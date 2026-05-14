// ─────────────────────────────────────────────────────────────
//  EduPredict v5.0  —  MySQL Edition
//  Replaces lowdb (JSON) with mysql2 connection pool
//  Fix: "Cannot connect to server on port 5000"
// ─────────────────────────────────────────────────────────────

/* ── Load .env manually ── */
const fs_env   = require('fs');
const path_env = require('path');
const env_path = path_env.join(__dirname, '.env');
if (fs_env.existsSync(env_path)) {
  fs_env.readFileSync(env_path, 'utf8').split('\n').forEach(line => {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) return;
    const idx = clean.indexOf('=');
    if (idx < 0) return;
    const key = clean.slice(0, idx).trim();
    const val = clean.slice(idx + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  });
}

const express    = require('express');
const cors       = require('cors');
const fs         = require('fs');
const path       = require('path');
const nodemailer = require('nodemailer');
const bcrypt     = require('bcryptjs');
const mysql      = require('mysql2/promise');

const app  = express();
const PORT = 5000;

app.use(cors({
  origin: ['http://localhost:5173','http://localhost:5174','http://localhost:3000','http://127.0.0.1:5173','http://127.0.0.1:5174'],
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));

/* ══════════════════════════════════════════════════
   MYSQL CONNECTION POOL
══════════════════════════════════════════════════*/
const pool = mysql.createPool({
  host:               process.env.DB_HOST || 'localhost',
  port:               Number(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER || 'root',
  password:           process.env.DB_PASS || '',
  database:           process.env.DB_NAME || 'edupredict',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  decimalNumbers:     true,
});

async function initDB() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log(`✅ MySQL connected → ${process.env.DB_HOST||'localhost'}:${process.env.DB_PORT||3306}/${process.env.DB_NAME||'edupredict'}`);
  } catch (err) {
    console.error('❌ MySQL connection FAILED:', err.message);
    console.error('   1. Make sure MySQL is running');
    console.error('   2. Set DB_HOST, DB_USER, DB_PASS, DB_NAME in backend/.env');
    console.error('   3. Run: mysql -u root -p < edupredict_setup.sql');
    process.exit(1);
  }
}

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/* ══════════════════════════════════════════════════
   PASSWORD HELPERS
══════════════════════════════════════════════════*/
const SALT = 10;
function hashPw(plain)        { return bcrypt.hashSync(plain, SALT); }
function checkPw(plain, hash) {
  if (hash && hash.startsWith('$2')) return bcrypt.compareSync(plain, hash);
  return plain === hash;
}

/* ══════════════════════════════════════════════════
   EMAIL
══════════════════════════════════════════════════*/
const SENDER_EMAIL = process.env.SENDER_EMAIL || '';
const SENDER_PASS  = process.env.SENDER_PASS  || '';
let transporter = null;
if (SENDER_EMAIL && !SENDER_EMAIL.includes('YOUR_')) {
  transporter = nodemailer.createTransport({ service:'gmail', auth:{ user:SENDER_EMAIL, pass:SENDER_PASS } });
  console.log(`✅ Email: ${SENDER_EMAIL}`);
}

async function sendLoginEmail(user) {
  if (!transporter) return;
  const now = new Date().toLocaleString('en-IN', { timeZone:'Asia/Kolkata' });
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden;"><div style="background:linear-gradient(135deg,#6366f1,#a78bfa);padding:28px 32px;text-align:center;"><h1 style="margin:0;color:white;font-size:22px;">🎓 EduPredict</h1><p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">RYMEC — Login Notification</p></div><div style="padding:28px 32px;"><p style="color:#cbd5e1;">Hi <strong style="color:white;">${user.name}</strong>, a login was detected at ${now} IST.</p><p style="color:#64748b;font-size:12px;">If this wasn't you, contact your administrator immediately.</p></div><div style="padding:14px;background:#0a0f1e;text-align:center;color:#475569;font-size:11px;">EduPredict · RYMEC College</div></div>`;
  try {
    await transporter.sendMail({ from:`"EduPredict 🎓" <${SENDER_EMAIL}>`, to:user.email, subject:`🔐 EduPredict Login — ${user.name}`, html });
    console.log(`📧 Login email → ${user.email}`);
  } catch(e) { console.error(`❌ Email failed: ${e.message}`); }
}

/* ══════════════════════════════════════════════════
   ML MODEL
══════════════════════════════════════════════════*/
const MODEL_PATH = path.join(__dirname, 'data', 'model.json');
let MODEL = null;
try {
  MODEL = JSON.parse(fs.readFileSync(MODEL_PATH,'utf8'));
  console.log(`✅ ML Model loaded (R²=${MODEL.linear_regression.metrics.r2}, trained on ${MODEL.dataset_size} records)`);
} catch(e) { console.warn('⚠️  No trained model found. Run: node train-model.js'); }

function encodeFeatures({ hours_studied=6,attendance=75,sleep_hours=7,previous_scores=70,tutoring_sessions=1,physical_activity=3,motivation_level='Medium',parental_involvement='Medium',access_to_resources='Medium',internet_access='Yes',extracurricular='No',peer_influence='Neutral',school_type='Public',learning_disabilities='No',family_income='Medium',teacher_quality='Medium',distance_from_home='Near',gender='Male' }) {
  return [ hours_studied,attendance,sleep_hours,previous_scores,tutoring_sessions,physical_activity,
    ({Low:0,Medium:1,High:2}[motivation_level]??1),({Low:0,Medium:1,High:2}[parental_involvement]??1),({Low:0,Medium:1,High:2}[access_to_resources]??1),
    internet_access==='Yes'?1:0,extracurricular==='Yes'?1:0,({Negative:0,Neutral:1,Positive:2}[peer_influence]??1),
    school_type==='Private'?1:0,learning_disabilities==='Yes'?0:1,({Low:0,Medium:1,High:2}[family_income]??1),
    ({Low:0,Medium:1,High:2}[teacher_quality]??1),({Near:2,Moderate:1,Far:0}[distance_from_home]??1),gender==='Male'?1:0 ];
}

function predictWithModel(features) {
  if (!MODEL) return null;
  const {means,stds}=MODEL.normalization, {weights,bias}=MODEL.linear_regression;
  const norm=features.map((v,i)=>(v-means[i])/stds[i]);
  const score=norm.reduce((s,v,j)=>s+v*weights[j],0)+bias;
  return Math.min(100,Math.max(30,Math.round(score)));
}

/* ══════════════════════════════════════════════════
   CSV DATASET
══════════════════════════════════════════════════*/
const CSV_PATH = path.join(__dirname,'data','StudentPerformanceFactors.csv');
let DATASET=[];
try {
  const raw=fs.readFileSync(CSV_PATH,'utf8');
  const lines=raw.replace(/\r/g,'').trim().split('\n');
  const hdr=lines[0].split(',');
  DATASET=lines.slice(1).map(l=>{ const v=l.split(','),o={}; hdr.forEach((h,i)=>{ const val=v[i]??''; o[h.trim()]=isNaN(val)||val===''?val.trim():Number(val); }); return o; });
  console.log(`✅ CSV: ${DATASET.length} records`);
} catch(e) { console.warn('⚠️  CSV not found'); }

function avg(arr,key){ const v=arr.map(r=>r[key]).filter(v=>typeof v==='number'); return v.length?+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(2):0; }
function countBy(arr,key){ const c={}; arr.forEach(r=>{const v=r[key];c[v]=(c[v]||0)+1;}); return c; }
function histogram(arr,key,b=10){ const v=arr.map(r=>r[key]).filter(v=>typeof v==='number'); const mn=Math.min(...v),mx=Math.max(...v),sz=(mx-mn)/b; return Array.from({length:b},(_,i)=>({label:`${Math.round(mn+i*sz)}-${Math.round(mn+(i+1)*sz)}`,count:0})).map((bin,i)=>{ v.forEach(x=>{ if(Math.min(Math.floor((x-mn)/sz),b-1)===i) bin.count++; }); return bin; }); }

/* ══════════════════════════════════════════════════
   AUTH ROUTES
══════════════════════════════════════════════════*/
app.post('/api/login', async (req,res) => {
  const {email,password}=req.body;
  if (!email||!password) return res.status(400).json({error:'Email and password required'});
  try {
    const rows=await query('SELECT * FROM users WHERE LOWER(email)=LOWER(?)',[email.trim()]);
    const user=rows[0];
    if (!user||!checkPw(password,user.password)) return res.status(401).json({error:'Invalid email or password'});
    if (!user.password.startsWith('$2'))
      await query('UPDATE users SET password=? WHERE id=?',[hashPw(password),user.id]);
    await query('INSERT INTO login_logs (user_id,email,name,role,ip) VALUES (?,?,?,?,?)',
      [user.id,user.email,user.name,user.role,req.ip||'unknown']);
    await query(`INSERT INTO active_sessions (user_id,email,name,role,ip) VALUES (?,?,?,?,?)
      ON DUPLICATE KEY UPDATE email=VALUES(email),name=VALUES(name),role=VALUES(role),ip=VALUES(ip),last_seen=NOW()`,
      [user.id,user.email,user.name,user.role,req.ip||'unknown']);
    sendLoginEmail(user).catch(()=>{});
    const {password:_,...safe}=user;
    res.json({success:true,user:safe});
  } catch(err) {
    console.error('Login error:',err.message);
    res.status(500).json({error:'Database error during login'});
  }
});

app.get('/api/students', async (req,res) => {
  try { res.json(await query("SELECT id,name,email,role,branch,semester,cgpa,attendance,points,created_at FROM users WHERE role='student'")); }
  catch(e){ res.status(500).json({error:e.message}); }
});
app.get('/api/users', async (req,res) => {
  try { res.json(await query('SELECT id,name,email,role,branch,semester,cgpa,attendance,points,department,subject,created_at FROM users')); }
  catch(e){ res.status(500).json({error:e.message}); }
});
app.get('/api/login-logs', async (req,res) => {
  try { res.json(await query('SELECT * FROM login_logs ORDER BY created_at DESC LIMIT 500')); }
  catch(e){ res.status(500).json({error:e.message}); }
});
app.get('/api/active-sessions', async (req,res) => {
  try { res.json(await query('SELECT * FROM active_sessions ORDER BY last_seen DESC')); }
  catch(e){ res.status(500).json({error:e.message}); }
});

app.post('/api/users', async (req,res) => {
  try {
    const existing=await query('SELECT id FROM users WHERE email=?',[req.body.email]);
    if (existing.length) return res.status(400).json({error:'Email already exists'});
    const role=req.body.role||'student',prefix=role==='teacher'?'T':'S';
    const countRows=await query('SELECT COUNT(*) AS cnt FROM users WHERE role=?',[role]);
    const newId=`${prefix}${String(countRows[0].cnt+1).padStart(3,'0')}`;
    const hashed=hashPw(req.body.password||'student123');
    await query(`INSERT INTO users (id,name,email,password,role,branch,semester,cgpa,attendance,points,department,subject) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [newId,req.body.name,req.body.email,hashed,role,req.body.branch||null,req.body.semester||null,req.body.cgpa||null,req.body.attendance||null,req.body.points||0,req.body.department||null,req.body.subject||null]);
    const rows=await query('SELECT id,name,email,role,branch,semester,cgpa,attendance,points,department,subject FROM users WHERE id=?',[newId]);
    res.json({success:true,user:rows[0]});
  } catch(e){ res.status(500).json({error:e.message}); }
});

app.put('/api/users/:id', async (req,res) => {
  try {
    const updates={...req.body};
    if (updates.password) updates.password=hashPw(updates.password);
    const sets=Object.keys(updates).map(k=>`${k}=?`).join(',');
    const values=[...Object.values(updates),req.params.id];
    await query(`UPDATE users SET ${sets} WHERE id=?`,values);
    const rows=await query('SELECT id,name,email,role,branch,semester,cgpa,attendance,points,department,subject FROM users WHERE id=?',[req.params.id]);
    if (!rows.length) return res.status(404).json({error:'Not found'});
    res.json({success:true,user:rows[0]});
  } catch(e){ res.status(500).json({error:e.message}); }
});

app.delete('/api/users/:id', async (req,res) => {
  try {
    const r=await query('DELETE FROM users WHERE id=?',[req.params.id]);
    if (r.affectedRows===0) return res.status(404).json({error:'Not found'});
    res.json({success:true});
  } catch(e){ res.status(500).json({error:e.message}); }
});

/* ══════════════════════════════════════════════════
   ML PREDICTION
══════════════════════════════════════════════════*/
app.post('/api/predict',(req,res)=>{
  const input={...req.body};
  if (input.cgpa&&!input.previous_scores) input.previous_scores=Math.round(input.cgpa*10);
  if (input.studyHours&&!input.hours_studied) input.hours_studied=input.studyHours;
  const features=encodeFeatures(input),mlScore=predictWithModel(features);
  const hrs=input.hours_studied??6,att=input.attendance??75,prev=input.previous_scores??70;
  const fallback=Math.min(100,Math.max(30,Math.round((hrs/44)*15+(att/100)*20+7/10*8+(prev/100)*35)));
  const score=mlScore??fallback;
  let grade,label,color;
  if(score>=80){grade='A+';label='Excellent';color='#10b981';}
  else if(score>=65){grade='A';label='Good';color='#38bdf8';}
  else if(score>=50){grade='B';label='Average';color='#fbbf24';}
  else if(score>=40){grade='C';label='Below Average';color='#fb923c';}
  else{grade='D';label='At Risk';color='#f43f5e';}
  const similar=DATASET.filter(r=>Math.abs(r.Hours_Studied-hrs)<5&&Math.abs(r.Attendance-att)<10&&Math.abs(r.Previous_Scores-prev)<15).slice(0,5);
  const avgSimilar=similar.length?avg(similar,'Exam_Score'):null;
  const tips=[];
  if(hrs<6) tips.push({factor:'Study Hours',tip:`Studying ${hrs}h/day. Students who study 8+ score ~5pts higher.`});
  if(att<80) tips.push({factor:'Attendance',tip:`${att}% attendance. Above 85% averages 6 more points.`});
  if((input.sleep_hours??7)<7) tips.push({factor:'Sleep',tip:'7-8h sleep improves retention and exam performance.'});
  if((input.tutoring_sessions??1)<2) tips.push({factor:'Tutoring',tip:'2+ sessions/week improve scores by ~4 points.'});
  if(input.motivation_level==='Low') tips.push({factor:'Motivation',tip:'Low motivation students score 8pts below high-motivation peers.'});
  if(!tips.length) tips.push({factor:'Keep it up!',tip:'Strong profile — maintain consistency.'});
  res.json({grade,label,score,color,avgSimilar,similarCount:similar.length,tips,
    model_used:mlScore?'Linear Regression (trained)':'Formula (fallback)',
    model_r2:MODEL?.linear_regression?.metrics?.r2,dataset_size:DATASET.length,
    feature_importance:MODEL?.feature_importance?.slice(0,5)??[]});
});

/* ══════════════════════════════════════════════════
   ANALYTICS
══════════════════════════════════════════════════*/
app.get('/api/dataset',(req,res)=>{
  const p=parseInt(req.query.page||'1'),l=parseInt(req.query.limit||'50'),s=(p-1)*l;
  res.json({total:DATASET.length,page:p,limit:l,pages:Math.ceil(DATASET.length/l),data:DATASET.slice(s,s+l)});
});
app.get('/api/analytics/summary',(req,res)=>{
  const d=DATASET; if(!d.length) return res.json({error:'No data'});
  res.json({total_students:d.length,avg_exam_score:avg(d,'Exam_Score'),avg_hours_studied:avg(d,'Hours_Studied'),avg_attendance:avg(d,'Attendance'),avg_sleep_hours:avg(d,'Sleep_Hours'),avg_previous_scores:avg(d,'Previous_Scores'),avg_tutoring_sessions:avg(d,'Tutoring_Sessions'),avg_physical_activity:avg(d,'Physical_Activity'),score_histogram:histogram(d,'Exam_Score',10),hours_histogram:histogram(d,'Hours_Studied',8),gender_dist:countBy(d,'Gender'),school_type_dist:countBy(d,'School_Type'),parental_involvement:countBy(d,'Parental_Involvement'),access_to_resources:countBy(d,'Access_to_Resources'),motivation_level:countBy(d,'Motivation_Level'),family_income:countBy(d,'Family_Income'),teacher_quality:countBy(d,'Teacher_Quality'),peer_influence:countBy(d,'Peer_Influence'),learning_disabilities:countBy(d,'Learning_Disabilities'),internet_access:countBy(d,'Internet_Access'),extracurricular:countBy(d,'Extracurricular_Activities'),
    score_bands:{'Excellent (80-100)':d.filter(r=>r.Exam_Score>=80).length,'Good (65-79)':d.filter(r=>r.Exam_Score>=65&&r.Exam_Score<80).length,'Average (50-64)':d.filter(r=>r.Exam_Score>=50&&r.Exam_Score<65).length,'At Risk (<50)':d.filter(r=>r.Exam_Score<50).length},
    model_stats:MODEL?{r2:MODEL.linear_regression.metrics.r2,rmse:MODEL.linear_regression.metrics.rmse,trained_at:MODEL.trained_at,feature_importance:MODEL.feature_importance?.slice(0,6)}:null});
});
app.get('/api/analytics/factors',(req,res)=>{
  const d=DATASET,fa=(key,groups)=>groups.map(g=>({group:g,avg_score:avg(d.filter(r=>r[key]===g),'Exam_Score'),count:d.filter(r=>r[key]===g).length}));
  res.json({by_motivation:fa('Motivation_Level',['Low','Medium','High']),by_parental:fa('Parental_Involvement',['Low','Medium','High']),by_resources:fa('Access_to_Resources',['Low','Medium','High']),by_teacher:fa('Teacher_Quality',['Low','Medium','High']),by_peer:fa('Peer_Influence',['Negative','Neutral','Positive']),by_income:fa('Family_Income',['Low','Medium','High']),by_school:fa('School_Type',['Public','Private']),by_internet:fa('Internet_Access',['Yes','No']),by_extracurr:fa('Extracurricular_Activities',['Yes','No']),by_gender:fa('Gender',['Male','Female'])});
});

/* ══════════════════════════════════════════════════
   POINTS
══════════════════════════════════════════════════*/
app.post('/api/points/award', async (req,res)=>{
  const {studentId,points}=req.body;
  try {
    await query('INSERT INTO points_ledger (student_id,points) VALUES (?,?)',[studentId,points]);
    await query('UPDATE users SET points=points+? WHERE id=?',[points,studentId]);
    const rows=await query('SELECT points FROM users WHERE id=?',[studentId]);
    res.json({success:true,total:rows[0]?.points??0});
  } catch(e){ res.status(500).json({error:e.message}); }
});
app.get('/api/points/:studentId', async (req,res)=>{
  try {
    const rows=await query('SELECT points FROM users WHERE id=?',[req.params.studentId]);
    res.json({points:rows[0]?.points??0});
  } catch(e){ res.status(500).json({error:e.message}); }
});

/* ══════════════════════════════════════════════════
   COURSES
══════════════════════════════════════════════════*/
const COURSES=[
  {id:1,title:'Data Structures & Algorithms',branch:'CSE',difficulty:'Intermediate',duration:'40h',youtubeUrl:'https://www.youtube.com/watch?v=8hly31xKli0'},
  {id:2,title:'Machine Learning A-Z',branch:'CSE',difficulty:'Advanced',duration:'50h',youtubeUrl:'https://www.youtube.com/watch?v=jGwO_UgTS7I'},
  {id:3,title:'Full Stack Web Development',branch:'IT',difficulty:'Beginner',duration:'60h',youtubeUrl:'https://www.youtube.com/watch?v=nu_pCVPKzTk'},
  {id:4,title:'Python for Beginners',branch:'CSE',difficulty:'Beginner',duration:'25h',youtubeUrl:'https://www.youtube.com/watch?v=_uQrJ0TkZlc'},
  {id:5,title:'Deep Learning with PyTorch',branch:'CSE',difficulty:'Advanced',duration:'45h',youtubeUrl:'https://www.youtube.com/watch?v=VMj-3S1tku0'},
  {id:6,title:'Statistics & Probability',branch:'DS',difficulty:'Intermediate',duration:'30h',youtubeUrl:'https://www.youtube.com/watch?v=xxpc-HPKN28'},
];
app.get('/api/courses',(req,res)=>res.json(COURSES));

/* ══════════════════════════════════════════════════
   AI PROXY (Gemini)
══════════════════════════════════════════════════*/
function buildLocalAISummary(reqBody={}) {
  const messages=Array.isArray(reqBody.messages)?reqBody.messages:[],system=reqBody.system||'';
  let userContent='';
  const userMsg=messages.find(m=>m&&m.role==='user');
  if(typeof userMsg?.content==='string') userContent=userMsg.content;
  else if(Array.isArray(userMsg?.content)) userContent=userMsg.content.filter(p=>p.type==='text').map(p=>p.text||'').join('\n');
  const prompt=`${system}\n\n${userContent}`;
  const pick=(label,fallback='')=>{ const m=prompt.match(new RegExp(label+':\\s*([^\\n]+)','i')); return m?m[1].replace(/^"|"$/g,'').trim():fallback; };
  const course=pick('Course','this course'),provider=pick('Provider','the provider'),difficulty=pick('Difficulty','Beginner'),duration=pick('Duration','self-paced'),skills=pick('Skills','core concepts, practice, project skills'),category=pick('Category','learning'),careers=pick('Career Paths','placements and project work');
  if(/Course:\s*/i.test(prompt)) return `## What You'll Learn\n- Important ${category} concepts from ${course}.\n- Practical skills such as ${skills}.\n- How to apply the topic through examples and practice.\n- A clear learning path suitable for ${difficulty} level students.\n\n## Who Should Take This\nThis course is useful for students who want to improve their knowledge in ${category}. It is especially helpful if you can spend ${duration} learning consistently.\n\n## Career Impact\nLearning ${course} from ${provider} can support ${careers}.\n\n## Study Tips\n- Watch lessons regularly and take short notes.\n- Practice every important concept with examples.\n- Add one small project or certificate proof after completion.`;
  return 'AI is running in local fallback mode. Add GEMINI_API_KEY in backend/.env and restart backend for full Gemini responses.';
}

app.post('/api/ai/chat', async (req,res)=>{
  const KEY=process.env.GEMINI_API_KEY;
  if(!KEY||KEY.includes('YOUR_')) return res.json({content:[{type:'text',text:buildLocalAISummary(req.body)}],model:'local-fallback',warning:'Gemini API key not set.'});
  try {
    const {messages,system,max_tokens}=req.body;
    const userMsg=messages?.find(m=>m.role==='user');
    let userContent='';
    if(typeof userMsg?.content==='string') userContent=userMsg.content;
    else if(Array.isArray(userMsg?.content)) userContent=userMsg.content.filter(p=>p.type==='text').map(p=>p.text).join('\n');
    const fullPrompt=system?`${system}\n\n${userContent}`:userContent;
    const geminiRes=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${KEY}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:fullPrompt}]}],generationConfig:{maxOutputTokens:max_tokens||1000,temperature:0.7}})});
    const data=await geminiRes.json();
    if(!geminiRes.ok) return res.status(geminiRes.status).json({error:data?.error?.message||'Gemini API error'});
    const text=data?.candidates?.[0]?.content?.parts?.[0]?.text??'';
    res.json({content:[{type:'text',text}],model:'gemini-2.0-flash',usage:{input_tokens:0,output_tokens:0}});
  } catch(e){ console.error('Gemini proxy error:',e.message); res.status(500).json({error:'Gemini proxy error',detail:e.message}); }
});

/* ══════════════════════════════════════════════════
   MODEL INFO + HEALTH
══════════════════════════════════════════════════*/
app.get('/api/model/info',(req,res)=>{
  if(!MODEL) return res.status(404).json({error:'Model not trained. Run: node train-model.js'});
  res.json({version:MODEL.version,trained_at:MODEL.trained_at,dataset_size:MODEL.dataset_size,features:MODEL.features,linear_regression:MODEL.linear_regression.metrics,random_forest:MODEL.random_forest.metrics,feature_importance:MODEL.feature_importance,score_distribution:MODEL.score_distribution,dataset_stats:MODEL.dataset_stats});
});

app.get('/api/health', async (req,res)=>{
  try {
    const [uc]=await query('SELECT COUNT(*) AS cnt FROM users');
    const [sc]=await query("SELECT COUNT(*) AS cnt FROM users WHERE role='student'");
    const [tc]=await query("SELECT COUNT(*) AS cnt FROM users WHERE role='teacher'");
    const [lc]=await query('SELECT COUNT(*) AS cnt FROM login_logs');
    res.json({status:'ok',version:'5.0',database:'MySQL (mysql2)',users:uc.cnt,students:sc.cnt,teachers:tc.cnt,login_logs:lc.cnt,dataset_loaded:DATASET.length,ml_model:MODEL?`Trained (R²=${MODEL.linear_regression.metrics.r2})`:'Not trained',email_configured:transporter!==null});
  } catch(e){ res.status(500).json({status:'error',detail:e.message}); }
});

/* ══════════════════════════════════════════════════
   START
══════════════════════════════════════════════════*/
initDB().then(()=>{
  app.listen(PORT,()=>{
    const gemKey=process.env.GEMINI_API_KEY;
    console.log(`\n🚀 EduPredict v5.0 (MySQL) on port ${PORT}`);
    console.log(`🗄️  DB: ${process.env.DB_HOST||'localhost'}:${process.env.DB_PORT||3306}/${process.env.DB_NAME||'edupredict'}`);
    console.log(`🤖 Gemini AI: ${gemKey&&!gemKey.includes('YOUR_')?'✅ Key loaded ('+gemKey.slice(0,10)+'...)':'❌ Not configured — using local fallback'}`);
    console.log(`🤖 ML Model:  ${MODEL?`Loaded (R²=${MODEL.linear_regression.metrics.r2})`:'Not found — run: node train-model.js'}`);
    console.log(`📧 Email:     ${transporter?SENDER_EMAIL:'Not configured'}\n`);
  });
});
