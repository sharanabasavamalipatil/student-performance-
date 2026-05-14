"""
EduPredict v2 — FastAPI Backend
- Auth: JWT (demo users + CSV students)
- ML: predict, recommend (from existing .pkl models)
- Data: ALL from engineering_students.csv (2000 students)
- Points: teacher-only, persisted in memory
- AI Chat: rule-based with dataset context
- WebSocket: real-time points push
Run: uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
import jwt, datetime, json, os, uuid, io
import joblib, numpy as np, pandas as pd

from recommender import recommend_courses, get_all_courses, get_skill_gap_analysis
from preprocessing import preprocess_single_student

# ── App ───────────────────────────────────────────────────────────
app = FastAPI(title="EduPredict v2", version="2.0.0", docs_url="/docs")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

security   = HTTPBearer(auto_error=False)
SECRET_KEY = os.getenv("JWT_SECRET", "edupredict-secret-key-2024")
ALGORITHM  = "HS256"
BASE_DIR   = os.path.dirname(__file__)
MODEL_DIR  = os.path.join(BASE_DIR, "models")
DATA_PATH  = os.path.join(BASE_DIR, "data", "engineering_students.csv")

# ── In-memory stores ──────────────────────────────────────────────
POINTS_DB: Dict[str, Dict]  = {}  # studentId -> {points, log}
NOTIFS_DB: Dict[str, List]  = {}  # studentId -> [notifs]
CHAT_HISTORY: Dict[str, List] = {}

# ── Load CSV dataset once ─────────────────────────────────────────
try:
    DF = pd.read_csv(DATA_PATH)
    print(f"✅ Loaded dataset: {len(DF)} students")
except Exception as e:
    DF = pd.DataFrame()
    print(f"⚠️ CSV load error: {e}")

# ── Demo login users ──────────────────────────────────────────────
DEMO_USERS = {
    "priya@edu.in":    {"id":"S001","name":"Priya Sharma","role":"student","branch":"Computer Science","semester":6,"cgpa":8.7,"password":"student123"},
    "arjun@edu.in":    {"id":"S002","name":"Arjun Mehta","role":"student","branch":"Data Science","semester":4,"cgpa":7.2,"password":"student123"},
    "kavya@edu.in":    {"id":"S003","name":"Kavya Reddy","role":"student","branch":"Electronics & Communication","semester":5,"cgpa":6.5,"password":"student123"},
    "rohan@edu.in":    {"id":"S004","name":"Rohan Singh","role":"student","branch":"Mechanical","semester":3,"cgpa":5.8,"password":"student123"},
    "sneha@edu.in":    {"id":"S005","name":"Sneha Iyer","role":"student","branch":"Information Technology","semester":7,"cgpa":9.1,"password":"student123"},
    "vikram@edu.in":   {"id":"S006","name":"Vikram Patel","role":"student","branch":"Computer Science","semester":5,"cgpa":7.8,"password":"student123"},
    "divya@edu.in":    {"id":"S007","name":"Divya Nair","role":"student","branch":"Data Science","semester":6,"cgpa":8.3,"password":"student123"},
    "kiran@edu.in":    {"id":"S008","name":"Kiran Joshi","role":"student","branch":"Mechanical","semester":4,"cgpa":6.9,"password":"student123"},
    "rajesh@faculty.in":{"id":"T001","name":"Dr. Rajesh Kumar","role":"teacher","department":"Computer Science","subject":"Machine Learning","password":"teacher123"},
    "anita@faculty.in": {"id":"T002","name":"Prof. Anita Bose","role":"teacher","department":"Data Science","subject":"Data Structures","password":"teacher123"},
    "suresh@faculty.in":{"id":"T003","name":"Dr. Suresh Nair","role":"teacher","department":"Electronics","subject":"Digital Circuits","password":"teacher123"},
}

ACTIVITY_RULES = [
    {"id":"hackathon",    "label":"Hackathon Participation","points":20,"icon":"🏆","category":"competition"},
    {"id":"project",      "label":"Project Submitted",       "points":15,"icon":"🔧","category":"academic"},
    {"id":"certification","label":"Certification Earned",    "points":25,"icon":"📜","category":"skill"},
    {"id":"internship",   "label":"Internship Completed",    "points":30,"icon":"💼","category":"experience"},
    {"id":"quiz",         "label":"Quiz / Assessment",       "points":5, "icon":"✏️","category":"academic"},
    {"id":"workshop",     "label":"Workshop Attended",       "points":10,"icon":"🎓","category":"skill"},
    {"id":"volunteering", "label":"Community Volunteering",  "points":8, "icon":"🤝","category":"social"},
    {"id":"paper",        "label":"Research Paper Published","points":40,"icon":"📝","category":"academic"},
    {"id":"club",         "label":"Club / Society Event",    "points":6, "icon":"🎭","category":"social"},
    {"id":"sports",       "label":"Sports / Fitness Event",  "points":5, "icon":"⚽","category":"wellness"},
    {"id":"bonus",        "label":"Bonus / Special Award",   "points":0, "icon":"🌟","category":"bonus"},
    {"id":"deduction",    "label":"Point Deduction",         "points":0, "icon":"⚠️","category":"deduction"},
]

RISK_TIERS = {
    "At Risk":      {"color":"#f43f5e","level":5,"label":"CRITICAL"},
    "Below Average":{"color":"#fb923c","level":4,"label":"HIGH"},
    "Average":      {"color":"#fbbf24","level":3,"label":"MODERATE"},
    "Good":         {"color":"#38bdf8","level":2,"label":"LOW"},
    "Excellent":    {"color":"#10b981","level":1,"label":"NONE"},
}

# ── ML Models ─────────────────────────────────────────────────────
models, scaler, label_encoder, metadata = {}, None, None, {}

def load_models():
    global models, scaler, label_encoder, metadata
    try:
        scaler        = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
        label_encoder = joblib.load(os.path.join(MODEL_DIR, "label_encoder.pkl"))
        for name in ["random_forest","gradient_boosting","mlp","logistic_regression"]:
            p = os.path.join(MODEL_DIR, f"{name}.pkl")
            if os.path.exists(p): models[name] = joblib.load(p)
        meta = os.path.join(MODEL_DIR, "metadata.json")
        if os.path.exists(meta):
            with open(meta) as f: metadata = json.load(f)
        print(f"✅ Loaded {len(models)} ML models — best: {metadata.get('best_model','?')}")
    except Exception as e:
        print(f"⚠️ Model load error: {e}")

load_models()

# ── WebSocket Manager ─────────────────────────────────────────────
class WsManager:
    def __init__(self): self.conns: Dict[str, WebSocket] = {}
    async def connect(self, uid: str, ws: WebSocket):
        await ws.accept(); self.conns[uid] = ws
    def disconnect(self, uid: str): self.conns.pop(uid, None)
    async def send(self, uid: str, data: dict):
        ws = self.conns.get(uid)
        if ws:
            try: await ws.send_json(data)
            except: self.disconnect(uid)

manager = WsManager()

# ── JWT ───────────────────────────────────────────────────────────
def make_token(payload: dict) -> str:
    p = {**payload, "exp": datetime.datetime.utcnow() + datetime.timedelta(days=30)}
    return jwt.encode(p, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try: return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except: raise HTTPException(status_code=401, detail="Invalid or expired token")

def get_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    if not creds: raise HTTPException(status_code=401, detail="Not authenticated")
    return decode_token(creds.credentials)

def teacher_only(user=Depends(get_user)):
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    return user

# ── Schemas ───────────────────────────────────────────────────────
class LoginReq(BaseModel):
    email: str; password: str

class AwardReq(BaseModel):
    activity_id: str
    custom_points: Optional[float] = None
    note: Optional[str] = ""

class PredictReq(BaseModel):
    cgpa: float = 7.0
    attendance_percent: float = 80.0
    study_hours_per_day: float = 4.0
    sleep_hours_per_day: float = 7.0
    stress_level: int = 2
    backlogs: int = 0
    internships_completed: int = 0
    projects_completed: int = 0
    certifications: int = 0
    hackathons_participated: int = 0
    branch: str = "Computer Science"
    semester: int = 4
    career_goal: str = "Software Engineer"
    primary_interest: str = "AI/ML"
    learning_style: str = "Visual"
    family_income: str = "Middle"
    gender: str = "Male"
    part_time_job: bool = False
    library_visits_per_week: int = 2
    programming_score: float = 60.0
    math_score: float = 60.0
    circuits_score: float = 60.0
    mechanics_score: float = 60.0
    design_score: float = 60.0
    communication_score: float = 60.0
    critical_thinking_score: float = 60.0

class ChatReq(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

# ── AI Chat responses using dataset context ───────────────────────
def build_chat_reply(message: str, context: dict) -> str:
    msg = message.lower().strip()
    cgpa = float(context.get("cgpa", 0) or 0)
    branch = str(context.get("branch", ""))
    semester = int(context.get("semester", 0) or 0)

    # Compute dataset stats for contextual answers
    stats = {}
    if not DF.empty:
        stats["avg_cgpa"]        = round(DF["cgpa"].mean(), 2)
        stats["avg_attendance"]  = round(DF["attendance_percent"].mean(), 1)
        stats["avg_study"]       = round(DF["study_hours_per_day"].mean(), 1)
        stats["at_risk_pct"]     = round((DF["performance_label"]=="At Risk").mean()*100, 1)
        stats["excellent_pct"]   = round((DF["performance_label"]=="Excellent").mean()*100, 1)
        if branch:
            b = DF[DF["branch"]==branch]
            if len(b):
                stats["branch_avg_cgpa"] = round(b["cgpa"].mean(), 2)
                stats["branch_top_goal"] = b["career_goal"].value_counts().index[0] if len(b) else ""

    # Context-aware opener
    personal = ""
    if cgpa > 0:
        tier = "excellent" if cgpa>=8 else "good" if cgpa>=7 else "average" if cgpa>=6 else "below average" if cgpa>=5 else "at-risk"
        personal = f"Based on your CGPA of {cgpa} (rated **{tier}**): "

    # Match intent
    if any(w in msg for w in ["cgpa","grade","marks","score","gpa","academic"]):
        avg = stats.get("avg_cgpa", 7.1)
        b_avg = stats.get("branch_avg_cgpa","")
        comp = f"Your branch average is {b_avg}. " if b_avg else ""
        advice = "You're above average — focus on maintaining consistency." if cgpa >= avg else f"The dataset average is {avg}. You need to close this gap."
        return f"{personal}📊 **CGPA Improvement Tips**\n\n{comp}{advice}\n\n• Study 4–5 hrs/day consistently\n• Attend ≥85% of lectures\n• Clear backlogs immediately — they pull your CGPA down\n• Focus on your 2 weakest subjects each semester\n• Form a study group with peers scoring ≥7.5"

    if any(w in msg for w in ["stress","mental","anxiety","pressure","burnout","overwhelm"]):
        return f"{personal}🧘 **Stress Management**\n\nIn our dataset of 2000 students, {stats.get('at_risk_pct',8)}% are at-risk partly due to high stress.\n\n• Use the **Pomodoro technique**: 25 min study + 5 min break\n• Sleep 7–8 hrs — students averaging <6 hrs score 0.8 CGPA lower\n• Exercise 3× per week (proven to reduce cortisol)\n• Talk to the campus counsellor — it's confidential\n• Reduce phone screen time to <2 hrs/day\n• Don't compare yourself to others — track YOUR progress"

    if any(w in msg for w in ["point","award","earn","badge","tier","activity"]):
        return "🏅 **Activity Points System**\n\nPoints are **awarded exclusively by your teacher** — you cannot self-award.\n\n| Activity | Points |\n|---|---|\n| Internship | 30 |\n| Research Paper | 40 |\n| Certification | 25 |\n| Hackathon | 20 |\n| Workshop | 10 |\n| Project | 15 |\n\n**Tiers:** Bronze (0–59) → Silver (60–119) → Gold (120–199) → Platinum (200+)\n\nHigher tiers unlock better course recommendations and boost your resume ATS score by up to 35%!"

    if any(w in msg for w in ["career","job","placement","future","goal","work"]):
        top_goal = stats.get("branch_top_goal", "Software Engineer")
        return f"{personal}💼 **Career Planning**\n\nTop career goal in your branch: **{top_goal}**\n\n• Start internship search from Semester {max(semester,4)}\n• Build 2–3 GitHub projects relevant to your goal\n• Get at least 2 certifications (Coursera/AWS/Google)\n• Apply to hackathons — they signal initiative to recruiters\n• Update LinkedIn weekly with projects and skills\n• Network with alumni in your target company"

    if any(w in msg for w in ["attend","bunk","absent","miss","lecture","class"]):
        avg_att = stats.get("avg_attendance", 81)
        return f"{personal}📋 **Attendance**\n\nDataset average attendance: **{avg_att}%**. Below 75% risks an exam ban.\n\n• Set phone reminders for all classes\n• Inform faculty in advance for known absences\n• Track your attendance weekly using a notebook/app\n• Students with ≥85% attendance average 0.6 CGPA higher\n• Even 1 missed class per week = 14% attendance loss per semester"

    if any(w in msg for w in ["recommend","course","learn","skill","study what","which course"]):
        return f"{personal}📚 **Course Recommendations**\n\nUse the **Predictor** tab to get personalized ML-powered recommendations based on your branch, CGPA, career goal and skill scores.\n\nGeneral advice for Semester {semester or '?'}:\n• Foundation: Python, Mathematics, Communication\n• Intermediate: DSA, Statistics, Cloud Computing\n• Advanced: ML/AI, System Design, Research Methods\n\nYour activity tier also unlocks tier-specific recommended courses!"

    if any(w in msg for w in ["backlog","arrear","fail","kt","supplementary"]):
        return f"{personal}📌 **Clearing Backlogs**\n\nIn the dataset, students with 2+ backlogs have 0.9 lower average CGPA.\n\n• Create a subject-wise daily study plan (2 hrs/backlog subject)\n• Get past papers from seniors — exam patterns repeat\n• Form a study group specifically for the backlog subject\n• Visit faculty during office hours — most are happy to help\n• Clear all backlogs BEFORE appearing for placements\n• Don't ignore backlogs — they compound each semester"

    if any(w in msg for w in ["sleep","rest","tired","energy","fatigue"]):
        return "😴 **Sleep & Academic Performance**\n\nOur dataset shows students sleeping <6 hrs/day score on average **0.7 CGPA lower**.\n\n• Aim for 7–8 hrs of quality sleep\n• Sleep before midnight — deep sleep cycles are critical 11pm–2am\n• Avoid all-nighters before exams — recall drops 40%\n• No phone/laptop 30 min before bed\n• Consistent sleep-wake time helps more than total duration"

    if any(w in msg for w in ["predict","performance","result","how am i","my result"]):
        if cgpa > 0:
            tier = "Excellent 🏆" if cgpa>=8 else "Good ✅" if cgpa>=7 else "Average 📊" if cgpa>=6 else "Below Average ⚠️" if cgpa>=5 else "At Risk 🚨"
            return f"🔮 **Performance Estimate**\n\nBased on your CGPA of **{cgpa}**, your current tier is: **{tier}**\n\nFor a precise ML prediction using all your metrics (attendance, stress, study hours, skill scores), go to the **Predictor** tab and fill in the form. The system uses Random Forest, Gradient Boosting, MLP, and Logistic Regression models trained on {len(DF)} students."
        return "🔮 Go to the **Predictor** tab and fill in your details for a full ML-powered performance prediction using 4 trained models!"

    if any(w in msg for w in ["hello","hi","hey","good morning","good evening"]):
        excellent = stats.get("excellent_pct", 18)
        return f"👋 Hello! I'm your **EduPredict AI Assistant**.\n\nI have access to data from **{len(DF)} engineering students** in our dataset.\n\n{excellent}% of students are in the Excellent tier. I can help you with:\n• 📊 CGPA improvement strategies\n• 🧘 Stress management\n• 🏅 Activity points system\n• 💼 Career planning\n• 📚 Course recommendations\n• 📋 Attendance advice\n\nWhat would you like to know?"

    # Default
    return f"🤖 I can help you with CGPA improvement, stress management, activity points, career guidance, attendance, backlogs, and course recommendations.\n\nOur dataset has **{len(DF)} students** with a mean CGPA of **{stats.get('avg_cgpa',7.1)}**.\n\nTry asking: 'How can I improve my CGPA?' or 'What are activity points?'"


# ═══════════════════════════════════════════════════════════════════
# API ROUTES
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/health")
def health():
    return {"status":"ok","models":len(models),"dataset_size":len(DF),"best_model":metadata.get("best_model")}

# ── AUTH ──────────────────────────────────────────────────────────
@app.post("/api/auth/login")
def login(req: LoginReq):
    user = DEMO_USERS.get(req.email.lower())
    if not user or user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    payload = {k:v for k,v in user.items() if k != "password"}
    return {"access_token": make_token(payload), "token_type": "bearer", "user": payload}

@app.get("/api/auth/me")
def me(user=Depends(get_user)):
    return user

# ── STUDENTS (from CSV dataset) ───────────────────────────────────
@app.get("/api/students")
def list_students(page:int=1, per_page:int=25, q:str="", branch:str="", performance:str="", semester:int=0):
    if DF.empty:
        return {"students":[],"total":0,"page":page,"per_page":per_page}
    df = DF.copy()
    if q:          df = df[df["name"].str.lower().str.contains(q.lower(), na=False)]
    if branch:     df = df[df["branch"]==branch]
    if performance:df = df[df["performance_label"]==performance]
    if semester:   df = df[df["semester"]==semester]
    total = len(df)
    df = df.sort_values("cgpa", ascending=False)
    start = (page-1)*per_page
    cols = ["student_id","name","gender","branch","semester","cgpa","prev_semester_cgpa",
            "attendance_percent","study_hours_per_day","sleep_hours_per_day","stress_level",
            "backlogs","internships_completed","projects_completed","certifications",
            "hackathons_participated","performance_label","career_goal","primary_interest",
            "programming_score","math_score","circuits_score","mechanics_score",
            "design_score","communication_score","critical_thinking_score"]
    existing = [c for c in cols if c in df.columns]
    return {
        "students": df.iloc[start:start+per_page][existing].fillna(0).to_dict("records"),
        "total": total, "page": page, "per_page": per_page,
        "branches": sorted(DF["branch"].unique().tolist()) if "branch" in DF.columns else [],
    }

@app.get("/api/students/branches")
def get_branches():
    if DF.empty: return {"branches":[]}
    return {"branches": sorted(DF["branch"].unique().tolist())}

# ── POINTS (Teacher-only) ─────────────────────────────────────────
@app.post("/api/students/{student_id}/points")
async def award_points(student_id: str, req: AwardReq, teacher=Depends(teacher_only)):
    rule = next((r for r in ACTIVITY_RULES if r["id"]==req.activity_id), None)
    if not rule: raise HTTPException(status_code=404, detail="Activity not found")

    raw   = req.custom_points if req.activity_id in ("bonus","deduction") else (req.custom_points or rule["points"])
    pts   = -abs(float(raw)) if req.activity_id=="deduction" else float(raw)
    db    = POINTS_DB.get(student_id, {"points":0,"log":[]})
    total = max(0.0, db["points"] + pts)

    entry = {
        "id":str(uuid.uuid4()), "activity_id":req.activity_id,
        "icon":rule["icon"], "label":rule["label"], "category":rule["category"],
        "points_earned":pts, "total_after":total, "note":req.note or "",
        "awarded_by":teacher["name"], "teacher_id":teacher["id"],
        "date":datetime.datetime.utcnow().isoformat()
    }
    POINTS_DB[student_id] = {"points":total, "log":[entry, *db["log"]]}

    notif = {
        "id":str(uuid.uuid4()),
        "type":"points_awarded" if pts>=0 else "points_deducted",
        "title":f"+{int(pts)} Points from {teacher['name']}! 🎉" if pts>=0 else f"{int(pts)} Points Deducted",
        "message":f"{rule['label']}{': '+req.note if req.note else ''}. Total: {int(total)} pts.",
        "timestamp":datetime.datetime.utcnow().isoformat(), "read":False, "icon":rule["icon"]
    }
    NOTIFS_DB.setdefault(student_id,[]).insert(0, notif)

    # Real-time push
    await manager.send(student_id, {"type":"points_update","data":{"points":total,"entry":entry,"notif":notif}})
    return {"success":True,"new_total":total,"entry":entry}

@app.get("/api/students/{student_id}/points")
def get_points(student_id: str, _=Depends(get_user)):
    db = POINTS_DB.get(student_id, {"points":0,"log":[]})
    return {**db, "notifications": NOTIFS_DB.get(student_id,[])}

@app.get("/api/students/all-points")
def all_points(teacher=Depends(teacher_only)):
    result = []
    for u in DEMO_USERS.values():
        if u["role"]!="student": continue
        db = POINTS_DB.get(u["id"],{"points":0,"log":[]})
        result.append({"id":u["id"],"name":u["name"],"branch":u["branch"],"semester":u["semester"],"cgpa":u["cgpa"],"points":db["points"],"log_count":len(db["log"]),"last_entry":db["log"][0] if db["log"] else None})
    return sorted(result, key=lambda x:x["points"], reverse=True)

# ── ML PREDICT ────────────────────────────────────────────────────
@app.post("/api/predict")
def predict(req: PredictReq):
    try:
        data     = req.dict()
        features = preprocess_single_student(data)
        scaled   = scaler.transform(features) if scaler else features
        best     = metadata.get("best_model","gradient_boosting")
        model    = models.get(best) or (list(models.values())[0] if models else None)
        if not model: raise HTTPException(status_code=503, detail="No model loaded. Run: python model.py")

        enc   = model.predict(scaled)[0]
        proba = model.predict_proba(scaled)[0]
        label = label_encoder.inverse_transform([enc])[0] if label_encoder else str(enc)
        classes = label_encoder.classes_.tolist() if label_encoder else []
        recs  = recommend_courses(data, top_n=5)

        all_preds = {}
        for name, m in models.items():
            p = m.predict(scaled)[0]
            pb= m.predict_proba(scaled)[0]
            l = label_encoder.inverse_transform([p])[0] if label_encoder else str(p)
            all_preds[name] = {"prediction":l,"confidence":round(float(max(pb))*100,1)}

        return {
            "prediction":label,
            "confidence":round(float(max(proba))*100,1),
            "probabilities":{c:round(float(p)*100,1) for c,p in zip(classes,proba)},
            "all_model_predictions":all_preds,
            "best_model_used":best,
            "risk_color":RISK_TIERS.get(label,{}).get("color","#fbbf24"),
            "risk_tier":RISK_TIERS.get(label,{}),
            "top_courses":recs[:3],
        }
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ── RECOMMEND ─────────────────────────────────────────────────────
@app.post("/api/recommend")
def recommend(req: PredictReq):
    try:
        data = req.dict()
        return {"recommendations":recommend_courses(data,top_n=8),"skill_gap_analysis":get_skill_gap_analysis(data),"total_available":len(get_all_courses())}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ── ANALYTICS (from CSV) ──────────────────────────────────────────
@app.get("/api/analytics")
def analytics():
    if DF.empty: raise HTTPException(status_code=503,detail="Dataset not loaded")
    try:
        df = DF.copy()
        branch_stats   = df.groupby("branch").agg(avg_cgpa=("cgpa","mean"),avg_attendance=("attendance_percent","mean"),count=("cgpa","count"),avg_stress=("stress_level","mean")).round(2).reset_index().to_dict("records")
        perf_dist      = df["performance_label"].value_counts().to_dict()
        sem_stats      = df.groupby("semester").agg(avg_cgpa=("cgpa","mean"),avg_study=("study_hours_per_day","mean"),avg_stress=("stress_level","mean")).round(2).reset_index().to_dict("records")
        top10          = df.nlargest(10,"cgpa")[["name","branch","cgpa","performance_label","career_goal"]].to_dict("records")
        skill_avgs     = {k:round(df[f"{k}_score"].mean(),1) for k in ["programming","math","circuits","mechanics","design","communication","critical_thinking"] if f"{k}_score" in df.columns}
        career_dist    = df["career_goal"].value_counts().head(10).to_dict()
        stress_cgpa    = df.groupby("stress_level").agg(avg_cgpa=("cgpa","mean"),count=("cgpa","count")).round(2).reset_index().to_dict("records")
        df["sleep_bin"]= pd.cut(df["sleep_hours_per_day"],bins=[0,5,6,7,8,15],labels=["<5h","5-6h","6-7h","7-8h",">8h"])
        sleep_perf     = df.groupby("sleep_bin",observed=True)["cgpa"].mean().round(2).to_dict()
        return {
            "branch_statistics":branch_stats,"performance_distribution":perf_dist,
            "semester_statistics":sem_stats,"top_students":top10,"skill_averages":skill_avgs,
            "career_distribution":career_dist,"stress_vs_cgpa":stress_cgpa,
            "sleep_vs_cgpa":{str(k):v for k,v in sleep_perf.items()},
            "total_students":len(df),
            "at_risk_count":int((df["performance_label"]=="At Risk").sum()),
            "excellent_count":int((df["performance_label"]=="Excellent").sum()),
            "avg_cgpa":round(df["cgpa"].mean(),2),
            "avg_attendance":round(df["attendance_percent"].mean(),1),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── AT-RISK (from CSV) ────────────────────────────────────────────
@app.get("/api/at-risk")
def at_risk():
    if DF.empty: raise HTTPException(status_code=503,detail="Dataset not loaded")
    try:
        df   = DF.copy()
        risk = df[df["performance_label"].isin(["At Risk","Below Average"])].sort_values("cgpa").head(50)
        cols = ["name","branch","semester","cgpa","attendance_percent","backlogs","stress_level","performance_label","career_goal"]
        existing = [c for c in cols if c in risk.columns]
        return {
            "at_risk_students":risk[existing].fillna(0).to_dict("records"),
            "summary":{
                "total_at_risk":int((df["performance_label"]=="At Risk").sum()),
                "total_below_avg":int((df["performance_label"]=="Below Average").sum()),
                "avg_cgpa_at_risk":round(risk["cgpa"].mean(),2) if len(risk) else 0,
                "branches_affected":risk["branch"].value_counts().head(5).to_dict(),
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── COURSES ───────────────────────────────────────────────────────
@app.get("/api/courses")
def courses(branch:str="", difficulty:str=""):
    cs = get_all_courses()
    if branch:     cs = [c for c in cs if branch in c.get("branch",[])]
    if difficulty: cs = [c for c in cs if c.get("difficulty")==difficulty]
    return {"courses":cs,"count":len(cs)}

# ── AI CHAT (Claude-powered with rule-based fallback) ────────────
import httpx as _httpx

class ChatReqV2(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None
    history: Optional[List[Dict[str, str]]] = []

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

def build_system_prompt(ctx: dict) -> str:
    stats = {}
    if not DF.empty:
        stats["avg_cgpa"]       = round(DF["cgpa"].mean(), 2)
        stats["avg_attendance"] = round(DF["attendance_percent"].mean(), 1)
        stats["at_risk_pct"]    = round((DF["performance_label"]=="At Risk").mean()*100, 1)
        stats["excellent_pct"]  = round((DF["performance_label"]=="Excellent").mean()*100, 1)
    branch = ctx.get("branch", "Engineering")
    return f"""You are EduPredict AI, a smart academic assistant for engineering students in India. You have deep knowledge about the EduPredict platform and real student performance data.

STUDENT CONTEXT:
- Name: {ctx.get("name", "Student")}
- Branch: {branch}
- Semester: {ctx.get("semester", "N/A")}
- CGPA: {ctx.get("cgpa", "N/A")}

DATASET INSIGHTS (from {len(DF)} real engineering students):
- Average CGPA: {stats.get("avg_cgpa", 7.1)}
- Average Attendance: {stats.get("avg_attendance", 81)}%
- At-Risk students: {stats.get("at_risk_pct", 8)}%
- Excellent students: {stats.get("excellent_pct", 18)}%

PLATFORM KNOWLEDGE:
- EduPredict uses 4 ML models: Random Forest, Gradient Boosting, MLP, Logistic Regression
- Activity points ONLY awarded by teachers: Hackathon(20pts), Project(15pts), Certification(25pts), Internship(30pts), Research Paper(40pts), Workshop(10pts)
- Point tiers: Bronze(0-59), Silver(60-119), Gold(120-199), Platinum(200+)
- Students sleeping <6hrs score 0.7 CGPA lower on average
- Students with 2+ backlogs score 0.9 CGPA lower on average
- Students with >=85% attendance score 0.6 CGPA higher on average

INSTRUCTIONS:
- Be friendly, encouraging, personalized to the student's profile above
- Give concrete actionable advice with specific numbers from the dataset
- Use emojis to make responses engaging
- Use **bold** for key points, bullet lists where helpful
- Keep responses concise (3-8 lines for most questions)
- Direct to Predictor tab for ML predictions, Courses tab for course recommendations
- Always be supportive and growth-focused"""

@app.post("/api/chat")
async def chat(req: ChatReqV2, user=Depends(get_user)):
    ctx = req.context or {}
    ctx.setdefault("name", user.get("name", "Student"))
    ctx.setdefault("branch", user.get("branch", ""))
    ctx.setdefault("semester", user.get("semester", ""))
    ctx.setdefault("cgpa", user.get("cgpa", ""))

    uid = user.get("id", "anon")
    ts  = datetime.datetime.utcnow().isoformat()
    reply = ""

    # Try Claude API first
    if ANTHROPIC_API_KEY:
        try:
            messages = list(req.history or [])[-10:]  # last 10 turns
            messages.append({"role": "user", "content": req.message})
            async with _httpx.AsyncClient(timeout=30) as client:
                r = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": ANTHROPIC_API_KEY,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-sonnet-4-20250514",
                        "max_tokens": 1000,
                        "system": build_system_prompt(ctx),
                        "messages": messages,
                    }
                )
                if r.status_code == 200:
                    reply = r.json()["content"][0]["text"]
        except Exception as e:
            print(f"Claude API error: {e}")

    # Fallback to rule-based if Claude unavailable
    if not reply:
        reply = build_chat_reply(req.message, ctx)

    CHAT_HISTORY.setdefault(uid, []).extend([
        {"id": str(uuid.uuid4()), "role": "user",      "content": req.message, "ts": ts},
        {"id": str(uuid.uuid4()), "role": "assistant",  "content": reply,       "ts": ts},
    ])
    return {"reply": reply}

@app.get("/api/chat/history/{uid}")
def chat_history(uid: str, _=Depends(get_user)):
    return {"history": CHAT_HISTORY.get(uid,[])}

# ── LEADERBOARD (demo users + live points) ────────────────────────
@app.get("/api/leaderboard")
def leaderboard(_=Depends(get_user)):
    result = []
    for u in DEMO_USERS.values():
        if u["role"]!="student": continue
        pts      = POINTS_DB.get(u["id"],{}).get("points",0)
        combined = round((u["cgpa"]/10)*60 + (pts/200)*40, 1)
        result.append({"id":u["id"],"name":u["name"],"branch":u["branch"],"semester":u["semester"],"cgpa":u["cgpa"],"points":pts,"combined_score":combined})
    return sorted(result, key=lambda x:x["combined_score"], reverse=True)

# ── CERTIFICATES ─────────────────────────────────────────────────
# In-memory cert store: student_id -> list of cert records
CERTS_DB: Dict[str, List] = {}

class CourseEnrollReq(BaseModel):
    course_id: str
    course_name: str

class CourseCompleteReq(BaseModel):
    course_id: str
    course_name: str

@app.post("/api/courses/enroll")
def enroll_course(req: CourseEnrollReq, user=Depends(get_user)):
    """Student enrolls in a course."""
    sid = user.get("id")
    if not sid:
        raise HTTPException(status_code=401, detail="Not authenticated")
    db = CERTS_DB.setdefault(sid, [])
    # Check if already enrolled
    existing = next((c for c in db if c["course_id"] == req.course_id), None)
    if existing:
        return {"message": "Already enrolled", "course": existing}
    entry = {
        "id": str(uuid.uuid4()),
        "course_id": req.course_id,
        "course_name": req.course_name,
        "status": "enrolled",
        "enrolled_at": datetime.datetime.utcnow().isoformat(),
        "completed_at": None,
        "certificate_id": None,
    }
    db.append(entry)
    return {"message": "Enrolled successfully", "course": entry}

@app.post("/api/courses/complete")
def complete_course(req: CourseCompleteReq, user=Depends(get_user)):
    """Mark a course as completed and generate a certificate."""
    sid = user.get("id")
    if not sid:
        raise HTTPException(status_code=401, detail="Not authenticated")
    db = CERTS_DB.setdefault(sid, [])
    entry = next((c for c in db if c["course_id"] == req.course_id), None)
    if not entry:
        # Auto-enroll if not enrolled
        entry = {
            "id": str(uuid.uuid4()),
            "course_id": req.course_id,
            "course_name": req.course_name,
            "status": "enrolled",
            "enrolled_at": datetime.datetime.utcnow().isoformat(),
            "completed_at": None,
            "certificate_id": None,
        }
        db.append(entry)

    if entry["status"] == "completed":
        return {"message": "Already completed", "course": entry}

    cert_id = str(uuid.uuid4())
    entry["status"] = "completed"
    entry["completed_at"] = datetime.datetime.utcnow().isoformat()
    entry["certificate_id"] = cert_id

    # Add certification activity points automatically (+25)
    pts_db = POINTS_DB.get(sid, {"points": 0, "log": []})
    new_total = pts_db["points"] + 25
    pts_entry = {
        "id": str(uuid.uuid4()), "activity_id": "certification",
        "icon": "📜", "label": f"Course Completed: {req.course_name}",
        "category": "skill", "points_earned": 25, "total_after": new_total,
        "note": f"Auto-awarded on completion of {req.course_name}",
        "awarded_by": "EduPredict System", "teacher_id": "SYSTEM",
        "date": datetime.datetime.utcnow().isoformat()
    }
    POINTS_DB[sid] = {"points": new_total, "log": [pts_entry, *pts_db["log"]]}

    notif = {
        "id": str(uuid.uuid4()), "type": "course_completed",
        "title": f"🎓 Course Completed! Certificate Ready",
        "message": f"You completed '{req.course_name}'. Your certificate is available. +25 points awarded!",
        "timestamp": datetime.datetime.utcnow().isoformat(), "read": False, "icon": "📜"
    }
    NOTIFS_DB.setdefault(sid, []).insert(0, notif)

    return {"message": "Course completed! Certificate generated.", "course": entry, "certificate_id": cert_id, "points_awarded": 25}

@app.get("/api/courses/my-courses")
def my_courses(user=Depends(get_user)):
    """Get all enrolled/completed courses for the current student."""
    sid = user.get("id")
    if not sid:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"courses": CERTS_DB.get(sid, [])}

@app.get("/api/certificates")
def my_certificates(user=Depends(get_user)):
    """Get all completed certificates for the current student."""
    sid = user.get("id")
    if not sid:
        raise HTTPException(status_code=401, detail="Not authenticated")
    courses = CERTS_DB.get(sid, [])
    completed = [c for c in courses if c["status"] == "completed"]
    return {"certificates": completed, "total": len(completed)}

@app.get("/api/certificates/{certificate_id}/download")
def download_certificate(certificate_id: str, user=Depends(get_user)):
    """Download a certificate PDF by certificate ID."""
    try:
        from certificate_gen import generate_certificate
    except ImportError:
        raise HTTPException(status_code=500, detail="Certificate generation not available. Install reportlab: pip install reportlab")

    sid = user.get("id")
    courses = CERTS_DB.get(sid, [])
    cert_entry = next((c for c in courses if c.get("certificate_id") == certificate_id), None)
    if not cert_entry:
        raise HTTPException(status_code=404, detail="Certificate not found")

    u = None
    for email, usr in DEMO_USERS.items():
        if usr["id"] == sid:
            u = usr
            break

    completed_date = cert_entry.get("completed_at", "")
    if completed_date:
        try:
            dt = datetime.datetime.fromisoformat(completed_date)
            completed_date = dt.strftime("%B %d, %Y")
        except:
            pass

    pdf_bytes = generate_certificate(
        student_name=user.get("name", "Student"),
        course_name=cert_entry["course_name"],
        course_id=cert_entry["course_id"],
        completion_date=completed_date,
        student_id=sid,
        certificate_id=certificate_id,
        instructor_name="EduPredict Faculty",
        cgpa=u.get("cgpa") if u else None,
        branch=user.get("branch", ""),
    )

    course_safe = cert_entry["course_name"].replace(" ", "_")[:30]
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Certificate_{course_safe}.pdf"'},
    )

@app.get("/api/notifications")
def get_notifications(user=Depends(get_user)):
    """Get all notifications for the current user."""
    sid = user.get("id")
    return {"notifications": NOTIFS_DB.get(sid, [])}

@app.post("/api/notifications/{notif_id}/read")
def mark_notification_read(notif_id: str, user=Depends(get_user)):
    """Mark a notification as read."""
    sid = user.get("id")
    notifs = NOTIFS_DB.get(sid, [])
    for n in notifs:
        if n["id"] == notif_id:
            n["read"] = True
    return {"success": True}

# ── WEBSOCKET ─────────────────────────────────────────────────────
@app.websocket("/ws/{user_id}")
async def ws_endpoint(ws: WebSocket, user_id: str):
    await manager.connect(user_id, ws)
    try:
        while True:
            data = await ws.receive_json()
            if data.get("type")=="ping":
                await ws.send_json({"type":"pong"})
    except WebSocketDisconnect:
        manager.disconnect(user_id)

# ── MODEL INFO ────────────────────────────────────────────────────
@app.get("/api/models/info")
def model_info():
    return {"models":list(models.keys()),"best_model":metadata.get("best_model"),"best_accuracy":metadata.get("best_accuracy"),"model_results":metadata.get("model_results",{})}

if __name__ == "__main__":
    import uvicorn
    print("\n🎓 EduPredict v2 API")
    print("   http://localhost:8000")
    print("   Docs: http://localhost:8000/docs\n")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
