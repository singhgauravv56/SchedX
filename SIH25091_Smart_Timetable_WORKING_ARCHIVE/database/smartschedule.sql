CREATE DATABASE IF NOT EXISTS smartschedule CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smartschedule;

CREATE TABLE IF NOT EXISTS courses (
  course_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  department VARCHAR(80) NOT NULL DEFAULT 'General',
  course_type ENUM('Major','Minor','Multidisciplinary','Lab') NOT NULL DEFAULT 'Major',
  credits INT NOT NULL DEFAULT 3,
  students INT NOT NULL DEFAULT 30,
  weekly_periods INT NOT NULL DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teachers (
  teacher_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  department VARCHAR(80) NOT NULL DEFAULT 'General',
  specialization VARCHAR(120) NOT NULL DEFAULT 'General',
  availability VARCHAR(120) NOT NULL DEFAULT 'Mon-Fri'
);

CREATE TABLE IF NOT EXISTS rooms (
  room_id INT AUTO_INCREMENT PRIMARY KEY,
  room_name VARCHAR(60) NOT NULL UNIQUE,
  room_type ENUM('Classroom','Computer Lab','Laboratory','Seminar Hall') NOT NULL DEFAULT 'Classroom',
  capacity INT NOT NULL DEFAULT 40,
  facilities VARCHAR(255) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS classes (
  class_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  section VARCHAR(20) NOT NULL DEFAULT 'A',
  semester INT NOT NULL DEFAULT 1,
  students INT NOT NULL DEFAULT 30
);

CREATE TABLE IF NOT EXISTS time_slots (
  slot_id INT AUTO_INCREMENT PRIMARY KEY,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  UNIQUE KEY uq_time (start_time,end_time)
);

CREATE TABLE IF NOT EXISTS timetable (
  timetable_id INT AUTO_INCREMENT PRIMARY KEY,
  day VARCHAR(15) NOT NULL,
  slot_id INT NOT NULL,
  class_id INT NOT NULL,
  course_id INT NOT NULL,
  teacher_id INT NOT NULL,
  room_id INT NOT NULL,
  FOREIGN KEY(slot_id) REFERENCES time_slots(slot_id) ON DELETE CASCADE,
  FOREIGN KEY(class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
  FOREIGN KEY(course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
  FOREIGN KEY(teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE,
  FOREIGN KEY(room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
  UNIQUE KEY uq_teacher_time(day,slot_id,teacher_id),
  UNIQUE KEY uq_class_time(day,slot_id,class_id),
  UNIQUE KEY uq_room_time(day,slot_id,room_id)
);

INSERT INTO time_slots(start_time,end_time) VALUES
('09:00:00','10:00:00'),('10:00:00','11:00:00'),('11:00:00','12:00:00'),
('12:00:00','13:00:00'),('14:00:00','15:00:00'),('15:00:00','16:00:00')
ON DUPLICATE KEY UPDATE end_time=VALUES(end_time);

INSERT INTO teachers(name,department,specialization,availability) VALUES
('Dr. Rahul Kumar','CSE','Data Structures','Mon-Fri'),
('Dr. Priya Sharma','CSE','Operating Systems','Mon-Thu'),
('Dr. Amit Verma','CSE','Database Systems','Mon-Fri'),
('Dr. Neha Singh','CSE','Artificial Intelligence','Tue-Fri'),
('Dr. Anjali Rao','Humanities','Economics','Mon-Wed'),
('Dr. Karan Mehta','Management','Entrepreneurship','Mon-Fri')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO courses(name,department,course_type,credits,students,weekly_periods) VALUES
('Data Structures','CSE','Major',4,40,3),
('Operating Systems','CSE','Major',4,40,3),
('Database Systems','CSE','Major',4,40,3),
('Artificial Intelligence','CSE','Major',4,40,3),
('Economics','Humanities','Minor',3,35,2),
('Entrepreneurship','Management','Multidisciplinary',3,35,2),
('Cloud Computing Lab','CSE','Lab',2,35,2)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO classes(name,section,semester,students) VALUES
('BCA','A',5,40),('BCA','B',5,40)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO rooms(room_name,room_type,capacity,facilities) VALUES
('R-101','Classroom',80,'Projector, AC'),
('R-203','Classroom',70,'Projector'),
('R-305','Classroom',60,'Projector, AC'),
('LAB-1','Computer Lab',40,'40 PCs, Projector'),
('AUD-1','Seminar Hall',150,'Projector, Audio')
ON DUPLICATE KEY UPDATE room_name=VALUES(room_name);
