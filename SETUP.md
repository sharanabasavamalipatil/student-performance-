# EduPredict v5.0 — MySQL Setup Guide

## What Changed
- **Database**: Replaced lowdb (JSON file) with **MySQL** via `mysql2`
- **Fix**: Resolves "Cannot connect to server. Make sure the backend is running on port 5000"
- All data (users, login logs, sessions, points) now stored in MySQL

---

## Step 1 — Install MySQL

If MySQL is not installed:
- **Windows**: Download from https://dev.mysql.com/downloads/installer/
- **Ubuntu/WSL**: `sudo apt install mysql-server && sudo service mysql start`
- **macOS**: `brew install mysql && brew services start mysql`

---

## Step 2 — Create the Database

Open MySQL shell and run the setup script:

```bash
mysql -u root -p < backend/edupredict_setup.sql
```

This creates the `edupredict` database with all tables and seeds the 8 default users.

**Default Credentials:**
| User | Email | Password |
|------|-------|----------|
| Sushma M (Student) | sushma.cse.rymec99@gmail.com | student123 |
| Sharana (Student) | sharana.cse.rymec44@gmail.com | student123 |
| Shashi Rekha (Student) | shashirekha.cse.rymec@gmail.com | student123 |
| Abhishek (Student) | abhishek.rymec@gmail.com | student123 |
| Bhavana (Student) | bhavana.rymec@gmail.com | student123 |
| Harsha (Teacher) | harsha.faculty.rymec@gmail.com | teacher123 |
| Abhinandan (Teacher) | abhinandan.faculty.rymec@gmail.com | teacher123 |
| Hafsa (Teacher) | hafsa.faculty.rymec@gmail.com | teacher123 |

---

## Step 3 — Configure .env

Edit `backend/.env` and fill in your MySQL password:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=YOUR_MYSQL_PASSWORD   ← change this
DB_NAME=edupredict

# Optional — Gmail App Password for login notifications
SENDER_EMAIL=sushma.cse.rymec99@gmail.com
SENDER_PASS=tzfyhfwbpajwlypo

# Optional — Free Gemini key from aistudio.google.com
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
```

---

## Step 4 — Install Dependencies & Start Backend

```bash
cd backend
npm install          # installs mysql2 and all other deps
node server.js       # start backend on port 5000
```

You should see:
```
✅ MySQL connected → localhost:3306/edupredict
🚀 EduPredict v5.0 (MySQL) on port 5000
```

---

## Step 5 — Start Frontend

```bash
cd frontend
npm install
npm run dev          # starts Vite on port 5173 or 5174
```

Open http://localhost:5173 and log in!

---

## MySQL Tables Created

| Table | Description |
|-------|-------------|
| `users` | Students and teachers with bcrypt passwords |
| `login_logs` | Every login event |
| `active_sessions` | Latest session per user |
| `points_ledger` | Point award history |

---

## Troubleshooting

**"Cannot connect to server"** → Backend isn't running. Run `node server.js` in the `backend/` folder.

**"MySQL connection FAILED"** → Check your `DB_PASS` in `.env`, and make sure MySQL service is running.

**"Access denied for user 'root'"** → Run MySQL as: `mysql -u root -p` and set a password, or use a different MySQL user.

**Port conflict** → If MySQL is on a different port, change `DB_PORT` in `.env`.
