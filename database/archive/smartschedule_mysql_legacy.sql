-- ==============================================================================
-- LEGACY MYSQL SCHEMA ARCHIVE - DO NOT USE IN PRODUCTION
-- This file is retained solely for historical reference.
-- SchedX has migrated to Supabase PostgreSQL (see database/supabase_schema.sql).
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS smartschedule CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smartschedule;

CREATE TABLE IF NOT EXISTS departments (
  department_id INT AUTO_INCREMENT PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teachers (
  teacher_id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_name VARCHAR(120) NOT NULL,
  specialization VARCHAR(120),
  department_id INT,
  working_days_per_week INT DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(department_id) REFERENCES departments(department_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS courses (
  course_id INT AUTO_INCREMENT PRIMARY KEY,
  course_name VARCHAR(120) NOT NULL,
  department_id INT,
  room_type ENUM('Classroom','Laboratory') DEFAULT 'Classroom',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(department_id) REFERENCES departments(department_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS classes (
  class_id INT AUTO_INCREMENT PRIMARY KEY,
  class_name VARCHAR(60) NOT NULL,
  section VARCHAR(20),
  student_count INT,
  department_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(department_id) REFERENCES departments(department_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS rooms (
  room_id INT AUTO_INCREMENT PRIMARY KEY,
  room_name VARCHAR(60) NOT NULL UNIQUE,
  room_type ENUM('Classroom','Laboratory') NOT NULL,
  capacity INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS working_days (
  working_day_id INT AUTO_INCREMENT PRIMARY KEY,
  day_name VARCHAR(15) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS time_slots (
  slot_id INT AUTO_INCREMENT PRIMARY KEY,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  UNIQUE KEY uq_time (start_time,end_time)
);

CREATE TABLE IF NOT EXISTS teacher_courses (
  teacher_course_id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT NOT NULL,
  course_id INT NOT NULL,
  FOREIGN KEY(teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE,
  FOREIGN KEY(course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
  UNIQUE KEY uq_teacher_course (teacher_id, course_id)
);

CREATE TABLE IF NOT EXISTS timetable (
  timetable_id INT AUTO_INCREMENT PRIMARY KEY,
  day VARCHAR(15) NOT NULL,
  slot_id INT NOT NULL,
  class_id INT NOT NULL,
  course_id INT NOT NULL,
  teacher_id INT NOT NULL,
  room_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(slot_id) REFERENCES time_slots(slot_id) ON DELETE CASCADE,
  FOREIGN KEY(class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
  FOREIGN KEY(course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
  FOREIGN KEY(teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE,
  FOREIGN KEY(room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
  UNIQUE KEY uq_teacher_time(day,slot_id,teacher_id),
  UNIQUE KEY uq_class_time(day,slot_id,class_id),
  UNIQUE KEY uq_room_time(day,slot_id,room_id)
);
