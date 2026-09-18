-- ==============================================================================
-- LEGACY MYSQL SCHEMA ARCHIVE - DO NOT USE IN PRODUCTION
-- This file is retained solely for historical reference.
-- SchedX has migrated to Supabase PostgreSQL (see database/supabase_schema.sql).
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS smart_timetable CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_timetable;

CREATE TABLE IF NOT EXISTS departments (
  department_id INT AUTO_INCREMENT PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teachers (
  teacher_id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_name VARCHAR(120) NOT NULL,
  department VARCHAR(100) NOT NULL,
  working_days_per_week INT NOT NULL DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_working_days CHECK (working_days_per_week BETWEEN 1 AND 7)
);

CREATE TABLE IF NOT EXISTS courses (
  course_id INT AUTO_INCREMENT PRIMARY KEY,
  course_name VARCHAR(150) NOT NULL,
  department VARCHAR(100) NOT NULL,
  course_type ENUM('Classroom','Laboratory') NOT NULL DEFAULT 'Classroom',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classes (
  class_id INT AUTO_INCREMENT PRIMARY KEY,
  class_name VARCHAR(80) NOT NULL,
  section VARCHAR(20) NOT NULL DEFAULT 'A',
  number_of_students INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_student_count CHECK (number_of_students > 0)
);

CREATE TABLE IF NOT EXISTS rooms (
  room_id INT AUTO_INCREMENT PRIMARY KEY,
  room_name VARCHAR(80) NOT NULL UNIQUE,
  room_type ENUM('Classroom','Laboratory') NOT NULL,
  capacity INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_capacity CHECK (capacity > 0)
);

CREATE TABLE IF NOT EXISTS time_slots (
  slot_id INT AUTO_INCREMENT PRIMARY KEY,
  day VARCHAR(15) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  UNIQUE KEY uq_day_time (day, start_time, end_time)
);

CREATE TABLE IF NOT EXISTS teacher_courses (
  teacher_course_id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT NOT NULL,
  course_id INT NOT NULL,
  UNIQUE KEY uq_teacher_course (teacher_id, course_id),
  CONSTRAINT fk_teacher_courses_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE,
  CONSTRAINT fk_teacher_courses_course FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS timetable (
  timetable_id INT AUTO_INCREMENT PRIMARY KEY,
  day VARCHAR(15) NOT NULL,
  slot_id INT NOT NULL,
  teacher_id INT NOT NULL,
  course_id INT NOT NULL,
  class_id INT NOT NULL,
  room_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_timetable_slot FOREIGN KEY (slot_id) REFERENCES time_slots(slot_id) ON DELETE CASCADE,
  CONSTRAINT fk_timetable_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE,
  CONSTRAINT fk_timetable_course FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
  CONSTRAINT fk_timetable_class FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
  CONSTRAINT fk_timetable_room FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
  UNIQUE KEY uq_teacher_day_slot (day, slot_id, teacher_id),
  UNIQUE KEY uq_class_day_slot (day, slot_id, class_id),
  UNIQUE KEY uq_room_day_slot (day, slot_id, room_id)
);
