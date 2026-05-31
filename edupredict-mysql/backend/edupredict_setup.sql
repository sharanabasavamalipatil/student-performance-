-- ============================================================
--  EduPredict MySQL Setup Script
--  Run once: mysql -u root -p < edupredict_setup.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS edupredict CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE edupredict;

-- ─────────────────────────────────────────────
--  USERS  (students + teachers)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           VARCHAR(10)  NOT NULL PRIMARY KEY,
  name         VARCHAR(120) NOT NULL,
  email        VARCHAR(180) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,
  role         ENUM('student','teacher') NOT NULL DEFAULT 'student',
  -- student fields
  branch       VARCHAR(120) DEFAULT NULL,
  semester     TINYINT      DEFAULT NULL,
  cgpa         DECIMAL(4,2) DEFAULT NULL,
  attendance   TINYINT      DEFAULT NULL,
  points       INT          DEFAULT 0,
  -- teacher fields
  department   VARCHAR(120) DEFAULT NULL,
  subject      VARCHAR(120) DEFAULT NULL,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
--  LOGIN LOGS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS login_logs (
  id         BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(10)  NOT NULL,
  email      VARCHAR(180) NOT NULL,
  name       VARCHAR(120) NOT NULL,
  role       VARCHAR(20)  NOT NULL,
  ip         VARCHAR(50)  DEFAULT 'unknown',
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- ─────────────────────────────────────────────
--  ACTIVE SESSIONS  (one row per user)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS active_sessions (
  user_id    VARCHAR(10)  NOT NULL PRIMARY KEY,
  email      VARCHAR(180) NOT NULL,
  name       VARCHAR(120) NOT NULL,
  role       VARCHAR(20)  NOT NULL,
  ip         VARCHAR(50)  DEFAULT 'unknown',
  last_seen  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
--  POINTS  (separate award ledger)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS points_ledger (
  id         BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(10) NOT NULL,
  points     INT         NOT NULL DEFAULT 0,
  awarded_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_student (student_id)
);

-- ─────────────────────────────────────────────
--  SEED DATA  (passwords = bcrypt of 'student123' / 'teacher123')
-- ─────────────────────────────────────────────
INSERT IGNORE INTO users (id, name, email, password, role, branch, semester, cgpa, attendance, points) VALUES
  ('S001','Sushma M',     'sushma.cse.rymec99@gmail.com',    '$2a$10$/M0YPzUHKGdtnoBi/WfIF.zrPOBZAun8UUsXnfabX5XzIH5SDDAem','student','Computer Science Engineering',6,8.0,90,1250),
  ('S002','Sharana',      'sharana.cse.rymec44@gmail.com',   '$2a$10$i3s39dhDXlWaABh.vXcRYOQcSKR/KFj03F9lmA1UcnYeRDLk6/nmO','student','Computer Science Engineering',4,7.5,85,860),
  ('S003','Shashi Rekha', 'shashirekha.cse.rymec@gmail.com', '$2a$10$R09XaHeyB0W42kdcsLBSS.1D/G7Ip5lazAMOt7xu1wryGoLG9Uf9C','student','Data Science',              4,7.8,88,980),
  ('S004','Abhishek',     'abhishek.rymec@gmail.com',        '$2a$10$ps2AY4XlvSu6RyWntKc1h.vSrtoqJwJz4GLRBBgXkz1QK9piXGRuK','student','Computer Science Engineering',5,7.2,80,750),
  ('S005','Bhavana',      'bhavana.rymec@gmail.com',         '$2a$10$AaXGsDMhWr/K7V18/HDrue9OvjNkku9Vu9Cy/cjV9aXzY6hz8m7Dm','student','Computer Science Engineering',5,8.3,92,1100);

INSERT IGNORE INTO users (id, name, email, password, role, department, subject) VALUES
  ('T001','Harsha',     'harsha.faculty.rymec@gmail.com',     '$2a$10$Sy10FZ5ieFAUYsO5FkPSAuFLIFEMDQPgNJMcVf6jrr4kYxDHjG5CK','teacher','Computer Science','Machine Learning'),
  ('T002','Abhinandan', 'abhinandan.faculty.rymec@gmail.com', '$2a$10$lGNVxt7tK8/0rV22HIgVJu2X1YoOlFNUiZ5jd3bIhgNLjKewg/Yvvmi','teacher','Computer Science','Data Structures'),
  ('T003','Hafsa',      'hafsa.faculty.rymec@gmail.com',      '$2a$10$CdSsD0Nv3qUh4lSF3y3bgeyKg5hqwZCwCq5oU9EUIFl47xEbVMImO', 'teacher','Data Science',    'Statistics & ML');

SELECT CONCAT('✅ EduPredict DB ready — ', COUNT(*), ' users seeded') AS status FROM users;
