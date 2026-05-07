# EduPredict – Student Performance Prediction & Course Recommendation System

EduPredict is an AI-powered student intelligence platform that helps predict student performance, recommend suitable courses, and support students with smart learning features.

---

## Project Overview

This project was developed in different stages, from a basic prediction system to an advanced AI-based education platform.

Initially, the project focused on predicting student performance using academic data such as attendance, marks, study hours, and previous results.

Later, it was enhanced with a course recommendation system to suggest useful courses based on student skills, interests, and performance.

In the current advanced version, the platform includes AI assistant features, course summaries, notifications, dashboards, points, certificates, and teacher/student portals.

---

##  Project Evolution

###  Basic Version – Student Performance Prediction

In the basic version, the system predicts student performance using machine learning.

#### Features
- Student performance prediction
- Attendance and marks analysis
- Risk identification
- Basic student dashboard
- Teacher monitoring support

#### Machine Learning Models
- Logistic Regression
- Decision Tree
- Random Forest
- Gradient Boosting

---

### Enhanced Version – Course Recommendation System

In this version, course recommendation features were added.

#### Features
- Personalized course recommendations
- Skill-based learning suggestions
- Course library
- Watchlist option
- In-progress and completed course tracking
- YouTube course integration

#### Recommendation Based On
- Student branch
- Skill level
- Course difficulty
- Career path
- Student performance

---

### Advanced Version – AI-Powered Smart Education Platform

The current version includes advanced features to make the system more interactive and intelligent.

#### Advanced Features
- AI course summary
- AI academic assistant
- Real-time notifications
- Student dashboard
- Teacher dashboard
- Course progress tracking
- Points and achievement system
- Leaderboard
- Assignment section
- Certificate generation
- Login system
- Performance analytics
- Student risk prediction

---

## Machine Learning Module

The ML model is trained using student academic data.

### Dataset Features
- Attendance
- Study hours
- Previous scores
- Assignment marks
- Participation
- Internet access
- Sleep hours
- Tutoring sessions
- Exam score

### Output
The system predicts student performance and helps identify students who may need academic support.

---

##  Trained Model Details

The project includes trained ML model files.

### Model Files
```txt
backend/ml/student_score_regressor.joblib
backend/ml/student_performance_classifier.joblib
backend/ml/model_metrics.json
backend/ml/train_model.py
backend/ml/predict_with_model.py
## Tech 

Frontend

* React
* TypeScript
* Vite
* Tailwind CSS

Backend

* Python
* FastAPI
* Uvicorn

Machine Learning

* Scikit-learn
* Random Forest
* Gradient Boosting
* Logistic Regression
* MLP Neural Network

Database / Storage

* JSON Database
* CSV Dataset Storage
* Browser LocalStorage

DevOps / Deployment

* Docker
* kubernetes
* MLflow (experiment tracking)

AI Integration

* Anthropic Claude API (optional AI chat)
## Installation

* Clone the repository:

  git clone https://github.com/https://github.com/sharanabasavamalipatil/student-performance-/edupredict.git

* Navigate to the project folder:

  cd edupredict

* Install backend dependencies:

  cd backend
  pip install -r requirements.txt

* Install frontend dependencies:

  cd ../frontend
  npm install

* Run Machine Learning Model

cd backend
pip install -r requirements-ml.txt
python ml/train_model.py

## Environment Variables
---

Create a `.env` file inside the **backend folder**.

Example:

```
ANTHROPIC_API_KEY=your_api_key
JWT_SECRET=secure_secret_key
DATABASE_URL=postgresql://user:password@localhost:5432/edupredict
REDIS_URL=redis://localhost:6379
```

| Variable          | Description                    |
| ----------------- | ------------------------------ |
| ANTHROPIC_API_KEY | API key for Claude AI chatbot  |
| JWT_SECRET        | Secret key for authentication  |
| DATABASE_URL      | PostgreSQL database connection |
| REDIS_URL         | Redis caching service          |

---

   
## Run Locally

* Run backend:

  cd backend
  uvicorn main:app --reload

* Backend runs at:

  http://localhost:8000

* API documentation:

  http://localhost:8000/docs

* Run frontend:

  cd frontend
  npm run dev

* Frontend runs at:

  http://localhost:5173

## Deployment

* Docker Deployment
  docker-compose up --build


* Cloud Platforms

Supported deployment platforms:

* AWS
* Azure
* Google Cloud
* Render
* Vercel (Frontend)
## Usage / Examples

workflow:

1. Student logs into the platform.
2. System collects academic metrics.
3. ML model predicts student performance.
4. Dashboard shows performance analytics.
5. AI assistant provides learning suggestions.
6. Student enrolls in recommended courses.
7. Teachers monitor and award points.

Example prediction input:

{
  "attendance": 75,
  "study_hours": 4,
  "assignments_completed": 8,
  "participation": 3
}

Example response:

{
  "prediction": "At Risk",
  "confidence": 0.84
}
## API Reference

* Login

 POST /api/auth/login

* Predict Performance

 POST /api/predict

* AI Chat Assistant

 POST /api/chat

* Course Enrollment

 POST /api/courses/enroll

* Course Completion

 POST /api/courses/complete

* Fetch Certificates

 GET /api/certificates

* Download Certificate

 GET /api/certificates/{id}/download

* Award Student Points

 POST /api/students/{id}/points
##  Running Tests

* Run backend tests:

  pytest

* Run frontend tests:

  npm test
## 12. Lessons

* Designing full-stack AI applications
* Implementing machine learning pipelines
* Creating scalable REST APIs using FastAPI
* Building interactive dashboards with React
* Managing environment variables securely
* Integrating AI APIs with web systems
* Deploying applications with Docker 
##  Documentation


* API documentation available at:

http://localhost:8000/docs

* Additional documentation includes:

 System architecture
 Machine learning model workflow
 Deployment configuration
## Roadmap

* Mobile application
* Deep learning prediction models
* Advanced student analytics
* LMS integration
* Automated intervention system
* Real-time academic monitoring
##  FAQ



1. What dataset is used?

  A synthetic dataset of 2000 students generated using Scikit-learn.

2. Can the system scale for institutions?

  Yes, it supports Docker and Kubernetes deployment.
## Appendix

* Dataset structure
* Feature engineering methods
* Model evaluation metrics
## Acknowledgements

 Libraries and tools used:

* FastAPI
* React
* Tailwind CSS
* Scikit-learn
* MLflow
* Anthropic Claude API
## Authors

* Sushma M
* ShashiRekha Y
* SharanaBasava Malipatil
* Abhishek Rathod
* Bhavana 
## GitHub Profile

https://github.com/sushmasunitha

https://github.com/sharanabasavamalipatil

https://github.com/shashirekhacserymec-pixel

https://github.com/Spideyabhiii

https://github.com/BHAVANAMN2609
## Feedback

If you have suggestions or find issues:

* Open a GitHub issue
* Submit a pull request
* Contact via GitHub profile
