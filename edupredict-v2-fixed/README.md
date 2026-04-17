# 🎓 EduPredict v2 — AI Student Intelligence Platform

## 🚀 Quick Start

### 1. Backend (Python FastAPI)
```bash
cd backend
python -m venv venv

# Mac/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

pip install -r requirements.txt

# Add your Anthropic API key (optional — enables Claude AI chat)
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-your-key

uvicorn main:app --reload --port 8000
# → http://localhost:8000
# → Docs: http://localhost:8000/docs
```

### 2. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

## 🔐 Login Credentials

| Role    | Email               | Password    |
|---------|---------------------|-------------|
| Student | priya@edu.in        | student123  |
| Student | arjun@edu.in        | student123  |
| Teacher | rajesh@faculty.in   | teacher123  |

## ✨ Features

- **ML Prediction** — 4 models (Random Forest, Gradient Boosting, MLP, Logistic Regression)
- **AI Chat** — Claude-powered with voice input/output (use Chrome)
- **Courses & Certificates** — Enroll, complete, download PDF certificate
- **Points System** — Teacher awards points; students earn tiers (Bronze → Platinum)
- **Real-time** — WebSocket notifications
- **Analytics** — Charts from 2000-student dataset

## 🎤 Voice Assistant
- Open **Chat** tab
- Click 🎤 mic button → speak your question
- Toggle 🔊 Voice On to hear responses spoken back
- Requires **Chrome** or **Edge** browser

## 🎓 Certificate Flow
1. Student goes to **Courses** tab
2. Clicks **Enroll Now** on a course
3. After completing, clicks **Mark as Completed**
4. Certificate auto-generated + **+25 points** awarded
5. Click **Download Certificate PDF** to get the PDF

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/predict | ML prediction |
| POST | /api/chat | AI assistant |
| POST | /api/courses/enroll | Enroll in course |
| POST | /api/courses/complete | Complete + generate cert |
| GET  | /api/certificates | List my certificates |
| GET  | /api/certificates/{id}/download | Download PDF |
| POST | /api/students/{id}/points | Award points (teacher) |
