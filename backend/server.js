const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const USERS = [
  { id:1,  name:'Priya Sharma',      email:'priya@edu.in',      password:'student123', role:'student', branch:'CSE', semester:6, cgpa:8.7, attendance:92, points:1250 },
  { id:2,  name:'Arjun Mehta',       email:'arjun@edu.in',      password:'student123', role:'student', branch:'ECE', semester:4, cgpa:7.2, attendance:78, points:860  },
  { id:3,  name:'Kavya Reddy',       email:'kavya@edu.in',      password:'student123', role:'student', branch:'CSE', semester:8, cgpa:9.1, attendance:96, points:1800 },
  { id:4,  name:'Rohan Verma',       email:'rohan@edu.in',      password:'student123', role:'student', branch:'ME',  semester:2, cgpa:6.4, attendance:65, points:420  },
  { id:5,  name:'Sneha Patel',       email:'sneha@edu.in',      password:'student123', role:'student', branch:'IT',  semester:5, cgpa:7.9, attendance:88, points:980  },
  { id:6,  name:'Rahul Singh',       email:'rahul@edu.in',      password:'student123', role:'student', branch:'CSE', semester:3, cgpa:5.8, attendance:60, points:310  },
  { id:7,  name:'Ananya Iyer',       email:'ananya@edu.in',     password:'student123', role:'student', branch:'ECE', semester:7, cgpa:8.3, attendance:90, points:1100 },
  { id:8,  name:'Vikram Nair',       email:'vikram@edu.in',     password:'student123', role:'student', branch:'CE',  semester:6, cgpa:7.5, attendance:82, points:750  },
  { id:9,  name:'Dr. Rajesh Kumar',  email:'rajesh@faculty.in', password:'teacher123', role:'teacher', branch:'CSE', semester:0, cgpa:0,   attendance:0,  points:0    },
  { id:10, name:'Prof. Anita Desai', email:'anita@faculty.in',  password:'teacher123', role:'teacher', branch:'ECE', semester:0, cgpa:0,   attendance:0,  points:0    },
];

const COURSES = [
  { id:1, title:'Data Structures & Algorithms', branch:'CSE', difficulty:'Intermediate', duration:'40 hours', youtubeUrl:'https://www.youtube.com/watch?v=8hly31xKli0' },
  { id:2, title:'Machine Learning A-Z',          branch:'CSE', difficulty:'Advanced',     duration:'50 hours', youtubeUrl:'https://www.youtube.com/watch?v=jGwO_UgTS7I' },
  { id:3, title:'Full Stack Web Development',    branch:'IT',  difficulty:'Beginner',     duration:'60 hours', youtubeUrl:'https://www.youtube.com/watch?v=nu_pCVPKzTk' },
  { id:4, title:'Python for Beginners',          branch:'CSE', difficulty:'Beginner',     duration:'25 hours', youtubeUrl:'https://www.youtube.com/watch?v=_uQrJ0TkZlc' },
  { id:5, title:'Deep Learning with PyTorch',    branch:'CSE', difficulty:'Advanced',     duration:'45 hours', youtubeUrl:'https://www.youtube.com/watch?v=VMj-3S1tku0' },
  { id:6, title:'AWS Cloud Practitioner',        branch:'IT',  difficulty:'Beginner',     duration:'30 hours', youtubeUrl:'https://www.youtube.com/watch?v=SOTamWNgDKc' },
  { id:7, title:'VLSI Design Fundamentals',      branch:'ECE', difficulty:'Intermediate', duration:'35 hours', youtubeUrl:'https://www.youtube.com/watch?v=6dFnL8JcKMo' },
  { id:8, title:'Digital Signal Processing',     branch:'ECE', difficulty:'Advanced',     duration:'40 hours', youtubeUrl:'https://www.youtube.com/watch?v=aQKX3mrDFoY' },
];

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = USERS.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });
  const { password: _, ...safe } = user;
  res.json({ success: true, user: safe });
});

app.get('/api/students', (req, res) => {
  res.json(USERS.filter(u => u.role === 'student').map(({ password, ...u }) => u));
});

app.get('/api/courses', (req, res) => res.json(COURSES));

app.post('/api/predict', (req, res) => {
  const { cgpa, attendance, studyHours, assignments, stressLevel } = req.body;
  const score = (cgpa/10)*0.40 + (attendance/100)*0.25 + (studyHours/12)*0.20 + (assignments/100)*0.10 - (stressLevel/10)*0.05;
  let grade, label;
  if      (score >= 0.85) { grade = 'A+'; label = 'Excellent'; }
  else if (score >= 0.70) { grade = 'A';  label = 'Good'; }
  else if (score >= 0.55) { grade = 'B';  label = 'Average'; }
  else if (score >= 0.40) { grade = 'C';  label = 'Below Average'; }
  else                    { grade = 'D';  label = 'At Risk'; }
  res.json({ grade, label, score: Math.round(score * 100) });
});

app.post('/api/points/award', (req, res) => {
  const { studentId, points } = req.body;
  const student = USERS.find(u => u.id === studentId);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  student.points += points;
  res.json({ success: true, newTotal: student.points });
});

app.get('/api/leaderboard', (req, res) => {
  res.json(USERS.filter(u => u.role === 'student').map(({ password, ...u }) => u).sort((a, b) => b.points - a.points));
});

app.get('/api/at-risk', (req, res) => {
  res.json(USERS.filter(u => u.role === 'student' && (u.cgpa < 6.5 || u.attendance < 70)).map(({ password, ...u }) => u));
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'EduPredict API is running!' }));

app.listen(PORT, () => {
  console.log('========================================');
  console.log('  EduPredict Backend API');
  console.log('  Running at http://localhost:' + PORT);
  console.log('========================================');
});
