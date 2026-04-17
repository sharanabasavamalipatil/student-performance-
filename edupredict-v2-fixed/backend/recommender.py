"""
recommender.py v3.1 — Hybrid recommendation engine
Uses: branch match + semester fit + CGPA + skill gaps + career_goal + primary_interest + learning_style
"""
from typing import List, Dict, Any

ENGINEERING_COURSES = {
    # ── COMPUTER SCIENCE ──────────────────────────────────────────────────────
    "CS101": {"name":"Data Structures & Algorithms","branch":["Computer Science","Information Technology","Data Science"],"semester_min":2,"semester_max":6,"difficulty":"intermediate","skills_required":{"programming_score":50,"math_score":45},"skills_improved":["programming_score","math_score"],"category":"Core CS","credits":4,"description":"Advanced problem solving, time-space complexity, trees, graphs, dynamic programming.","career_paths":["Software Engineer","Competitive Programmer","Backend Developer"],"prereq_cgpa":5.5,"career_tags":["Software Engineer","Full Stack Developer","ML Engineer"],"interest_tags":["AI/ML","Web Development"]},
    "CS102": {"name":"Machine Learning & AI","branch":["Computer Science","Data Science","Information Technology","Electronics & Communication"],"semester_min":5,"semester_max":8,"difficulty":"advanced","skills_required":{"programming_score":65,"math_score":70},"skills_improved":["programming_score","math_score"],"category":"AI/ML","credits":4,"description":"Supervised/unsupervised learning, neural networks, model evaluation, real-world projects.","career_paths":["ML Engineer","Data Scientist","AI Researcher"],"prereq_cgpa":6.5,"career_tags":["ML Engineer","AI Researcher","Data Scientist"],"interest_tags":["AI/ML","Statistics"]},
    "CS103": {"name":"Cloud Computing & DevOps","branch":["Computer Science","Information Technology","Data Science"],"semester_min":5,"semester_max":8,"difficulty":"intermediate","skills_required":{"programming_score":55},"skills_improved":["programming_score","design_score"],"category":"Infrastructure","credits":3,"description":"AWS/GCP/Azure, CI/CD pipelines, containerization with Docker & Kubernetes.","career_paths":["DevOps Engineer","Cloud Architect","SRE"],"prereq_cgpa":5.5,"career_tags":["DevOps Engineer","API Engineer","Full Stack Developer"],"interest_tags":["Cloud Computing","DevOps"]},
    "CS104": {"name":"Cybersecurity & Ethical Hacking","branch":["Computer Science","Information Technology","Electronics & Communication"],"semester_min":4,"semester_max":8,"difficulty":"advanced","skills_required":{"programming_score":60,"circuits_score":40},"skills_improved":["programming_score","circuits_score"],"category":"Security","credits":3,"description":"Network security, penetration testing, cryptography, SOC analysis.","career_paths":["Security Engineer","Ethical Hacker","SOC Analyst"],"prereq_cgpa":6.0,"career_tags":["Cybersecurity Analyst"],"interest_tags":["Cybersecurity","Security"]},
    "CS105": {"name":"Deep Learning & Computer Vision","branch":["Computer Science","Data Science","Biomedical"],"semester_min":6,"semester_max":8,"difficulty":"advanced","skills_required":{"programming_score":70,"math_score":75},"skills_improved":["programming_score","math_score"],"category":"AI/ML","credits":4,"description":"CNNs, RNNs, Transformers, object detection, image segmentation.","career_paths":["Computer Vision Engineer","Deep Learning Researcher"],"prereq_cgpa":7.0,"career_tags":["ML Engineer","AI Researcher","Bioinformatics Scientist"],"interest_tags":["AI/ML","Genomics","Medical Imaging"]},
    "CS106": {"name":"Blockchain & Distributed Systems","branch":["Computer Science","Information Technology"],"semester_min":5,"semester_max":8,"difficulty":"advanced","skills_required":{"programming_score":65,"math_score":60},"skills_improved":["programming_score"],"category":"Emerging Tech","credits":3,"description":"Smart contracts, consensus algorithms, DeFi, distributed ledger technology.","career_paths":["Blockchain Developer","Web3 Engineer"],"prereq_cgpa":6.5,"career_tags":["Software Engineer","API Engineer"],"interest_tags":["Web Development","Finance Analytics"]},
    "CS107": {"name":"Natural Language Processing","branch":["Computer Science","Data Science","Information Technology"],"semester_min":6,"semester_max":8,"difficulty":"advanced","skills_required":{"programming_score":70,"math_score":65,"critical_thinking_score":60},"skills_improved":["programming_score","math_score","critical_thinking_score"],"category":"AI/ML","credits":4,"description":"Text preprocessing, transformers, BERT, GPT, sentiment analysis, chatbots.","career_paths":["NLP Engineer","AI Researcher","Data Scientist"],"prereq_cgpa":7.0,"career_tags":["ML Engineer","AI Researcher","Data Scientist"],"interest_tags":["AI/ML","Healthcare Analytics"]},

    # ── DATA SCIENCE ──────────────────────────────────────────────────────────
    "DS101": {"name":"Big Data Analytics & Spark","branch":["Data Science","Computer Science","Information Technology"],"semester_min":5,"semester_max":8,"difficulty":"advanced","skills_required":{"programming_score":65,"math_score":60},"skills_improved":["programming_score","math_score"],"category":"Big Data","credits":4,"description":"Hadoop ecosystem, Apache Spark, Kafka, real-time data pipelines.","career_paths":["Data Engineer","Big Data Architect","Analytics Engineer"],"prereq_cgpa":6.5,"career_tags":["Data Scientist","BI Engineer","Data Analyst"],"interest_tags":["Statistics","Finance Analytics"]},
    "DS102": {"name":"Statistical Learning & Probabilistic Models","branch":["Data Science","Computer Science","Biomedical","Chemical"],"semester_min":4,"semester_max":7,"difficulty":"intermediate","skills_required":{"math_score":65},"skills_improved":["math_score","critical_thinking_score"],"category":"Statistics","credits":3,"description":"Bayesian inference, hypothesis testing, regression, time series forecasting.","career_paths":["Data Analyst","Quantitative Analyst","Research Scientist"],"prereq_cgpa":6.0,"career_tags":["Data Analyst","Quant Analyst","Bioinformatics Scientist"],"interest_tags":["Statistics","Finance Analytics","Healthcare Analytics"]},
    "DS103": {"name":"Data Visualization & BI Tools","branch":["Data Science","Computer Science","Information Technology"],"semester_min":3,"semester_max":7,"difficulty":"intermediate","skills_required":{"programming_score":45,"design_score":40},"skills_improved":["design_score","communication_score"],"category":"Analytics","credits":3,"description":"Tableau, Power BI, D3.js, storytelling with data, dashboard design.","career_paths":["BI Engineer","Data Analyst","Product Analyst"],"prereq_cgpa":5.5,"career_tags":["BI Engineer","Data Analyst","Product Manager"],"interest_tags":["Statistics","Finance Analytics"]},
    "DS104": {"name":"Feature Engineering & Model Deployment","branch":["Data Science","Computer Science"],"semester_min":6,"semester_max":8,"difficulty":"advanced","skills_required":{"programming_score":70,"math_score":65},"skills_improved":["programming_score","critical_thinking_score"],"category":"AI/ML","credits":4,"description":"Feature selection, MLflow, FastAPI serving, model monitoring, A/B testing.","career_paths":["ML Engineer","Data Scientist","MLOps Engineer"],"prereq_cgpa":7.0,"career_tags":["ML Engineer","Data Scientist","AI Researcher"],"interest_tags":["AI/ML","Healthcare Analytics"]},

    # ── ELECTRONICS & COMMUNICATION ───────────────────────────────────────────
    "EC101": {"name":"VLSI Design & Verification","branch":["Electronics & Communication","Electrical"],"semester_min":5,"semester_max":8,"difficulty":"advanced","skills_required":{"circuits_score":65,"math_score":60},"skills_improved":["circuits_score","design_score"],"category":"VLSI","credits":4,"description":"RTL design, simulation, synthesis, physical design using Cadence/Synopsys.","career_paths":["VLSI Engineer","Chip Designer","EDA Engineer"],"prereq_cgpa":6.0,"career_tags":["VLSI Engineer","Embedded Engineer"],"interest_tags":["VLSI Design","5G Networks"]},
    "EC102": {"name":"IoT & Embedded Systems","branch":["Electronics & Communication","Electrical","Computer Science","Mechanical"],"semester_min":4,"semester_max":8,"difficulty":"intermediate","skills_required":{"circuits_score":55,"programming_score":45},"skills_improved":["circuits_score","programming_score"],"category":"Embedded","credits":3,"description":"Microcontrollers, RTOS, sensor integration, edge computing, IoT protocols.","career_paths":["Embedded Systems Engineer","IoT Developer","Firmware Engineer"],"prereq_cgpa":5.5,"career_tags":["Embedded Engineer","RF Engineer","Robotics Engineer"],"interest_tags":["IoT","Robotics","5G Networks"]},
    "EC103": {"name":"Digital Signal Processing","branch":["Electronics & Communication","Electrical","Biomedical"],"semester_min":4,"semester_max":7,"difficulty":"intermediate","skills_required":{"math_score":65,"circuits_score":55},"skills_improved":["math_score","circuits_score"],"category":"Signal Processing","credits":4,"description":"Z-transforms, FFT, filter design, adaptive filtering, spectral analysis.","career_paths":["Signal Processing Engineer","Audio Engineer","Telecom Engineer"],"prereq_cgpa":6.0,"career_tags":["Signal Processing Engineer","RF Engineer","VLSI Engineer"],"interest_tags":["Signal Processing","5G Networks"]},
    "EC104": {"name":"5G & Advanced Communication Systems","branch":["Electronics & Communication","Electrical"],"semester_min":6,"semester_max":8,"difficulty":"advanced","skills_required":{"circuits_score":65,"math_score":70},"skills_improved":["circuits_score","math_score"],"category":"Communication","credits":4,"description":"OFDM, MIMO, beamforming, network slicing, 5G NR standards.","career_paths":["RF Engineer","Telecom Engineer","Network Architect"],"prereq_cgpa":6.5,"career_tags":["RF Engineer","Telecom Engineer","Signal Processing Engineer"],"interest_tags":["5G Networks","Signal Processing","VLSI Design"]},

    # ── MECHANICAL ────────────────────────────────────────────────────────────
    "ME101": {"name":"Finite Element Analysis & Simulation","branch":["Mechanical","Civil","Aerospace"],"semester_min":5,"semester_max":8,"difficulty":"advanced","skills_required":{"mechanics_score":60,"math_score":60},"skills_improved":["mechanics_score","math_score"],"category":"Simulation","credits":4,"description":"FEA theory, ANSYS/ABAQUS, structural analysis, thermal simulation.","career_paths":["FEA Engineer","Simulation Engineer","Product Engineer"],"prereq_cgpa":6.0,"career_tags":["Design Engineer","CFD Engineer","R&D Engineer"],"interest_tags":["Simulation","Automotive","Aerospace"]},
    "ME102": {"name":"Robotics & Automation","branch":["Mechanical","Electronics & Communication","Electrical","Computer Science"],"semester_min":5,"semester_max":8,"difficulty":"advanced","skills_required":{"mechanics_score":55,"programming_score":45},"skills_improved":["mechanics_score","programming_score"],"category":"Robotics","credits":4,"description":"Robot kinematics, ROS, path planning, industrial automation, cobots.","career_paths":["Robotics Engineer","Automation Engineer","R&D Engineer"],"prereq_cgpa":6.0,"career_tags":["Robotics Engineer","Manufacturing Engineer","R&D Engineer"],"interest_tags":["Robotics","Automotive","3D Printing"]},
    "ME103": {"name":"Additive Manufacturing & 3D Printing","branch":["Mechanical","Aerospace","Biomedical","Civil"],"semester_min":4,"semester_max":8,"difficulty":"intermediate","skills_required":{"mechanics_score":50,"design_score":50},"skills_improved":["mechanics_score","design_score"],"category":"Manufacturing","credits":3,"description":"FDM, SLA, SLS technologies, material science, design for additive manufacturing.","career_paths":["Manufacturing Engineer","Product Designer","R&D Engineer"],"prereq_cgpa":5.5,"career_tags":["Manufacturing Engineer","Design Engineer","R&D Engineer"],"interest_tags":["3D Printing","Automotive","Aerospace"]},
    "ME104": {"name":"Product Design & CAD/CAM","branch":["Mechanical","Civil","Aerospace"],"semester_min":3,"semester_max":7,"difficulty":"intermediate","skills_required":{"design_score":50,"mechanics_score":45},"skills_improved":["design_score","mechanics_score"],"category":"Design","credits":3,"description":"SolidWorks, CATIA, GD&T, design for manufacturing, tolerance analysis.","career_paths":["Design Engineer","Product Engineer","Manufacturing Engineer"],"prereq_cgpa":5.5,"career_tags":["Design Engineer","CFD Engineer","Manufacturing Engineer"],"interest_tags":["Simulation","Automotive","3D Printing"]},

    # ── CIVIL ─────────────────────────────────────────────────────────────────
    "CV101": {"name":"Building Information Modeling (BIM)","branch":["Civil"],"semester_min":4,"semester_max":8,"difficulty":"intermediate","skills_required":{"design_score":50,"mechanics_score":45},"skills_improved":["design_score","communication_score"],"category":"Design","credits":3,"description":"Revit, AutoCAD, clash detection, 4D scheduling, smart building design.","career_paths":["BIM Manager","Structural Engineer","Project Manager"],"prereq_cgpa":5.5,"career_tags":["BIM Manager","Project Manager","Urban Planner"],"interest_tags":["Smart Cities","Structural Design","Construction Tech"]},
    "CV102": {"name":"Smart Infrastructure & Sustainable Engineering","branch":["Civil","Chemical","Mechanical"],"semester_min":5,"semester_max":8,"difficulty":"intermediate","skills_required":{"mechanics_score":50,"design_score":45},"skills_improved":["mechanics_score","design_score"],"category":"Sustainability","credits":3,"description":"Green building, LEED certification, smart sensors, sustainable materials.","career_paths":["Sustainability Consultant","Infrastructure Engineer"],"prereq_cgpa":5.5,"career_tags":["Urban Planner","Geotechnical Engineer","Project Manager"],"interest_tags":["Sustainability","Smart Cities","Urban Planning"]},

    # ── AEROSPACE ─────────────────────────────────────────────────────────────
    "AE101": {"name":"Computational Fluid Dynamics","branch":["Aerospace","Mechanical","Chemical"],"semester_min":5,"semester_max":8,"difficulty":"advanced","skills_required":{"mechanics_score":65,"math_score":70,"programming_score":55},"skills_improved":["mechanics_score","math_score","programming_score"],"category":"Simulation","credits":4,"description":"Navier-Stokes equations, ANSYS Fluent, OpenFOAM, turbulence modeling.","career_paths":["CFD Engineer","Aerospace Engineer","R&D Engineer"],"prereq_cgpa":6.5,"career_tags":["CFD Engineer","Aerospace Engineer","Propulsion Engineer"],"interest_tags":["Aerodynamics","Simulation","Defense Tech"]},
    "AE102": {"name":"Spacecraft Design & Orbital Mechanics","branch":["Aerospace"],"semester_min":6,"semester_max":8,"difficulty":"advanced","skills_required":{"mechanics_score":70,"math_score":75},"skills_improved":["mechanics_score","math_score"],"category":"Space Tech","credits":4,"description":"Orbital dynamics, satellite systems, launch vehicle design, mission analysis.","career_paths":["Spacecraft Engineer","Mission Analyst","Systems Engineer"],"prereq_cgpa":7.0,"career_tags":["Aerospace Engineer","Mission Analyst","Systems Engineer"],"interest_tags":["Spacecraft Design","Aerodynamics","Defense Tech"]},

    # ── ELECTRICAL ────────────────────────────────────────────────────────────
    "EE101": {"name":"Renewable Energy Systems","branch":["Electrical","Mechanical","Chemical"],"semester_min":5,"semester_max":8,"difficulty":"intermediate","skills_required":{"circuits_score":55,"math_score":55},"skills_improved":["circuits_score","math_score"],"category":"Energy","credits":3,"description":"Solar PV, wind energy, energy storage, grid integration, smart grids.","career_paths":["Energy Engineer","Power Systems Engineer","Sustainability Engineer"],"prereq_cgpa":5.5,"career_tags":["Power Engineer","EV Engineer","Energy Auditor","Smart Grid Engineer"],"interest_tags":["Renewable Energy","EV Technology","Smart Grid"]},
    "EE102": {"name":"Power Electronics & EV Engineering","branch":["Electrical"],"semester_min":5,"semester_max":8,"difficulty":"advanced","skills_required":{"circuits_score":65,"math_score":60},"skills_improved":["circuits_score","math_score"],"category":"Power","credits":4,"description":"Converters, inverters, motor drives, PWM techniques, EV power systems.","career_paths":["Power Electronics Engineer","EV Engineer","Drive Systems Engineer"],"prereq_cgpa":6.0,"career_tags":["EV Engineer","Power Engineer","Control Systems Engineer"],"interest_tags":["EV Technology","Renewable Energy","Power Electronics"]},

    # ── BIOMEDICAL ────────────────────────────────────────────────────────────
    "BM101": {"name":"Bioinformatics & Genomics","branch":["Biomedical","Chemical","Data Science"],"semester_min":5,"semester_max":8,"difficulty":"advanced","skills_required":{"programming_score":55,"math_score":60},"skills_improved":["programming_score","math_score","critical_thinking_score"],"category":"Bioinformatics","credits":4,"description":"Sequence alignment, gene expression analysis, CRISPR, drug discovery ML.","career_paths":["Bioinformatics Scientist","Computational Biologist","Research Scientist"],"prereq_cgpa":6.5,"career_tags":["Bioinformatics Scientist","Research Scientist","Neural Engineer"],"interest_tags":["Genomics","Drug Discovery","Healthcare Analytics"]},
    "BM102": {"name":"Medical Imaging & Computer-Aided Diagnosis","branch":["Biomedical","Computer Science"],"semester_min":5,"semester_max":8,"difficulty":"advanced","skills_required":{"programming_score":60,"math_score":65},"skills_improved":["programming_score","critical_thinking_score"],"category":"Bioinformatics","credits":4,"description":"MRI, CT, X-ray processing, deep learning for diagnostics, DICOM standards.","career_paths":["Medical Imaging Engineer","Clinical Data Analyst","Research Scientist"],"prereq_cgpa":6.5,"career_tags":["Medical Device Engineer","Clinical Data Analyst","Bioinformatics Scientist"],"interest_tags":["Medical Imaging","Genomics","Wearable Tech"]},

    # ── SOFT / PROFESSIONAL ────────────────────────────────────────────────────
    "PRO101": {"name":"Technical Communication & Presentation Skills","branch":["Computer Science","Electronics & Communication","Mechanical","Civil","Electrical","Information Technology","Chemical","Aerospace","Biomedical","Data Science"],"semester_min":1,"semester_max":8,"difficulty":"foundation","skills_required":{},"skills_improved":["communication_score"],"category":"Professional Skills","credits":2,"description":"IEEE paper writing, technical presentations, stakeholder communication, LinkedIn branding.","career_paths":["Any Engineering Role"],"prereq_cgpa":0,"career_tags":[],"interest_tags":[]},
    "PRO102": {"name":"Critical Thinking & Problem Solving","branch":["Computer Science","Electronics & Communication","Mechanical","Civil","Electrical","Information Technology","Chemical","Aerospace","Biomedical","Data Science"],"semester_min":1,"semester_max":6,"difficulty":"foundation","skills_required":{},"skills_improved":["critical_thinking_score"],"category":"Professional Skills","credits":2,"description":"First-principles thinking, structured problem decomposition, decision frameworks.","career_paths":["Any Engineering Role"],"prereq_cgpa":0,"career_tags":[],"interest_tags":[]},

    # ── FOUNDATION ────────────────────────────────────────────────────────────
    "GEN101": {"name":"Advanced Engineering Mathematics","branch":["Computer Science","Electronics & Communication","Mechanical","Civil","Electrical","Information Technology","Chemical","Aerospace","Biomedical","Data Science"],"semester_min":1,"semester_max":4,"difficulty":"foundation","skills_required":{},"skills_improved":["math_score","critical_thinking_score"],"category":"Foundation","credits":4,"description":"Linear algebra, differential equations, Fourier analysis, probability theory.","career_paths":["Any Engineering Role"],"prereq_cgpa":0,"career_tags":[],"interest_tags":[]},
    "GEN102": {"name":"Python Programming for Engineers","branch":["Computer Science","Electronics & Communication","Mechanical","Civil","Electrical","Information Technology","Chemical","Aerospace","Biomedical","Data Science"],"semester_min":1,"semester_max":4,"difficulty":"foundation","skills_required":{},"skills_improved":["programming_score"],"category":"Foundation","credits":3,"description":"Python basics to advanced: NumPy, Pandas, Matplotlib, automation scripts.","career_paths":["Any Engineering Role"],"prereq_cgpa":0,"career_tags":[],"interest_tags":[]},
    "GEN103": {"name":"Research Methodology & Technical Writing","branch":["Computer Science","Electronics & Communication","Mechanical","Civil","Electrical","Information Technology","Chemical","Aerospace","Biomedical","Data Science"],"semester_min":6,"semester_max":8,"difficulty":"intermediate","skills_required":{},"skills_improved":["communication_score","critical_thinking_score"],"category":"Professional Skills","credits":2,"description":"IEEE paper writing, literature review, research design, patent filing.","career_paths":["Researcher","Academic","R&D Engineer"],"prereq_cgpa":0,"career_tags":["AI Researcher","Research Scientist"],"interest_tags":[]},
    "GEN104": {"name":"Project Management & Agile for Engineers","branch":["Computer Science","Electronics & Communication","Mechanical","Civil","Electrical","Information Technology","Chemical","Aerospace","Biomedical","Data Science"],"semester_min":5,"semester_max":8,"difficulty":"intermediate","skills_required":{},"skills_improved":["communication_score","design_score"],"category":"Professional Skills","credits":2,"description":"Scrum, Kanban, risk management, stakeholder communication, PMP concepts.","career_paths":["Project Manager","Tech Lead","Product Manager"],"prereq_cgpa":0,"career_tags":["Product Manager","Project Manager","DevOps Engineer"],"interest_tags":[]},
}


def get_all_courses():
    return [{"id": cid, **cdata} for cid, cdata in ENGINEERING_COURSES.items()]


def compute_skill_gaps(student_skills, course):
    gaps = {}
    for skill, required in course.get("skills_required", {}).items():
        val = student_skills.get(skill, 0)
        if val < required:
            gaps[skill] = round(required - val, 1)
    return gaps


def score_course(student: dict, course: dict) -> float:
    score = 0.0
    cgpa    = student.get("cgpa", 7.0)
    sem     = student.get("semester", 4)
    career  = student.get("career_goal", "")
    interest = student.get("primary_interest", "")
    learn   = student.get("learning_style", "")

    # ── Branch match (big weight) ─────────────────────────────────────────────
    if student.get("branch") in course.get("branch", []):
        score += 40

    # ── Semester fit ──────────────────────────────────────────────────────────
    if course["semester_min"] <= sem <= course["semester_max"]:
        score += 20
    elif sem < course["semester_min"]:
        score -= 15   # too early

    # ── CGPA eligibility ──────────────────────────────────────────────────────
    prereq = course.get("prereq_cgpa", 0)
    if cgpa >= prereq:
        score += 15
        if cgpa >= prereq + 1.0:
            score += 5   # comfortably above prereq
    else:
        score -= 35   # hard penalty for not meeting prereq

    # ── Skill gap penalty ─────────────────────────────────────────────────────
    total_gap = sum(compute_skill_gaps(student, course).values())
    score -= total_gap * 0.20

    # ── Difficulty match ──────────────────────────────────────────────────────
    diff_map = {"foundation": 1, "intermediate": 2, "advanced": 3}
    cdiff = diff_map.get(course.get("difficulty", "intermediate"), 2)
    if cgpa >= 8.5 and cdiff == 3:       score += 12
    elif 7.0 <= cgpa < 8.5 and cdiff in (2, 3): score += 8
    elif 6.0 <= cgpa < 7.0 and cdiff == 2: score += 8
    elif cgpa < 6.0 and cdiff == 1:      score += 12
    elif cgpa < 5.5 and cdiff == 3:      score -= 20

    # ── Career goal match (NEW) ───────────────────────────────────────────────
    if career and career in course.get("career_tags", []):
        score += 18

    # ── Primary interest match (NEW) ──────────────────────────────────────────
    if interest and interest in course.get("interest_tags", []):
        score += 12

    # ── Learning style bonus (NEW) ────────────────────────────────────────────
    style_skill = {
        "Visual":          ["design_score"],
        "Kinesthetic":     ["mechanics_score","programming_score"],
        "Reading/Writing": ["math_score","critical_thinking_score"],
        "Auditory":        ["communication_score"],
    }
    favoured = style_skill.get(learn, [])
    improved = course.get("skills_improved", [])
    if any(s in improved for s in favoured):
        score += 6

    # ── Wellness / stress penalty for advanced courses ────────────────────────
    stress = student.get("stress_level", 3)
    if stress >= 4 and cdiff == 3:
        score -= 8   # high stress student → suggest not overloading

    return score


def recommend_courses(student: dict, top_n: int = 8) -> List[Dict]:
    scored = []
    for cid, course in ENGINEERING_COURSES.items():
        s = score_course(student, course)
        gaps = compute_skill_gaps(student, course)
        scored.append({
            "id": cid,
            "score": round(s, 2),
            "skill_gaps": gaps,
            "match_percent": min(100, max(0, round((s / 90) * 100))),
            **course
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    top = scored[:top_n]

    for course in top:
        reasons = []
        if student.get("branch") in course.get("branch", []):
            reasons.append(f"Aligned with your {student.get('branch')} branch")
        career = student.get("career_goal", "")
        if career and career in course.get("career_tags", []):
            reasons.append(f"Directly supports your career goal: {career}")
        interest = student.get("primary_interest", "")
        if interest and interest in course.get("interest_tags", []):
            reasons.append(f"Matches your interest in {interest}")
        if course.get("difficulty") == "advanced" and student.get("cgpa", 0) >= 7.5:
            reasons.append("Matches your strong academic performance")
        if not course.get("skill_gaps"):
            reasons.append("You already meet all skill prerequisites")
        elif course.get("skill_gaps"):
            gap_skills = [s.replace("_score","") for s in course["skill_gaps"].keys()]
            reasons.append(f"Will help bridge your gap in {', '.join(gap_skills)}")
        learn = student.get("learning_style", "")
        style_skill = {"Visual":["design_score"],"Kinesthetic":["mechanics_score","programming_score"],"Reading/Writing":["math_score","critical_thinking_score"],"Auditory":["communication_score"]}
        if any(s in course.get("skills_improved",[]) for s in style_skill.get(learn,[])):
            reasons.append(f"Suits your {learn} learning style")
        if course["semester_min"] <= student.get("semester",4) <= course["semester_max"]:
            reasons.append(f"Perfectly timed for Semester {student.get('semester',4)}")
        course["reasoning"] = reasons

    return top


def get_skill_gap_analysis(student: dict) -> Dict:
    branch = student.get("branch", "Computer Science")
    relevant = [(cid, c) for cid, c in ENGINEERING_COURSES.items() if branch in c.get("branch", [])]
    gap_summary = {}
    for cid, course in relevant:
        for skill, gap in compute_skill_gaps(student, course).items():
            gap_summary.setdefault(skill, []).append(gap)
    return {
        skill: {
            "avg_gap": round(sum(gaps)/len(gaps), 1),
            "max_gap": max(gaps),
            "courses_affected": len(gaps)
        }
        for skill, gaps in gap_summary.items()
    }
