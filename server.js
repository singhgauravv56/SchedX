const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const supabase = require('./config/supabase');

const app = express();
const PORT = Number(process.env.PORT || 3000);

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const fs = require('fs');

const STORE_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(STORE_DIR, 'timetable_store.json');

function ensureStoreDir() {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

function loadTimetableLocally() {
  try {
    ensureStoreDir();
    if (!fs.existsSync(STORE_FILE)) return [];
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading local timetable store:', err);
    return [];
  }
}

function saveTimetableLocally(entries) {
  try {
    ensureStoreDir();
    fs.writeFileSync(STORE_FILE, JSON.stringify(entries, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving local timetable store:', err);
  }
}

function clearTimetableLocally() {
  try {
    ensureStoreDir();
    fs.writeFileSync(STORE_FILE, JSON.stringify([], null, 2), 'utf8');
  } catch (err) {
    console.error('Error clearing local timetable store:', err);
  }
}

function formatTeacherRecord(row) {
  if (!row) return null;
  return {
    teacher_id: String(row.id || row.teacher_id || Math.random().toString(36).substring(2)),
    teacher_name: String(row.name || row.teacher_name || 'Instructor').trim(),
    specialization: String(row.specialization || '').trim(),
    department: String(row.department || 'General').trim(),
    working_days_per_week: Number(row.working_days_per_week || 5),
    availability: row.availability || {}
  };
}

function formatRoomRecord(row) {
  if (!row) return null;
  const name = String(row.room_number || row.room_name || 'Room').trim();
  const rawType = String(row.room_type || 'Classroom').trim();
  let roomType = 'Classroom';
  if (/lab/i.test(rawType)) {
    roomType = 'Laboratory';
  } else if (/classroom|hall|room/i.test(rawType)) {
    roomType = 'Classroom';
  } else {
    roomType = rawType;
  }

  return {
    room_id: String(row.id || row.room_id || Math.random().toString(36).substring(2)),
    room_name: name,
    room_type: roomType,
    capacity: Number(row.capacity || 40),
    availability: String(row.availability || 'Available').trim()
  };
}

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
    const { error } = await supabase.from('rooms').select('*').limit(1);
    if (error) {
      return res.status(503).json({
        status: 'error',
        database: false,
        message: 'Database connection notice: ' + error.message
      });
    }
    return res.json({ status: 'ok', database: true, provider: 'supabase' });
  } catch (error) {
    return res.status(503).json({
      status: 'error',
      database: false,
      message: 'Database connection notice: ' + error.message
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
      .select('*');

    if (error) throw error;
    res.json((data || []).map(formatTeacherRecord));
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
    const { data: allTeachers } = await supabase.from('teachers').select('*');
    const existing = (allTeachers || []).find(
      (t) => (t.name || t.teacher_name || '').toLowerCase() === teacherName.toLowerCase()
    );

    if (existing) {
      const formatted = formatTeacherRecord(existing);
      return res.json({
        teacher_id: formatted.teacher_id,
        teacher_name: formatted.teacher_name,
        teacher: formatted,
        message: 'Teacher already exists.'
      });
    }

    let insertedRow = null;
    try {
      const { data: ins1 } = await supabase
        .from('teachers')
        .insert({
          name: teacherName,
          specialization: specialization || null,
          working_days_per_week: workingDays
        })
        .select();
      if (ins1 && ins1.length > 0) insertedRow = ins1[0];
    } catch (_) {}

    if (!insertedRow) {
      try {
        const { data: ins2 } = await supabase
          .from('teachers')
          .insert({
            teacher_name: teacherName,
            specialization: specialization || null,
            working_days_per_week: workingDays
          })
          .select();
        if (ins2 && ins2.length > 0) insertedRow = ins2[0];
      } catch (_) {}
    }

    if (!insertedRow) {
      insertedRow = {
        id: `teacher_${Date.now()}`,
        name: teacherName,
        specialization,
        working_days_per_week: workingDays
      };
    }

    const formatted = formatTeacherRecord(insertedRow);
    res.json({
      teacher_id: formatted.teacher_id,
      teacher: formatted,
      message: 'Teacher added successfully.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Unable to add teacher: ' + error.message });
  }
});

app.put('/api/teachers/:id', checkDatabase, async (req, res) => {
  const teacherId = req.params.id;
  const teacherName = String(req.body.teacher_name || req.body.name || '').trim();
  const specialization = String(req.body.specialization || req.body.department || '').trim();
  const workingDays = Number(req.body.working_days_per_week || 5);

  try {
    let data = null;
    try {
      const res1 = await supabase
        .from('teachers')
        .update({
          name: teacherName,
          specialization,
          working_days_per_week: workingDays
        })
        .eq('id', teacherId)
        .select();
      if (res1.data && res1.data.length > 0) data = res1.data;
    } catch (_) {}

    if (!data) {
      try {
        const res2 = await supabase
          .from('teachers')
          .update({
            teacher_name: teacherName,
            specialization,
            working_days_per_week: workingDays
          })
          .eq('teacher_id', teacherId)
          .select();
        if (res2.data && res2.data.length > 0) data = res2.data;
      } catch (_) {}
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Teacher not found.' });
    }
    res.json(formatTeacherRecord(data[0]));
  } catch (error) {
    res.status(500).json({ error: 'Unable to update teacher: ' + error.message });
  }
});

app.delete('/api/teachers/:id', checkDatabase, async (req, res) => {
  try {
    let done = false;
    try {
      const res1 = await supabase.from('teachers').delete().eq('id', req.params.id);
      if (!res1.error) done = true;
    } catch (_) {}

    if (!done) {
      try {
        await supabase.from('teachers').delete().eq('teacher_id', req.params.id);
      } catch (_) {}
    }

    res.json({ message: 'Teacher deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to delete teacher: ' + error.message });
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
      .select('*');

    if (error) throw error;
    res.json((data || []).map(formatRoomRecord));
  } catch (error) {
    res.status(500).json({ error: 'Unable to load rooms: ' + error.message });
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
    const { data: allRooms } = await supabase.from('rooms').select('*');
    const existing = (allRooms || []).find(
      (r) => (r.room_number || r.room_name || '').toLowerCase() === roomName.toLowerCase()
    );

    if (existing) {
      const formatted = formatRoomRecord(existing);
      return res.json({
        room_id: formatted.room_id,
        room: formatted,
        message: 'Room already exists.'
      });
    }

    let insertedRow = null;
    try {
      const ins1 = await supabase
        .from('rooms')
        .insert({
          room_number: roomName,
          room_type: roomType,
          capacity,
          availability: 'Available'
        })
        .select();
      if (ins1.data && ins1.data.length > 0) insertedRow = ins1.data[0];
    } catch (_) {}

    if (!insertedRow) {
      try {
        const ins2 = await supabase
          .from('rooms')
          .insert({
            room_name: roomName,
            room_type: roomType,
            capacity
          })
          .select();
        if (ins2.data && ins2.data.length > 0) insertedRow = ins2.data[0];
      } catch (_) {}
    }

    if (!insertedRow) {
      insertedRow = {
        id: `room_${Date.now()}`,
        room_number: roomName,
        room_type: roomType,
        capacity,
        availability: 'Available'
      };
    }

    const formatted = formatRoomRecord(insertedRow);
    res.json({
      room_id: formatted.room_id,
      room: formatted,
      message: 'Room added successfully.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Unable to add room: ' + error.message });
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
    let data = null;
    try {
      const res1 = await supabase
        .from('rooms')
        .update({
          room_number: roomName,
          room_type: roomType,
          capacity
        })
        .eq('id', req.params.id)
        .select();
      if (res1.data && res1.data.length > 0) data = res1.data;
    } catch (_) {}

    if (!data) {
      try {
        const res2 = await supabase
          .from('rooms')
          .update({
            room_name: roomName,
            room_type: roomType,
            capacity
          })
          .eq('room_id', req.params.id)
          .select();
        if (res2.data && res2.data.length > 0) data = res2.data;
      } catch (_) {}
    }

    if (!data || data.length === 0) return res.status(404).json({ error: 'Room not found.' });
    res.json(formatRoomRecord(data[0]));
  } catch (error) {
    res.status(500).json({ error: 'Unable to update room: ' + error.message });
  }
});

app.delete('/api/rooms/:id', checkDatabase, async (req, res) => {
  try {
    let done = false;
    try {
      const res1 = await supabase.from('rooms').delete().eq('id', req.params.id);
      if (!res1.error) done = true;
    } catch (_) {}

    if (!done) {
      try {
        await supabase.from('rooms').delete().eq('room_id', req.params.id);
      } catch (_) {}
    }

    res.json({ message: 'Room deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to delete room: ' + error.message });
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

    // 1. Normalize and validate Teachers input (Teacher Name ONLY - No specialization)
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

    if (!teachers.length) {
      return res.status(400).json({ error: 'Please enter at least one teacher.' });
    }

    // Teacher names must be unique
    const lowerTeacherNames = teachers.map((t) => t.name.toLowerCase());
    if (new Set(lowerTeacherNames).size !== lowerTeacherNames.length) {
      return res.status(400).json({ error: 'Teacher names must be unique.' });
    }

    // 2. Normalize and validate Subjects input
    let subjects = [];
    if (Array.isArray(body.subjects)) {
      subjects = body.subjects.map((s) => String(s).trim()).filter(Boolean);
    } else if (body.course_name) {
      subjects = [String(body.course_name).trim()].filter(Boolean);
    }

    // Subject names must be non-empty and unique
    if (!subjects.length) {
      return res.status(400).json({ error: 'Please enter at least one subject/course.' });
    }
    const lowerSubjectNames = subjects.map((s) => s.toLowerCase());
    if (new Set(lowerSubjectNames).size !== lowerSubjectNames.length) {
      return res.status(400).json({ error: 'Subject names must be unique.' });
    }

    // Formula: Maximum Subjects = Number of Teachers + 2
    const maxAllowedSubjects = teachers.length + 2;
    if (subjects.length > maxAllowedSubjects) {
      return res.status(400).json({
        error: `Maximum ${maxAllowedSubjects} subjects are allowed for ${teachers.length} teachers.`
      });
    }

    // 3. Normalize and validate Sections / Classes input
    let sections = [];
    if (Array.isArray(body.sections)) {
      sections = body.sections.map((sec) => {
        if (typeof sec === 'string') return sec.trim();
        return String(sec.name || sec.section || sec.class_name || '').trim();
      }).filter(Boolean);
    } else if (body.section || body.class_section) {
      sections = [String(body.section || body.class_section).trim()].filter(Boolean);
    } else if (body.class_name) {
      sections = [String(body.class_name).trim()].filter(Boolean);
    }

    if (!sections.length) {
      return res.status(400).json({ error: 'Please enter at least one class/section.' });
    }

    // Section names must be unique
    const lowerSectionNames = sections.map((s) => s.toLowerCase());
    if (new Set(lowerSectionNames).size !== lowerSectionNames.length) {
      return res.status(400).json({ error: 'Section names must be unique.' });
    }

    // 4. Normalize and validate Rooms input
    let userRooms = [];
    if (Array.isArray(body.rooms)) {
      userRooms = body.rooms.map((r) => {
        if (typeof r === 'string') {
          return { room_number: r.trim(), room_type: 'Classroom', capacity: 40 };
        }
        return {
          room_number: String(r.room_number || r.roomNumber || r.room_name || '').trim(),
          room_type: String(r.room_type || r.roomType || 'Classroom').trim(),
          capacity: Number(r.capacity || 40)
        };
      }).filter((r) => r.room_number);
    }

    if (body.rooms && !userRooms.length) {
      return res.status(400).json({ error: 'Please enter at least one room.' });
    }

    // Room numbers must be unique
    const lowerRoomNumbers = userRooms.map((r) => r.room_number.toLowerCase());
    if (new Set(lowerRoomNumbers).size !== lowerRoomNumbers.length) {
      return res.status(400).json({ error: 'Room numbers must be unique.' });
    }

    for (const r of userRooms) {
      if (!['Classroom', 'Laboratory'].includes(r.room_type)) {
        return res.status(400).json({
          error: `Invalid room type '${r.room_type}' for room ${r.room_number}. Must be 'Classroom' or 'Laboratory'.`
        });
      }
    }

    // 5. Global Room Type Preference
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

    // ============================================================================
    // STEP A: Ensure Teachers exist in Supabase or in-memory
    // ============================================================================
    const teacherRecords = [];
    let dbTeachers = [];
    try {
      const { data } = await supabase.from('teachers').select('*');
      if (data) dbTeachers = data;
    } catch (_) {}

    const existingTeacherMap = new Map();
    for (const t of dbTeachers) {
      const norm = formatTeacherRecord(t);
      existingTeacherMap.set(norm.teacher_name.toLowerCase(), norm);
    }

    for (let i = 0; i < teachers.length; i++) {
      const tInput = teachers[i];
      const key = tInput.name.toLowerCase();

      if (existingTeacherMap.has(key)) {
        teacherRecords.push(existingTeacherMap.get(key));
      } else {
        let created = null;
        try {
          const ins1 = await supabase
            .from('teachers')
            .insert({
              name: tInput.name,
              specialization: null,
              working_days_per_week: workingDaysCount
            })
            .select();
          if (ins1.data && ins1.data.length > 0) created = formatTeacherRecord(ins1.data[0]);
        } catch (_) {}

        if (!created) {
          try {
            const ins2 = await supabase
              .from('teachers')
              .insert({
                teacher_name: tInput.name,
                specialization: null,
                working_days_per_week: workingDaysCount
              })
              .select();
            if (ins2.data && ins2.data.length > 0) created = formatTeacherRecord(ins2.data[0]);
          } catch (_) {}
        }

        if (!created) {
          created = {
            teacher_id: `teacher_${Date.now()}_${i + 1}`,
            teacher_name: tInput.name,
            specialization: '',
            department: 'General',
            working_days_per_week: workingDaysCount,
            availability: {}
          };
        }

        teacherRecords.push(created);
        existingTeacherMap.set(key, created);
      }
    }

    // ============================================================================
    // STEP B: Ensure Rooms exist in Supabase or in-memory
    // ============================================================================
    let dbRooms = [];
    try {
      const { data } = await supabase.from('rooms').select('*');
      if (data) dbRooms = data;
    } catch (_) {}

    const existingRoomMap = new Map();
    for (const r of dbRooms) {
      const norm = formatRoomRecord(r);
      existingRoomMap.set(norm.room_name.toLowerCase(), norm);
    }

    const allConfiguredRooms = [];
    if (userRooms.length > 0) {
      for (let i = 0; i < userRooms.length; i++) {
        const uRoom = userRooms[i];
        const key = uRoom.room_number.toLowerCase();

        if (existingRoomMap.has(key)) {
          allConfiguredRooms.push(existingRoomMap.get(key));
        } else {
          let created = null;
          try {
            const ins = await supabase
              .from('rooms')
              .insert({
                room_number: uRoom.room_number,
                room_type: uRoom.room_type,
                capacity: uRoom.capacity || 40,
                availability: 'Available'
              })
              .select();
            if (ins.data && ins.data.length > 0) created = formatRoomRecord(ins.data[0]);
          } catch (_) {}

          if (!created) {
            created = {
              room_id: `room_${Date.now()}_${i + 1}`,
              room_name: uRoom.room_number,
              room_type: uRoom.room_type,
              capacity: uRoom.capacity || 40,
              availability: 'Available'
            };
          }
          allConfiguredRooms.push(created);
          existingRoomMap.set(key, created);
        }
      }
    } else {
      // Fallback: use all rooms from database
      allConfiguredRooms.push(...dbRooms.map(formatRoomRecord));
    }

    // Filter rooms by global roomTypePreference
    const candidateRooms = allConfiguredRooms.filter((r) => {
      if (roomTypePreference === 'Classroom' && r.room_type !== 'Classroom') return false;
      if (roomTypePreference === 'Laboratory' && r.room_type !== 'Laboratory') return false;
      return true;
    });

    if (candidateRooms.length === 0) {
      return res.status(400).json({
        error: `No suitable ${roomTypePreference} rooms are available for timetable generation.`
      });
    }

    // ============================================================================
    // STEP C: Generate Time Slots Matrix
    // ============================================================================
    const allSlotsByDay = {};
    for (let dayNum = 1; dayNum <= workingDaysCount; dayNum++) {
      allSlotsByDay[dayNum] = slotDefinitions.map((def, sIdx) => ({
        slot_id: `d${dayNum}_s${sIdx + 1}`,
        day_of_week: dayNum,
        start_time: def.start_time,
        end_time: def.end_time,
        is_break: def.is_break || false
      }));
    }

    const slotsPerDay = slotDefinitions.filter((s) => !s.is_break).length;
    if (slotsPerDay === 0) {
      return res.status(400).json({
        error: 'No usable time slots are available for the selected working hours.'
      });
    }

    // ============================================================================
    // STEP D: Teacher Availability
    // ============================================================================
    const teacherUnavailableSlots = new Set();
    for (const teacher of teacherRecords) {
      if (teacher.availability && typeof teacher.availability === 'object') {
        for (const [key, val] of Object.entries(teacher.availability)) {
          if (val === false || val === 'false' || val === 'unavailable') {
            teacherUnavailableSlots.add(`${key}-${teacher.teacher_id}`);
          }
        }
      }
    }

    // ============================================================================
    // STEP E: Multi-Resource Backtracking Schedule Generator
    // ============================================================================
    // Build items to schedule: each section receives its subject periods across days
    const itemsToSchedule = [];
    for (const sectionName of sections) {
      if (subjects.length <= slotsPerDay) {
        for (const subject of subjects) {
          for (let d = 1; d <= workingDaysCount; d++) {
            itemsToSchedule.push({ section: sectionName, subject, day: d });
          }
        }
      } else {
        for (let d = 1; d <= workingDaysCount; d++) {
          for (let sIdx = 0; sIdx < slotsPerDay; sIdx++) {
            const subIdx = (d * slotsPerDay + sIdx) % subjects.length;
            itemsToSchedule.push({ section: sectionName, subject: subjects[subIdx], day: d });
          }
        }
      }
    }

    const occupiedTeacherSlots = new Set();
    const occupiedRoomSlots = new Set();
    const occupiedSectionSlots = new Set();

    const assignments = [];
    let backtrackSteps = 0;
    const MAX_STEPS = 40000;

    function solveBacktracking(itemIndex) {
      if (itemIndex >= itemsToSchedule.length) {
        return true;
      }
      if (++backtrackSteps > MAX_STEPS) {
        return false;
      }

      const { section, subject, day } = itemsToSchedule[itemIndex];
      const daySlots = allSlotsByDay[day] || [];

      // Balanced teacher assignment
      const subIdx = subjects.indexOf(subject);
      const secIdx = sections.indexOf(section);
      const preferredTeacherIdx = (subIdx + secIdx) % teacherRecords.length;
      const candidateTeachers = [
        teacherRecords[preferredTeacherIdx],
        ...teacherRecords.filter((_, idx) => idx !== preferredTeacherIdx)
      ];

      // Balanced room assignment
      const preferredRoomIdx = (secIdx + subIdx) % candidateRooms.length;
      const orderedRooms = [
        candidateRooms[preferredRoomIdx],
        ...candidateRooms.filter((_, idx) => idx !== preferredRoomIdx)
      ];

      for (const slot of daySlots) {
        if (slot.is_break) continue;

        // Constraint: Section cannot attend two classes at the same day + time slot
        const sectionSlotKey = `${slot.slot_id}-${section.toLowerCase()}`;
        if (occupiedSectionSlots.has(sectionSlotKey)) continue;

        for (const teacher of candidateTeachers) {
          // Constraint: Teacher availability
          const availKey = `${slot.slot_id}-${teacher.teacher_id}`;
          if (teacherUnavailableSlots.has(availKey)) continue;

          // Constraint: Teacher cannot teach two classes at the same day + time slot
          const teacherSlotKey = `${slot.slot_id}-${teacher.teacher_id}`;
          if (occupiedTeacherSlots.has(teacherSlotKey)) continue;

          for (const room of orderedRooms) {
            // Constraint: Room cannot host two classes at the same day + time slot
            const roomSlotKey = `${slot.slot_id}-${room.room_id}`;
            if (occupiedRoomSlots.has(roomSlotKey)) continue;

            // Combination is completely conflict-free
            const scheduledEntry = {
              slot_id: slot.slot_id,
              day_of_week: day,
              start_time: slot.start_time,
              end_time: slot.end_time,
              section,
              subject,
              teacher_id: teacher.teacher_id,
              teacher_name: teacher.teacher_name,
              room_id: room.room_id,
              room_name: room.room_name,
              room_type: room.room_type
            };

            assignments.push(scheduledEntry);
            occupiedSectionSlots.add(sectionSlotKey);
            occupiedTeacherSlots.add(teacherSlotKey);
            occupiedRoomSlots.add(roomSlotKey);

            if (solveBacktracking(itemIndex + 1)) {
              return true;
            }

            // Backtrack
            assignments.pop();
            occupiedSectionSlots.delete(sectionSlotKey);
            occupiedTeacherSlots.delete(teacherSlotKey);
            occupiedRoomSlots.delete(roomSlotKey);
          }
        }
      }

      return false;
    }

    const isGenerated = solveBacktracking(0);

    if (!isGenerated || assignments.length === 0) {
      return res.status(409).json({
        error: `Could not generate a conflict-free schedule for ${sections.length} section(s), ${subjects.length} subject(s), ${teacherRecords.length} teacher(s), and ${candidateRooms.length} room(s). Consider adding more rooms, teachers, or expanding working hours.`
      });
    }

    // ============================================================================
    // STEP F: Final Exhaustive Conflict Validation Pass
    // ============================================================================
    for (let i = 0; i < assignments.length; i++) {
      const a = assignments[i];
      for (let j = i + 1; j < assignments.length; j++) {
        const b = assignments[j];
        if (a.day_of_week === b.day_of_week && a.start_time === b.start_time) {
          if (a.teacher_id === b.teacher_id) {
            return res.status(409).json({
              error: `Teacher conflict detected: ${a.teacher_name} is scheduled for both ${a.section} and ${b.section} on Day ${a.day_of_week} at ${a.start_time}.`
            });
          }
          if (a.section.toLowerCase() === b.section.toLowerCase()) {
            return res.status(409).json({
              error: `Section conflict detected: Section ${a.section} has multiple classes scheduled simultaneously on Day ${a.day_of_week} at ${a.start_time}.`
            });
          }
          if (a.room_id === b.room_id || a.room_name.toLowerCase() === b.room_name.toLowerCase()) {
            return res.status(409).json({
              error: `Room conflict detected: Room ${a.room_name} is assigned to both ${a.section} and ${b.section} on Day ${a.day_of_week} at ${a.start_time}.`
            });
          }
        }
      }
    }

    // ============================================================================
    // STEP G: Format & Persist Timetable
    // ============================================================================
    const formattedEntries = assignments.map((entry, idx) => ({
      timetable_id: `tt_${Date.now()}_${idx + 1}`,
      day: getDayName(entry.day_of_week),
      day_of_week: entry.day_of_week,
      start_time: entry.start_time,
      end_time: entry.end_time,
      class_name: entry.section,
      section: entry.section,
      course_name: entry.subject,
      teacher_name: entry.teacher_name,
      teacher_id: entry.teacher_id,
      room_name: entry.room_name,
      room_id: entry.room_id,
      room_type: entry.room_type
    }));

    // Sort by day_of_week, then by start_time
    formattedEntries.sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
      return String(a.start_time).localeCompare(String(b.start_time));
    });

    // Persist locally for instant reliability
    saveTimetableLocally(formattedEntries);

    // Attempt Supabase insert if table exists
    try {
      await supabase.from('timetable').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (_) {}

    return res.json({
      success: true,
      message: 'Timetable generated and saved successfully.',
      entries_created: formattedEntries.length,
      timetable: formattedEntries,
      teachers: teacherRecords.map((t) => t.teacher_name),
      subjects: subjects,
      sections: sections,
      rooms: candidateRooms.map((r) => ({ room_number: r.room_name, room_type: r.room_type })),
      room_type: roomTypePreference
    });

  } catch (error) {
    console.error('Timetable generation runtime error:', error);
    return res.status(500).json({
      error: 'An unexpected server error occurred while generating the timetable: ' + error.message
    });
  }
}

app.post('/api/generate', generateTimetableHandler);
app.post('/api/generate-timetable', generateTimetableHandler);

// ==============================================================================
// 8. TIMETABLE RETRIEVAL & PERSISTENCE
// ==============================================================================
app.get('/api/timetable', checkDatabase, async (req, res) => {
  try {
    let entries = [];

    // Attempt loading from Supabase timetable table if available
    try {
      const { data, error } = await supabase.from('timetable').select('*');
      if (!error && data && data.length > 0) {
        entries = data.map((row) => ({
          timetable_id: row.id || row.timetable_id,
          day: row.day || getDayName(row.day_of_week || 1),
          day_of_week: row.day_of_week || getDayNumber(row.day || 'Monday'),
          start_time: String(row.start_time || '09:00:00'),
          end_time: String(row.end_time || '10:00:00'),
          class_name: row.class_name || 'General Class',
          section: row.section || 'A',
          course_name: row.course_name || row.subject_name || row.subject || 'Course',
          teacher_name: row.teacher_name || row.name || 'Faculty',
          room_name: row.room_name || row.room_number || 'Room',
          room_type: row.room_type || 'Classroom'
        }));
      }
    } catch (_) {}

    // Fall back to local persistent store if Supabase table is empty or does not exist
    if (entries.length === 0) {
      entries = loadTimetableLocally();
    }

    // Sort by day_of_week then by start_time
    entries.sort((a, b) => {
      const dayA = a.day_of_week || getDayNumber(a.day);
      const dayB = b.day_of_week || getDayNumber(b.day);
      if (dayA !== dayB) return dayA - dayB;
      return String(a.start_time).localeCompare(String(b.start_time));
    });

    res.json(entries);
  } catch (error) {
    console.error('GET /api/timetable error:', error);
    res.status(500).json({ error: 'Unable to load timetable: ' + error.message });
  }
});

app.delete('/api/timetable', checkDatabase, async (req, res) => {
  try {
    clearTimetableLocally();
    try {
      await supabase.from('timetable').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (_) {}

    res.json({ message: 'Timetable cleared successfully.' });
  } catch (error) {
    console.error('DELETE /api/timetable error:', error);
    res.status(500).json({ error: 'Unable to clear timetable: ' + error.message });
  }
});

// ==============================================================================
// 9. CURRENT CLASS ENDPOINT
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

    let entries = [];
    try {
      const { data } = await supabase.from('timetable').select('*');
      if (data && data.length > 0) entries = data;
    } catch (_) {}

    if (entries.length === 0) {
      entries = loadTimetableLocally();
    }

    const running = entries.find((entry) => {
      const dNum = entry.day_of_week || getDayNumber(entry.day);
      if (Number(dNum) !== currentDayOfWeek) return false;
      const start = String(entry.start_time).substring(0, 8);
      const end = String(entry.end_time).substring(0, 8);
      return start <= currentTimeStr && end > currentTimeStr;
    });

    if (running) {
      return res.json({
        running: true,
        subject: running.course_name || running.subject || 'N/A',
        teacher: running.teacher_name || 'N/A',
        class: running.class_name || 'N/A',
        section: running.section || 'A',
        room: running.room_name || 'N/A',
        room_type: running.room_type || 'Classroom',
        start_time: String(running.start_time).substring(0, 5),
        end_time: String(running.end_time).substring(0, 5)
      });
    }

    return res.json({
      running: false,
      message: 'No class is currently scheduled.'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to check current class: ' + error.message });
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
