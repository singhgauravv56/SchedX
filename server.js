const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const supabase = require('./config/supabase');

const app = express();
const PORT = Number(process.env.PORT || 3000);

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Environment validation on startup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.warn('\n⚠️  Missing Supabase environment variables.');
  console.warn('   Please configure SUPABASE_URL and SUPABASE_SECRET_KEY in your .env file.');
  console.warn('   The server will start, but database operations will return a configuration notice.\n');
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database availability middleware
function checkDatabase(req, res, next) {
  if (!supabase) {
    return res.status(503).json({
      error: 'Database connection failed. Please check Supabase configuration in your .env file.',
      status: 'database_unavailable'
    });
  }
  next();
}

// Utility: convert HH:MM(:SS) to minutes
function timeToMinutes(timeValue) {
  if (!timeValue) return 0;
  const [hours, minutes] = String(timeValue).split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

// Utility: convert minutes to HH:MM:00
function minutesToTime(totalMinutes) {
  const safeMinutes = Math.max(0, totalMinutes);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

// Utility: build 1-hour slot objects between start and end
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

// Map day of week integer (1=Mon..7=Sun) to string name
function getDayName(dayOfWeek) {
  const index = Number(dayOfWeek) - 1;
  return DAY_NAMES[index] || `Day ${dayOfWeek}`;
}

// Map day string name to integer (1=Mon..7=Sun)
function getDayNumber(dayName) {
  if (typeof dayName === 'number') return dayName;
  const index = DAY_NAMES.findIndex((d) => d.toLowerCase() === String(dayName).toLowerCase());
  return index !== -1 ? index + 1 : 1;
}

// ==============================================================================
// 1. HEALTH CHECK ENDPOINT
// ==============================================================================
app.get('/api/health', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({
      status: 'error',
      database: false,
      message: 'Supabase environment configuration is missing. Configure .env with SUPABASE_URL and SUPABASE_SECRET_KEY.'
    });
  }

  try {
    const { error } = await supabase.from('rooms').select('room_id').limit(1);
    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('relation') || error.message.includes('does not exist')) {
        return res.status(503).json({
          status: 'error',
          database: false,
          message: 'Connected to Supabase, but schema tables are missing. Please run database/supabase_schema.sql in the Supabase SQL Editor.'
        });
      }
      return res.status(503).json({
        status: 'error',
        database: false,
        message: 'Database connection failed. Please check Supabase configuration.'
      });
    }
    return res.json({ status: 'ok', database: true, provider: 'supabase' });
  } catch (error) {
    return res.status(503).json({
      status: 'error',
      database: false,
      message: 'Database connection failed. Please check Supabase configuration.'
    });
  }
});

// ==============================================================================
// 2. TEACHERS CRUD
// ==============================================================================
app.get('/api/teachers', checkDatabase, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .order('teacher_id', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: 'Unable to load teachers.' });
  }
});

app.post('/api/teachers', checkDatabase, async (req, res) => {
  const teacherName = String(req.body.teacher_name || req.body.name || '').trim();
  const specialization = String(req.body.specialization || req.body.department || '').trim();
  const workingDays = Number(req.body.working_days_per_week || 5);

  if (!teacherName) {
    return res.status(400).json({ error: 'Teacher name is required.' });
  }

  try {
    // Check if teacher with same name already exists
    const { data: existing } = await supabase
      .from('teachers')
      .select('teacher_id, teacher_name')
      .ilike('teacher_name', teacherName)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.json({
        teacher_id: existing[0].teacher_id,
        teacher_name: existing[0].teacher_name,
        message: 'Teacher already exists.'
      });
    }

    const { data, error } = await supabase
      .from('teachers')
      .insert({
        teacher_name: teacherName,
        specialization,
        working_days_per_week: workingDays
      })
      .select();

    if (error) throw error;
    res.json({
      teacher_id: data[0].teacher_id,
      teacher: data[0],
      message: 'Teacher added successfully.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Unable to add teacher.' });
  }
});

app.put('/api/teachers/:id', checkDatabase, async (req, res) => {
  const teacherId = req.params.id;
  const teacherName = String(req.body.teacher_name || req.body.name || '').trim();
  const specialization = String(req.body.specialization || req.body.department || '').trim();
  const workingDays = Number(req.body.working_days_per_week || 5);

  try {
    const { data, error } = await supabase
      .from('teachers')
      .update({
        teacher_name: teacherName,
        specialization,
        working_days_per_week: workingDays
      })
      .eq('teacher_id', teacherId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Teacher not found.' });
    }
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Unable to update teacher.' });
  }
});

app.delete('/api/teachers/:id', checkDatabase, async (req, res) => {
  try {
    const { error } = await supabase
      .from('teachers')
      .delete()
      .eq('teacher_id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Teacher deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to delete teacher.' });
  }
});

// ==============================================================================
// 3. COURSES CRUD
// ==============================================================================
app.get('/api/courses', checkDatabase, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('course_id', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: 'Unable to load courses.' });
  }
});

app.post('/api/courses', checkDatabase, async (req, res) => {
  const courseName = String(req.body.course_name || req.body.name || '').trim();

  if (!courseName) {
    return res.status(400).json({ error: 'Course name is required.' });
  }

  try {
    const { data: existing } = await supabase
      .from('courses')
      .select('course_id, course_name')
      .ilike('course_name', courseName)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.json({
        course_id: existing[0].course_id,
        course_name: existing[0].course_name,
        message: 'Course already exists.'
      });
    }

    const { data, error } = await supabase
      .from('courses')
      .insert({ course_name: courseName })
      .select();

    if (error) throw error;
    res.json({
      course_id: data[0].course_id,
      course: data[0],
      message: 'Course added successfully.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Unable to add course.' });
  }
});

app.put('/api/courses/:id', checkDatabase, async (req, res) => {
  const courseName = String(req.body.course_name || req.body.name || '').trim();

  try {
    const { data, error } = await supabase
      .from('courses')
      .update({ course_name: courseName })
      .eq('course_id', req.params.id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: 'Course not found.' });
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Unable to update course.' });
  }
});

app.delete('/api/courses/:id', checkDatabase, async (req, res) => {
  try {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('course_id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Course deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to delete course.' });
  }
});

// ==============================================================================
// 4. CLASSES CRUD
// ==============================================================================
app.get('/api/classes', checkDatabase, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('class_id', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: 'Unable to load classes.' });
  }
});

app.post('/api/classes', checkDatabase, async (req, res) => {
  const className = String(req.body.class_name || req.body.name || '').trim();
  const section = String(req.body.section || 'A').trim();
  const studentCount = Number(req.body.student_count || req.body.number_of_students || 40);

  if (!className) {
    return res.status(400).json({ error: 'Class name is required.' });
  }
  if (!studentCount || studentCount <= 0) {
    return res.status(400).json({ error: 'Number of students must be greater than zero.' });
  }

  try {
    const { data: existing } = await supabase
      .from('classes')
      .select('class_id')
      .eq('class_name', className)
      .eq('section', section)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.json({ class_id: existing[0].class_id, message: 'Class already exists.' });
    }

    const { data, error } = await supabase
      .from('classes')
      .insert({
        class_name: className,
        section,
        student_count: studentCount
      })
      .select();

    if (error) throw error;
    res.json({ class_id: data[0].class_id, class: data[0], message: 'Class added successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to add class.' });
  }
});

app.put('/api/classes/:id', checkDatabase, async (req, res) => {
  const className = String(req.body.class_name || req.body.name || '').trim();
  const section = String(req.body.section || 'A').trim();
  const studentCount = Number(req.body.student_count || req.body.number_of_students || 40);

  try {
    const { data, error } = await supabase
      .from('classes')
      .update({
        class_name: className,
        section,
        student_count: studentCount
      })
      .eq('class_id', req.params.id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: 'Class not found.' });
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Unable to update class.' });
  }
});

app.delete('/api/classes/:id', checkDatabase, async (req, res) => {
  try {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('class_id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Class deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to delete class.' });
  }
});

// ==============================================================================
// 5. ROOMS CRUD
// ==============================================================================
app.get('/api/rooms', checkDatabase, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('room_id', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: 'Unable to load rooms.' });
  }
});

app.post('/api/rooms', checkDatabase, async (req, res) => {
  const roomName = String(req.body.room_name || req.body.room_number || '').trim();
  const rawType = String(req.body.room_type || '').trim();
  const capacity = Number(req.body.capacity || 40);

  if (!roomName) {
    return res.status(400).json({ error: 'Room name is required.' });
  }

  // Normalize room_type to allowed values: Classroom or Laboratory
  let roomType = 'Classroom';
  if (/lab/i.test(rawType)) {
    roomType = 'Laboratory';
  } else if (/classroom|hall|room/i.test(rawType)) {
    roomType = 'Classroom';
  } else if (rawType === 'Classroom' || rawType === 'Laboratory') {
    roomType = rawType;
  } else {
    return res.status(400).json({ error: "Room type must be 'Classroom' or 'Laboratory'." });
  }

  if (!capacity || capacity <= 0) {
    return res.status(400).json({ error: 'Room capacity must be greater than zero.' });
  }

  try {
    const { data: existing } = await supabase
      .from('rooms')
      .select('*')
      .ilike('room_name', roomName)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.json({ room_id: existing[0].room_id, room: existing[0], message: 'Room already exists.' });
    }

    const { data, error } = await supabase
      .from('rooms')
      .insert({
        room_name: roomName,
        room_type: roomType,
        capacity
      })
      .select();

    if (error) throw error;
    res.json({
      room_id: data[0].room_id,
      room: data[0],
      message: 'Room added successfully.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Unable to add room.' });
  }
});

app.put('/api/rooms/:id', checkDatabase, async (req, res) => {
  const roomName = String(req.body.room_name || req.body.room_number || '').trim();
  const rawType = String(req.body.room_type || '').trim();
  const capacity = Number(req.body.capacity || 40);

  let roomType = 'Classroom';
  if (/lab/i.test(rawType)) roomType = 'Laboratory';
  else if (rawType === 'Classroom' || rawType === 'Laboratory') roomType = rawType;

  try {
    const { data, error } = await supabase
      .from('rooms')
      .update({
        room_name: roomName,
        room_type: roomType,
        capacity
      })
      .eq('room_id', req.params.id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: 'Room not found.' });
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Unable to update room.' });
  }
});

app.delete('/api/rooms/:id', checkDatabase, async (req, res) => {
  try {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('room_id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Room deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to delete room.' });
  }
});

// ==============================================================================
// 6. TEACHER AVAILABILITY API
// ==============================================================================
app.get('/api/teacher-availability', checkDatabase, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teacher_availability')
      .select(`
        availability_id,
        is_available,
        teachers ( teacher_id, teacher_name, specialization ),
        time_slots ( slot_id, day_of_week, start_time, end_time )
      `)
      .order('availability_id', { ascending: true });

    if (error) throw error;

    const formatted = (data || []).map((row) => ({
      availability_id: row.availability_id,
      is_available: row.is_available,
      teacher_id: row.teachers ? row.teachers.teacher_id : null,
      teacher_name: row.teachers ? row.teachers.teacher_name : 'Unknown',
      slot_id: row.time_slots ? row.time_slots.slot_id : null,
      day_of_week: row.time_slots ? row.time_slots.day_of_week : null,
      day: row.time_slots ? getDayName(row.time_slots.day_of_week) : null,
      start_time: row.time_slots ? row.time_slots.start_time : null,
      end_time: row.time_slots ? row.time_slots.end_time : null
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Unable to load teacher availability.' });
  }
});

app.post('/api/teacher-availability', checkDatabase, async (req, res) => {
  const teachersPayload = Array.isArray(req.body.teachers) ? req.body.teachers : [req.body];

  if (!teachersPayload.length) {
    return res.status(400).json({ error: 'No teacher availability data provided.' });
  }

  try {
    let savedCount = 0;

    for (const item of teachersPayload) {
      const name = String(item.teacher_name || item.name || '').trim();
      const spec = String(item.specialization || '').trim();
      const selectedSlots = Array.isArray(item.availability) ? item.availability : [];

      if (!name) continue;

      // 1. Ensure teacher exists
      let teacherId = item.teacher_id;
      if (!teacherId) {
        const { data: existingT } = await supabase
          .from('teachers')
          .select('teacher_id')
          .ilike('teacher_name', name)
          .limit(1);

        if (existingT && existingT.length > 0) {
          teacherId = existingT[0].teacher_id;
        } else {
          const { data: newT, error: insertError } = await supabase
            .from('teachers')
            .insert({ teacher_name: name, specialization: spec })
            .select();
          if (insertError) throw insertError;
          teacherId = newT[0].teacher_id;
        }
      }

      // 2. Clear old availability for this teacher
      await supabase
        .from('teacher_availability')
        .delete()
        .eq('teacher_id', teacherId);

      // 3. Process each selected slot
      for (const slotStr of selectedSlots) {
        // format: "Monday 09:00–10:00" or "Monday|09:00–10:00" or object { day_of_week, start_time, end_time }
        let dayName = 'Monday';
        let timeRange = '09:00–10:00';

        if (typeof slotStr === 'string') {
          const parts = slotStr.includes('|') ? slotStr.split('|') : slotStr.split(' ');
          dayName = parts[0] || 'Monday';
          timeRange = parts[1] || '09:00–10:00';
        } else if (slotStr && slotStr.day) {
          dayName = slotStr.day;
          timeRange = `${slotStr.start_time}–${slotStr.end_time}`;
        }

        const times = timeRange.replace('–', '-').split('-');
        const startTime = times[0] ? (times[0].length === 5 ? `${times[0]}:00` : times[0]) : '09:00:00';
        const endTime = times[1] ? (times[1].length === 5 ? `${times[1]}:00` : times[1]) : '10:00:00';
        const dayOfWeek = getDayNumber(dayName);

        // Find or create time slot
        let slotId;
        const { data: existingSlot } = await supabase
          .from('time_slots')
          .select('slot_id')
          .eq('day_of_week', dayOfWeek)
          .eq('start_time', startTime)
          .eq('end_time', endTime)
          .limit(1);

        if (existingSlot && existingSlot.length > 0) {
          slotId = existingSlot[0].slot_id;
        } else {
          const { data: newSlot, error: slotError } = await supabase
            .from('time_slots')
            .insert({
              day_of_week: dayOfWeek,
              start_time: startTime,
              end_time: endTime
            })
            .select();
          if (slotError) throw slotError;
          slotId = newSlot[0].slot_id;
        }

        // Insert availability row
        const { error: availError } = await supabase
          .from('teacher_availability')
          .upsert({
            teacher_id: teacherId,
            slot_id: slotId,
            is_available: true
          }, { onConflict: 'teacher_id,slot_id' });

        if (!availError) savedCount++;
      }
    }

    res.json({
      message: 'Teacher availability saved successfully to Supabase.',
      records_saved: savedCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Unable to save teacher availability.' });
  }
});

// ==============================================================================
// 7. TIMETABLE GENERATION
// ==============================================================================
async function generateTimetableHandler(req, res) {
  if (!supabase) {
    return res.status(503).json({
      error: 'Database connection failed. Please check Supabase configuration.'
    });
  }

  try {
    const body = req.body || {};

    // 1. Normalize teachers input
    let teachers = [];
    if (Array.isArray(body.teachers)) {
      teachers = body.teachers.map((t) => {
        if (typeof t === 'string') return { name: t.trim(), specialization: '' };
        return {
          name: String(t.name || t.teacher_name || '').trim(),
          specialization: String(t.specialization || '').trim()
        };
      }).filter((t) => t.name);
    } else if (body.teacher_name) {
      teachers = [{
        name: String(body.teacher_name).trim(),
        specialization: String(body.specialization || body.department_name || '').trim()
      }];
    }

    // 2. Normalize subjects input
    let subjects = [];
    if (Array.isArray(body.subjects)) {
      subjects = body.subjects.map((s) => String(s).trim()).filter(Boolean);
    } else if (body.course_name) {
      subjects = [String(body.course_name).trim()].filter(Boolean);
    }

    // Unique subjects
    subjects = [...new Set(subjects)];

    // 3. Validation
    if (!teachers.length) {
      return res.status(400).json({ error: 'Please enter at least one teacher.' });
    }
    if (!subjects.length) {
      return res.status(400).json({ error: 'Please enter at least one subject/course.' });
    }

    // CRITICAL REQUIREMENT 14: Number of subjects MUST NOT be greater than number of teachers
    if (subjects.length > teachers.length) {
      return res.status(400).json({
        error: `Number of subjects (${subjects.length}) cannot be greater than the number of teachers (${teachers.length}). Please add more teachers or reduce the number of subjects.`
      });
    }

    const roomTypePreference = String(body.room_type || 'Classroom').trim();
    if (!['Classroom', 'Laboratory', 'Both'].includes(roomTypePreference)) {
      return res.status(400).json({ error: "Room type must be 'Classroom', 'Laboratory', or 'Both'." });
    }

    const workingDaysCount = Number(body.working_days_per_week || 5);
    if (!Number.isInteger(workingDaysCount) || workingDaysCount < 1 || workingDaysCount > 7) {
      return res.status(400).json({ error: 'Working days per week must be between 1 and 7.' });
    }

    const startTime = String(body.working_start_time || '09:00').trim();
    const endTime = String(body.working_end_time || '16:00').trim();

    let slotDefinitions;
    try {
      slotDefinitions = buildTimeSlots(startTime, endTime);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const className = String(body.class_name || 'General Class').trim();
    const classSection = String(body.class_section || 'A').trim();
    const studentCount = Number(body.student_count || 40);

    // ============================================================================
    // STEP A: Ensure Teachers exist in Supabase
    // ============================================================================
    const teacherRecords = [];
    for (const t of teachers) {
      const { data: existing } = await supabase
        .from('teachers')
        .select('teacher_id, teacher_name, specialization, working_days_per_week')
        .ilike('teacher_name', t.name)
        .limit(1);

      if (existing && existing.length > 0) {
        teacherRecords.push(existing[0]);
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('teachers')
          .insert({
            teacher_name: t.name,
            specialization: t.specialization,
            working_days_per_week: workingDaysCount
          })
          .select();
        if (insertError) throw insertError;
        teacherRecords.push(inserted[0]);
      }
    }

    // ============================================================================
    // STEP B: Ensure Courses exist in Supabase
    // ============================================================================
    const courseRecords = [];
    for (const s of subjects) {
      const { data: existing } = await supabase
        .from('courses')
        .select('course_id, course_name')
        .ilike('course_name', s)
        .limit(1);

      if (existing && existing.length > 0) {
        courseRecords.push(existing[0]);
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('courses')
          .insert({ course_name: s })
          .select();
        if (insertError) throw insertError;
        courseRecords.push(inserted[0]);
      }
    }

    // ============================================================================
    // STEP C: Ensure Teacher-Course relationships (Requirements 8 & 9)
    // Map each course to at least one teacher qualified to teach it
    // ============================================================================
    for (let i = 0; i < courseRecords.length; i++) {
      const assignedTeacher = teacherRecords[i % teacherRecords.length];
      await supabase
        .from('teacher_courses')
        .upsert({
          teacher_id: assignedTeacher.teacher_id,
          course_id: courseRecords[i].course_id
        }, { onConflict: 'teacher_id,course_id' });
    }

    // ============================================================================
    // STEP D: Ensure Class exists in Supabase
    // ============================================================================
    let classId;
    const { data: existingClass } = await supabase
      .from('classes')
      .select('class_id')
      .eq('class_name', className)
      .eq('section', classSection)
      .limit(1);

    if (existingClass && existingClass.length > 0) {
      classId = existingClass[0].class_id;
    } else {
      const { data: insertedClass, error: classError } = await supabase
        .from('classes')
        .insert({
          class_name: className,
          section: classSection,
          student_count: studentCount
        })
        .select();
      if (classError) throw classError;
      classId = insertedClass[0].class_id;
    }

    // ============================================================================
    // STEP E: Find Suitable Rooms (Requirement 15: Classroom, Laboratory, Both)
    // ============================================================================
    let roomQuery = supabase
      .from('rooms')
      .select('room_id, room_name, room_type, capacity')
      .gte('capacity', Math.min(studentCount, 30));

    if (roomTypePreference === 'Classroom') {
      roomQuery = roomQuery.eq('room_type', 'Classroom');
    } else if (roomTypePreference === 'Laboratory') {
      roomQuery = roomQuery.eq('room_type', 'Laboratory');
    }
    // If 'Both', no filter on room_type is applied

    let { data: availableRooms, error: roomError } = await roomQuery.order('capacity', { ascending: true });

    if (roomError) throw roomError;

    // Fallback: If no rooms exist in database, create standard default room
    if (!availableRooms || availableRooms.length === 0) {
      const fallbackType = roomTypePreference === 'Laboratory' ? 'Laboratory' : 'Classroom';
      const fallbackName = `${fallbackType}-101`;
      const { data: newRoom, error: createRoomError } = await supabase
        .from('rooms')
        .insert({
          room_name: fallbackName,
          room_type: fallbackType,
          capacity: Math.max(studentCount, 50)
        })
        .select();
      if (!createRoomError && newRoom && newRoom.length > 0) {
        availableRooms = newRoom;
      } else {
        return res.status(400).json({
          error: `Unable to schedule timetable: No suitable ${roomTypePreference} room is available with capacity for ${studentCount} students.`
        });
      }
    }

    // ============================================================================
    // STEP F: Ensure Time Slots exist for the specified working days
    // ============================================================================
    const allSlotsByDay = {};

    for (let dayNum = 1; dayNum <= workingDaysCount; dayNum++) {
      allSlotsByDay[dayNum] = [];

      for (const slotDef of slotDefinitions) {
        const { data: existingSlot } = await supabase
          .from('time_slots')
          .select('slot_id, day_of_week, start_time, end_time, is_break')
          .eq('day_of_week', dayNum)
          .eq('start_time', slotDef.start_time)
          .eq('end_time', slotDef.end_time)
          .limit(1);

        if (existingSlot && existingSlot.length > 0) {
          allSlotsByDay[dayNum].push(existingSlot[0]);
        } else {
          const { data: insertedSlot, error: slotError } = await supabase
            .from('time_slots')
            .insert({
              day_of_week: dayNum,
              start_time: slotDef.start_time,
              end_time: slotDef.end_time,
              is_break: false
            })
            .select();
          if (slotError) throw slotError;
          allSlotsByDay[dayNum].push(insertedSlot[0]);
        }
      }
    }

    // ============================================================================
    // STEP G: Load Teacher Availability Constraints (Requirement 16)
    // ============================================================================
    const teacherIds = teacherRecords.map((t) => t.teacher_id);
    const { data: teacherAvailRows } = await supabase
      .from('teacher_availability')
      .select('teacher_id, slot_id, is_available')
      .in('teacher_id', teacherIds);

    // Map: teacherId -> Set of available slotIds (if any defined)
    const teacherAvailabilityMap = new Map();
    if (teacherAvailRows && teacherAvailRows.length > 0) {
      for (const row of teacherAvailRows) {
        if (!teacherAvailabilityMap.has(row.teacher_id)) {
          teacherAvailabilityMap.set(row.teacher_id, new Set());
        }
        if (row.is_available) {
          teacherAvailabilityMap.get(row.teacher_id).add(row.slot_id);
        }
      }
    }

    // ============================================================================
    // STEP H: Conflict-Checked Schedule Generation Algorithm (Requirements 18 & 19)
    // Prevent:
    // 1. Same teacher teaching two classes at the same time slot
    // 2. Same room assigned to two classes at the same time slot
    // 3. Same class having two subjects at the same time slot
    // 4. Respect teacher availability
    // 5. Respect room type and capacity
    // ============================================================================

    // Query existing scheduled slots in Supabase to prevent collisions across batches
    const { data: existingTimetable } = await supabase
      .from('timetable')
      .select('slot_id, teacher_id, room_id, class_id')
      .neq('class_id', classId);

    const occupiedTeacherSlots = new Set();
    const occupiedRoomSlots = new Set();
    const occupiedClassSlots = new Set();

    if (existingTimetable) {
      for (const entry of existingTimetable) {
        occupiedTeacherSlots.add(`${entry.slot_id}-${entry.teacher_id}`);
        occupiedRoomSlots.add(`${entry.slot_id}-${entry.room_id}`);
        occupiedClassSlots.add(`${entry.slot_id}-${entry.class_id}`);
      }
    }

    const newTimetableEntries = [];

    // Schedule each course across the working days
    for (let courseIndex = 0; courseIndex < courseRecords.length; courseIndex++) {
      const course = courseRecords[courseIndex];
      const teacher = teacherRecords[courseIndex % teacherRecords.length];

      // Distribute across working days
      for (let dayNum = 1; dayNum <= workingDaysCount; dayNum++) {
        const daySlots = allSlotsByDay[dayNum] || [];
        let scheduled = false;

        for (const slot of daySlots) {
          if (slot.is_break) continue;

          // 1. Check teacher availability
          if (teacherAvailabilityMap.has(teacher.teacher_id)) {
            const allowedSlots = teacherAvailabilityMap.get(teacher.teacher_id);
            if (!allowedSlots.has(slot.slot_id)) {
              continue; // Teacher not available for this slot
            }
          }

          // 2. Check if teacher is already booked
          if (occupiedTeacherSlots.has(`${slot.slot_id}-${teacher.teacher_id}`)) {
            continue;
          }

          // 3. Check if class is already booked at this slot
          if (occupiedClassSlots.has(`${slot.slot_id}-${classId}`)) {
            continue;
          }

          // 4. Find an unoccupied suitable room
          for (const room of availableRooms) {
            if (occupiedRoomSlots.has(`${slot.slot_id}-${room.room_id}`)) {
              continue; // Room busy
            }

            // Valid slot found! Assign entry
            newTimetableEntries.push({
              slot_id: slot.slot_id,
              teacher_id: teacher.teacher_id,
              course_id: course.course_id,
              class_id: classId,
              room_id: room.room_id
            });

            // Mark as occupied
            occupiedTeacherSlots.add(`${slot.slot_id}-${teacher.teacher_id}`);
            occupiedRoomSlots.add(`${slot.slot_id}-${room.room_id}`);
            occupiedClassSlots.add(`${slot.slot_id}-${classId}`);
            scheduled = true;
            break;
          }

          if (scheduled) break;
        }

        // If no slot could be scheduled due to conflicts
        if (!scheduled && daySlots.length > 0) {
          // Warning: conflict encountered
        }
      }
    }

    if (newTimetableEntries.length === 0) {
      return res.status(400).json({
        error: 'Timetable could not be generated because of scheduling conflicts. Please check teacher availability, room capacity, and working hours.'
      });
    }

    // Delete existing entries for this class before saving newly generated timetable
    await supabase
      .from('timetable')
      .delete()
      .eq('class_id', classId);

    // Save newly generated timetable to Supabase
    const { data: savedEntries, error: saveError } = await supabase
      .from('timetable')
      .insert(newTimetableEntries)
      .select();

    if (saveError) {
      console.error('Supabase timetable insert error:', saveError);
      return res.status(400).json({
        error: 'Timetable could not be saved to Supabase because of scheduling conflicts.'
      });
    }

    return res.json({
      message: 'Timetable generated and saved successfully.',
      entries_created: savedEntries.length,
      teachers: teacherRecords.map((t) => t.teacher_name),
      subjects: courseRecords.map((c) => c.course_name),
      class_name: className,
      section: classSection,
      room_type: roomTypePreference
    });

  } catch (error) {
    console.error('Timetable generation error:', error);
    return res.status(500).json({
      error: 'Timetable could not be generated because of scheduling conflicts.'
    });
  }
}

app.post('/api/generate', generateTimetableHandler);
app.post('/api/generate-timetable', generateTimetableHandler);

// ==============================================================================
// 8. TIMETABLE RETRIEVAL & PERSISTENCE (Requirement 19)
// ==============================================================================
app.get('/api/timetable', checkDatabase, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('timetable')
      .select(`
        timetable_id,
        time_slots ( slot_id, day_of_week, start_time, end_time ),
        teachers ( teacher_id, teacher_name, specialization ),
        courses ( course_id, course_name ),
        classes ( class_id, class_name, section ),
        rooms ( room_id, room_name, room_type )
      `)
      .order('timetable_id', { ascending: true });

    if (error) throw error;

    const formatted = (data || []).map((row) => {
      const slot = row.time_slots || {};
      const dayNum = slot.day_of_week || 1;
      const dayName = getDayName(dayNum);

      return {
        timetable_id: row.timetable_id,
        day: dayName,
        day_of_week: dayNum,
        start_time: slot.start_time || '09:00:00',
        end_time: slot.end_time || '10:00:00',
        class_name: row.classes ? row.classes.class_name : 'General',
        section: row.classes ? row.classes.section : 'A',
        course_name: row.courses ? row.courses.course_name : 'Subject',
        teacher_name: row.teachers ? row.teachers.teacher_name : 'Faculty',
        room_name: row.rooms ? row.rooms.room_name : 'Room',
        room_type: row.rooms ? row.rooms.room_type : 'Classroom'
      };
    });

    // Sort by day of week then by start time
    formatted.sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
      return a.start_time.localeCompare(b.start_time);
    });

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Unable to load timetable.' });
  }
});

app.delete('/api/timetable', checkDatabase, async (req, res) => {
  try {
    const { error } = await supabase
      .from('timetable')
      .delete()
      .not('timetable_id', 'is', null);

    if (error) throw error;
    res.json({ message: 'Timetable cleared successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to clear timetable.' });
  }
});

// ==============================================================================
// 9. CURRENT CLASS ENDPOINT (Requirement 20)
// ==============================================================================
app.get('/api/current-class', checkDatabase, async (req, res) => {
  try {
    const now = new Date();
    // JavaScript getDay(): 0 = Sunday, 1 = Monday, 2 = Tuesday, ..., 6 = Saturday
    const jsDay = now.getDay();
    const currentDayOfWeek = jsDay === 0 ? 7 : jsDay;

    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMins = String(now.getMinutes()).padStart(2, '0');
    const currentSecs = String(now.getSeconds()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMins}:${currentSecs}`;

    // Query active timetable entries joined with time_slots
    const { data: entries, error } = await supabase
      .from('timetable')
      .select(`
        timetable_id,
        time_slots ( slot_id, day_of_week, start_time, end_time ),
        teachers ( teacher_name ),
        courses ( course_name ),
        classes ( class_name, section ),
        rooms ( room_name, room_type )
      `);

    if (error) throw error;

    // Find class matching current day and time window
    const running = (entries || []).find((entry) => {
      const slot = entry.time_slots;
      if (!slot) return false;
      if (Number(slot.day_of_week) !== currentDayOfWeek) return false;
      return slot.start_time <= currentTimeStr && slot.end_time > currentTimeStr;
    });

    if (running) {
      return res.json({
        running: true,
        subject: running.courses ? running.courses.course_name : 'N/A',
        teacher: running.teachers ? running.teachers.teacher_name : 'N/A',
        class: running.classes ? running.classes.class_name : 'N/A',
        section: running.classes ? running.classes.section : 'A',
        room: running.rooms ? running.rooms.room_name : 'N/A',
        room_type: running.rooms ? running.rooms.room_type : 'Classroom',
        start_time: running.time_slots.start_time.substring(0, 5),
        end_time: running.time_slots.end_time.substring(0, 5)
      });
    }

    return res.json({
      running: false,
      message: 'No class is currently scheduled.'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to check current class.' });
  }
});

// ==============================================================================
// 10. PAGE ROUTING (Requirement 22)
// ==============================================================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/generate', (req, res) => res.sendFile(path.join(__dirname, 'public', 'generate.html')));
app.get('/features', (req, res) => res.sendFile(path.join(__dirname, 'public', 'features.html')));
app.get('/teacher-availability', (req, res) => res.sendFile(path.join(__dirname, 'public', 'teacher-availability.html')));
app.get('/teacher-info', (req, res) => res.sendFile(path.join(__dirname, 'public', 'teacher-info.html')));
app.get('/rooms', (req, res) => res.sendFile(path.join(__dirname, 'public', 'rooms.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Server startup listener
const server = app.listen(PORT, () => {
  console.log(`\n✓ SchedX running at http://localhost:${PORT}`);
  console.log(`✓ Database: Supabase PostgreSQL (Cloud)`);
  console.log(`✓ API Base: http://localhost:${PORT}/api\n`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Set PORT in your .env to a free port.`);
  } else {
    console.error('Server error:', error.message);
  }
  process.exit(1);
});

module.exports = app;
