const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_DB_NAME = 'smart_timetable';
const DEFAULT_PORT = 3000;
const DB_NAME = process.env.DB_NAME || DEFAULT_DB_NAME;
const DB_PORT = Number(process.env.DB_PORT || 3306);
let databaseReady = false;
let databaseWarningMessage = 'MySQL Server is not available yet. Start MySQL and configure your .env file to enable timetable generation.';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (!databaseReady) {
    return res.status(503).json({
      error: databaseWarningMessage,
      status: 'database_unavailable'
    });
  }
  return next();
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: DB_PORT,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

function timeToMinutes(timeValue) {
  if (!timeValue) return 0;
  const [hours, minutes] = String(timeValue).split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const safeMinutes = Math.max(0, totalMinutes);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

function buildTimeSlots(startTime, endTime) {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (endMinutes <= startMinutes) {
    throw new Error('Working end time must be later than working start time.');
  }

  const slots = [];
  let currentStart = startMinutes;

  while (currentStart + 60 <= endMinutes) {
    slots.push({
      start_time: minutesToTime(currentStart),
      end_time: minutesToTime(currentStart + 60)
    });
    currentStart += 60;
  }

  if (slots.length === 0) {
    throw new Error('At least one 1-hour time slot is required for the working hours.');
  }

  return slots;
}

function resolveFriendlyDatabaseError(message = '') {
  if (!message) return 'Unable to connect to MySQL Server. Please check your MySQL Server and .env configuration.';

  if (message.includes('ECONNREFUSED') || message.includes('connect ECONNREFUSED')) {
    return 'Unable to connect to MySQL Server. Please install MySQL Server and verify your .env settings.';
  }

  if (message.includes('Access denied')) {
    return 'MySQL access is denied. Check DB_USER and DB_PASSWORD in .env.';
  }

  if (message.includes('Unknown database')) {
    return 'Database not found. Please create the database or check DB_NAME in .env.';
  }

  return 'Unable to connect to MySQL Server. Please check your MySQL Server and .env configuration.';
}

async function initializeDatabase() {
  let connection;

  try {
    const connectionConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: DB_PORT,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      connectTimeout: 10000
    };

    const dbName = process.env.DB_NAME || DEFAULT_DB_NAME;
    const schemaPath = path.join(__dirname, 'database', 'timetable.sql');
    const legacySchemaPath = path.join(__dirname, 'database', 'smartschedule.sql');
    const schemaFile = fs.existsSync(schemaPath) ? schemaPath : legacySchemaPath;

    if (!fs.existsSync(schemaFile)) {
      throw new Error('Database schema file not found.');
    }

    const rootConnection = await mysql.createConnection(connectionConfig);
    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await rootConnection.end();

    connection = await pool.getConnection();
    const sqlContent = fs.readFileSync(schemaFile, 'utf8');
    const statements = sqlContent
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean)
      .filter((statement) => !/^USE\s+/i.test(statement));

    for (const statement of statements) {
      try {
        await connection.query(statement);
      } catch (error) {
        const msg = error && error.message ? error.message : '';
        const shouldIgnore = /already exists|Duplicate|does not exist|Table .* already exists/i.test(msg);
        if (!shouldIgnore) {
          console.warn('Schema warning:', msg.substring(0, 140));
        }
      }
    }

    connection.release();
    databaseReady = true;
    databaseWarningMessage = 'MySQL Server is available, but the app is still waiting for the database setup to be completed.';
    console.log(`✓ MySQL database ready: ${dbName}`);
  } catch (error) {
    if (connection) connection.release();
    const friendlyMessage = resolveFriendlyDatabaseError(error && error.message ? error.message : '');
    databaseReady = false;
    databaseWarningMessage = friendlyMessage;
    console.warn('\nDatabase initialization failed.');
    console.warn(friendlyMessage);
    console.warn('The webpage will still load, but timetable APIs remain disabled until MySQL is running and the .env file is correct.');
  }
}

async function ensureDepartment(connection, departmentName) {
  const name = String(departmentName || 'General').trim();

  const [rows] = await connection.query('SELECT department_id FROM departments WHERE department_name = ? LIMIT 1', [name]);
  if (rows.length > 0) return rows[0].department_id;

  const [result] = await connection.query('INSERT INTO departments (department_name) VALUES (?)', [name]);
  return result.insertId;
}

async function ensureTeacher(connection, teacherName, departmentName, workingDaysPerWeek) {
  const name = String(teacherName || '').trim();
  const department = String(departmentName || 'General').trim();
  const days = Number(workingDaysPerWeek || 5);

  if (!name) {
    throw new Error('Teacher name is required.');
  }

  const [rows] = await connection.query('SELECT teacher_id, department, working_days_per_week FROM teachers WHERE teacher_name = ? LIMIT 1', [name]);

  if (rows.length > 0) {
    const teacher = rows[0];
    if (teacher.department && teacher.department !== department) {
      throw new Error(`Teacher ${name} belongs to ${teacher.department}, not ${department}.`);
    }

    if (Number(teacher.working_days_per_week) < days) {
      await connection.query('UPDATE teachers SET working_days_per_week = ? WHERE teacher_id = ?', [days, teacher.teacher_id]);
    }

    return teacher.teacher_id;
  }

  const [result] = await connection.query(
    'INSERT INTO teachers (teacher_name, department, working_days_per_week) VALUES (?, ?, ?)',
    [name, department, days]
  );

  return result.insertId;
}

async function ensureCourse(connection, courseName, departmentName, roomType) {
  const name = String(courseName || '').trim();
  const department = String(departmentName || 'General').trim();
  const type = roomType || 'Classroom';

  if (!name) {
    throw new Error('Course name is required.');
  }

  const [rows] = await connection.query('SELECT course_id, department, course_type FROM courses WHERE course_name = ? LIMIT 1', [name]);

  if (rows.length > 0) {
    const course = rows[0];
    if (course.department && course.department !== department) {
      throw new Error(`Course ${name} belongs to ${course.department}, not ${department}.`);
    }
    if (course.course_type && course.course_type !== type) {
      await connection.query('UPDATE courses SET course_type = ? WHERE course_id = ?', [type, course.course_id]);
    }
    return course.course_id;
  }

  const [result] = await connection.query(
    'INSERT INTO courses (course_name, department, course_type) VALUES (?, ?, ?)',
    [name, department, type]
  );

  return result.insertId;
}

async function ensureClass(connection, className, section, studentCount) {
  const name = String(className || '').trim();
  const classSection = String(section || 'A').trim();
  const count = Number(studentCount || 0);

  if (!name) {
    throw new Error('Class name is required.');
  }

  if (!count || count <= 0) {
    throw new Error('Number of students must be greater than zero.');
  }

  const [rows] = await connection.query(
    'SELECT class_id, number_of_students FROM classes WHERE class_name = ? AND section = ? LIMIT 1',
    [name, classSection]
  );

  if (rows.length > 0) {
    const existingClass = rows[0];
    if (Number(existingClass.number_of_students) < count) {
      await connection.query('UPDATE classes SET number_of_students = ? WHERE class_id = ?', [count, existingClass.class_id]);
    }
    return existingClass.class_id;
  }

  const [result] = await connection.query(
    'INSERT INTO classes (class_name, section, number_of_students) VALUES (?, ?, ?)',
    [name, classSection, count]
  );

  return result.insertId;
}

async function ensureTeacherCourse(connection, teacherId, courseId) {
  const [rows] = await connection.query(
    'SELECT teacher_course_id FROM teacher_courses WHERE teacher_id = ? AND course_id = ? LIMIT 1',
    [teacherId, courseId]
  );

  if (rows.length === 0) {
    await connection.query('INSERT INTO teacher_courses (teacher_id, course_id) VALUES (?, ?)', [teacherId, courseId]);
  }
}

async function ensureTimeSlotsForDay(connection, day, startTime, endTime) {
  const slots = buildTimeSlots(startTime, endTime);

  for (const slot of slots) {
    await connection.query(
      'INSERT IGNORE INTO time_slots (day, start_time, end_time) VALUES (?, ?, ?)',
      [day, slot.start_time, slot.end_time]
    );
  }

  const [rows] = await connection.query(
    'SELECT slot_id, start_time, end_time FROM time_slots WHERE day = ? ORDER BY start_time',
    [day]
  );

  return rows;
}

async function generateTimetableHandler(req, res) {
  try {
    const teacherName = String(req.body.teacher_name || '').trim();
    const workingDays = Number(req.body.working_days_per_week || 5);
    const courseName = String(req.body.course_name || '').trim();
    const departmentName = String(req.body.department_name || 'General').trim();
    const className = String(req.body.class_name || '').trim();
    const section = String(req.body.class_section || 'A').trim();
    const studentCount = Number(req.body.student_count || 0);
    const roomType = String(req.body.room_type || '').trim();
    const startTime = String(req.body.working_start_time || '').trim();
    const endTime = String(req.body.working_end_time || '').trim();

    if (!teacherName) return res.status(400).json({ error: 'Teacher name is required.' });
    if (!courseName) return res.status(400).json({ error: 'Course name is required.' });
    if (!departmentName) return res.status(400).json({ error: 'Department is required.' });
    if (!className) return res.status(400).json({ error: 'Class name is required.' });
    if (!studentCount || studentCount <= 0) return res.status(400).json({ error: 'Number of students must be greater than zero.' });
    if (!roomType || !['Classroom', 'Laboratory'].includes(roomType)) return res.status(400).json({ error: 'Teaching location must be Classroom or Laboratory.' });
    if (!Number.isInteger(workingDays) || workingDays < 1 || workingDays > 7) return res.status(400).json({ error: 'Working days per week must be between 1 and 7.' });
    if (!startTime || !endTime) return res.status(400).json({ error: 'Working hours are required.' });

    const connection = await pool.getConnection();

    try {
      const deptId = await ensureDepartment(connection, departmentName);
      const teacherId = await ensureTeacher(connection, teacherName, departmentName, workingDays);
      const courseId = await ensureCourse(connection, courseName, departmentName, roomType);
      const classId = await ensureClass(connection, className, section, studentCount);
      await ensureTeacherCourse(connection, teacherId, courseId);

      const availableRooms = await connection.query(
        'SELECT room_id, room_name, room_type, capacity FROM rooms WHERE room_type = ? AND capacity >= ? ORDER BY capacity ASC',
        [roomType, studentCount]
      );

      if (!availableRooms[0] || availableRooms[0].length === 0) {
        throw new Error(`Unable to schedule ${courseName} for ${className}-${section} because no suitable ${roomType} is available.`);
      }

      const selectedDays = DAY_NAMES.slice(0, workingDays);
      const scheduledEntries = [];

      for (const day of selectedDays) {
        const daySlots = await ensureTimeSlotsForDay(connection, day, startTime, endTime);
        let placed = false;

        for (const slot of daySlots) {
          for (const room of availableRooms[0]) {
            const [conflicts] = await connection.query(
              'SELECT 1 FROM timetable WHERE day = ? AND slot_id = ? AND (teacher_id = ? OR class_id = ? OR room_id = ?) LIMIT 1',
              [day, slot.slot_id, teacherId, classId, room.room_id]
            );

            if (conflicts.length === 0) {
              scheduledEntries.push({
                day,
                slot_id: slot.slot_id,
                teacher_id: teacherId,
                course_id: courseId,
                class_id: classId,
                room_id: room.room_id
              });
              placed = true;
              break;
            }
          }

          if (placed) break;
        }

        if (!placed) {
          throw new Error(`Unable to schedule ${courseName} for ${className}-${section} because no suitable teacher, room, or time slot is available.`);
        }
      }

      await connection.query('DELETE FROM timetable WHERE class_id = ? AND course_id = ?', [classId, courseId]);
      const values = scheduledEntries.map((item) => [item.day, item.slot_id, item.teacher_id, item.course_id, item.class_id, item.room_id]);

      if (values.length > 0) {
        await connection.query(
          'INSERT INTO timetable (day, slot_id, teacher_id, course_id, class_id, room_id) VALUES ?',
          [values]
        );
      }

      connection.release();
      return res.json({
        message: 'Timetable generated successfully.',
        entries_created: values.length,
        teacher_name: teacherName,
        course_name: courseName,
        class_name: className,
        section,
        department_name: departmentName
      });
    } catch (error) {
      connection.release();
      const friendlyMessage = error && error.message ? error.message : 'Timetable generation failed.';
      return res.status(400).json({ error: friendlyMessage });
    }
  } catch (error) {
    const friendlyMessage = resolveFriendlyDatabaseError(error && error.message ? error.message : '');
    return res.status(503).json({ error: friendlyMessage });
  }
}

app.get('/api/health', async (req, res) => {
  if (!databaseReady) {
    return res.status(503).json({
      status: 'error',
      database: false,
      db_name: DB_NAME,
      message: databaseWarningMessage
    });
  }

  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    return res.json({ status: 'ok', database: true, db_name: DB_NAME });
  } catch (error) {
    return res.status(503).json({ status: 'error', database: false, message: resolveFriendlyDatabaseError(error && error.message ? error.message : '') });
  }
});

app.get('/api/teachers', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM teachers ORDER BY teacher_id DESC');
    connection.release();
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load teachers.' });
  }
});

app.post('/api/teachers', async (req, res) => {
  try {
    const teacherName = String(req.body.teacher_name || '').trim();
    const departmentName = String(req.body.department || req.body.department_name || 'General').trim();
    const workingDays = Number(req.body.working_days_per_week || 5);

    if (!teacherName) return res.status(400).json({ error: 'Teacher name is required.' });

    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT teacher_id FROM teachers WHERE teacher_name = ? LIMIT 1', [teacherName]);

    if (rows.length > 0) {
      connection.release();
      return res.status(400).json({ error: 'A teacher with this name already exists.' });
    }

    const [result] = await connection.query(
      'INSERT INTO teachers (teacher_name, department, working_days_per_week) VALUES (?, ?, ?)',
      [teacherName, departmentName, workingDays]
    );

    connection.release();
    return res.json({ teacher_id: result.insertId, message: 'Teacher added successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to add teacher.' });
  }
});

app.get('/api/courses', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM courses ORDER BY course_id DESC');
    connection.release();
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load courses.' });
  }
});

app.post('/api/courses', async (req, res) => {
  try {
    const courseName = String(req.body.course_name || '').trim();
    const departmentName = String(req.body.department || req.body.department_name || 'General').trim();
    const roomType = String(req.body.room_type || 'Classroom').trim();

    if (!courseName) return res.status(400).json({ error: 'Course name is required.' });

    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT course_id FROM courses WHERE course_name = ? LIMIT 1', [courseName]);

    if (rows.length > 0) {
      connection.release();
      return res.status(400).json({ error: 'A course with this name already exists.' });
    }

    const [result] = await connection.query(
      'INSERT INTO courses (course_name, department, course_type) VALUES (?, ?, ?)',
      [courseName, departmentName, roomType]
    );

    connection.release();
    return res.json({ course_id: result.insertId, message: 'Course added successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to add course.' });
  }
});

app.get('/api/classes', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM classes ORDER BY class_id DESC');
    connection.release();
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load classes.' });
  }
});

app.post('/api/classes', async (req, res) => {
  try {
    const className = String(req.body.class_name || '').trim();
    const section = String(req.body.section || 'A').trim();
    const studentCount = Number(req.body.number_of_students || req.body.student_count || 0);

    if (!className) return res.status(400).json({ error: 'Class name is required.' });
    if (!studentCount || studentCount <= 0) return res.status(400).json({ error: 'Number of students must be greater than zero.' });

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO classes (class_name, section, number_of_students) VALUES (?, ?, ?)',
      [className, section, studentCount]
    );

    connection.release();
    return res.json({ class_id: result.insertId, message: 'Class added successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to add class.' });
  }
});

app.get('/api/rooms', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM rooms ORDER BY room_id DESC');
    connection.release();
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load rooms.' });
  }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const roomName = String(req.body.room_name || '').trim();
    const roomType = String(req.body.room_type || '').trim();
    const capacity = Number(req.body.capacity || 0);

    if (!roomName) return res.status(400).json({ error: 'Room name is required.' });
    if (!roomType || !['Classroom', 'Laboratory'].includes(roomType)) return res.status(400).json({ error: 'Room type must be Classroom or Laboratory.' });
    if (!capacity || capacity <= 0) return res.status(400).json({ error: 'Room capacity must be greater than zero.' });

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO rooms (room_name, room_type, capacity) VALUES (?, ?, ?)',
      [roomName, roomType, capacity]
    );

    connection.release();
    return res.json({ room_id: result.insertId, message: 'Room added successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to add room.' });
  }
});

app.get('/api/timetable', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(`
      SELECT t.timetable_id, t.day, ts.start_time, ts.end_time,
             c.class_name, c.section, co.course_name, te.teacher_name,
             r.room_name, r.room_type
      FROM timetable t
      JOIN time_slots ts ON ts.slot_id = t.slot_id
      JOIN classes c ON c.class_id = t.class_id
      JOIN courses co ON co.course_id = t.course_id
      JOIN teachers te ON te.teacher_id = t.teacher_id
      JOIN rooms r ON r.room_id = t.room_id
      ORDER BY FIELD(t.day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), ts.start_time, c.class_name
    `);
    connection.release();
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load timetable.' });
  }
});

app.delete('/api/timetable', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.query('DELETE FROM timetable');
    connection.release();
    return res.json({ message: 'Timetable cleared successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to clear timetable.' });
  }
});

app.post('/api/generate', generateTimetableHandler);
app.post('/api/generate-timetable', generateTimetableHandler);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/generate', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'generate.html'));
});

app.get('/features', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'features.html'));
});

app.get('/teacher-availability', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teacher-availability.html'));
});

app.get('/teacher-info', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teacher-info.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`\n✓ Smart Timetable Generator running at http://localhost:${port}`);
    console.log(`✓ MySQL Database: ${DB_NAME}`);
    console.log(`✓ API Base: http://localhost:${port}/api\n`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Stop the current process or change PORT in .env to a free port.`);
      process.exit(1);
    }

    console.error('Server failed to start:', error.message);
    process.exit(1);
  });
}

initializeDatabase().finally(() => {
  const preferredPort = Number(process.env.PORT || DEFAULT_PORT);
  startServer(preferredPort);
});
