CREATE DATABASE IF NOT EXISTS SMS_db;
USE SMS_db;

-- =====================
-- Core auth
-- =====================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','teacher','student','parent') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- Academic master data
-- =====================
CREATE TABLE IF NOT EXISTS classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  section VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS teachers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  class VARCHAR(100) NOT NULL
);

-- =====================
-- Students
-- =====================
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  class VARCHAR(100) NOT NULL,
  gender ENUM('Male','Female') NOT NULL,
  fee_status ENUM('Paid','Pending','Overdue','Partial') NOT NULL,
  enrolled_date DATE NOT NULL,
  avatar_initials VARCHAR(6) NOT NULL
);

-- =====================
-- Attendance
-- =====================
CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_name VARCHAR(50) NOT NULL,
  subject VARCHAR(100) DEFAULT 'General',
  percentage DECIMAL(5,2) NOT NULL,
  date DATE NOT NULL
);

-- =====================
-- Exams
-- =====================
CREATE TABLE IF NOT EXISTS exams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  class VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  status ENUM('Active','Pending','Draft') NOT NULL
);

-- =====================
-- Fees
-- =====================
CREATE TABLE IF NOT EXISTS fees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('Paid','Pending','Overdue','Partial') NOT NULL,
  term VARCHAR(20) NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- =====================
-- Seed data
-- =====================
-- Users (passwords are plain text to match existing backend)
INSERT INTO users (name, email, password, role) VALUES
  ('Admin User', 'admin@school.edu', '123456', 'admin')
ON DUPLICATE KEY UPDATE
  name = VALUES(name), password = VALUES(password), role = VALUES(role);

INSERT INTO users (name, email, password, role) VALUES
  ('Teacher One', 'teacher@school.edu', '123456', 'teacher')
ON DUPLICATE KEY UPDATE
  name = VALUES(name), password = VALUES(password), role = VALUES(role);

-- Minimal master data
INSERT INTO classes (name, section) VALUES
  ('Form 1A','A'), ('Form 2B','B'), ('Form 3A','A'), ('Form 3B','B'), ('Form 4C','C')
ON DUPLICATE KEY UPDATE name = VALUES(name), section = VALUES(section);

INSERT INTO subjects (name) VALUES
  ('Maths'),('English'),('Physics'),('Chemistry'),('Biology'),('History')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO teachers (name, subject, class) VALUES
  ('Tunde Adebayo','Maths','Form 1A'),
  ('Adaeze Okafor','English','Form 2B')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Students (matches requested examples in task, avatar_initials derived)
INSERT INTO students (name, class, gender, fee_status, enrolled_date, avatar_initials) VALUES
  ('Amara Lopes','Form3A','Female','Paid','2024-01-01','AL'),
  ('Brian Kofi','Form2B','Male','Pending','2023-09-01','BK'),
  ('Chioma Nwosu','Form1A','Female','Overdue','2025-01-01','CN'),
  ('David Mensah','Form4C','Male','Paid','2022-09-01','DM'),
  ('Emeka Okonkwo','Form3B','Male','Partial','2024-01-01','EO')
ON DUPLICATE KEY UPDATE
  name = VALUES(name), class = VALUES(class), gender = VALUES(gender), fee_status = VALUES(fee_status), enrolled_date = VALUES(enrolled_date), avatar_initials = VALUES(avatar_initials);

-- Fees (ensure feesCollected has something)
INSERT INTO fees (student_id, amount, status, term)
SELECT s.id, 1200.00, 'Paid', 'Current'
FROM students s
WHERE s.fee_status IN ('Paid','Partial')
LIMIT 5;

-- Attendance today (use CURDATE())
INSERT INTO attendance (class_name, subject, percentage, date) VALUES
  ('Form 1A Maths', 'Maths', 96.00, CURDATE()),
  ('Form 2B English', 'English', 88.00, CURDATE()),
  ('Form 3A Physics', 'Physics', 74.00, CURDATE()),
  ('Form 3B Chemistry', 'Chemistry', 71.00, CURDATE()),
  ('Form 4C Biology', 'Biology', 62.00, CURDATE()),
  ('Form 2A History', 'History', 93.00, CURDATE())
ON DUPLICATE KEY UPDATE
  percentage = VALUES(percentage), date = VALUES(date);

-- Upcoming exams
INSERT INTO exams (name, class, date, status) VALUES
  ('Midterm-Maths','Form3A','2025-06-20','Active'),
  ('Quiz-English','Form1B','2025-06-21','Active'),
  ('Final-Physics','Form4A','2025-06-25','Pending'),
  ('Monthly-Biology','Form2C','2025-06-28','Pending'),
  ('Final-History','Form4B','2025-07-02','Draft')
ON DUPLICATE KEY UPDATE
  name = VALUES(name), class = VALUES(class), date = VALUES(date), status = VALUES(status);

