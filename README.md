# student-performance-
A full-stack educational analytics platform powered by machine learning and AI, designed to predict student performance, recommend personalized learning paths, and enable real-time teacher-student engagement.
EduPredict v2 is a comprehensive educational intelligence system built for institutions seeking data-driven insights into student academic performance. The platform leverages 4 ensemble machine learning models to predict student dropout risk, course performance, and learning gaps, while integrating Claude AI for intelligent tutoring and personalized course recommendations. Teachers gain real-time analytics and intervention tools, while students receive AI-powered guidance, gamified learning through a points system, and digital certificates upon course completion.

Outcomes & Impact
* ML Prediction Accuracy — 4 trained models (Random Forest, Gradient Boosting, MLP, Logistic Regression) trained on 2,000+ engineering student records
* Real-time Intervention — Teachers identify at-risk students instantly and award motivational points
* Personalized Learning Paths — AI recommends skill development courses based on student gaps
* Gamification — Points system drives engagement with tier progression (Bronze → Silver → Gold → Platinum)
* Digital Credentials — Auto-generated PDF certificates awarded upon course completion
* Voice-Enabled Tutoring — Claude AI with speech-to-text & text-to-speech (Chrome browser)
* Scalable Architecture — Dockerized backend & frontend, Kubernetes-ready deployment

Technology Stack
Backend

Framework: FastAPI 0.111.0 (async Python web server)
Auth: JWT-based authentication with demo user database
ML Libraries: scikit-learn 1.5.2, NumPy 1.26.4, Pandas 2.2.3
Models: Pre-trained Random Forest, Gradient Boosting, MLP, Logistic Regression (pickled)
AI Integration: Anthropic Claude API (optional — for intelligent chat)
PDF Generation: ReportLab 4.2.2 (certificate generation)
Async Client: HTTPX 0.27.0
Server: Uvicorn with hot reload
Database: In-memory stores (can be upgraded to PostgreSQL)

Frontend

Framework: Next.js 14.2.5 (React 18.3.1 with TypeScript)
Styling: Tailwind CSS 3.4.6 with PostCSS
UI Components: Material-UI (MUI) 5.16.5 + Emotion
Charts: Recharts 2.12.7 & Chart.js 4.4.3
State Management: Zustand 4.5.4
Forms: React Hook Form 7.52.1 + Zod validation
Animations: Framer Motion 11.3.8
Notifications: React Hot Toast 2.4.1
HTTP Client: Axios 1.7.2

Key Features
1. ML-Powered Student Performance Prediction

Ensemble of 4 machine learning models predict student risk levels
Inputs: CGPA, attendance, internship, projects, study hours, Sleep Quality, Physical Activity
Output: Risk Classification (Excellent → At Risk)
Real-time probability scores for intervention planning

2. Intelligent Course Recommendation Engine

Analyzes student skill gaps and academic history
Recommends personalized course pathways
Tracks course completion and auto-awards certificates
25 points bonus per completed course

3. AI-Powered Chat Assistant

Claude API integration for 24/7 tutoring
Voice input ( speak questions) — requires Chrome/Edge
Voice output ( hear responses)
Context-aware replies using student dataset
Chat history persistence

4. Teacher Analytics Dashboard

At-risk student identification with color-coded severity levels
Class-wide performance analytics (graphs & charts)
Student roster management with filterable data
Points allocation interface with 12 predefined activity categories

5. Gamification & Points System

Teacher awards points for: hackathons, projects, certifications, internships, quizzes, workshops, etc.
Students earn tiers: Bronze (0-100) → Silver (100-250) → Gold (250-500) → Platinum (500+)
Visual progress tracking & leaderboard ranking
Real-time WebSocket notifications

6. Digital Certificate Generation

Auto-generated PDF certificates on course completion
Student metadata + course details embedded
Downloadable as PDF file
ATS-compliant design

7. Role-Based Access Control

Student Portal: Dashboard, performance predictor, course enrollment, AI chat, certificate download, leaderboard
Teacher Portal: Class analytics, at-risk student alerts, student roster, points management, real-time notifications

8. Real-time Notifications (WebSocket)

Instant alerts when teachers award points
Push notifications for course completion
Live leaderboard updates

9. Multi-Model Ensemble Predictions

Random Forest: Robust non-linear patterns
Gradient Boosting: Sequential error correction
MLP (Neural Network): Deep pattern recognition
Logistic Regression: Probabilistic baseline

10. Responsive UI with Modern Design

Mobile-friendly Tailwind CSS design
Smooth animations (Framer Motion)
Dark mode support
Real-time chart updates (Recharts)


Data Model
Student Record (from CSV)

Demographics: ID, Name, Email, Branch, Semester, Graduation Year
Academics: CGPA, Attendance Rate, GPA Trend
Performance: Internship Status, Projects Count, Research Papers
Lifestyle: Sleep Quality, Physical Activity, Social Activities
Target: Dropout Risk (Yes/No)

Machine Learning Features

13+ numerical features (CGPA, hours studied, sleep quality, etc.)
Label-encoded categorical features (branch, region)
StandardScaler normalized (mean=0, std=1)


 Voice Assistant Guide

Navigate to Student Dashboard → Chat tab
Click  Mic Button to speak your question
Claude AI processes & responds
Toggle Voice On to hear responses (speech synthesis)
Requires Google Chrome or Microsoft Edge browser



Role: Project Lead / Team Lead

As the Project Lead, I was responsible for planning, coordinating, and supervising the overall development of the Student Performance Prediction and Course Recommendation System. I ensured smooth collaboration among team members and maintained progress according to project timelines.

Responsibilities
Led the overall project planning and task distribution among team members
Designed the project workflow and system architecture
Coordinated frontend and backend integration
Supervised development of the Random Forest machine learning model
Managed backend development using Flask
Reviewed code and ensured proper implementation of features
Identified and resolved technical issues during development
Monitored project progress and ensured timely completion
Ensured proper documentation and repository management on GitHub
Guided team members in debugging and improving code quality    

AIML Engineer Role

As an AI/ML Engineer, I was responsible for designing, developing, and implementing the machine learning components of the Student Performance Prediction and Course Recommendation System. I worked on data preprocessing, model training, testing, and integration of the machine learning model with the backend to generate accurate predictions and recommendations.

Responsibilities
Collected and analyzed student academic data for model development
Performed data preprocessing such as handling missing values and formatting datasets
Selected important features influencing student performance
Implemented the Random Forest algorithm for performance prediction
Trained and tested the machine learning model using real dataset samples
Evaluated model accuracy using performance metrics
Improved model performance through parameter tuning
Integrated the trained model with the Flask backend
Generated prediction results based on user input data
Assisted in debugging and improving model efficiency
Documented the machine learning workflow and results   

Literature Survey & Analysis

As part of this project, I conducted a comprehensive literature survey for both the Student Performance Prediction System and the Course Recommendation System.

Objectives
Understand existing research and methodologies in student performance prediction
Analyze recommendation techniques used in course recommendation systems
Identify gaps and limitations in current approaches
Work Done
Reviewed research papers, journals, and online resources on:
Student performance prediction using Machine Learning
Course recommendation systems based on user behavior and academic data
Studied key algorithms:
Regression Models
Classification Techniques
Collaborative Filtering
Content-Based Recommendation
Compared models based on:
Accuracy
Efficiency
Scalability
Key Insights
Models like Decision Trees, Random Forest, and Linear Regression are widely used for prediction
Recommendation systems improve personalized learning paths
Data quality and feature selection significantly impact model performance
Outcome
Identified suitable approaches for building an efficient prediction and recommendation system
Established a strong foundation for model selection, feature engineering, and system design


As the Documentation Lead, I was responsible for preparing, organizing, and maintaining all project-related documents for the Student Performance Prediction and Personalized Course Recommendation System. I ensured that all technical and non-technical aspects of the project were clearly documented and aligned with project requirements.

Responsibilities

Prepared and maintained project documentation including:

Literature Review
Problem Statement
System Design
Methodology
Results and Analysis
Collected and structured information from research papers and technical resources for the literature survey
Created Research Paper Summary Tables, Technology Analysis, and Gap Analysis
Documented machine learning models used in the project such as:
Random Forest
XGBoost
Logistic Regression
Prepared system architecture diagrams and workflow explanations
Assisted in writing project report (VTU format) and ensured proper formatting
Maintained proper version control documentation using GitHub
Created PPT content for presentation, including:
Literature Survey
Problem Statement
Proposed System
Results
Ensured clarity and consistency in all documents for easy understanding
Designed and maintained standard document templates for consistency (report, PPT, tables)
Ensured proper formatting, headings, numbering, and alignment as per academic guidelines
Prepared flowcharts, block diagrams, and system architecture descriptions
Documented data preprocessing steps (handling missing values, encoding, normalization)
Explained model training process step-by-step in simple terms
Created tables and charts for:
Accuracy comparison
Model performance
Dataset features
Documented evaluation metrics such as:
Accuracy
Precision
Recall
F1-score
Maintained daily internship / project journal entries
Organized reference links and citations for all research papers
Ensured proper plagiarism-free content writing
Coordinated with team members to collect technical updates and progress reports
Updated documentation based on feedback from guide/mentor
Maintained backup of all documents and versions

Key Contributions

Developed a complete literature review section by analyzing multiple research papers
Identified research gaps and helped define the project problem
Structured the final project report professionally
Prepared presentation-ready content for seminar and viva
Simplified complex technical concepts into easy explanations
Converted complex ML concepts into easy-to-understand explanations for presentation
Prepared comparison between algorithms (Random Forest vs XGBoost etc.)
Created gap analysis and problem justification for project approval
Helped align project implementation with research papers
Supported debugging documentation (noting errors and solutions)
Documented API endpoints and system flow (frontend ↔ backend)
Contributed to final result analysis and interpretation

Skills Used

Technical Writing
Research Analysis
Documentation & Reporting
MS Word / LaTeX / PPT
Data Interpretation
Communication Skills
Analytical Thinking
Attention to Detail
Structured Writing
Research Interpretation
Data Presentation Skills
Technical Simplification
Time Management
