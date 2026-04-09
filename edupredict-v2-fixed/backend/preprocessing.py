"""
preprocessing.py — Feature engineering for Student Performance Predictor
Features: academics + lifestyle + wellness + skills + activities
"""
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
import os

FEATURE_COLS = [
    # Core academic
    'semester', 'cgpa', 'prev_semester_cgpa', 'cgpa_trend',
    'attendance_percent', 'study_hours_per_day', 'backlogs',
    # Lifestyle
    'sleep_hours_per_day', 'stress_level', 'library_visits_per_week', 'part_time_job',
    # Activities
    'internships_completed', 'projects_completed', 'certifications',
    'hackathons_participated', 'extracurricular_activities',
    # Skills
    'programming_score', 'math_score', 'circuits_score',
    'mechanics_score', 'design_score', 'communication_score', 'critical_thinking_score',
    # Encodings
    'branch_encoded', 'gender_encoded', 'learning_style_encoded', 'family_income_encoded',
    # Composites
    'activity_score', 'academic_pressure_index',
    'skill_diversity_score', 'avg_skill_score',
    'wellness_score', 'sleep_quality_index',
]

BRANCH_LIST  = ['Aerospace','Biomedical','Chemical','Civil','Computer Science',
                'Data Science','Electrical','Electronics & Communication',
                'Information Technology','Mechanical']
GENDER_LIST  = ['Female','Male','Other']
LEARN_LIST   = ['Auditory','Kinesthetic','Reading/Writing','Visual']
INCOME_LIST  = ['10–20 LPA','3–6 LPA','6–10 LPA','< 3 LPA','> 20 LPA']


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    skill_cols = ['programming_score','math_score','circuits_score','mechanics_score',
                  'design_score','communication_score','critical_thinking_score']
    existing = [c for c in skill_cols if c in df.columns]
    df['avg_skill_score']      = df[existing].mean(axis=1)
    df['skill_diversity_score'] = df[existing].std(axis=1)

    prev = df.get('prev_semester_cgpa', df['cgpa'])
    df['cgpa_trend'] = df['cgpa'] - prev

    df['activity_score'] = (
        df.get('internships_completed', 0) * 3.5 +
        df.get('projects_completed', 0) * 2.5 +
        df.get('certifications', 0) * 1.5 +
        df.get('hackathons_participated', 0) * 2.0 +
        df.get('extracurricular_activities', 0) * 1.0 +
        df.get('library_visits_per_week', 0) * 0.5
    )
    df['academic_pressure_index'] = (
        df.get('backlogs', 0) * 2.5 +
        (10 - df['cgpa']) * 1.5 +
        (100 - df.get('attendance_percent', 80)) * 0.06 +
        df.get('stress_level', 3) * 1.2
    )
    sleep = df.get('sleep_hours_per_day', 7)
    stress = df.get('stress_level', 3)
    df['sleep_quality_index'] = -(abs(sleep - 7) * 2)
    df['wellness_score'] = df['sleep_quality_index'] - (stress - 1) * 1.5

    for col, lst in [('branch', BRANCH_LIST), ('gender', GENDER_LIST),
                     ('learning_style', LEARN_LIST), ('family_income', INCOME_LIST)]:
        enc = LabelEncoder()
        enc.classes_ = np.array(lst)
        out = col + '_encoded'
        if col in df.columns:
            vals = df[col].apply(lambda x: x if x in lst else lst[0])
            df[out] = enc.transform(vals)
        else:
            df[out] = 0
    return df


def preprocess_for_training(df: pd.DataFrame):
    df = engineer_features(df)
    X = df[FEATURE_COLS]
    y = df['performance_label']
    return X, y


def preprocess_single_student(data: dict) -> np.ndarray:
    skill_cols = ['programming_score','math_score','circuits_score','mechanics_score',
                  'design_score','communication_score','critical_thinking_score']
    skill_vals = [data.get(c, 50) for c in skill_cols]

    cgpa       = data.get('cgpa', 7.0)
    prev_cgpa  = data.get('prev_semester_cgpa', cgpa)
    sleep      = data.get('sleep_hours_per_day', 7)
    stress     = data.get('stress_level', 3)

    activity_score = (
        data.get('internships_completed', 0) * 3.5 +
        data.get('projects_completed', 0) * 2.5 +
        data.get('certifications', 0) * 1.5 +
        data.get('hackathons_participated', 0) * 2.0 +
        data.get('extracurricular_activities', 0) * 1.0 +
        data.get('library_visits_per_week', 0) * 0.5
    )
    academic_pressure = (
        data.get('backlogs', 0) * 2.5 +
        (10 - cgpa) * 1.5 +
        (100 - data.get('attendance_percent', 80)) * 0.06 +
        stress * 1.2
    )
    sleep_qi  = -(abs(sleep - 7) * 2)
    wellness  = sleep_qi - (stress - 1) * 1.5

    def enc(val, lst):
        try: return list(lst).index(str(val))
        except: return 0

    features = [
        data.get('semester', 4), cgpa, prev_cgpa, cgpa - prev_cgpa,
        data.get('attendance_percent', 80), data.get('study_hours_per_day', 5),
        data.get('backlogs', 0), sleep, stress,
        data.get('library_visits_per_week', 2), int(data.get('part_time_job', 0)),
        data.get('internships_completed', 0), data.get('projects_completed', 0),
        data.get('certifications', 0), data.get('hackathons_participated', 0),
        data.get('extracurricular_activities', 0),
        data.get('programming_score', 50), data.get('math_score', 50),
        data.get('circuits_score', 50), data.get('mechanics_score', 50),
        data.get('design_score', 50), data.get('communication_score', 50),
        data.get('critical_thinking_score', 50),
        enc(data.get('branch','Computer Science'), BRANCH_LIST),
        enc(data.get('gender','Male'), GENDER_LIST),
        enc(data.get('learning_style','Visual'), LEARN_LIST),
        enc(data.get('family_income','6–10 LPA'), INCOME_LIST),
        activity_score, academic_pressure,
        float(np.std(skill_vals)), float(np.mean(skill_vals)),
        wellness, sleep_qi,
    ]
    return np.array(features, dtype=float).reshape(1, -1)
