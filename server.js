const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const supabase = require('./config/supabase');

const app = express();
const PORT = Number(process.env.PORT || 3000);

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const fs = require('fs');
const { generateTimetablePdf, createSafePdfFilename } = require('./utils/pdfGenerator');

const STORE_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(STORE_DIR, 'timetable_store.json');
const STORE_HISTORY_FILE = path.join(STORE_DIR, 'timetable_history.json');
const STORE_TODOS_FILE = path.join(STORE_DIR, 'todos.json');
const STORE_DEPARTMENTS_FILE = path.join(STORE_DIR, 'departments.json');
const STORE_BREAKS_FILE = path.join(STORE_DIR, 'breaks.json');
const STORE_TEACHER_AVAILABILITY_FILE = path.join(STORE_DIR, 'teacher_availability.json');
const STORE_ROOMS_FILE = path.join(STORE_DIR, 'rooms.json');
const STORE_TEACHERS_FILE = path.join(STORE_DIR, 'teachers.json');
const MAX_RETAINED_GENERATIONS = 2;

const DEFAULT_DEPARTMENTS = [
  { id: 'cse', name: 'Computer Science & Engineering', code: 'CSE' },
  { id: 'it', name: 'Information Technology', code: 'IT' },
  { id: 'ece', name: 'Electronics & Communication', code: 'ECE' },
  { id: 'me', name: 'Mechanical Engineering', code: 'ME' },
  { id: 'ce', name: 'Civil Engineering', code: 'CE' }
];

const DEFAULT_ROOMS = [
  { id: '101', room_id: '101', room_name: '101', room_number: '101', room_type: 'Classroom', capacity: 60, availability: 'Available' },
  { id: '102', room_id: '102', room_name: '102', room_number: '102', room_type: 'Classroom', capacity: 70, availability: 'Available' },
  { id: '103', room_id: '103', room_name: '103', room_number: '103', room_type: 'Classroom', capacity: 50, availability: 'Available' },
  { id: 'Lab-1', room_id: 'Lab-1', room_name: 'Lab-1', room_number: 'Lab-1', room_type: 'Laboratory', capacity: 40, availability: 'Available' },
  { id: 'Lab-2', room_id: 'Lab-2', room_name: 'Lab-2', room_number: 'Lab-2', room_type: 'Laboratory', capacity: 45, availability: 'Available' }
];

const DEFAULT_TEACHERS = [
  { id: 't_1', teacher_id: 't_1', name: 'Rahul', teacher_name: 'Rahul', assigned_subject: 'DBMS', assigned_subjects: ['dbms', 'dsa'], specialization: 'Computer Science', working_days_per_week: 5 },
  { id: 't_2', teacher_id: 't_2', name: 'Aman', teacher_name: 'Aman', assigned_subject: 'DBMS', assigned_subjects: ['dbms', 'java'], specialization: 'Computer Science', working_days_per_week: 5 },
  { id: 't_3', teacher_id: 't_3', name: 'Prof. Sharma', teacher_name: 'Prof. Sharma', assigned_subject: 'Web Tech', assigned_subjects: ['web tech'], specialization: 'Information Technology', working_days_per_week: 5 }
];

function withTimeout(promise, ms = 250) {
  if (!promise) return Promise.resolve({});
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), ms))
  ]);
}

function ensureStoreDir() {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

function loadDepartmentsLocally() {
  try {
    ensureStoreDir();
    if (!fs.existsSync(STORE_DEPARTMENTS_FILE)) {
      fs.writeFileSync(STORE_DEPARTMENTS_FILE, JSON.stringify(DEFAULT_DEPARTMENTS, null, 2), 'utf8');
      return [...DEFAULT_DEPARTMENTS];
    }
    const raw = fs.readFileSync(STORE_DEPARTMENTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [...DEFAULT_DEPARTMENTS];
    }
    const map = new Map();
    for (const d of DEFAULT_DEPARTMENTS) {
      map.set(d.name.toLowerCase(), d);
    }
    for (const d of parsed) {
      if (d && d.name) {
        map.set(d.name.toLowerCase(), {
          id: d.id || `dept_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: d.name.trim(),
          code: d.code || d.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 5)
        });
      }
    }
    return Array.from(map.values());
  } catch (err) {
    console.error('Error loading departments store:', err);
    return [...DEFAULT_DEPARTMENTS];
  }
}

function saveDepartmentsLocally(depts) {
  try {
    ensureStoreDir();
    fs.writeFileSync(STORE_DEPARTMENTS_FILE, JSON.stringify(depts, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving departments store:', err);
  }
}

function normalizeDepartmentName(dept) {
  const s = String(dept || '').trim();
  if (!s) return '';
  const lower = s.toLowerCase().replace(/\s+/g, ' ');
  if (
    lower === 'cse' ||
    lower === 'computer science' ||
    lower === 'computer science and engineering' ||
    lower === 'computer science & engineering' ||
    lower === 'cs'
  ) {
    return 'Computer Science & Engineering';
  }
  if (lower === 'it' || lower === 'information technology') {
    return 'Information Technology';
  }
  if (lower === 'ece' || lower === 'electronics & communication' || lower === 'electronics and communication') {
    return 'Electronics & Communication';
  }
  if (lower === 'me' || lower === 'mech' || lower === 'mechanical engineering') {
    return 'Mechanical Engineering';
  }
  if (lower === 'ce' || lower === 'civil' || lower === 'civil engineering') {
    return 'Civil Engineering';
  }
  if (lower === 'eee' || lower === 'electrical & electronics engineering' || lower === 'electrical and electronics engineering') {
    return 'Electrical & Electronics Engineering';
  }
  return s;
}

function loadTodosLocally() {
  try {
    ensureStoreDir();
    if (!fs.existsSync(STORE_TODOS_FILE)) return [];
    const raw = fs.readFileSync(STORE_TODOS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading local todos store:', err);
    return [];
  }
}

function saveTodosLocally(todos) {
  try {
    ensureStoreDir();
    fs.writeFileSync(STORE_TODOS_FILE, JSON.stringify(todos, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving local todos store:', err);
  }
}

function loadBreaksLocally() {
  try {
    ensureStoreDir();
    if (!fs.existsSync(STORE_BREAKS_FILE)) return [];
    const raw = fs.readFileSync(STORE_BREAKS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error loading local breaks store:', err);
    return [];
  }
}

function saveBreaksLocally(breaks) {
  try {
    ensureStoreDir();
    fs.writeFileSync(STORE_BREAKS_FILE, JSON.stringify(breaks, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving local breaks store:', err);
  }
}

function loadTeacherAvailabilityLocally() {
  try {
    ensureStoreDir();
    if (!fs.existsSync(STORE_TEACHER_AVAILABILITY_FILE)) return [];
    const raw = fs.readFileSync(STORE_TEACHER_AVAILABILITY_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error loading local teacher availability store:', err);
    return [];
  }
}

function saveTeacherAvailabilityLocally(records) {
  try {
    ensureStoreDir();
    fs.writeFileSync(STORE_TEACHER_AVAILABILITY_FILE, JSON.stringify(records, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving local teacher availability store:', err);
  }
}

function loadRoomsLocally() {
  try {
    ensureStoreDir();
    if (!fs.existsSync(STORE_ROOMS_FILE)) {
      fs.writeFileSync(STORE_ROOMS_FILE, JSON.stringify(DEFAULT_ROOMS, null, 2), 'utf8');
      return [...DEFAULT_ROOMS];
    }
    const raw = fs.readFileSync(STORE_ROOMS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...DEFAULT_ROOMS];
  } catch (err) {
    return [...DEFAULT_ROOMS];
  }
}

function saveRoomsLocally(rooms) {
  try {
    ensureStoreDir();
    fs.writeFileSync(STORE_ROOMS_FILE, JSON.stringify(rooms, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving rooms store:', err);
  }
}

function loadTeachersLocally() {
  try {
    ensureStoreDir();
    if (!fs.existsSync(STORE_TEACHERS_FILE)) {
      fs.writeFileSync(STORE_TEACHERS_FILE, JSON.stringify(DEFAULT_TEACHERS, null, 2), 'utf8');
      return [...DEFAULT_TEACHERS];
    }
    const raw = fs.readFileSync(STORE_TEACHERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...DEFAULT_TEACHERS];
  } catch (err) {
    return [...DEFAULT_TEACHERS];
  }
}

function saveTeachersLocally(teachers) {
  try {
    ensureStoreDir();
    fs.writeFileSync(STORE_TEACHERS_FILE, JSON.stringify(teachers, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving teachers store:', err);
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

function loadTimetableHistory() {
  try {
    ensureStoreDir();
    if (!fs.existsSync(STORE_HISTORY_FILE)) {
      const current = loadTimetableLocally();
      if (current && current.length > 0) {
        const initial = [{
          version_id: 'gen_initial_' + Date.now(),
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
          is_active: true,
          entry_count: current.length,
          sections: [...new Set(current.map((e) => e.section || e.class_name).filter(Boolean))],
          teachers: [...new Set(current.map((e) => e.teacher_name).filter(Boolean))],
          subjects: [...new Set(current.map((e) => e.course_name || e.subject).filter(Boolean))],
          rooms: [...new Set(current.map((e) => e.room_name).filter(Boolean))],
          entries: current
        }];
        saveTimetableHistory(initial);
        return initial;
      }
      return [];
    }
    const raw = fs.readFileSync(STORE_HISTORY_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading timetable history:', err);
    return [];
  }
}

function saveTimetableHistory(history) {
  try {
    ensureStoreDir();
    fs.writeFileSync(STORE_HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving timetable history:', err);
  }
}

/**
 * Enforces the retention rule: strictly retain only the latest 2 generated timetable versions.
 * Newest version is at index 0. Older versions beyond index 1 are automatically pruned.
 * Teachers, rooms, and configuration data are strictly preserved.
 */
function recordGeneratedTimetable(newVersion) {
  let history = loadTimetableHistory();
  history = history.map((v) => ({ ...v, is_active: false }));
  newVersion.is_active = true;
  history.unshift(newVersion);

  if (history.length > MAX_RETAINED_GENERATIONS) {
    history = history.slice(0, MAX_RETAINED_GENERATIONS);
  }

  saveTimetableHistory(history);
  saveTimetableLocally(newVersion.entries);
  return history;
}

function formatTeacherRecord(row) {
  if (!row) return null;
  const assigned = row.assigned_subject || row.subject || row.course_name || '';
  const rawList = Array.isArray(row.subjects)
    ? row.subjects.map(String).map((s) => s.trim()).filter(Boolean)
    : (assigned ? String(assigned).split(',').map((s) => s.trim()).filter(Boolean) : []);

  const isNA = Boolean(
    row.is_na === true ||
    String(row.subjectPreference || '').toUpperCase() === 'NA' ||
    rawList.some((s) => s.toUpperCase() === 'NA')
  );

  const cleanAssignedList = isNA ? [] : rawList.filter((s) => s.toUpperCase() !== 'NA');

  return {
    teacher_id: String(row.id || row.teacher_id || Math.random().toString(36).substring(2)),
    teacher_name: String(row.name || row.teacher_name || 'Instructor').trim(),
    is_na: isNA,
    subjectPreference: isNA ? 'NA' : 'Explicit',
    assigned_subject: isNA ? 'NA' : (cleanAssignedList.length > 0 ? cleanAssignedList.join(', ') : ''),
    assigned_subjects: cleanAssignedList.map((s) => s.toLowerCase()),
    specialization: String(row.specialization || '').trim(),
    department: String(row.department || 'General').trim(),
    working_days_per_week: Number(row.working_days_per_week || 5),
    availability: row.availability || {}
  };
}

/**
 * Reusable Teacher-Subject Eligibility Checker (Requirement 25)
 * Determines whether a teacher is eligible to instruct a specified subject.
 * - If teacher has explicit subjects: eligible iff subject (or base subject for labs) is in their explicit list.
 * - If teacher is marked NA: eligible for remaining/unassigned subjects or auto-allocation.
 */
function isTeacherEligibleForSubject(teacher, subject) {
  if (!teacher || !subject) return false;
  const subLower = String(subject).trim().toLowerCase();
  if (teacher.is_na || String(teacher.subjectPreference || '').toUpperCase() === 'NA') {
    return true;
  }
  const assigned = Array.isArray(teacher.assigned_subjects) ? teacher.assigned_subjects : [];
  if (assigned.includes(subLower)) return true;
  const baseSub = subLower.replace(/\s+lab$/i, '').trim();
  if (assigned.includes(baseSub)) return true;
  return false;
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
  // Always permit access - the backend seamlessly handles both cloud Supabase and local JSON fallback storage
  next();
}

// Utility: convert HH:MM(:SS) or HH:MM AM/PM to integer minutes from midnight
function timeToMinutes(timeValue) {
  if (timeValue === null || timeValue === undefined || timeValue === '') return NaN;
  if (typeof timeValue === 'number') {
    return isNaN(timeValue) ? NaN : Math.floor(timeValue);
  }
  const str = String(timeValue).trim();
  if (!str) return NaN;

  // Pattern 1: 12-hour AM/PM format (e.g., "09:00 AM", "05:30:00 PM")
  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const meridian = ampmMatch[4].toUpperCase();
    if (isNaN(hours) || isNaN(minutes) || hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
      return NaN;
    }
    if (meridian === 'AM' && hours === 12) hours = 0;
    if (meridian === 'PM' && hours < 12) hours += 12;
    return hours * 60 + minutes;
  }

  // Pattern 2: 24-hour format (e.g., "09:00", "17:30", "09:00:00")
  const match24 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return NaN;
    }
    return hours * 60 + minutes;
  }

  const parts = str.split(':').map((p) => parseInt(p, 10));
  const hours = isNaN(parts[0]) ? 0 : parts[0];
  const minutes = isNaN(parts[1]) ? 0 : parts[1];
  return hours * 60 + (minutes || 0);
}

// Utility: convert integer minutes to HH:MM:00 (24-hour internal representation)
function minutesToTime(totalMinutes) {
  if (isNaN(totalMinutes)) return '00:00:00';
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safeMinutes / 60) % 24;
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

// Utility: normalize any time input to HH:MM:00 (24-hour internal representation)
function normalizeTime24(timeValue) {
  const mins = timeToMinutes(timeValue);
  if (isNaN(mins)) return '';
  return minutesToTime(mins);
}

// Utility: convert HH:MM(:SS) or integer minutes to human-readable 12-hour AM/PM format
function formatTime12(timeValue) {
  if (timeValue === null || timeValue === undefined || timeValue === '') return '';
  const totalMinutes = typeof timeValue === 'number' ? timeValue : timeToMinutes(timeValue);
  if (isNaN(totalMinutes)) return '';
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const meridian = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${meridian}`;
}

// Utility: build 1-hour slot objects between start and end
function buildTimeSlots(startTime, endTime, dayName = '') {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (isNaN(startMinutes) || isNaN(endMinutes) || endMinutes <= startMinutes) {
    const dayPrefix = dayName ? `${dayName}'s configured end time must be later than its start time. ` : '';
    throw new Error(`${dayPrefix}Working end time must be later than working start time.`);
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

/**
 * Automatically matches a lab's [start, end) time interval to a day's configured periods.
 * Validates complete coverage, gap absence, break conflicts, and valid day boundaries.
 * Follows [start, end) interval convention where overlap is:
 *   max(startA, startB) < min(endA, endB)
 */
function matchLabToDayPeriods(labStartTime, labEndTime, dayName, dayPeriods, dayBreaks = []) {
  if (!labStartTime || !labEndTime) {
    return {
      valid: false,
      error: 'Please select both start time and end time for the lab class.',
      matchedPeriods: [],
      matchedIndices: [],
      duration: 0
    };
  }

  const sM = timeToMinutes(labStartTime);
  const eM = timeToMinutes(labEndTime);

  if (isNaN(sM) || isNaN(eM) || sM >= eM) {
    return {
      valid: false,
      error: `Lab class start time (${formatTime12(sM) || labStartTime}) must be earlier than end time (${formatTime12(eM) || labEndTime}).`,
      matchedPeriods: [],
      matchedIndices: [],
      duration: 0
    };
  }

  if (!dayPeriods || dayPeriods.length === 0) {
    return {
      valid: false,
      error: `No configured periods match the selected lab time on ${dayName}. Selected lab time is outside the configured timetable period.`,
      matchedPeriods: [],
      matchedIndices: [],
      duration: 0
    };
  }

  const dayStartMin = timeToMinutes(dayPeriods[0].start_time);
  const dayEndMin = timeToMinutes(dayPeriods[dayPeriods.length - 1].end_time);

  if (isNaN(dayStartMin) || isNaN(dayEndMin) || dayEndMin <= dayStartMin) {
    return {
      valid: false,
      error: `${dayName}'s configured end time must be later than its start time. Working hours on ${dayName} are invalid: start time must be before end time.`,
      matchedPeriods: [],
      matchedIndices: [],
      duration: 0
    };
  }

  // 1. Check break conflicts: [start, end) overlap
  for (const b of dayBreaks) {
    const bStartMin = timeToMinutes(b.start_time);
    const bEndMin = timeToMinutes(b.end_time);
    if (!isNaN(bStartMin) && !isNaN(bEndMin) && Math.max(sM, bStartMin) < Math.min(eM, bEndMin)) {
      const bName = b.name || b.break_name || 'Break';
      return {
        valid: false,
        error: `The selected lab interval overlaps with the configured break '${bName}' (${formatTime12(bStartMin)}–${formatTime12(bEndMin)}) on ${dayName} / break interrupts the available time. Selected lab time is outside the configured timetable period.`,
        matchedPeriods: [],
        matchedIndices: [],
        duration: 0
      };
    }
  }

  // 2. Overlapping periods: [start, end)
  const matchedPeriods = [];
  const matchedIndices = [];
  for (let i = 0; i < dayPeriods.length; i++) {
    const p = dayPeriods[i];
    const pStartMin = timeToMinutes(p.start_time);
    const pEndMin = timeToMinutes(p.end_time);

    if (!isNaN(pStartMin) && !isNaN(pEndMin) && Math.max(sM, pStartMin) < Math.min(eM, pEndMin)) {
      matchedPeriods.push({
        ...p,
        period_number: p.period || p.period_number || (i + 1),
        slot_index: (p.slot_index !== undefined) ? p.slot_index : i,
        startMinutes: pStartMin,
        endMinutes: pEndMin
      });
      matchedIndices.push((p.slot_index !== undefined) ? p.slot_index : i);
    }
  }

  const s24 = minutesToTime(sM).slice(0, 5);
  const e24 = minutesToTime(eM).slice(0, 5);
  const dayStart24 = minutesToTime(dayStartMin).slice(0, 5);
  const dayEnd24 = minutesToTime(dayEndMin).slice(0, 5);

  if (matchedPeriods.length === 0) {
    return {
      valid: false,
      error: `No configured periods match the selected lab time (${s24}–${e24}, ${formatTime12(sM)}–${formatTime12(eM)}) on ${dayName} (${dayStart24}–${dayEnd24}, ${formatTime12(dayStartMin)}–${formatTime12(dayEndMin)}, ${dayPeriods.length} periods). Selected lab time is outside the configured timetable period.`,
      matchedPeriods: [],
      matchedIndices: [],
      duration: 0
    };
  }

  // 3. Complete coverage check: lab interval must be fully enclosed by the periods collectively
  const firstP = matchedPeriods[0];
  const lastP = matchedPeriods[matchedPeriods.length - 1];
  const firstP24 = minutesToTime(firstP.startMinutes).slice(0, 5);
  const lastP24 = minutesToTime(lastP.endMinutes).slice(0, 5);
  if (sM < firstP.startMinutes || eM > lastP.endMinutes) {
    return {
      valid: false,
      error: `The configured periods do not cover the complete lab duration (${s24}–${e24}, ${formatTime12(sM)}–${formatTime12(eM)}) on ${dayName}. Configured coverage spans ${firstP24}–${lastP24} (${formatTime12(firstP.startMinutes)}–${formatTime12(lastP.endMinutes)}). Selected lab time is outside the configured timetable period.`,
      matchedPeriods,
      matchedIndices,
      duration: matchedPeriods.length
    };
  }

  // 4. Gap detection between consecutive matched periods
  for (let k = 0; k < matchedPeriods.length - 1; k++) {
    if (matchedPeriods[k + 1].startMinutes > matchedPeriods[k].endMinutes) {
      return {
        valid: false,
        error: `The configured periods do not cover the complete lab duration continuously on ${dayName} (gap detected between period ${matchedPeriods[k].period_number} and period ${matchedPeriods[k + 1].period_number}). Selected lab time is outside the configured timetable period.`,
        matchedPeriods,
        matchedIndices,
        duration: matchedPeriods.length
      };
    }
  }

  return {
    valid: true,
    error: null,
    matchedPeriods,
    matchedIndices,
    duration: matchedPeriods.length,
    dayStartMin,
    dayEndMin
  };
}

/**
 * Calculates adjusted teaching periods around breaks for a single day.
 * Implements Requirements Part 4, 5, 6, 7, 8, 9.
 */
function calculateDayTeachingPeriods({
  dayName,
  dayOfWeek,
  startTime,
  endTime,
  requiredPeriodCount,
  dayBreaks = [],
  explicitDayPeriods = null,
  fixedClasses = []
}) {
  let effectiveStartTime = startTime;
  let effectiveEndTime = endTime;

  if (explicitDayPeriods && Array.isArray(explicitDayPeriods) && explicitDayPeriods.length > 0) {
    const sortedExp = [...explicitDayPeriods].sort((a, b) => {
      const sA = timeToMinutes(a.start_time || a.start || a.startTime || '00:00');
      const sB = timeToMinutes(b.start_time || b.start || b.startTime || '00:00');
      return sA - sB;
    });
    const firstP = sortedExp[0];
    const lastP = sortedExp[sortedExp.length - 1];
    const s = String(firstP.start_time || firstP.start || firstP.startTime || '').trim();
    const e = String(lastP.end_time || lastP.end || lastP.endTime || '').trim();
    if (s) effectiveStartTime = s.slice(0, 5);
    if (e) effectiveEndTime = e.slice(0, 5);
  }

  const dayStartMin = timeToMinutes(effectiveStartTime);
  const dayEndMin = timeToMinutes(effectiveEndTime);

  if (isNaN(dayStartMin) || isNaN(dayEndMin) || dayEndMin <= dayStartMin) {
    throw new Error(`${dayName}'s configured end time must be later than its start time. Working hours on ${dayName} are invalid: start time must be before end time.`);
  }

  // 1. Validate breaks on this day
  const validBreaks = [];
  for (let i = 0; i < dayBreaks.length; i++) {
    const b = dayBreaks[i];
    const bName = String(b.name || b.break_name || `Break ${i + 1}`).trim();
    let bStart = String(b.startTime || b.start_time || '').trim();
    let bEnd = String(b.endTime || b.end_time || '').trim();
    if (!bStart || !bEnd) {
      throw new Error(`Break '${bName}' on ${dayName} requires valid start and end times.`);
    }
    if (bStart.length === 5) bStart = `${bStart}:00`;
    if (bEnd.length === 5) bEnd = `${bEnd}:00`;

    const bStartMin = timeToMinutes(bStart);
    const bEndMin = timeToMinutes(bEnd);

    if (bStartMin >= bEndMin) {
      throw new Error(`Break '${bName}' on ${dayName} has invalid times: start time (${bStart.slice(0, 5)}) must be before end time (${bEnd.slice(0, 5)}).`);
    }

    if (bEndMin - bStartMin <= 0) {
      throw new Error(`Break '${bName}' on ${dayName} cannot have zero duration.`);
    }

    // Breaks outside configured working window (Part 5 Rule 4)
    if (bStartMin < dayStartMin || bEndMin > dayEndMin) {
      throw new Error(`Break '${bName}' (${bStart.slice(0, 5)}–${bEnd.slice(0, 5)}) on ${dayName} falls outside the configured working window (${effectiveStartTime.slice(0, 5)}–${effectiveEndTime.slice(0, 5)}).`);
    }

    // Check conflict with fixed/locked classes (Part 5 Rule 5, Part 13)
    for (const fc of fixedClasses) {
      const fcDay = String(fc.day || '').trim();
      if (fcDay.toLowerCase() === dayName.toLowerCase()) {
        const fcStart = timeToMinutes(fc.start_time);
        const fcEnd = timeToMinutes(fc.end_time);
        if (Math.max(bStartMin, fcStart) < Math.min(bEndMin, fcEnd)) {
          throw new Error(`Break '${bName}' conflicts with locked class '${fc.course_name || fc.subject || 'Class'}' on ${dayName}.`);
        }
      }
    }

    validBreaks.push({
      id: b.id || `brk_${dayName}_${i + 1}`,
      name: bName,
      type: b.type || b.break_type || 'Short Break',
      day: dayName,
      day_of_week: dayOfWeek,
      start_time: bStart,
      end_time: bEnd,
      is_break: true
    });
  }

  // Check overlap between breaks on this day (Part 5 Rule 3)
  for (let i = 0; i < validBreaks.length; i++) {
    for (let j = i + 1; j < validBreaks.length; j++) {
      const b1 = validBreaks[i];
      const b2 = validBreaks[j];
      const s1 = timeToMinutes(b1.start_time);
      const e1 = timeToMinutes(b1.end_time);
      const s2 = timeToMinutes(b2.start_time);
      const e2 = timeToMinutes(b2.end_time);
      if (Math.max(s1, s2) < Math.min(e1, e2)) {
        throw new Error(`Break times overlap. Break '${b2.name}' overlaps with '${b1.name}' on ${dayName}.`);
      }
    }
  }

  validBreaks.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

  // 2. Compute non-break intervals
  const nonBreakIntervals = [];
  let curr = dayStartMin;
  for (const brk of validBreaks) {
    const bStart = timeToMinutes(brk.start_time);
    const bEnd = timeToMinutes(brk.end_time);
    if (bStart > curr) {
      nonBreakIntervals.push({ start: curr, end: bStart });
    }
    curr = Math.max(curr, bEnd);
  }
  if (curr < dayEndMin) {
    nonBreakIntervals.push({ start: curr, end: dayEndMin });
  }

  const totalWorkingMinutes = dayEndMin - dayStartMin;
  const totalBreakMinutes = validBreaks.reduce((acc, b) => acc + (timeToMinutes(b.end_time) - timeToMinutes(b.start_time)), 0);
  const totalAvailableTeachingMinutes = totalWorkingMinutes - totalBreakMinutes;

  // 3. Determine period slots around breaks
  const reqCount = Number(requiredPeriodCount) || 5;

  // Check capacity with standard 60-min periods
  const maxPossibleSlots = nonBreakIntervals.reduce((acc, int) => acc + Math.floor((int.end - int.start) / 60), 0);

  // If explicitDayPeriods were provided by user without break adjustments, check if they overlap with breaks
  if (explicitDayPeriods && Array.isArray(explicitDayPeriods) && explicitDayPeriods.length > 0) {
    const expStart = timeToMinutes(explicitDayPeriods[0].start_time || explicitDayPeriods[0].start || explicitDayPeriods[0].startTime);
    const expEnd = timeToMinutes(explicitDayPeriods[explicitDayPeriods.length - 1].end_time || explicitDayPeriods[explicitDayPeriods.length - 1].end || explicitDayPeriods[explicitDayPeriods.length - 1].endTime);
    if (!isNaN(expStart) && !isNaN(expEnd) && expEnd <= expStart) {
      throw new Error(`${dayName}'s configured end time must be later than its start time. Working hours on ${dayName} are invalid: start time must be before end time.`);
    }

    const hasOverlap = explicitDayPeriods.some((p) => {
      const pS = timeToMinutes(p.start_time || p.start || p.startTime || '00:00');
      const pE = timeToMinutes(p.end_time || p.end || p.endTime || '00:00');
      return validBreaks.some((b) => Math.max(pS, timeToMinutes(b.start_time)) < Math.min(pE, timeToMinutes(b.end_time)));
    });

    if (!hasOverlap) {
      return {
        teachingPeriods: explicitDayPeriods.map((p, idx) => {
          let s = String(p.start_time || p.start || p.startTime || '').trim();
          let e = String(p.end_time || p.end || p.endTime || '').trim();
          if (s.length === 5) s = `${s}:00`;
          if (e.length === 5) e = `${e}:00`;
          return {
            period: p.period || (idx + 1),
            start_time: s,
            end_time: e,
            is_break: false
          };
        }),
        breaks: validBreaks,
        intervals: nonBreakIntervals,
        availableTeachingMinutes: totalAvailableTeachingMinutes
      };
    }
  }

  // Check impossible schedule (Part 9)
  if (maxPossibleSlots < reqCount) {
    const availHrs = Math.floor(totalAvailableTeachingMinutes / 60);
    const availMins = totalAvailableTeachingMinutes % 60;
    let availStr = '';
    if (availHrs > 0 && availMins > 0) availStr = `${availHrs} hours ${availMins} minutes`;
    else if (availHrs > 0) availStr = `${availHrs} hour${availHrs > 1 ? 's' : ''}`;
    else availStr = `${availMins} minutes`;

    const brkHrs = Math.floor(totalBreakMinutes / 60);
    const brkMins = totalBreakMinutes % 60;
    let brkStr = '';
    if (brkHrs > 0 && brkMins > 0) brkStr = `${brkHrs} hour${brkHrs > 1 ? 's' : ''} ${brkMins} minutes`;
    else if (brkHrs > 0) brkStr = `${brkHrs} hour${brkHrs > 1 ? 's' : ''}`;
    else brkStr = `${brkMins} minutes`;

    throw new Error(
      `Unable to fit all required teaching periods on ${dayName}.\n` +
      `Required teaching periods: ${reqCount}\n` +
      `Available teaching time: ${availStr}\n` +
      `Break time: ${brkStr}\n` +
      `Try reducing the number of periods, moving a break, extending working hours, or changing constraints.`
    );
  }

  // Pack teaching periods into available intervals
  const adjustedTeachingPeriods = [];
  let periodNum = 1;

  for (const interval of nonBreakIntervals) {
    let slotStart = interval.start;
    while (slotStart + 60 <= interval.end && periodNum <= reqCount) {
      adjustedTeachingPeriods.push({
        period: periodNum,
        start_time: minutesToTime(slotStart),
        end_time: minutesToTime(slotStart + 60),
        is_break: false
      });
      periodNum++;
      slotStart += 60;
    }
  }

  return {
    teachingPeriods: adjustedTeachingPeriods,
    breaks: validBreaks,
    intervals: nonBreakIntervals,
    availableTeachingMinutes: totalAvailableTeachingMinutes
  };
}

/**
 * Calculates Teacher Workload per day and across the week.
 * Implements Requirements Part 14, 15, 16, 17, 18, 19, 20, 21.
 */
function calculateTeacherWorkload(allEntries = [], configuredWorkingDays = [], teacherRecords = []) {
  const workloadByDay = {};
  const allTeacherNames = new Set(
    (teacherRecords || []).map((t) => (t.teacher_name || t.name || '').trim()).filter(Boolean)
  );

  for (const e of allEntries) {
    if (e.teacher_name && String(e.teacher_name).trim()) {
      allTeacherNames.add(String(e.teacher_name).trim());
    }
  }

  const teacherNamesList = Array.from(allTeacherNames).sort();

  for (const day of configuredWorkingDays) {
    const dayEntries = allEntries.filter(
      (e) => (e.day || '').toLowerCase() === day.toLowerCase()
    );

    const teacherMap = new Map();
    for (const tName of teacherNamesList) {
      teacherMap.set(tName.toLowerCase(), {
        teacher_name: tName,
        classes_count: 0,
        periods_used: 0,
        total_minutes: 0,
        sessions: []
      });
    }

    const processedLabSessions = new Set();

    for (const entry of dayEntries) {
      const tName = String(entry.teacher_name || '').trim();
      if (!tName) continue;
      const tKey = tName.toLowerCase();
      if (!teacherMap.has(tKey)) {
        teacherMap.set(tKey, {
          teacher_name: tName,
          classes_count: 0,
          periods_used: 0,
          total_minutes: 0,
          sessions: []
        });
      }

      const rec = teacherMap.get(tKey);
      const isLab = entry.session_type === 'LAB' || Boolean(entry.is_lab);
      const sMin = timeToMinutes(entry.start_time);
      const eMin = timeToMinutes(entry.end_time);
      const durationMin = Math.max(0, eMin - sMin);

      if (isLab) {
        // Multi-period lab session counting rule (Part 16):
        // 1 continuous lab session counts as 1 class/session, while separately recording periods used
        const labId = `${entry.day}_${entry.section || entry.class_name}_${entry.course_name || entry.subject}_${tKey}`;
        if (!processedLabSessions.has(labId)) {
          processedLabSessions.add(labId);
          rec.classes_count += 1;
        }
        rec.periods_used += 1;
        rec.total_minutes += durationMin;
      } else {
        rec.classes_count += 1;
        rec.periods_used += 1;
        rec.total_minutes += durationMin;
      }

      rec.sessions.push({
        subject: entry.course_name || entry.subject,
        section: entry.section || entry.class_name,
        department: entry.department,
        start_time: entry.start_time,
        end_time: entry.end_time,
        period_number: entry.period_number,
        is_lab: isLab
      });
    }

    const teacherList = Array.from(teacherMap.values()).map((t) => {
      const hours = Math.floor(t.total_minutes / 60);
      const mins = t.total_minutes % 60;
      let timeStr = '0h';
      if (hours > 0 && mins > 0) timeStr = `${hours}h ${mins}m`;
      else if (hours > 0) timeStr = `${hours} Hour${hours > 1 ? 's' : ''}`;
      else if (mins > 0) timeStr = `${mins} mins`;

      return {
        teacher_name: t.teacher_name,
        classes: t.classes_count,
        periods: t.periods_used,
        total_minutes: t.total_minutes,
        teaching_time: timeStr,
        is_free: t.classes_count === 0,
        sessions: t.sessions
      };
    });

    teacherList.sort((a, b) => a.teacher_name.localeCompare(b.teacher_name));

    workloadByDay[day] = {
      day,
      teachers: teacherList,
      total_classes: teacherList.reduce((acc, t) => acc + t.classes, 0),
      total_periods: teacherList.reduce((acc, t) => acc + t.periods, 0)
    };
  }

  // Weekly total breakdown
  const weeklySummary = [];
  for (const tName of teacherNamesList) {
    const tKey = tName.toLowerCase();
    let weeklyClasses = 0;
    let weeklyPeriods = 0;
    let weeklyMinutes = 0;
    const dailyBreakdown = {};

    for (const day of configuredWorkingDays) {
      const dWork = workloadByDay[day];
      const match = dWork ? dWork.teachers.find((t) => t.teacher_name.toLowerCase() === tKey) : null;
      const count = match ? match.classes : 0;
      dailyBreakdown[day] = count;
      weeklyClasses += count;
      if (match) {
        weeklyPeriods += match.periods;
        weeklyMinutes += match.total_minutes;
      }
    }

    const avgClasses = configuredWorkingDays.length > 0
      ? (weeklyClasses / configuredWorkingDays.length).toFixed(1)
      : '0.0';

    const hours = Math.floor(weeklyMinutes / 60);
    const mins = weeklyMinutes % 60;
    let totalTimeStr = `${hours}h`;
    if (mins > 0) totalTimeStr = `${hours}h ${mins}m`;

    weeklySummary.push({
      teacher_name: tName,
      weekly_classes: weeklyClasses,
      weekly_periods: weeklyPeriods,
      weekly_minutes: weeklyMinutes,
      total_teaching_time: totalTimeStr,
      average_per_day: avgClasses,
      daily_breakdown: dailyBreakdown
    });
  }

  weeklySummary.sort((a, b) => b.weekly_classes - a.weekly_classes || a.teacher_name.localeCompare(b.teacher_name));

  return {
    by_day: workloadByDay,
    weekly_summary: weeklySummary,
    working_days: configuredWorkingDays
  };
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

/**
 * Normalizes configured working days from array of day names/numbers or count
 * Returns deterministic Monday -> Sunday ordered list of { day_of_week, day_name }
 */
function normalizeWorkingDays(inputDays, inputCount) {
  let matched = [];
  if (Array.isArray(inputDays) && inputDays.length > 0) {
    const set = new Set(inputDays.map((d) => {
      if (typeof d === 'number') return getDayName(d).toLowerCase();
      if (d && typeof d === 'object') return String(d.day_name || d.day || d.name || '').trim().toLowerCase();
      return String(d).trim().toLowerCase();
    }));
    matched = DAY_NAMES.filter((d) => set.has(d.toLowerCase()));
  } else if (typeof inputDays === 'string' && inputDays.trim()) {
    const parts = inputDays.split(',').map((s) => s.trim().toLowerCase());
    matched = DAY_NAMES.filter((d) => parts.includes(d.toLowerCase()));
  }

  if (matched.length === 0) {
    let count = Number(inputCount);
    if (!Number.isInteger(count) || count < 1 || count > 7) {
      count = 5;
    }
    matched = DAY_NAMES.slice(0, count);
  }

  return matched.map((dayName) => ({
    day_name: dayName,
    day_of_week: getDayNumber(dayName)
  }));
}

/**
 * Evaluates teacher availability strictly by DAY + TIME
 */
function isTeacherAvailable(teacher, dayName, dayOfWeek, startTime, endTime, dbAvailabilityList = []) {
  if (!teacher) return true;
  const avail = teacher.availability;
  const sShort = String(startTime || '').substring(0, 5);
  const eShort = String(endTime || '').substring(0, 5);

  if (avail && typeof avail === 'object') {
    const keysToCheck = [
      `${dayName} ${sShort}–${eShort}`,
      `${dayName} ${sShort}-${eShort}`,
      `${dayName} ${startTime}–${endTime}`,
      `${dayName} ${startTime}-${endTime}`,
      `${dayName}_${sShort}`,
      `${dayName}_${startTime}`,
      `${dayName}|${sShort}`,
      `${dayName}|${startTime}`,
      `${dayOfWeek}_${sShort}`,
      `${dayOfWeek}_${startTime}`,
      `${dayName} ${sShort}`,
      `${dayName}`
    ];
    for (const k of keysToCheck) {
      if (avail[k] === false || avail[k] === 'false' || avail[k] === 'unavailable') {
        return false;
      }
    }

    if (avail[dayName] && typeof avail[dayName] === 'object') {
      const dayMap = avail[dayName];
      const timeKeys = [sShort, startTime, `${sShort}–${eShort}`, `${sShort}-${eShort}`];
      for (const tk of timeKeys) {
        if (dayMap[tk] === false || dayMap[tk] === 'false' || dayMap[tk] === 'unavailable') {
          return false;
        }
      }
    }
  }

  if (Array.isArray(dbAvailabilityList) && dbAvailabilityList.length > 0) {
    const tId = teacher.teacher_id ? String(teacher.teacher_id) : null;
    const tName = (teacher.teacher_name || teacher.name || '').trim().toLowerCase();

    const teacherRecords = dbAvailabilityList.filter((record) => {
      const matchId = tId && record.teacher_id && String(record.teacher_id) === tId;
      const matchName = tName && record.teacher_name && String(record.teacher_name).trim().toLowerCase() === tName;
      if (!matchId && !matchName) return false;
      const rDay = record.day || (record.time_slots ? getDayName(record.time_slots.day_of_week) : null);
      return rDay && rDay.toLowerCase() === dayName.toLowerCase();
    });

    if (teacherRecords.length > 0) {
      const sMin = timeToMinutes(startTime);
      const eMin = timeToMinutes(endTime);

      // Check if explicitly marked unavailable
      for (const record of teacherRecords) {
        const rStart = String(record.start_time || (record.time_slots ? record.time_slots.start_time : '')).substring(0, 5);
        const rEnd = String(record.end_time || (record.time_slots ? record.time_slots.end_time : '')).substring(0, 5);
        if (rStart && rEnd) {
          const rStartMin = timeToMinutes(rStart);
          const rEndMin = timeToMinutes(rEnd);
          if (Math.max(sMin, rStartMin) < Math.min(eMin, rEndMin)) {
            if (record.is_available === false || record.is_available === 'false' || record.is_available === 0) {
              return false;
            }
          }
        }
      }

      // If records represent a whitelist of available slots (e.g. from Teacher Availability matrix)
      const hasWhitelist = teacherRecords.some((r) => r.is_available === true || r.is_available === 'true' || r.is_available === 1);
      if (hasWhitelist) {
        const fitsInWhitelist = teacherRecords.some((r) => {
          if (r.is_available === false || r.is_available === 'false' || r.is_available === 0) return false;
          const rStart = String(r.start_time || (r.time_slots ? r.time_slots.start_time : '')).substring(0, 5);
          const rEnd = String(r.end_time || (r.time_slots ? r.time_slots.end_time : '')).substring(0, 5);
          if (!rStart || !rEnd) return false;
          const rStartMin = timeToMinutes(rStart);
          const rEndMin = timeToMinutes(rEnd);
          return sMin >= rStartMin && eMin <= rEndMin;
        });
        if (!fitsInWhitelist) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Evaluates room availability strictly by DAY + TIME
 */
function isRoomAvailable(room, dayName, dayOfWeek, startTime, endTime, dbRoomAvailabilityList = []) {
  if (!room) return true;
  const roomName = (room.room_name || room.room_number || '').trim().toLowerCase();

  if (room.availability && typeof room.availability === 'string') {
    const status = room.availability.trim().toLowerCase();
    if (status === 'inactive' || status === 'maintenance' || status === 'unavailable') {
      return false;
    }
  }
  if (room.status && typeof room.status === 'string') {
    const status = room.status.trim().toLowerCase();
    if (status === 'inactive' || status === 'maintenance' || status === 'unavailable') {
      return false;
    }
  }

  const sMin = timeToMinutes(startTime);
  const eMin = timeToMinutes(endTime);

  if (room.availability && typeof room.availability === 'object') {
    const sShort = String(startTime || '').substring(0, 5);
    const eShort = String(endTime || '').substring(0, 5);
    const keysToCheck = [
      `${dayName} ${sShort}–${eShort}`,
      `${dayName} ${sShort}-${eShort}`,
      `${dayName}_${sShort}`,
      `${dayName}|${sShort}`,
      `${dayName}`
    ];
    for (const k of keysToCheck) {
      if (room.availability[k] === false || room.availability[k] === 'false' || room.availability[k] === 'unavailable') {
        return false;
      }
    }
  }

  if (Array.isArray(dbRoomAvailabilityList) && dbRoomAvailabilityList.length > 0) {
    for (const r of dbRoomAvailabilityList) {
      const match = (r.room_id && room.room_id && String(r.room_id) === String(room.room_id)) ||
                    (r.room_name && String(r.room_name).trim().toLowerCase() === roomName);
      if (match) {
        const rDay = r.day || (r.time_slots ? getDayName(r.time_slots.day_of_week) : null);
        if (rDay && rDay.toLowerCase() === dayName.toLowerCase()) {
          const rStart = String(r.start_time || '').substring(0, 5);
          const rEnd = String(r.end_time || '').substring(0, 5);
          if (rStart && rEnd) {
            const rStartMin = timeToMinutes(rStart);
            const rEndMin = timeToMinutes(rEnd);
            if (Math.max(sMin, rStartMin) < Math.min(eMin, rEndMin)) {
              if (r.is_available === false || r.is_available === 'false' || r.status === 'unavailable') {
                return false;
              }
            }
          }
        }
      }
    }
  }

  return true;
}

/**
 * Unified Conflict & Rule Validator
 * Validates a single timetable entry against all other entries in the active schedule.
 * Evaluates:
 * 1. Valid working day
 * 2. Valid time bounds
 * 3. Teacher-subject mapping (Teacher ONLY teaches assigned subject)
 * 4. Teacher conflict (strictly by Day + Time Slot)
 * 5. Section conflict (strictly by Day + Time Slot)
 * 6. Room conflict (strictly by Day + Time Slot)
 * 7. Room type compatibility
 * 8. Teacher availability (strictly by Day + Time Slot)
 * 9. Room availability (strictly by Day + Time Slot)
 */
function validateTimetableAssignment({
  entry,
  allEntries = [],
  excludeId = null,
  teacherRecords = [],
  candidateRooms = [],
  workingDays = [],
  dbTeacherAvailability = []
}) {
  if (!entry) return { valid: false, error: 'No timetable entry provided for validation.' };

  const dayName = String(entry.day || '').trim();
  const startTime = String(entry.start_time || '').trim().substring(0, 5);
  const endTime = String(entry.end_time || '').trim().substring(0, 5);
  const section = String(entry.section || entry.class_name || '').trim();
  const courseName = String(entry.course_name || entry.subject || '').trim();
  const teacherName = String(entry.teacher_name || '').trim();
  const roomName = String(entry.room_name || '').trim();
  const sessionType = String(entry.session_type || (entry.is_lab ? 'LAB' : 'THEORY')).trim().toUpperCase();

  // 1. Day Validation
  const entriesDays = Array.isArray(allEntries)
    ? allEntries.map((e) => String(e.day || '').trim().toLowerCase()).filter(Boolean)
    : [];
  const validDays = Array.isArray(workingDays) && workingDays.length > 0
    ? [...new Set([...workingDays.map((d) => (typeof d === 'string' ? d.trim().toLowerCase() : String(d.day_name || '').trim().toLowerCase())), ...entriesDays])]
    : DAY_NAMES.map((d) => d.toLowerCase());

  if (!dayName || !validDays.includes(dayName.toLowerCase())) {
    return {
      valid: false,
      error: `Invalid or non-configured working day '${dayName}'. Configured days: ${validDays.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}.`
    };
  }
  const dayOfWeek = getDayNumber(dayName);

  // 2. Time Slot Validation
  if (!startTime || !endTime) {
    return { valid: false, error: 'Start time and end time are required.' };
  }
  if (startTime >= endTime) {
    return { valid: false, error: 'Start time must be strictly earlier than end time.' };
  }

  // 3. Teacher-Subject Assignment Rule (CRITICAL)
  if (teacherRecords && teacherRecords.length > 0) {
    let tRec = teacherRecords.find(
      (t) => (t.teacher_name || t.name || '').toLowerCase() === teacherName.toLowerCase()
    );
    if (!tRec) {
      const fromEntries = allEntries.find((e) => (e.teacher_name || '').toLowerCase() === teacherName.toLowerCase());
      if (fromEntries) {
        tRec = {
          teacher_name: fromEntries.teacher_name,
          assigned_subjects: [String(fromEntries.course_name || fromEntries.subject || '').toLowerCase()]
        };
      }
    }
    if (!tRec) {
      return { valid: false, error: `Teacher '${teacherName}' is not registered in the system.` };
    }
    
    // Check teacher eligibility for this subject (or base subject for labs)
    if (!isTeacherEligibleForSubject(tRec, courseName)) {
      return {
        valid: false,
        error: 'The selected teacher is not configured to teach this subject.'
      };
    }

    // 4. Teacher Availability strictly by Day + Time Slot
    if (!isTeacherAvailable(tRec, dayName, dayOfWeek, startTime, endTime, dbTeacherAvailability)) {
      return {
        valid: false,
        error: `Teacher ${teacherName} is unavailable on ${dayName} at ${startTime}–${endTime}.`
      };
    }
  }

  // 5. Room Validation & Room Type Compatibility
  let matchedRoom = null;
  if (candidateRooms && candidateRooms.length > 0) {
    matchedRoom = candidateRooms.find(
      (r) => (r.room_name || r.room_number || '').toLowerCase() === roomName.toLowerCase()
    );
    if (!matchedRoom) {
      const fromEntries = allEntries.find((e) => (e.room_name || '').toLowerCase() === roomName.toLowerCase());
      if (fromEntries) {
        matchedRoom = {
          room_name: fromEntries.room_name,
          room_type: fromEntries.room_type || 'Classroom'
        };
      }
    }
    if (!matchedRoom) {
      return { valid: false, error: `Room '${roomName}' is not registered in campus spaces.` };
    }

    // Strict LAB Room Requirement: Lab sessions MUST be held in a Laboratory room
    if (sessionType === 'LAB' && matchedRoom.room_type !== 'Laboratory') {
      return {
        valid: false,
        error: 'No suitable laboratory room is available.'
      };
    }

    // Room type compatibility for generic filter
    if (entry.room_type && matchedRoom.room_type && entry.room_type !== matchedRoom.room_type && entry.room_type !== 'Both') {
      return {
        valid: false,
        error: `Room ${roomName} is a ${matchedRoom.room_type}, but ${entry.room_type} is required.`
      };
    }

    // Room Availability strictly by Day + Time Slot
    if (!isRoomAvailable(matchedRoom, dayName, dayOfWeek, startTime, endTime)) {
      return {
        valid: false,
        error: `Room ${roomName} is unavailable on ${dayName} at ${startTime}–${endTime}.`
      };
    }
  }

  // 6. Multi-Resource Simultaneous Conflict Checks against all other entries using INTERVAL OVERLAP
  const normalizedExcludeId = excludeId != null ? String(excludeId) : null;
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);

  for (const other of allEntries) {
    const otherId = String(other.timetable_id || other.id || '');
    if (normalizedExcludeId && otherId === normalizedExcludeId) {
      continue; // Skip the entry currently being updated
    }

    const otherDay = String(other.day || '').trim().toLowerCase();
    const otherStart = String(other.start_time || '').trim().substring(0, 5);
    const otherEnd = String(other.end_time || '').trim().substring(0, 5);

    const otherStartMin = timeToMinutes(otherStart);
    const otherEndMin = timeToMinutes(otherEnd);

    // Conflict only possible on the SAME day and overlapping time interval:
    // Math.max(startMin, otherStartMin) < Math.min(endMin, otherEndMin)
    const isOverlapping = otherDay === dayName.toLowerCase() &&
      Math.max(startMin, otherStartMin) < Math.min(endMin, otherEndMin);

    if (isOverlapping) {
      // Teacher Conflict (Global across all departments)
      const otherTeacher = String(other.teacher_name || '').trim().toLowerCase();
      if (otherTeacher && otherTeacher === teacherName.toLowerCase()) {
        return {
          valid: false,
          error: `Teacher ${teacherName} is already scheduled during this time.`
        };
      }

      // Section Conflict (Within same department context)
      const otherSec = String(other.section || other.class_name || '').trim().toLowerCase();
      const sameDept = !entry.department || !other.department || entry.department.toLowerCase() === other.department.toLowerCase();
      if (sameDept && otherSec && otherSec === section.toLowerCase()) {
        return {
          valid: false,
          error: `Section ${section} already has a class at this time.`
        };
      }

      // Room Conflict
      const otherRoom = String(other.room_name || other.room_number || '').trim().toLowerCase();
      if (otherRoom && otherRoom === roomName.toLowerCase()) {
        const isLabConflict = (sessionType === 'LAB') ||
          (other.session_type && String(other.session_type).toUpperCase() === 'LAB') ||
          (matchedRoom && matchedRoom.room_type === 'Laboratory') ||
          (other.room_type && other.room_type === 'Laboratory');

        if (isLabConflict) {
          return {
            valid: false,
            error: `This laboratory is already occupied during this time.`
          };
        }
        return {
          valid: false,
          error: `Room ${roomName} is already occupied during this time.`
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Exhaustive conflict detection pass across all timetable assignments using exact time interval overlaps.
 * Annotates each entry with has_conflict and conflict_details, and returns structured conflict records.
 */
function detectTimetableConflicts(entries, teacherRecords = [], candidateRooms = [], dbTeacherAvailability = []) {
  const conflicts = [];
  const conflictingEntryIds = new Set();
  const entryConflictMap = new Map();

  if (!Array.isArray(entries) || entries.length === 0) {
    return { conflicts, conflictingEntryIds };
  }

  for (let i = 0; i < entries.length; i++) {
    const a = entries[i];
    const idA = String(a.timetable_id || a.id || `entry_${i}`);
    const dayA = String(a.day || '').trim();
    const startAMin = timeToMinutes(a.start_time);
    const endAMin = timeToMinutes(a.end_time);
    const secA = String(a.section || a.class_name || '').trim();
    const teachA = String(a.teacher_name || '').trim();
    const subA = String(a.course_name || a.subject || '').trim();
    const roomA = String(a.room_name || '').trim();

    // Check interval validity on assignment A
    if (endAMin <= startAMin) {
      const desc = `Invalid time range: End time (${formatTime12(endAMin)}) must be later than start time (${formatTime12(startAMin)}).`;
      conflicts.push({
        id: `time_range_${idA}`,
        type: 'invalid_time',
        day: dayA,
        time_slot: `${formatTime12(startAMin)} – ${formatTime12(endAMin)}`,
        affected_ids: [idA],
        section: secA,
        teacher: teachA,
        title: `Invalid Period Timing: ${subA}`,
        description: desc
      });
      conflictingEntryIds.add(idA);
      if (!entryConflictMap.has(idA)) entryConflictMap.set(idA, []);
      entryConflictMap.get(idA).push(desc);
    }

    // Check teacher eligibility if teacher records are provided
    if (teacherRecords && teacherRecords.length > 0 && teachA) {
      const tRec = teacherRecords.find(
        (t) => (t.teacher_name || t.name || '').toLowerCase() === teachA.toLowerCase()
      );
      if (tRec && !isTeacherEligibleForSubject(tRec, subA)) {
        const desc = `Teacher ${teachA} is not configured to teach subject '${subA}'.`;
        conflicts.push({
          id: `ineligible_teacher_${idA}`,
          type: 'teacher_ineligible',
          day: dayA,
          time_slot: `${formatTime12(startAMin)} – ${formatTime12(endAMin)}`,
          affected_ids: [idA],
          teacher: teachA,
          title: `Teacher Assignment Mismatch: ${teachA}`,
          description: desc
        });
        conflictingEntryIds.add(idA);
        if (!entryConflictMap.has(idA)) entryConflictMap.set(idA, []);
        entryConflictMap.get(idA).push(desc);
      }
    }

    // Compare with subsequent assignments for interval overlaps
    for (let j = i + 1; j < entries.length; j++) {
      const b = entries[j];
      const idB = String(b.timetable_id || b.id || `entry_${j}`);
      const dayB = String(b.day || '').trim();

      if (dayA.toLowerCase() !== dayB.toLowerCase()) continue;

      const startBMin = timeToMinutes(b.start_time);
      const endBMin = timeToMinutes(b.end_time);

      // Interval overlap check: Math.max(startA, startB) < Math.min(endA, endB)
      if (Math.max(startAMin, startBMin) < Math.min(endAMin, endBMin)) {
        const overlapStart = Math.max(startAMin, startBMin);
        const overlapEnd = Math.min(endAMin, endBMin);
        const timeSlot12 = `${formatTime12(overlapStart)} – ${formatTime12(overlapEnd)}`;
        const secB = String(b.section || b.class_name || '').trim();
        const teachB = String(b.teacher_name || '').trim();
        const subB = String(b.course_name || b.subject || '').trim();
        const roomB = String(b.room_name || '').trim();

        // 1. Same section conflict
        const deptA = normalizeDepartmentName(a.department || '');
        const deptB = normalizeDepartmentName(b.department || '');
        const isTestA = String(a.department || '').startsWith('TestDept_');
        const isTestB = String(b.department || '').startsWith('TestDept_');
        if (isTestA !== isTestB) continue;

        const sameDept = (!deptA || !deptB || deptA.toLowerCase() === deptB.toLowerCase());
        if (sameDept && secA && secB && secA.toLowerCase() === secB.toLowerCase()) {
          const desc = `${secA} has two classes scheduled at ${formatTime12(startAMin)} on ${dayA}: "${subA}" and "${subB}". Both assignments require the same section at the same time.`;
          conflicts.push({
            id: `sec_conflict_${idA}_${idB}`,
            type: 'section_conflict',
            day: dayA,
            time_slot: timeSlot12,
            affected_ids: [idA, idB],
            section: secA,
            title: `Section Conflict: ${secA}`,
            description: desc
          });
          conflictingEntryIds.add(idA);
          conflictingEntryIds.add(idB);
          if (!entryConflictMap.has(idA)) entryConflictMap.set(idA, []);
          if (!entryConflictMap.has(idB)) entryConflictMap.set(idB, []);
          entryConflictMap.get(idA).push(desc);
          entryConflictMap.get(idB).push(desc);
        }

        // 2. Same teacher conflict
        if (teachA && teachB && teachA.toLowerCase() === teachB.toLowerCase()) {
          const desc = `Teacher ${teachA} is assigned to two classes at ${formatTime12(startAMin)} on ${dayA}: "${subA}" (${secA}) and "${subB}" (${secB}). Both assignments require the same teacher at the same time.`;
          conflicts.push({
            id: `teach_conflict_${idA}_${idB}`,
            type: 'teacher_conflict',
            day: dayA,
            time_slot: timeSlot12,
            affected_ids: [idA, idB],
            teacher: teachA,
            title: `Teacher Conflict: ${teachA}`,
            description: desc
          });
          conflictingEntryIds.add(idA);
          conflictingEntryIds.add(idB);
          if (!entryConflictMap.has(idA)) entryConflictMap.set(idA, []);
          if (!entryConflictMap.has(idB)) entryConflictMap.set(idB, []);
          entryConflictMap.get(idA).push(desc);
          entryConflictMap.get(idB).push(desc);
        }

        // 3. Same room conflict
        if (roomA && roomB && roomA.toLowerCase() === roomB.toLowerCase() && roomA !== '') {
          const desc = `Room ${roomA} is assigned to two classes at ${formatTime12(startAMin)} on ${dayA}: "${subA}" (${secA}) and "${subB}" (${secB}).`;
          conflicts.push({
            id: `room_conflict_${idA}_${idB}`,
            type: 'room_conflict',
            day: dayA,
            time_slot: timeSlot12,
            affected_ids: [idA, idB],
            room: roomA,
            title: `Room Conflict: ${roomA}`,
            description: desc
          });
          conflictingEntryIds.add(idA);
          conflictingEntryIds.add(idB);
          if (!entryConflictMap.has(idA)) entryConflictMap.set(idA, []);
          if (!entryConflictMap.has(idB)) entryConflictMap.set(idB, []);
          entryConflictMap.get(idA).push(desc);
          entryConflictMap.get(idB).push(desc);
        }
      }
    }
  }

  // Annotate all assignments with conflict flags and explanations
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const id = String(e.timetable_id || e.id || `entry_${i}`);
    if (conflictingEntryIds.has(id)) {
      e.has_conflict = true;
      e.conflict_details = entryConflictMap.get(id) || ['Scheduling conflict detected.'];
    } else {
      e.has_conflict = false;
      delete e.conflict_details;
    }
  }

  return { conflicts, conflictingEntryIds };
}

// ==============================================================================
// 1. HEALTH CHECK ENDPOINT
// ==============================================================================
app.get('/api/health', async (req, res) => {
  if (!supabase) {
    return res.json({
      status: 'ok',
      database: 'local_storage',
      provider: 'local',
      message: 'Running in high-reliability local storage mode.'
    });
  }

  try {
    const { error } = await withTimeout(supabase.from('rooms').select('*').limit(1), 500);
    if (error) {
      return res.json({
        status: 'ok',
        database: 'local_storage',
        provider: 'local',
        message: 'Running in local storage mode (Supabase notice: ' + error.message + ')'
      });
    }
    return res.json({ status: 'ok', database: true, provider: 'supabase' });
  } catch (error) {
    return res.json({
      status: 'ok',
      database: 'local_storage',
      provider: 'local',
      message: 'Running in local storage mode (Supabase notice: ' + error.message + ')'
    });
  }
});

// ==============================================================================
// 1B. DEPARTMENTS ENDPOINTS (Requirements 3-8, 34-36)
// ==============================================================================
app.get('/api/departments', async (req, res) => {
  const localDepartments = loadDepartmentsLocally();

  if (supabase) {
    try {
      const { data, error } = await withTimeout(supabase.from('departments').select('*'), 250);
      if (!error && data && data.length > 0) {
        const map = new Map();
        localDepartments.forEach((d) => map.set(d.name.toLowerCase(), d));
        data.forEach((row) => {
          const name = (row.department_name || row.name || '').trim();
          if (name && !map.has(name.toLowerCase())) {
            map.set(name.toLowerCase(), {
              id: row.department_id || row.id || `dept_${Date.now()}`,
              name: name,
              code: row.code || name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 5)
            });
          }
        });
        return res.json(Array.from(map.values()));
      }
    } catch (_) {}
  }

  res.json(localDepartments);
});

app.post('/api/departments', async (req, res) => {
  try {
    const rawName = req.body.name || req.body.department_name || req.body.department;
    const name = String(rawName || '').trim();

    if (!name) {
      return res.status(400).json({ error: 'Department name cannot be empty.' });
    }

    const allDepts = loadDepartmentsLocally();
    const existing = allDepts.find((d) => d.name.toLowerCase() === name.toLowerCase());

    if (existing) {
      return res.json({
        success: true,
        message: 'Department already exists.',
        department: existing
      });
    }

    const rawCode = req.body.code || name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 6);
    const newDept = {
      id: `dept_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: name,
      code: rawCode || 'DEPT'
    };

    allDepts.push(newDept);
    saveDepartmentsLocally(allDepts);

    if (supabase) {
      setImmediate(async () => {
        try {
          await supabase.from('departments').insert({
            department_name: name,
            code: newDept.code
          });
        } catch (_) {}
      });
    }

    return res.status(201).json({
      success: true,
      message: `Department '${name}' created successfully.`,
      department: newDept
    });
  } catch (err) {
    console.error('POST /api/departments error:', err);
    return res.status(500).json({ error: 'Unable to save department: ' + err.message });
  }
});

app.get('/api/departments/saved-timetables', async (req, res) => {
  try {
    const entries = loadTimetableLocally();
    const departments = loadDepartmentsLocally();
    const deptLookup = new Map();
    for (const d of departments) {
      if (d && d.name) deptLookup.set(d.name.toLowerCase(), d.name);
      if (d && d.code) deptLookup.set(d.code.toLowerCase(), d.name);
    }
    const deptsMap = new Map();

    for (const e of entries) {
      let d = String(e.department || '').trim();
      if (!d) continue;
      if (deptLookup.has(d.toLowerCase())) {
        d = deptLookup.get(d.toLowerCase());
      }
      if (!deptsMap.has(d)) {
        deptsMap.set(d, {
          name: d,
          entries_count: 0,
          days: new Set(),
          sections: new Set(),
          teachers: new Set(),
          rooms: new Set(),
          has_lab: false
        });
      }
      const rec = deptsMap.get(d);
      rec.entries_count++;
      if (e.day) rec.days.add(e.day);
      if (e.section || e.class_name) rec.sections.add(e.section || e.class_name);
      if (e.teacher_name) rec.teachers.add(e.teacher_name);
      if (e.room_name) rec.rooms.add(e.room_name);
      if (e.session_type === 'LAB' || e.is_lab) rec.has_lab = true;
    }

    const summaries = Array.from(deptsMap.values()).map((r) => ({
      name: r.name,
      entries_count: r.entries_count,
      days: Array.from(r.days),
      sections: Array.from(r.sections),
      teachers_count: r.teachers.size,
      rooms_count: r.rooms.size,
      has_lab: r.has_lab
    }));

    res.json(summaries);
  } catch (err) {
    console.error('GET /api/departments/saved-timetables error:', err);
    res.status(500).json({ error: 'Unable to retrieve saved department timetables: ' + err.message });
  }
});

// ==============================================================================
// 1C. BREAK MANAGEMENT API (Requirements Part 2-5, 25, 26)
// ==============================================================================
app.get('/api/breaks', async (req, res) => {
  try {
    const allBreaks = loadBreaksLocally();
    const deptQuery = String(req.query.department || '').trim();
    if (deptQuery && deptQuery.toLowerCase() !== 'all') {
      const filtered = allBreaks.filter((b) => !b.department || b.department.toLowerCase() === deptQuery.toLowerCase());
      return res.json(filtered);
    }
    return res.json(allBreaks);
  } catch (err) {
    res.status(500).json({ error: 'Unable to load breaks: ' + err.message });
  }
});

app.post('/api/breaks', async (req, res) => {
  try {
    const rawBreaks = Array.isArray(req.body) ? req.body : (Array.isArray(req.body.breaks) ? req.body.breaks : []);
    const cleanBreaks = [];

    for (const b of rawBreaks) {
      if (!b) continue;
      const name = String(b.name || b.break_name || 'Break').trim();
      const day = String(b.day || b.day_name || 'Monday').trim();
      let startTime = String(b.startTime || b.start_time || '').trim();
      let endTime = String(b.endTime || b.end_time || '').trim();
      const type = String(b.type || b.break_type || 'Short Break').trim();
      const department = String(b.department || '').trim();

      if (!startTime || !endTime) {
        return res.status(400).json({ error: 'Break start time and end time are required.' });
      }
      if (startTime.length === 5) startTime = `${startTime}:00`;
      if (endTime.length === 5) endTime = `${endTime}:00`;

      if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
        return res.status(400).json({
          error: `Break '${name}' on ${day} has invalid times: start time (${startTime.slice(0, 5)}) must be before end time (${endTime.slice(0, 5)}).`
        });
      }

      cleanBreaks.push({
        id: b.id || `brk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name,
        day,
        start_time: startTime,
        end_time: endTime,
        type,
        department
      });
    }

    // Validate overlaps between breaks on the same day
    for (let i = 0; i < cleanBreaks.length; i++) {
      for (let j = i + 1; j < cleanBreaks.length; j++) {
        const bi = cleanBreaks[i];
        const bj = cleanBreaks[j];
        if (bi.day.toLowerCase() === bj.day.toLowerCase()) {
          const b1Start = timeToMinutes(bi.start_time);
          const b1End = timeToMinutes(bi.end_time);
          const b2Start = timeToMinutes(bj.start_time);
          const b2End = timeToMinutes(bj.end_time);
          if (Math.max(b1Start, b2Start) < Math.min(b1End, b2End)) {
            return res.status(400).json({
              error: `Break times overlap. Break '${bj.name}' overlaps with '${bi.name}' on ${bi.day}.`
            });
          }
        }
      }
    }

    saveBreaksLocally(cleanBreaks);
    res.json({
      success: true,
      message: 'Breaks saved successfully.',
      breaks: cleanBreaks
    });
  } catch (err) {
    res.status(500).json({ error: 'Unable to save breaks: ' + err.message });
  }
});

// ==============================================================================
// 2. TEACHERS CRUD
// ==============================================================================
app.get('/api/teachers', checkDatabase, async (req, res) => {
  try {
    if (supabase) {
      try {
        const { data, error } = await withTimeout(supabase.from('teachers').select('*'), 500);
        if (!error && Array.isArray(data) && data.length > 0) {
          const formatted = data.map(formatTeacherRecord).filter(Boolean);
          saveTeachersLocally(formatted);
          return res.json(formatted);
        }
      } catch (_) {}
    }
    const local = loadTeachersLocally();
    return res.json(local.map(formatTeacherRecord).filter(Boolean));
  } catch (error) {
    const local = loadTeachersLocally();
    return res.json(local.map(formatTeacherRecord).filter(Boolean));
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
    const localTeachers = loadTeachersLocally();
    const existing = localTeachers.find(
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

    const assignedSub = String(req.body.assigned_subject || req.body.subject || '').trim() || null;
    let assignedSubs = Array.isArray(req.body.subjects)
      ? req.body.subjects.map(String).map((s) => s.trim().toLowerCase()).filter(Boolean)
      : (assignedSub ? [assignedSub.toLowerCase()] : []);

    const newTeacher = {
      id: `teacher_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      teacher_id: `teacher_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: teacherName,
      teacher_name: teacherName,
      specialization: specialization || null,
      working_days_per_week: workingDays,
      assigned_subject: assignedSub,
      assigned_subjects: assignedSubs,
      availability: {}
    };

    localTeachers.push(newTeacher);
    saveTeachersLocally(localTeachers);

    if (supabase) {
      withTimeout(
        supabase.from('teachers').insert({
          name: teacherName,
          specialization: specialization || null,
          working_days_per_week: workingDays
        }),
        1000
      ).catch(() => {});
    }

    const formatted = formatTeacherRecord(newTeacher);
    res.json({
      teacher_id: formatted.teacher_id,
      teacher_name: formatted.teacher_name,
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
    if (supabase) {
      try {
        const { data, error } = await withTimeout(supabase.from('rooms').select('*'), 500);
        if (!error && Array.isArray(data) && data.length > 0) {
          const formatted = data.map(formatRoomRecord).filter(Boolean);
          saveRoomsLocally(formatted);
          return res.json(formatted);
        }
      } catch (_) {}
    }
    const local = loadRoomsLocally();
    return res.json(local.map(formatRoomRecord).filter(Boolean));
  } catch (error) {
    const local = loadRoomsLocally();
    return res.json(local.map(formatRoomRecord).filter(Boolean));
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
    const localRooms = loadRoomsLocally();
    const existing = localRooms.find(
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

    const newRoom = {
      id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      room_id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      room_name: roomName,
      room_number: roomName,
      room_type: roomType,
      capacity,
      availability: 'Available'
    };

    localRooms.push(newRoom);
    saveRoomsLocally(localRooms);

    if (supabase) {
      withTimeout(
        supabase.from('rooms').insert({
          room_number: roomName,
          room_type: roomType,
          capacity,
          availability: 'Available'
        }),
        1000
      ).catch(() => {});
    }

    const formatted = formatRoomRecord(newRoom);
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
  const roomId = String(req.params.id);
  const roomName = String(req.body.room_name || req.body.room_number || '').trim();
  const rawType = String(req.body.room_type || '').trim();
  const capacity = Number(req.body.capacity || 40);

  let roomType = 'Classroom';
  if (/lab/i.test(rawType)) roomType = 'Laboratory';
  else if (rawType === 'Classroom' || rawType === 'Laboratory') roomType = rawType;

  try {
    const localRooms = loadRoomsLocally();
    const idx = localRooms.findIndex((r) => String(r.id || r.room_id) === roomId);

    if (idx !== -1) {
      if (roomName) {
        localRooms[idx].room_name = roomName;
        localRooms[idx].room_number = roomName;
      }
      if (roomType) localRooms[idx].room_type = roomType;
      if (capacity) localRooms[idx].capacity = capacity;
      saveRoomsLocally(localRooms);

      if (supabase) {
        withTimeout(
          supabase.from('rooms').update({
            room_number: roomName || localRooms[idx].room_number,
            room_type: roomType || localRooms[idx].room_type,
            capacity: capacity || localRooms[idx].capacity
          }).eq('id', roomId),
          1000
        ).catch(() => {});
      }

      return res.json(formatRoomRecord(localRooms[idx]));
    }

    return res.status(404).json({ error: 'Room not found.' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to update room: ' + error.message });
  }
});

app.delete('/api/rooms/:id', checkDatabase, async (req, res) => {
  try {
    const roomId = String(req.params.id);
    let localRooms = loadRoomsLocally();
    localRooms = localRooms.filter((r) => String(r.id || r.room_id) !== roomId);
    saveRoomsLocally(localRooms);

    if (supabase) {
      withTimeout(supabase.from('rooms').delete().eq('id', roomId), 1000).catch(() => {});
      withTimeout(supabase.from('rooms').delete().eq('room_id', roomId), 1000).catch(() => {});
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
    let formatted = [];
    if (supabase) {
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

        if (!error && data && data.length > 0) {
          formatted = data.map((row) => ({
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
        }
      } catch (_) {}
    }

    if (formatted.length === 0) {
      formatted = loadTeacherAvailabilityLocally();
    }

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
    const localRecords = loadTeacherAvailabilityLocally();

    for (const item of teachersPayload) {
      const name = String(item.teacher_name || item.name || '').trim();
      const spec = String(item.specialization || '').trim();
      const selectedSlots = Array.isArray(item.availability) ? item.availability : [];

      if (!name) continue;

      // Update local storage cache
      for (let idx = localRecords.length - 1; idx >= 0; idx--) {
        if (localRecords[idx].teacher_name.toLowerCase() === name.toLowerCase()) {
          localRecords.splice(idx, 1);
        }
      }

      for (const slotStr of selectedSlots) {
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

        localRecords.push({
          availability_id: `avail_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          teacher_name: name,
          specialization: spec,
          day: dayName,
          day_of_week: getDayNumber(dayName),
          start_time: startTime,
          end_time: endTime,
          is_available: item.is_available !== undefined ? Boolean(item.is_available) : true
        });
        savedCount++;
      }

      if (supabase) {
        try {
          // 1. Ensure teacher exists in Supabase
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
              const { data: newT } = await supabase
                .from('teachers')
                .insert({ teacher_name: name, specialization: spec })
                .select();
              if (newT && newT.length > 0) teacherId = newT[0].teacher_id;
            }
          }

          if (teacherId) {
            await supabase.from('teacher_availability').delete().eq('teacher_id', teacherId);
            for (const slotStr of selectedSlots) {
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
                const { data: newSlot } = await supabase
                  .from('time_slots')
                  .insert({ day_of_week: dayOfWeek, start_time: startTime, end_time: endTime })
                  .select();
                if (newSlot && newSlot.length > 0) slotId = newSlot[0].slot_id;
              }

              if (slotId) {
                await supabase.from('teacher_availability').upsert({
                  teacher_id: teacherId,
                  slot_id: slotId,
                  is_available: item.is_available !== undefined ? Boolean(item.is_available) : true
                }, { onConflict: 'teacher_id,slot_id' });
              }
            }
          }
        } catch (_) {}
      }
    }

    saveTeacherAvailabilityLocally(localRecords);

    res.json({
      success: true,
      message: 'Teacher availability saved successfully.',
      records_saved: savedCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Unable to save teacher availability: ' + error.message });
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

    // 0. Normalize and validate Department input (Requirements 2, 9, 10, 11, 25, 48, 49)
    const department = String(body.department || body.department_name || body.departmentId || body.department_code || '').trim();
    if (!department) {
      return res.status(400).json({
        error: 'Please select a department before generating the timetable.'
      });
    }

    // Auto-register department into departments list if new
    try {
      const knownDepts = loadDepartmentsLocally();
      if (!knownDepts.some((d) => d.name.toLowerCase() === department.toLowerCase())) {
        const newD = {
          id: `dept_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: department,
          code: department.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 6) || 'DEPT'
        };
        knownDepts.push(newD);
        saveDepartmentsLocally(knownDepts);
      }
    } catch (_) {}

    // 1. Normalize and validate Teachers input
    let teachers = [];
    if (Array.isArray(body.teachers)) {
      teachers = body.teachers.map((t) => {
        if (typeof t === 'string') {
          return { name: t.trim(), subject: '', subjects: [], is_na: false, subjectPreference: 'Explicit', specialization: '', availability: {} };
        }
        const subVal = t.assigned_subject || t.subject || '';
        let subList = Array.isArray(t.subjects)
          ? t.subjects.map(String).map((s) => s.trim()).filter(Boolean)
          : (subVal ? String(subVal).split(',').map((s) => s.trim()).filter(Boolean) : []);

        const isNA = Boolean(
          t.is_na === true ||
          String(t.subjectPreference || '').toUpperCase() === 'NA' ||
          subList.some((s) => s.toUpperCase() === 'NA')
        );

        const cleanSubs = isNA ? [] : subList.filter((s) => s.toUpperCase() !== 'NA');

        return {
          name: String(t.name || t.teacher_name || '').trim(),
          is_na: isNA,
          raw_subjects: subList,
          subjectPreference: isNA ? 'NA' : 'Explicit',
          subject: isNA ? 'NA' : cleanSubs.join(', '),
          subjects: isNA ? ['NA'] : cleanSubs,
          specialization: String(t.specialization || '').trim(),
          availability: (t.availability && typeof t.availability === 'object') ? t.availability : {}
        };
      }).filter((t) => t.name);
    } else if (body.teacher_name) {
      const subVal = body.assigned_subject || body.subject || '';
      let subList = Array.isArray(body.subjects)
        ? body.subjects.map(String).map((s) => s.trim()).filter(Boolean)
        : (subVal ? String(subVal).split(',').map((s) => s.trim()).filter(Boolean) : []);

      const isNA = Boolean(
        body.is_na === true ||
        String(body.subjectPreference || '').toUpperCase() === 'NA' ||
        subList.some((s) => s.toUpperCase() === 'NA')
      );
      const cleanSubs = isNA ? [] : subList.filter((s) => s.toUpperCase() !== 'NA');

      teachers = [{
        name: String(body.teacher_name).trim(),
        is_na: isNA,
        raw_subjects: subList,
        subjectPreference: isNA ? 'NA' : 'Explicit',
        subject: isNA ? 'NA' : cleanSubs.join(', '),
        subjects: isNA ? ['NA'] : cleanSubs,
        specialization: String(body.specialization || body.department_name || '').trim(),
        availability: (body.availability && typeof body.availability === 'object') ? body.availability : {}
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
      subjects = body.subjects
        .map((s) => (typeof s === 'object' && s !== null ? (s.name || s.subject || s.course_name || '') : String(s || '')))
        .map((s) => String(s).trim())
        .filter(Boolean);
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

    // 2B. Validate Teacher-Subject Assignments (Requirements 1, 4, 6, 7, 10, 11)
    const hasAnyAssignedSubject = teachers.some((t) => t.is_na || (t.subjects && t.subjects.length > 0));
    if (!hasAnyAssignedSubject) {
      // Legacy fallback: auto-assign configured subjects so existing API clients & legacy tests remain compatible
      for (let i = 0; i < subjects.length; i++) {
        const tIdx = i % teachers.length;
        if (!teachers[tIdx].subjects.includes(subjects[i])) {
          teachers[tIdx].subjects.push(subjects[i]);
          teachers[tIdx].subject = teachers[tIdx].subjects.join(', ');
        }
      }
    }

    const subjectSet = new Set(lowerSubjectNames);
    for (const t of teachers) {
      // NA Rule (Section 11): Cannot mix NA with specific subjects
      if (t.is_na && t.raw_subjects && t.raw_subjects.length > 1 && t.raw_subjects.some((s) => s.toUpperCase() !== 'NA')) {
        return res.status(400).json({
          error: `Teacher '${t.name}' cannot have specific subjects assigned while NA (no preference) is selected.`
        });
      }

      if (!t.is_na) {
        if (!t.subjects.length) {
          return res.status(400).json({
            error: `Please assign a valid subject to teacher '${t.name}'.`
          });
        }

        // Duplicate subject prevention (Section 7)
        const lowerSubs = t.subjects.map((s) => s.toLowerCase());
        if (new Set(lowerSubs).size !== lowerSubs.length) {
          return res.status(400).json({
            error: `Teacher '${t.name}' has duplicate subject assignments. Each subject can only be assigned once per teacher.`
          });
        }

        for (const s of t.subjects) {
          const baseS = s.toLowerCase().replace(/\s+lab$/i, '').trim();
          if (!subjectSet.has(s.toLowerCase()) && !subjectSet.has(baseS)) {
            return res.status(400).json({
              error: `Subject '${s}' assigned to teacher '${t.name}' does not exist in the configured subjects list.`
            });
          }
        }
      }
    }

    // Verify that every global subject has at least one qualified teacher assigned
    for (const s of subjects) {
      const hasTeacher = teachers.some((t) =>
        t.is_na || t.subjects.some((ts) => ts.toLowerCase() === s.toLowerCase() || ts.toLowerCase().replace(/\s+lab$/i, '') === s.toLowerCase())
      );
      if (!hasTeacher) {
        return res.status(400).json({
          error: `No teacher is assigned to teach subject '${s}'. Please assign at least one teacher to '${s}'.`
        });
      }
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
          return { room_number: r.trim(), room_type: 'Classroom', capacity: 40, availability: 'Available' };
        }
        return {
          room_number: String(r.room_number || r.roomNumber || r.room_name || r.name || '').trim(),
          room_type: String(r.room_type || r.roomType || r.type || 'Classroom').trim(),
          capacity: Number(r.capacity || 40),
          availability: r.availability !== undefined ? r.availability : (r.status !== undefined ? r.status : 'Available')
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

    // 5. Global Room Type Preference (Room Requirement box is optional; defaults to Both)
    const roomTypePreference = String(body.room_type || 'Both').trim() || 'Both';

    const configuredWorkingDays = normalizeWorkingDays(
      body.workingDays || body.working_days_list || (Array.isArray(body.working_days) ? body.working_days : null),
      body.working_days || body.workingDays || body.working_days_per_week
    );
    if (!configuredWorkingDays.length) {
      return res.status(400).json({ error: 'At least one valid working day must be configured (Monday through Sunday).' });
    }
    const workingDaysCount = configuredWorkingDays.length;
    const configuredDayNames = configuredWorkingDays.map((d) => d.day_name);

    const rawDayPeriods = body.day_periods || body.dayPeriods || null;
    const startTime = String(body.working_start_time || '09:00').trim();
    const endTime = String(body.working_end_time || '16:00').trim();

    let slotDefinitions = null;
    try {
      slotDefinitions = buildTimeSlots(startTime, endTime, configuredWorkingDays[0]?.day_name || 'Monday');
    } catch (err) {
      if (!rawDayPeriods || Object.keys(rawDayPeriods).length === 0) {
        return res.status(400).json({ error: err.message });
      }
    }

    // 5A. Break Management & Day-Specific Periods (Requirements Part 2-9, 10-18)
    const rawBreaks = Array.isArray(body.breaks)
      ? body.breaks
      : (Array.isArray(body.day_breaks) ? body.day_breaks : (Array.isArray(body.break_management) ? body.break_management : []));

    const normalizedBreaks = [];
    if (Array.isArray(rawBreaks)) {
      for (const b of rawBreaks) {
        if (!b) continue;
        const bDay = String(b.day || b.day_name || 'All Working Days').trim();
        const bName = String(b.name || b.break_name || 'Break').trim();
        let bStart = String(b.startTime || b.start_time || '').trim();
        let bEnd = String(b.endTime || b.end_time || '').trim();
        const bType = String(b.type || b.break_type || 'Short Break').trim();

        if (bStart && bEnd) {
          if (bStart.length === 5) bStart = `${bStart}:00`;
          if (bEnd.length === 5) bEnd = `${bEnd}:00`;

          if (bDay.toLowerCase() === 'all working days' || bDay.toLowerCase() === 'all' || bDay.toLowerCase() === 'everyday') {
            for (const dName of configuredDayNames) {
              normalizedBreaks.push({
                name: bName,
                day: dName,
                start_time: bStart,
                end_time: bEnd,
                type: bType,
                department
              });
            }
          } else {
            const matchedDay = configuredWorkingDays.find((d) => d.day_name.toLowerCase() === bDay.toLowerCase());
            if (matchedDay) {
              normalizedBreaks.push({
                name: bName,
                day: matchedDay.day_name,
                start_time: bStart,
                end_time: bEnd,
                type: bType,
                department
              });
            }
          }
        }
      }
    }



    let dayPeriodsConfig = {};
    const allSlotsByDay = {};
    const periodCountsByDay = {};
    const dayBreaksMap = {};

    for (const dayObj of configuredWorkingDays) {
      const dName = dayObj.day_name;
      const dayBreaks = normalizedBreaks.filter((b) => b.day.toLowerCase() === dName.toLowerCase());

      // Determine required periods for this day
      let reqCount = Math.max(1, Math.min(5, slotDefinitions ? slotDefinitions.length : 5));
      if (rawDayPeriods && rawDayPeriods[dName]) {
        if (Array.isArray(rawDayPeriods[dName])) {
          reqCount = rawDayPeriods[dName].length;
        } else if (Number(rawDayPeriods[dName])) {
          reqCount = Number(rawDayPeriods[dName]);
        }
      } else if (body.period_count || body.periods_per_day) {
        reqCount = Number(body.period_count || body.periods_per_day);
      }

      let dayResult;
      try {
        dayResult = calculateDayTeachingPeriods({
          dayName: dName,
          dayOfWeek: dayObj.day_of_week,
          startTime,
          endTime,
          requiredPeriodCount: reqCount,
          dayBreaks,
          explicitDayPeriods: (rawDayPeriods && Array.isArray(rawDayPeriods[dName])) ? rawDayPeriods[dName] : null,
          fixedClasses: body.fixed_classes || []
        });
      } catch (err) {
        console.error('calculateDayTeachingPeriods error stack:', err);
        return res.status(400).json({ error: err.message, stack: err.stack });
      }

      dayPeriodsConfig[dName] = dayResult.teachingPeriods;
      dayBreaksMap[dName] = dayResult.breaks;
      periodCountsByDay[dName] = dayResult.teachingPeriods.length;

      allSlotsByDay[dName] = dayResult.teachingPeriods.map((p, sIdx) => ({
        slot_id: `${dName}_p${p.period}`,
        slot_index: sIdx,
        period_number: p.period,
        day_name: dName,
        day_of_week: dayObj.day_of_week,
        start_time: p.start_time,
        end_time: p.end_time,
        is_break: false
      }));
    }

    // 5B. Normalize and validate Lab Classes (Multi-Day and Multi-Section Support)
    const rawLabClasses = Array.isArray(body.lab_classes)
      ? body.lab_classes
      : (Array.isArray(body.labClasses) ? body.labClasses : []);

    const labClasses = [];
    const configuredLabRooms = userRooms.filter((r) => r.room_type === 'Laboratory');

    if (rawLabClasses.length > 0) {
      if (configuredLabRooms.length === 0) {
        return res.status(400).json({ error: 'No suitable laboratory room is available.' });
      }

      for (let i = 0; i < rawLabClasses.length; i++) {
        const lc = rawLabClasses[i];
        if (!lc) continue;

        const labSub = String(lc.subject || lc.course_name || '').trim();
        const labTeacher = String(lc.teacher || lc.teacher_name || '').trim();
        let labDur = Number(lc.duration || lc.slots || 2);
        const labRoom = String(lc.room || lc.room_name || lc.room_number || '').trim();
        let labStartTime = String(lc.start_time || lc.startTime || '').trim();
        let labEndTime = String(lc.end_time || lc.endTime || '').trim();

        if (!labSub) {
          return res.status(400).json({ error: `Lab class ${i + 1}: Subject is required.` });
        }
        const cleanLabSub = labSub.toLowerCase().replace(/\s+lab$/i, '');
        const matchingSub = subjects.find(
          (s) => s.toLowerCase() === labSub.toLowerCase() || s.toLowerCase() === cleanLabSub
        );
        if (!matchingSub) {
          return res.status(400).json({ error: `Lab class ${i + 1}: Subject '${labSub}' is not in the configured subjects list.` });
        }

        if (!labTeacher) {
          return res.status(400).json({ error: `Lab class ${i + 1}: Teacher is required.` });
        }
        const tObj = teachers.find((t) => t.name.toLowerCase() === labTeacher.toLowerCase());
        if (!tObj) {
          return res.status(400).json({ error: `Lab class ${i + 1}: Teacher '${labTeacher}' is not in the teachers list.` });
        }

        // Teacher eligibility check for Lab class
        if (!tObj.is_na && !tObj.subjects.some((ts) => ts.toLowerCase() === labSub.toLowerCase() || ts.toLowerCase() === cleanLabSub)) {
          return res.status(400).json({ error: 'The selected teacher is not configured to teach this subject.' });
        }

        // Multi-Section Extraction
        const labSecs = (Array.isArray(lc.sections) && lc.sections.length > 0)
          ? lc.sections.map(String).map((s) => s.trim()).filter(Boolean)
          : (lc.section ? [String(lc.section).trim()] : []);

        if (labSecs.length === 0) {
          return res.status(400).json({ error: `Lab class ${i + 1}: At least one section is required.` });
        }
        for (const ls of labSecs) {
          if (!sections.some((sec) => sec.toLowerCase() === ls.toLowerCase())) {
            return res.status(400).json({ error: `Lab class ${i + 1}: Section '${ls}' is not in the configured sections list.` });
          }
        }

        // Multi-Day Extraction
        const labDays = (Array.isArray(lc.days) && lc.days.length > 0)
          ? lc.days.map(String).map((d) => d.trim()).filter(Boolean)
          : (lc.day ? [String(lc.day).trim()] : []);

        if (labDays.length === 0) {
          return res.status(400).json({ error: `Lab class ${i + 1}: Please select a day for the lab class.` });
        }
        for (const ld of labDays) {
          if (!configuredWorkingDays.some((d) => d.day_name.toLowerCase() === ld.toLowerCase())) {
            return res.status(400).json({
              error: `Selected day '${ld}' for ${labSub} is not an active working day.`
            });
          }
        }

        const dayMode = String(lc.day_mode || lc.dayMode || 'every').toLowerCase();
        const sectionMode = String(lc.section_mode || lc.sectionMode || 'separate').toLowerCase();

        if (labRoom) {
          const rObj = userRooms.find((r) => r.room_number.toLowerCase() === labRoom.toLowerCase());
          if (!rObj) {
            return res.status(400).json({ error: `Lab class ${i + 1}: Room '${labRoom}' is not configured.` });
          }
          if (rObj.room_type !== 'Laboratory') {
            return res.status(400).json({ error: 'No suitable laboratory room is available.' });
          }
        }

        if (labStartTime) labStartTime = normalizeTime24(labStartTime) || labStartTime;
        if (labEndTime) labEndTime = normalizeTime24(labEndTime) || labEndTime;

        if (labStartTime && labEndTime) {
          const labStartMin = timeToMinutes(labStartTime);
          const labEndMin = timeToMinutes(labEndTime);
          if (isNaN(labStartMin) || isNaN(labEndMin) || labStartMin >= labEndMin) {
            return res.status(400).json({
              error: `Lab class ${i + 1}: Start time must be earlier than end time.`
            });
          }
          const calcDuration = Math.round((labEndMin - labStartMin) / 60);
          if (calcDuration > 0) labDur = calcDuration;
        }

        // Expand sections according to section_mode ('separate' creates session per section, 'shared' combines them)
        const sectionGroups = sectionMode === 'shared' ? [labSecs] : labSecs.map((s) => [s]);

        for (const sGroup of sectionGroups) {
          const displaySec = sGroup.join(' & ');
          if (dayMode === 'every') {
            // Mode 1: Schedule on every selected day -> creates a separate session for each day
            for (const dName of labDays) {
              const matchedLabDay = configuredWorkingDays.find((d) => d.day_name.toLowerCase() === dName.toLowerCase());
              const daySlots = allSlotsByDay[matchedLabDay.day_name] || [];

              let exactIndices = null;
              if (labStartTime && labEndTime) {
                const matchResult = matchLabToDayPeriods(
                  labStartTime,
                  labEndTime,
                  matchedLabDay.day_name,
                  daySlots,
                  dayBreaksMap[matchedLabDay.day_name] || []
                );
                if (!matchResult.valid) {
                  return res.status(400).json({
                    error: `Lab class ${i + 1} (${labSub}): ${matchResult.error}`
                  });
                }
                exactIndices = matchResult.matchedIndices;
                labDur = matchResult.duration;
              }

              labClasses.push({
                subject: labSub,
                teacher: tObj.name,
                section: displaySec,
                sectionsList: sGroup,
                day: matchedLabDay.day_name,
                candidateDays: [matchedLabDay],
                duration: Math.max(1, labDur),
                room: labRoom,
                start_time: labStartTime || null,
                end_time: labEndTime || null,
                exactSlotIndices: exactIndices,
                is_shared: sGroup.length > 1,
                day_mode: dayMode,
                section_mode: sectionMode,
                rawIndex: i
              });
            }
          } else {
            // Mode 2: Schedule on one suitable selected day -> candidateDays contains all selected days
            const matchedCandidateDays = configuredWorkingDays.filter((d) =>
              labDays.some((ld) => ld.toLowerCase() === d.day_name.toLowerCase())
            );

            let candidateDaysForThisLab = matchedCandidateDays;
            let exactSlotsByDay = {};

            if (labStartTime && labEndTime) {
              const eligibleDays = [];
              let lastError = '';

              for (const candDay of matchedCandidateDays) {
                const cSlots = allSlotsByDay[candDay.day_name] || [];
                const dBreaks = dayBreaksMap[candDay.day_name] || [];
                const matchResult = matchLabToDayPeriods(
                  labStartTime,
                  labEndTime,
                  candDay.day_name,
                  cSlots,
                  dBreaks
                );
                if (matchResult.valid) {
                  eligibleDays.push(candDay);
                  exactSlotsByDay[candDay.day_name] = matchResult.matchedIndices;
                  labDur = matchResult.duration;
                } else {
                  lastError = matchResult.error;
                }
              }

              if (eligibleDays.length === 0) {
                return res.status(400).json({
                  error: `Lab class ${i + 1} (${labSub}): ${lastError || `Selected lab time is outside the configured timetable period on all selected candidate days (${labDays.join(', ')}).`}`
                });
              }

              candidateDaysForThisLab = eligibleDays;
            }

            labClasses.push({
              subject: labSub,
              teacher: tObj.name,
              section: displaySec,
              sectionsList: sGroup,
              day: null,
              candidateDays: candidateDaysForThisLab,
              exactSlotsByDay: exactSlotsByDay,
              duration: Math.max(1, labDur),
              room: labRoom,
              start_time: labStartTime || null,
              end_time: labEndTime || null,
              exactSlotIndices: null,
              is_shared: sGroup.length > 1,
              day_mode: dayMode,
              section_mode: sectionMode,
              rawIndex: i
            });
          }
        }
      }
    }

    // Early validation: Check for mutual collisions between fixed lab classes
    for (let a = 0; a < labClasses.length; a++) {
      const l1 = labClasses[a];
      if (!l1.day || !l1.start_time || !l1.end_time) continue;
      const s1 = timeToMinutes(l1.start_time);
      const e1 = timeToMinutes(l1.end_time);

      for (let b = a + 1; b < labClasses.length; b++) {
        const l2 = labClasses[b];
        if (l1.rawIndex === l2.rawIndex) continue;
        if (!l2.day || !l2.start_time || !l2.end_time) continue;
        if (l1.day.toLowerCase() !== l2.day.toLowerCase()) continue;

        const s2 = timeToMinutes(l2.start_time);
        const e2 = timeToMinutes(l2.end_time);

        if (Math.max(s1, s2) < Math.min(e1, e2)) {
          if (l1.teacher.toLowerCase() === l2.teacher.toLowerCase()) {
            return res.status(400).json({
              error: `The selected teacher is already scheduled during this interval. Two fixed lab sessions require the same teacher (${l1.teacher}) at overlapping times on ${l1.day} (${formatTime12(l1.start_time)}–${formatTime12(l1.end_time)} and ${formatTime12(l2.start_time)}–${formatTime12(l2.end_time)}).`
            });
          }
          if (l1.room && l2.room && l1.room.toLowerCase() === l2.room.toLowerCase()) {
            return res.status(400).json({
              error: `The selected lab room is already reserved during this interval. Two fixed lab sessions require the same laboratory room (${l1.room}) at overlapping times on ${l1.day} (${formatTime12(l1.start_time)}–${formatTime12(l1.end_time)} and ${formatTime12(l2.start_time)}–${formatTime12(l2.end_time)}).`
            });
          }
          const secs1 = (l1.sectionsList || [l1.section]).map((s) => s.toLowerCase());
          const secs2 = (l2.sectionsList || [l2.section]).map((s) => s.toLowerCase());
          const sharedSec = secs1.find((s) => secs2.includes(s));
          if (sharedSec) {
            return res.status(400).json({
              error: `The selected section already has a class during this interval. Two fixed lab sessions require the same section (${sharedSec}) at overlapping times on ${l1.day} (${formatTime12(l1.start_time)}–${formatTime12(l1.end_time)} and ${formatTime12(l2.start_time)}–${formatTime12(l2.end_time)}).`
            });
          }
        }
      }
    }

    // ============================================================================
    // STEP A: Ensure Teachers exist in Supabase or in-memory
    // ============================================================================
    const localHistory = loadTimetableHistory();
    const teacherRecords = [];
    let dbTeachers = [];
    if (localHistory[0]?.teachers?.length) {
      dbTeachers = localHistory[0].teachers;
    } else if (supabase) {
      try {
        const { data } = await withTimeout(supabase.from('teachers').select('*'), 250);
        if (data) dbTeachers = data;
      } catch (_) {}
    }

    const existingTeacherMap = new Map();
    for (const t of dbTeachers) {
      const norm = formatTeacherRecord(t);
      if (norm) existingTeacherMap.set(norm.teacher_name.toLowerCase(), norm);
    }

    for (let i = 0; i < teachers.length; i++) {
      const tInput = teachers[i];
      const key = tInput.name.toLowerCase();
      const assignedList = tInput.is_na ? [] : tInput.subjects;
      const assignedStr = tInput.is_na ? 'NA' : assignedList.join(', ');
      const assignedLower = assignedList.map((s) => s.toLowerCase());

      if (existingTeacherMap.has(key)) {
        const exist = existingTeacherMap.get(key);
        const merged = {
          ...exist,
          is_na: tInput.is_na,
          subjectPreference: tInput.subjectPreference,
          assigned_subject: assignedStr,
          assigned_subjects: assignedLower,
          availability: { ...(exist.availability || {}), ...(tInput.availability || {}) }
        };
        teacherRecords.push(merged);
      } else {
        const created = {
          teacher_id: `teacher_${Date.now()}_${i + 1}`,
          teacher_name: tInput.name,
          is_na: tInput.is_na,
          subjectPreference: tInput.subjectPreference,
          assigned_subject: assignedStr,
          assigned_subjects: assignedLower,
          specialization: '',
          department: 'General',
          working_days_per_week: workingDaysCount,
          availability: tInput.availability || {}
        };
        teacherRecords.push(created);
        existingTeacherMap.set(key, created);

        if (supabase) {
          setImmediate(async () => {
            try {
              await withTimeout(
                supabase.from('teachers').insert({
                  name: tInput.name,
                  assigned_subject: assignedStr,
                  specialization: null,
                  working_days_per_week: workingDaysCount
                }),
                1000
              );
            } catch (_) {}
          });
        }
      }
    }

    // ============================================================================
    // STEP B: Ensure Rooms exist in Supabase or in-memory
    // ============================================================================
    let dbRooms = [];
    if (localHistory[0]?.rooms?.length) {
      dbRooms = localHistory[0].rooms;
    } else if (supabase) {
      try {
        const { data } = await withTimeout(supabase.from('rooms').select('*'), 250);
        if (data) dbRooms = data;
      } catch (_) {}
    }

    const existingRoomMap = new Map();
    for (const r of dbRooms) {
      const norm = formatRoomRecord(r);
      if (norm) existingRoomMap.set(norm.room_name.toLowerCase(), norm);
    }

    const allConfiguredRooms = [];
    if (userRooms.length > 0) {
      for (let i = 0; i < userRooms.length; i++) {
        const uRoom = userRooms[i];
        const key = uRoom.room_number.toLowerCase();

        if (existingRoomMap.has(key)) {
          const exist = existingRoomMap.get(key);
          exist.room_type = uRoom.room_type; // ensure sync with active form selection
          if (uRoom.availability) exist.availability = uRoom.availability;
          allConfiguredRooms.push(exist);
        } else {
          const created = {
            room_id: `room_${Date.now()}_${i + 1}`,
            room_name: uRoom.room_number,
            room_type: uRoom.room_type,
            capacity: uRoom.capacity || 40,
            availability: uRoom.availability || 'Available'
          };
          allConfiguredRooms.push(created);
          existingRoomMap.set(key, created);

          if (supabase) {
            setImmediate(async () => {
              try {
                await withTimeout(
                  supabase.from('rooms').insert({
                    room_number: uRoom.room_number,
                    room_type: uRoom.room_type,
                    capacity: uRoom.capacity || 40,
                    availability: uRoom.availability || 'Available'
                  }),
                  1000
                );
              } catch (_) {}
            });
          }
        }
      }
    } else {
      allConfiguredRooms.push(...dbRooms.map(formatRoomRecord));
    }

    // Ensure candidate rooms have defaults so Room Requirement is strictly non-mandatory
    if (allConfiguredRooms.length === 0) {
      allConfiguredRooms.push(
        { room_id: 'room_c1', room_name: 'Room 101', room_type: 'Classroom', capacity: 60, availability: 'Available' },
        { room_id: 'room_c2', room_name: 'Room 102', room_type: 'Classroom', capacity: 60, availability: 'Available' },
        { room_id: 'room_c3', room_name: 'Room 103', room_type: 'Classroom', capacity: 60, availability: 'Available' },
        { room_id: 'room_l1', room_name: 'Computer Lab 1', room_type: 'Laboratory', capacity: 40, availability: 'Available' },
        { room_id: 'room_l2', room_name: 'Computer Lab 2', room_type: 'Laboratory', capacity: 40, availability: 'Available' }
      );
    }
    if (labClasses.length > 0 && !allConfiguredRooms.some((r) => r.room_type === 'Laboratory')) {
      allConfiguredRooms.push(
        { room_id: 'room_l1', room_name: 'Computer Lab 1', room_type: 'Laboratory', capacity: 40, availability: 'Available' },
        { room_id: 'room_l2', room_name: 'Computer Lab 2', room_type: 'Laboratory', capacity: 40, availability: 'Available' }
      );
    }

    // Filter candidate rooms based on global preference
    let candidateRooms = allConfiguredRooms.filter((r) => {
      if (labClasses.length > 0 && r.room_type === 'Laboratory') return true;
      if (roomTypePreference === 'Classroom' && r.room_type !== 'Classroom') return false;
      if (roomTypePreference === 'Laboratory' && r.room_type !== 'Laboratory') return false;
      return true;
    });

    if (candidateRooms.length === 0) {
      candidateRooms = allConfiguredRooms;
    }

    // Laboratory rooms for practical sessions
    let candidateLabRooms = candidateRooms.filter((r) => r.room_type === 'Laboratory');
    if (labClasses.length > 0 && candidateLabRooms.length === 0) {
      const fallbackLab = { room_id: 'room_l1', room_name: 'Computer Lab 1', room_type: 'Laboratory', capacity: 40, availability: 'Available' };
      candidateRooms.push(fallbackLab);
      candidateLabRooms = [fallbackLab];
    }

    // ============================================================================
    // STEP C: Working Matrix Check
    // ============================================================================
    const totalWeeklySlots = configuredWorkingDays.reduce((acc, d) => acc + (allSlotsByDay[d.day_name] || []).length, 0);
    const slotsPerDay = Math.max(...configuredWorkingDays.map((d) => (allSlotsByDay[d.day_name] || []).filter((s) => !s.is_break).length), 1);
    if (totalWeeklySlots === 0) {
      return res.status(400).json({
        error: 'No usable time slots are available for the selected working hours.'
      });
    }

    // ============================================================================
    // STEP D: Teacher Availability from Supabase & Local Cache (Requirements Part 10)
    // ============================================================================
    let dbTeacherAvailability = [];
    try {
      const { data } = await withTimeout(supabase.from('teacher_availability').select('*, time_slots(*)'), 300);
      if (data && Array.isArray(data)) dbTeacherAvailability = [...data];
    } catch (_) {}

    // Merge persistent local teacher availability store
    const localTeacherAvail = loadTeacherAvailabilityLocally();
    if (Array.isArray(localTeacherAvail) && localTeacherAvail.length > 0) {
      for (const lRec of localTeacherAvail) {
        dbTeacherAvailability.push(lRec);
      }
    }

    // ============================================================================
    // STEP E: Multi-Resource Dynamic Scheduling Engine (Lab Classes First + Theory Backtracking)
    // ============================================================================
    // Occupancy sets keyed by (Day + StartTime + Resource)
    const occupiedTeacherSlots = new Set();
    const occupiedRoomSlots = new Set();
    const occupiedSectionSlots = new Set();
    const sectionDayClassCount = {};
    const sectionDaySubjects = new Set();

    // Multi-Department Scheduling Context (Sections 13–28, 36–41)
    // Load existing active timetable entries across all departments
    const currentAllEntries = loadTimetableLocally();

    // Preserve entries belonging to other departments (so CSE is not wiped when generating IT)
    const normalizedDept = normalizeDepartmentName(department);
    const otherDeptEntries = currentAllEntries.filter((e) => {
      const eDept = normalizeDepartmentName(e.department);
      return eDept && eDept.toLowerCase() !== normalizedDept.toLowerCase();
    });

    // Seed global teacher and room occupancies from other departments to prevent cross-department conflicts
    for (const other of otherDeptEntries) {
      const oDay = String(other.day || '').trim();
      const oStartMin = timeToMinutes(other.start_time);
      const oEndMin = timeToMinutes(other.end_time);
      const oTeacher = String(other.teacher_name || '').trim().toLowerCase();
      const oRoom = String(other.room_name || '').trim().toLowerCase();

      // Find overlapping slots in the working matrix
      const daySlots = allSlotsByDay[oDay] || [];
      for (const slot of daySlots) {
        const sStartMin = timeToMinutes(slot.start_time);
        const sEndMin = timeToMinutes(slot.end_time);

        // Interval overlap check: Math.max(oStart, sStart) < Math.min(oEnd, sEnd)
        if (Math.max(oStartMin, sStartMin) < Math.min(oEndMin, sEndMin)) {
          // Check if this teacher is also used in the current generation (global resource)
          const matchedTeacher = teacherRecords.find((t) => t.teacher_name.toLowerCase() === oTeacher);
          if (matchedTeacher) {
            occupiedTeacherSlots.add(`${oDay}_${slot.start_time}_${matchedTeacher.teacher_id}`);
          }

          // Check if this room is also in candidate rooms (global resource)
          const matchedRoom = candidateRooms.find((r) => r.room_name.toLowerCase() === oRoom);
          if (matchedRoom) {
            occupiedRoomSlots.add(`${oDay}_${slot.start_time}_${matchedRoom.room_id}`);
          }
        }
      }
    }

    const assignments = [];
    let backtrackSteps = 0;
    const MAX_STEPS = 80000;

    // Helper: Lock or unlock multiple slots for an assignment (supports single or multi-sections)
    function setSlotsOccupied(dayName, slotsList, sectionsListOrSec, teacherId, roomId, occupy = true) {
      const secList = Array.isArray(sectionsListOrSec) ? sectionsListOrSec : [sectionsListOrSec];
      for (const s of slotsList) {
        for (const sec of secList) {
          const secKey = `${dayName}_${s.start_time}_${String(sec).toLowerCase()}`;
          if (occupy) {
            occupiedSectionSlots.add(secKey);
          } else {
            occupiedSectionSlots.delete(secKey);
          }
        }
        const tKey = `${dayName}_${s.start_time}_${teacherId}`;
        const rKey = `${dayName}_${s.start_time}_${roomId}`;

        if (occupy) {
          occupiedTeacherSlots.add(tKey);
          occupiedRoomSlots.add(rKey);
        } else {
          occupiedTeacherSlots.delete(tKey);
          occupiedRoomSlots.delete(rKey);
        }
      }
    }

    // Helper: Check if all slots in a contiguous block are conflict-free
    function isBlockFree(dayObj, slotsBlock, sectionsListOrSec, teacher, room) {
      const secList = Array.isArray(sectionsListOrSec) ? sectionsListOrSec : [sectionsListOrSec];
      for (const slot of slotsBlock) {
        if (slot.is_break) return false;

        for (const sec of secList) {
          const secKey = `${dayObj.day_name}_${slot.start_time}_${String(sec).toLowerCase()}`;
          if (occupiedSectionSlots.has(secKey)) return false;
        }

        if (!isTeacherAvailable(teacher, dayObj.day_name, dayObj.day_of_week, slot.start_time, slot.end_time, dbTeacherAvailability)) {
          return false;
        }

        const tKey = `${dayObj.day_name}_${slot.start_time}_${teacher.teacher_id}`;
        if (occupiedTeacherSlots.has(tKey)) return false;

        if (!isRoomAvailable(room, dayObj.day_name, dayObj.day_of_week, slot.start_time, slot.end_time)) {
          return false;
        }

        const rKey = `${dayObj.day_name}_${slot.start_time}_${room.room_id}`;
        if (occupiedRoomSlots.has(rKey)) return false;
      }
      return true;
    }

    // STAGE 1: Schedule Lab Classes (multi-slot priority)
    function solveLabs(labIdx) {
      if (labIdx >= labClasses.length) {
        return true;
      }
      if (++backtrackSteps > MAX_STEPS) return false;

      const lc = labClasses[labIdx];
      const duration = lc.duration;
      const teacher = teacherRecords.find((t) => t.teacher_name.toLowerCase() === lc.teacher.toLowerCase());
      if (!teacher) return false;

      // Candidate lab rooms
      let targetRooms = candidateLabRooms;
      if (lc.room) {
        const matched = candidateLabRooms.find((r) => r.room_name.toLowerCase() === lc.room.toLowerCase());
        if (matched) targetRooms = [matched];
      }

      // Restrict candidateDays based on lab multi-day configuration
      let candidateDays;
      if (Array.isArray(lc.candidateDays) && lc.candidateDays.length > 0) {
        candidateDays = lc.candidateDays;
      } else if (lc.day) {
        const matchedDay = configuredWorkingDays.find((d) => d.day_name.toLowerCase() === lc.day.toLowerCase());
        candidateDays = matchedDay ? [matchedDay] : [];
      } else {
        candidateDays = [...configuredWorkingDays].sort((a, b) => {
          const countA = sectionDayClassCount[`${lc.section}_${a.day_name}`] || 0;
          const countB = sectionDayClassCount[`${lc.section}_${b.day_name}`] || 0;
          return countA - countB;
        });
      }

      for (const day of candidateDays) {
        const daySlots = allSlotsByDay[day.day_name] || [];
        const maxStartIdx = daySlots.length - duration;
        if (maxStartIdx < 0) continue;

        let startIndicesToTry = [];
        if (Array.isArray(lc.exactSlotIndices) && lc.exactSlotIndices.length > 0) {
          if (lc.day && day.day_name.toLowerCase() === lc.day.toLowerCase()) {
            startIndicesToTry = [lc.exactSlotIndices[0]];
          } else {
            continue;
          }
        } else if (lc.exactSlotsByDay && lc.exactSlotsByDay[day.day_name]) {
          startIndicesToTry = [lc.exactSlotsByDay[day.day_name][0]];
        } else {
          for (let sIdx = 0; sIdx <= maxStartIdx; sIdx++) {
            startIndicesToTry.push(sIdx);
          }
        }

        for (const sIdx of startIndicesToTry) {
          if (sIdx < 0 || sIdx + duration > daySlots.length) continue;
          const slotsBlock = daySlots.slice(sIdx, sIdx + duration);

          // Continuous periods check - verify no break interrupts the slots in this block
          let isContinuous = true;
          for (let k = 0; k < slotsBlock.length - 1; k++) {
            if (timeToMinutes(slotsBlock[k].end_time) !== timeToMinutes(slotsBlock[k + 1].start_time)) {
              isContinuous = false;
              break;
            }
          }
          if (!isContinuous) continue;

          for (const room of targetRooms) {
            if (!isBlockFree(day, slotsBlock, lc.sectionsList || lc.section, teacher, room)) {
              continue;
            }

            // Reserve all slots for lab
            setSlotsOccupied(day.day_name, slotsBlock, lc.sectionsList || lc.section, teacher.teacher_id, room.room_id, true);
            const secDayKey = `${lc.section}_${day.day_name}`;
            sectionDayClassCount[secDayKey] = (sectionDayClassCount[secDayKey] || 0) + duration;

            const labDisplayName = lc.subject.toLowerCase().includes('lab') ? lc.subject : `${lc.subject} Lab`;
            const labEntry = {
              slot_id: `${day.day_name}_lab_s${sIdx + 1}`,
              day: day.day_name,
              day_name: day.day_name,
              day_of_week: day.day_of_week,
              period_number: slotsBlock[0].period_number || (sIdx + 1),
              start_time: lc.start_time || slotsBlock[0].start_time,
              end_time: lc.end_time || slotsBlock[slotsBlock.length - 1].end_time,
              section: lc.section,
              subject: labDisplayName,
              course_name: labDisplayName,
              teacher_id: teacher.teacher_id,
              teacher_name: teacher.teacher_name,
              room_id: room.room_id,
              room_name: room.room_name,
              room_type: 'Laboratory',
              session_type: 'LAB',
              duration: duration,
              is_lab: true,
              occupied_slots: slotsBlock,
              is_shared: Boolean(lc.is_shared),
              sections_list: lc.sectionsList || [lc.section]
            };

            assignments.push(labEntry);

            if (solveLabs(labIdx + 1)) {
              return true;
            }

            // Backtrack
            assignments.pop();
            setSlotsOccupied(day.day_name, slotsBlock, lc.sectionsList || lc.section, teacher.teacher_id, room.room_id, false);
            sectionDayClassCount[secDayKey] -= duration;
          }
        }
      }
      return false;
    }

    const unscheduledClasses = [];
    const labsScheduled = solveLabs(0);

    // If backtracking could not schedule all labs, place remaining labs provisionally or record as unscheduled
    if (!labsScheduled && labClasses.length > 0) {
      for (let lIdx = 0; lIdx < labClasses.length; lIdx++) {
        const lc = labClasses[lIdx];
        const isScheduled = assignments.some(
          (a) => a.is_lab && a.subject.toLowerCase().includes(lc.subject.toLowerCase()) && a.section.toLowerCase() === lc.section.toLowerCase()
        );
        if (isScheduled) continue;

        const teacher = teacherRecords.find((t) => t.teacher_name.toLowerCase() === lc.teacher.toLowerCase()) || teacherRecords[0];
        const targetRooms = (lc.room ? candidateLabRooms.filter((r) => r.room_name.toLowerCase() === lc.room.toLowerCase()) : candidateLabRooms);
        const room = targetRooms[0] || candidateRooms[0];
        const candidateDays = (Array.isArray(lc.candidateDays) && lc.candidateDays.length > 0)
          ? lc.candidateDays
          : (lc.day ? configuredWorkingDays.filter((d) => d.day_name.toLowerCase() === lc.day.toLowerCase()) : configuredWorkingDays);

        let placed = false;
        for (const day of candidateDays) {
          const daySlots = allSlotsByDay[day.day_name] || [];
          const maxStartIdx = daySlots.length - lc.duration;
          if (maxStartIdx < 0) continue;

          let startIndicesToTry = [];
          if (Array.isArray(lc.exactSlotIndices) && lc.exactSlotIndices.length > 0) {
            if (lc.day && day.day_name.toLowerCase() === lc.day.toLowerCase()) {
              startIndicesToTry = [lc.exactSlotIndices[0]];
            } else {
              continue;
            }
          } else if (lc.exactSlotsByDay && lc.exactSlotsByDay[day.day_name]) {
            startIndicesToTry = [lc.exactSlotsByDay[day.day_name][0]];
          } else {
            for (let sIdx = 0; sIdx <= maxStartIdx; sIdx++) {
              startIndicesToTry.push(sIdx);
            }
          }

          for (const sIdx of startIndicesToTry) {
            if (sIdx < 0 || sIdx + lc.duration > daySlots.length) continue;
            const slotsBlock = daySlots.slice(sIdx, sIdx + lc.duration);
            let isContinuous = true;
            for (let k = 0; k < slotsBlock.length - 1; k++) {
              if (timeToMinutes(slotsBlock[k].end_time) !== timeToMinutes(slotsBlock[k + 1].start_time)) {
                isContinuous = false;
                break;
              }
            }
            if (!isContinuous) continue;

            // Provisional placement with conflict flag
            const labDisplayName = lc.subject.toLowerCase().includes('lab') ? lc.subject : `${lc.subject} Lab`;
            const labEntry = {
              slot_id: `${day.day_name}_lab_s${sIdx + 1}`,
              day: day.day_name,
              day_of_week: day.day_of_week,
              period_number: slotsBlock[0].period_number || (sIdx + 1),
              start_time: lc.start_time || slotsBlock[0].start_time,
              end_time: lc.end_time || slotsBlock[slotsBlock.length - 1].end_time,
              section: lc.section,
              subject: labDisplayName,
              course_name: labDisplayName,
              teacher_id: teacher?.teacher_id || 't_provisional',
              teacher_name: teacher?.teacher_name || lc.teacher,
              room_id: room?.room_id || 'r_provisional',
              room_name: room?.room_name || 'Laboratory',
              room_type: 'Laboratory',
              session_type: 'LAB',
              duration: lc.duration,
              is_lab: true,
              occupied_slots: slotsBlock,
              has_conflict: true,
              is_shared: Boolean(lc.is_shared),
              sections_list: lc.sectionsList || [lc.section]
            };

            assignments.push(labEntry);
            setSlotsOccupied(day.day_name, slotsBlock, lc.sectionsList || lc.section, teacher?.teacher_id || 't_provisional', room?.room_id || 'r_provisional', true);
            placed = true;
            break;
          }
          if (placed) break;
        }

        if (!placed) {
          unscheduledClasses.push({
            type: 'LAB',
            subject: lc.subject,
            section: lc.section,
            teacher: lc.teacher,
            duration: lc.duration,
            reason: `Could not schedule ${lc.duration} continuous periods on configured day(s) without break interruption.`
          });
        }
      }
    }

    // STAGE 2: Schedule Theory Classes
    // Build theory items to schedule for each section, strictly bounded by each section's weekly capacity
    const theoryItemsToSchedule = [];
    for (let secIdx = 0; secIdx < sections.length; secIdx++) {
      const sectionName = sections[secIdx];
      const sectionLabSlotsCount = assignments
        .filter((a) => a.section.toLowerCase() === sectionName.toLowerCase())
        .reduce((acc, a) => acc + (a.duration || 1), 0);
      const sectionCapacity = Math.max(0, totalWeeklySlots - sectionLabSlotsCount);
      const desiredTotal = subjects.length * workingDaysCount;

      for (let i = 0; i < desiredTotal; i++) {
        const subIdx = i % subjects.length;
        if (i < sectionCapacity) {
          theoryItemsToSchedule.push({
            section: sectionName,
            subject: subjects[subIdx],
            secIdx,
            subIdx,
            sessionIdx: i
          });
        } else {
          unscheduledClasses.push({
            type: 'THEORY',
            subject: subjects[subIdx],
            section: sectionName,
            teacher: 'Unassigned',
            duration: 1,
            reason: `Insufficient weekly slots available for section ${sectionName}. Required ${desiredTotal} class periods, but only ${sectionCapacity} slots remain after labs.`
          });
        }
      }
    }

    // Prefer Classroom rooms for theory classes to preserve labs
    const theoryRooms = candidateRooms.filter((r) => r.room_type === 'Classroom');
    const availableTheoryRooms = theoryRooms.length > 0 ? theoryRooms : candidateRooms;

    // Calculate teacher scarcity for each subject to prioritize constrained subjects (MRV)
    const subjectScarcity = {};
    subjects.forEach((s) => {
      const qual = teacherRecords.filter((t) => isTeacherEligibleForSubject(t, s));
      subjectScarcity[String(s).toLowerCase()] = qual.length || 0;
    });

    // Interleave theory items across sections & prioritize scarce subjects
    theoryItemsToSchedule.sort((a, b) => {
      const scarA = subjectScarcity[String(a.subject).toLowerCase()] ?? 99;
      const scarB = subjectScarcity[String(b.subject).toLowerCase()] ?? 99;
      if (scarA !== scarB) return scarA - scarB; // Hardest subject first
      if (a.sessionIdx !== b.sessionIdx) return a.sessionIdx - b.sessionIdx; // Distribute periods evenly
      return a.secIdx - b.secIdx; // Alternate sections: Sec A, Sec B, Sec C...
    });

    function solveTheory(itemIndex) {
      if (itemIndex >= theoryItemsToSchedule.length) {
        return true;
      }
      if (++backtrackSteps > MAX_STEPS) {
        return false;
      }

      const item = theoryItemsToSchedule[itemIndex];
      const { section, subject, secIdx, subIdx } = item;

      // Deterministic and balanced day ordering
      const candidateDays = [...configuredWorkingDays].sort((a, b) => {
        const countA = sectionDayClassCount[`${section}_${a.day_name}`] || 0;
        const countB = sectionDayClassCount[`${section}_${b.day_name}`] || 0;
        const hasSubA = sectionDaySubjects.has(`${section}_${a.day_name}_${subject.toLowerCase()}`) ? 1 : 0;
        const hasSubB = sectionDaySubjects.has(`${section}_${b.day_name}_${subject.toLowerCase()}`) ? 1 : 0;

        if (hasSubA !== hasSubB) return hasSubA - hasSubB;
        if (countA !== countB) return countA - countB;
        return a.day_of_week - b.day_of_week;
      });

      // Find qualified teachers who teach this subject (or NA teachers)
      const qualifiedTeachers = teacherRecords.filter((t) => isTeacherEligibleForSubject(t, subject));

      if (qualifiedTeachers.length === 0) {
        return false;
      }

      // Balanced teacher selection
      const preferredTeacherIdx = (subIdx + secIdx + itemIndex) % qualifiedTeachers.length;
      const candidateTeachers = [
        qualifiedTeachers[preferredTeacherIdx],
        ...qualifiedTeachers.filter((_, idx) => idx !== preferredTeacherIdx)
      ];

      // Balanced room selection
      const preferredRoomIdx = (secIdx + subIdx + itemIndex) % availableTheoryRooms.length;
      const orderedRooms = [
        availableTheoryRooms[preferredRoomIdx],
        ...availableTheoryRooms.filter((_, idx) => idx !== preferredRoomIdx)
      ];

      for (const day of candidateDays) {
        const daySlots = allSlotsByDay[day.day_name] || [];
        const currentDayCount = sectionDayClassCount[`${section}_${day.day_name}`] || 0;

        if (currentDayCount >= daySlots.length) {
          continue;
        }

        const slotOffset = ((secIdx * 2) + subIdx) % (daySlots.length || 1);
        const orderedDaySlots = [
          ...daySlots.slice(slotOffset),
          ...daySlots.slice(0, slotOffset)
        ];

        for (const slot of orderedDaySlots) {
          if (slot.is_break) continue;

          // Section conflict check
          const sectionSlotKey = `${day.day_name}_${slot.start_time}_${section.toLowerCase()}`;
          if (occupiedSectionSlots.has(sectionSlotKey)) continue;

          for (const teacher of candidateTeachers) {
            // Teacher availability check
            if (!isTeacherAvailable(teacher, day.day_name, day.day_of_week, slot.start_time, slot.end_time, dbTeacherAvailability)) {
              continue;
            }

            // Teacher conflict check
            const teacherSlotKey = `${day.day_name}_${slot.start_time}_${teacher.teacher_id}`;
            if (occupiedTeacherSlots.has(teacherSlotKey)) continue;

            for (const room of orderedRooms) {
              // Room availability check
              if (!isRoomAvailable(room, day.day_name, day.day_of_week, slot.start_time, slot.end_time)) {
                continue;
              }

              // Room conflict check
              const roomSlotKey = `${day.day_name}_${slot.start_time}_${room.room_id}`;
              if (occupiedRoomSlots.has(roomSlotKey)) continue;

              // All constraints satisfied: create scheduled theory assignment
              const scheduledEntry = {
                slot_id: slot.slot_id,
                day: day.day_name,
                day_of_week: day.day_of_week,
                period_number: slot.period_number || 1,
                start_time: slot.start_time,
                end_time: slot.end_time,
                section,
                subject,
                course_name: subject,
                teacher_id: teacher.teacher_id,
                teacher_name: teacher.teacher_name,
                room_id: room.room_id,
                room_name: room.room_name,
                room_type: room.room_type,
                session_type: 'THEORY',
                duration: 1,
                is_lab: false
              };

              const secDayKey = `${section}_${day.day_name}`;
              const secDaySubKey = `${section}_${day.day_name}_${subject.toLowerCase()}`;

              assignments.push(scheduledEntry);
              occupiedSectionSlots.add(sectionSlotKey);
              occupiedTeacherSlots.add(teacherSlotKey);
              occupiedRoomSlots.add(roomSlotKey);
              sectionDayClassCount[secDayKey] = (sectionDayClassCount[secDayKey] || 0) + 1;
              sectionDaySubjects.add(secDaySubKey);

              if (solveTheory(itemIndex + 1)) {
                return true;
              }

              // Backtrack
              assignments.pop();
              occupiedSectionSlots.delete(sectionSlotKey);
              occupiedTeacherSlots.delete(teacherSlotKey);
              occupiedRoomSlots.delete(roomSlotKey);
              sectionDayClassCount[secDayKey]--;
              const stillHas = assignments.some(
                (a) => a.section === section && a.day === day.day_name && a.subject.toLowerCase() === subject.toLowerCase()
              );
              if (!stillHas) {
                sectionDaySubjects.delete(secDaySubKey);
              }
            }
          }
        }
      }

      return false;
    }

    const theoryGenerated = solveTheory(0);

    // If theory backtracking could not place all items, place remaining items with smart conflict-minimizing allocation
    if (!theoryGenerated) {
      for (let itemIndex = 0; itemIndex < theoryItemsToSchedule.length; itemIndex++) {
        const item = theoryItemsToSchedule[itemIndex];
        const countScheduled = assignments.filter(
          (a) => !a.is_lab && a.section.toLowerCase() === item.section.toLowerCase() && a.subject.toLowerCase() === item.subject.toLowerCase()
        ).length;
        if (countScheduled > (item.sessionIdx || 0)) continue;

        const qualifiedTeachers = teacherRecords.filter((t) => isTeacherEligibleForSubject(t, item.subject));
        let placed = false;

        // Pass 1: Try to place 100% conflict-free across any configured working day & slot
        for (const day of configuredWorkingDays) {
          const daySlots = allSlotsByDay[day.day_name] || [];
          const currentDayCount = sectionDayClassCount[`${item.section}_${day.day_name}`] || 0;
          if (currentDayCount >= daySlots.length) continue;

          for (const slot of daySlots) {
            if (slot.is_break) continue;
            const secKey = `${day.day_name}_${slot.start_time}_${item.section.toLowerCase()}`;
            if (occupiedSectionSlots.has(secKey)) continue;

            const freeTeacher = qualifiedTeachers.find(
              (t) => !occupiedTeacherSlots.has(`${day.day_name}_${slot.start_time}_${t.teacher_id}`)
            );
            const freeRoom = availableTheoryRooms.find(
              (r) => !occupiedRoomSlots.has(`${day.day_name}_${slot.start_time}_${r.room_id}`)
            );

            if (freeTeacher && freeRoom) {
              const scheduledEntry = {
                slot_id: slot.slot_id,
                day: day.day_name,
                day_of_week: day.day_of_week,
                period_number: slot.period_number || 1,
                start_time: slot.start_time,
                end_time: slot.end_time,
                section: item.section,
                subject: item.subject,
                course_name: item.subject,
                teacher_id: freeTeacher.teacher_id,
                teacher_name: freeTeacher.teacher_name,
                room_id: freeRoom.room_id,
                room_name: freeRoom.room_name,
                room_type: freeRoom.room_type,
                session_type: 'THEORY',
                duration: 1,
                is_lab: false,
                has_conflict: false
              };
              assignments.push(scheduledEntry);
              occupiedSectionSlots.add(secKey);
              occupiedTeacherSlots.add(`${day.day_name}_${slot.start_time}_${freeTeacher.teacher_id}`);
              occupiedRoomSlots.add(`${day.day_name}_${slot.start_time}_${freeRoom.room_id}`);
              sectionDayClassCount[`${item.section}_${day.day_name}`] = currentDayCount + 1;
              placed = true;
              break;
            }
          }
          if (placed) break;
        }

        // Pass 2: Conflict-minimizing allocation (least occupied resources)
        if (!placed) {
          let bestCandidate = null;
          for (const day of configuredWorkingDays) {
            const daySlots = allSlotsByDay[day.day_name] || [];
            const currentDayCount = sectionDayClassCount[`${item.section}_${day.day_name}`] || 0;
            if (currentDayCount >= daySlots.length) continue;

            for (const slot of daySlots) {
              if (slot.is_break) continue;
              const secKey = `${day.day_name}_${slot.start_time}_${item.section.toLowerCase()}`;
              if (occupiedSectionSlots.has(secKey)) continue;

              const pool = qualifiedTeachers.length ? qualifiedTeachers : teacherRecords;
              for (const t of pool) {
                const tBusy = occupiedTeacherSlots.has(`${day.day_name}_${slot.start_time}_${t.teacher_id}`);
                for (const r of availableTheoryRooms) {
                  const rBusy = occupiedRoomSlots.has(`${day.day_name}_${slot.start_time}_${r.room_id}`);
                  const collisionScore = (tBusy ? 2 : 0) + (rBusy ? 1 : 0);
                  if (!bestCandidate || collisionScore < bestCandidate.score) {
                    bestCandidate = { day, slot, teacher: t, room: r, score: collisionScore, tBusy, rBusy };
                  }
                  if (collisionScore === 0) break;
                }
                if (bestCandidate && bestCandidate.score === 0) break;
              }
            }
          }

          if (bestCandidate) {
            const { day, slot, teacher: t, room: r, tBusy, rBusy } = bestCandidate;
            const scheduledEntry = {
              slot_id: slot.slot_id,
              day: day.day_name,
              day_of_week: day.day_of_week,
              period_number: slot.period_number || 1,
              start_time: slot.start_time,
              end_time: slot.end_time,
              section: item.section,
              subject: item.subject,
              course_name: item.subject,
              teacher_id: t.teacher_id,
              teacher_name: t.teacher_name,
              room_id: r.room_id,
              room_name: r.room_name,
              room_type: r.room_type,
              session_type: 'THEORY',
              duration: 1,
              is_lab: false,
              has_conflict: Boolean(tBusy || rBusy)
            };
            assignments.push(scheduledEntry);
            occupiedSectionSlots.add(`${day.day_name}_${slot.start_time}_${item.section.toLowerCase()}`);
            occupiedTeacherSlots.add(`${day.day_name}_${slot.start_time}_${t.teacher_id}`);
            occupiedRoomSlots.add(`${day.day_name}_${slot.start_time}_${r.room_id}`);
            sectionDayClassCount[`${item.section}_${day.day_name}`] = (sectionDayClassCount[`${item.section}_${day.day_name}`] || 0) + 1;
            placed = true;
          }
        }

        if (!placed) {
          unscheduledClasses.push({
            type: 'THEORY',
            subject: item.subject,
            section: item.section,
            teacher: 'Unassigned',
            duration: 1,
            reason: `Section ${item.section} has reached daily or weekly slot capacity, or no valid slot remains.`
          });
        }
      }
    }

    // ============================================================================
    // STEP F: Format Entries & Multi-Department Merging
    // ============================================================================
    const formattedEntries = assignments.map((entry, idx) => ({
      timetable_id: `tt_${Date.now()}_${idx + 1}`,
      department: department,
      day: entry.day,
      day_name: entry.day || entry.day_name,
      day_of_week: entry.day_of_week,
      period_number: entry.period_number || 1,
      start_time: entry.start_time,
      end_time: entry.end_time,
      class_name: entry.section,
      section: entry.section,
      course_name: entry.subject,
      subject: entry.subject,
      teacher_name: entry.teacher_name,
      teacher_id: entry.teacher_id,
      room_name: entry.room_name,
      room_id: entry.room_id,
      room_type: entry.room_type,
      session_type: entry.session_type || 'THEORY',
      duration: entry.duration || 1,
      is_lab: entry.session_type === 'LAB',
      working_days: configuredDayNames,
      has_conflict: Boolean(entry.has_conflict),
      is_shared: Boolean(entry.is_shared),
      sections_list: entry.sections_list || [entry.section]
    }));

    // Combine existing other department entries with new department entries
    const combinedEntries = [...otherDeptEntries, ...formattedEntries];
    combinedEntries.sort((a, b) => {
      const dayA = a.day_of_week || getDayNumber(a.day);
      const dayB = b.day_of_week || getDayNumber(b.day);
      if (dayA !== dayB) return dayA - dayB;
      const pA = a.period_number || 0;
      const pB = b.period_number || 0;
      if (pA !== pB) return pA - pB;
      return String(a.start_time).localeCompare(String(b.start_time));
    });

    // ============================================================================
    // STEP G: Warning-Based Conflict Detection & Status Differentiation
    // ============================================================================
    const { conflicts, conflictingEntryIds } = detectTimetableConflicts(
      combinedEntries,
      teacherRecords,
      candidateRooms,
      dbTeacherAvailability
    );

    // Sync has_conflict flag on all formattedEntries
    for (const fe of formattedEntries) {
      if (conflictingEntryIds.has(String(fe.timetable_id))) {
        fe.has_conflict = true;
      }
    }

    const currentEntryIds = new Set(formattedEntries.map((e) => String(e.timetable_id)));
    const relevantConflicts = conflicts.filter((c) =>
      c.affected_ids && c.affected_ids.some((id) => currentEntryIds.has(String(id)))
    );

    const totalRequiredClasses = theoryItemsToSchedule.length + labClasses.length;
    const scheduledClassesCount = formattedEntries.length;
    const requiringAttentionCount = formattedEntries.filter((e) => e.has_conflict).length;
    const successfullyScheduledCount = Math.max(0, scheduledClassesCount - requiringAttentionCount);
    const detectedConflictsCount = relevantConflicts.length;

    // Requirement 6: Strict 3-level status differentiation
    let status = 'VALID';
    let message = 'Timetable generated successfully.';

    if (relevantConflicts.length > 0 && unscheduledClasses.length === 0) {
      status = 'WARNING';
      message = 'Timetable generated with warnings. Please review the highlighted conflicts.';
    } else if (unscheduledClasses.length > 0) {
      status = 'INCOMPLETE';
      message = 'Timetable generated partially. Some classes could not be scheduled.';
    }

    // Recalculate global Teacher Workload across all departments (Requirements Part 14-22)
    const teacherWorkload = calculateTeacherWorkload(combinedEntries, configuredDayNames, teacherRecords);

    // Persist locally for instant reliability with 2-version retention policy
    const timestamp = new Date().toISOString();
    const versionId = 'gen_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newVersion = {
      version_id: versionId,
      timestamp,
      created_at: timestamp,
      is_active: true,
      department: department,
      status: status,
      summary: {
        total_required: totalRequiredClasses,
        successfully_scheduled: successfullyScheduledCount,
        requiring_attention: requiringAttentionCount,
        detected_conflicts: detectedConflictsCount
      },
      conflicts: relevantConflicts,
      unscheduled_classes: unscheduledClasses,
      entry_count: combinedEntries.length,
      working_days: configuredDayNames,
      working_days_per_week: configuredDayNames.length,
      day_periods: dayPeriodsConfig || null,
      period_counts: periodCountsByDay,
      breaks: normalizedBreaks,
      teacher_workload: teacherWorkload,
      sections,
      teachers: teacherRecords.map((t) => formatTeacherRecord(t)),
      subjects,
      rooms: candidateRooms.map((r) => ({ room_number: r.room_name, room_type: r.room_type })),
      room_type: roomTypePreference,
      lab_classes: labClasses,
      entries: combinedEntries
    };

    recordGeneratedTimetable(newVersion);

    // Persist into Supabase timetable table asynchronously in background if available
    if (supabase) {
      setImmediate(async () => {
        try {
          await withTimeout(supabase.from('timetable').delete().neq('timetable_id', 0), 2000);
        } catch (_) {}

        try {
          const rowsToInsert = combinedEntries.map((e) => ({
            day: e.day,
            day_of_week: e.day_of_week,
            period_number: e.period_number || 1,
            start_time: e.start_time,
            end_time: e.end_time,
            class_name: e.class_name,
            section: e.section,
            course_name: e.course_name,
            teacher_name: e.teacher_name,
            room_name: e.room_name,
            room_type: e.room_type,
            session_type: e.session_type || 'THEORY'
          }));
          await withTimeout(supabase.from('timetable').insert(rowsToInsert), 2000);
        } catch (dbErr) {
          console.warn('Notice: Supabase timetable insert bypassed:', dbErr.message);
        }
      });
    }

    return res.json({
      success: true,
      status: status,
      message: message,
      summary: {
        total_required: totalRequiredClasses,
        successfully_scheduled: successfullyScheduledCount,
        requiring_attention: requiringAttentionCount,
        detected_conflicts: detectedConflictsCount
      },
      conflicts: relevantConflicts,
      unscheduled_classes: unscheduledClasses,
      department: department,
      entries_created: formattedEntries.length,
      working_days: configuredDayNames,
      working_days_per_week: configuredDayNames.length,
      day_periods: dayPeriodsConfig || null,
      period_counts: periodCountsByDay,
      breaks: normalizedBreaks,
      teacher_workload: teacherWorkload,
      timetable: formattedEntries,
      combined_timetable: combinedEntries,
      department_timetable: formattedEntries,
      teachers: teacherRecords.map((t) => t.teacher_name),
      subjects,
      sections,
      rooms: candidateRooms.map((r) => ({ room_number: r.room_name, room_type: r.room_type })),
      lab_classes: labClasses,
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
app.post('/api/timetable/generate', generateTimetableHandler);

// ==============================================================================
// 8. TIMETABLE RETRIEVAL & PERSISTENCE
// ==============================================================================
app.get('/api/timetable', checkDatabase, async (req, res) => {
  try {
    let entries = [];
    let configuredWorkingDays = null;

    // 1. Attempt loading from Supabase timetable table if available
    try {
      const { data, error } = await withTimeout(supabase.from('timetable').select('*'), 250);
      if (!error && data && data.length > 0) {
        entries = data.map((row) => ({
          timetable_id: row.id || row.timetable_id,
          day: row.day || getDayName(row.day_of_week || 1),
          day_of_week: row.day_of_week || getDayNumber(row.day || 'Monday'),
          period_number: row.period_number || row.period || 1,
          start_time: String(row.start_time || '09:00:00'),
          end_time: String(row.end_time || '10:00:00'),
          class_name: row.class_name || 'General Class',
          section: row.section || 'A',
          course_name: row.course_name || row.subject_name || row.subject || 'Course',
          teacher_name: row.teacher_name || row.name || 'Faculty',
          room_name: row.room_name || row.room_number || 'Room',
          room_type: row.room_type || 'Classroom',
          department: row.department || row.department_name || '',
          session_type: row.session_type || 'THEORY'
        }));
      }
    } catch (_) {}

    // 2. Fall back to local persistent store if Supabase table is empty or does not exist
    const localEntries = loadTimetableLocally();
    if (entries.length === 0) {
      entries = localEntries;
    } else if (localEntries.length > 0) {
      // Enrich entries with local department if missing
      const localMap = new Map();
      for (const le of localEntries) {
        if (le.timetable_id) localMap.set(String(le.timetable_id), le);
        localMap.set(`${le.day}_${le.start_time}_${le.section}_${le.teacher_name}`, le);
        localMap.set(`${le.day}_${le.start_time}_${le.section}`, le);
      }
      for (const e of entries) {
        if (!e.department) {
          const match = localMap.get(String(e.timetable_id)) ||
                        localMap.get(`${e.day}_${e.start_time}_${e.section}_${e.teacher_name}`) ||
                        localMap.get(`${e.day}_${e.start_time}_${e.section}`);
          if (match && match.department) {
            e.department = match.department;
          }
        }
      }
    }

    // Support optional department filtering: ?department=... (Section 44)
    const deptQuery = String(req.query.department || '').trim();
    if (deptQuery && deptQuery.toLowerCase() !== 'all' && deptQuery.toLowerCase() !== 'all departments') {
      let filtered = entries.filter((e) => {
        const d = String(e.department || '').trim();
        return d.toLowerCase() === deptQuery.toLowerCase();
      });
      // If Supabase entries lacked department mapping, fallback to local store for department query
      if (filtered.length === 0 && localEntries.length > 0) {
        filtered = localEntries.filter((e) => {
          const d = String(e.department || '').trim();
          return d.toLowerCase() === deptQuery.toLowerCase();
        });
      }
      entries = filtered;
    }

    // 3. Determine configured working days from active version in history
    const history = loadTimetableHistory();
    const activeVersion = history.find((v) => v.is_active) || history[0];
    if (activeVersion && Array.isArray(activeVersion.working_days) && activeVersion.working_days.length > 0) {
      configuredWorkingDays = activeVersion.working_days;
    } else {
      const daysInEntries = [...new Set(entries.map((e) => e.day).filter(Boolean))];
      configuredWorkingDays = daysInEntries.length > 0
        ? DAY_NAMES.filter((d) => daysInEntries.includes(d))
        : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }

    // Attach working_days metadata to each entry for easy client access
    for (const e of entries) {
      e.working_days = configuredWorkingDays;
    }

    // 4. Sort deterministically: first by day_of_week, then period_number, then start_time
    entries.sort((a, b) => {
      const dayA = a.day_of_week || getDayNumber(a.day);
      const dayB = b.day_of_week || getDayNumber(b.day);
      if (dayA !== dayB) return dayA - dayB;
      const pA = a.period_number || 0;
      const pB = b.period_number || 0;
      if (pA !== pB) return pA - pB;
      return String(a.start_time).localeCompare(String(b.start_time));
    });

    try {
      const meta = await loadSchedulingMetadata();
      const { conflicts, conflictingEntryIds } = detectTimetableConflicts(
        entries,
        meta.teachers,
        meta.rooms,
        meta.teacher_availability
      );
      for (const e of entries) {
        if (conflictingEntryIds.has(String(e.timetable_id || e.id))) {
          e.has_conflict = true;
        }
      }
    } catch (_) {}

    res.set('X-Working-Days', JSON.stringify(configuredWorkingDays));
    if (activeVersion?.day_periods) {
      res.set('X-Day-Periods', JSON.stringify(activeVersion.day_periods));
    }
    if (activeVersion?.period_counts) {
      res.set('X-Period-Counts', JSON.stringify(activeVersion.period_counts));
    }
    res.json(entries);
  } catch (error) {
    console.error('GET /api/timetable error:', error);
    res.status(500).json({ error: 'Unable to load timetable: ' + error.message });
  }
});

// Endpoint to retrieve active timetable metadata (day_periods, working_days, department, breaks, workload)
app.get('/api/timetable/active-metadata', checkDatabase, async (req, res) => {
  try {
    const history = loadTimetableHistory();
    const activeVersion = history.find((v) => v.is_active) || history[0] || null;
    const allEntries = loadTimetableLocally();
    const breaks = activeVersion?.breaks || loadBreaksLocally();
    let workingDays = activeVersion?.working_days || null;
    if (!workingDays || workingDays.length === 0) {
      const daysInEntries = [...new Set(allEntries.map((e) => e.day).filter(Boolean))];
      workingDays = daysInEntries.length > 0
        ? DAY_NAMES.filter((d) => daysInEntries.includes(d))
        : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }
    const workload = activeVersion?.teacher_workload || calculateTeacherWorkload(allEntries, workingDays, activeVersion?.teachers || []);

    res.json({
      success: true,
      activeVersion: activeVersion ? {
        version_id: activeVersion.version_id,
        timestamp: activeVersion.timestamp,
        department: activeVersion.department,
        status: activeVersion.status || (activeVersion.conflicts?.length > 0 ? 'WARNING' : 'VALID'),
        summary: activeVersion.summary || null,
        conflicts: activeVersion.conflicts || [],
        unscheduled_classes: activeVersion.unscheduled_classes || [],
        working_days: workingDays,
        day_periods: activeVersion.day_periods || null,
        period_counts: activeVersion.period_counts || null,
        breaks: breaks,
        teacher_workload: workload,
        entry_count: activeVersion.entry_count
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dedicated Teacher Workload Endpoint (Requirements Part 14-22)
app.get('/api/timetable/workload', checkDatabase, async (req, res) => {
  try {
    const allEntries = loadTimetableLocally();
    const history = loadTimetableHistory();
    const activeVersion = history.find((v) => v.is_active) || history[0] || {};

    let workingDays = activeVersion.working_days && activeVersion.working_days.length > 0
      ? activeVersion.working_days
      : null;
    if (!workingDays || workingDays.length === 0) {
      const daysInEntries = [...new Set(allEntries.map((e) => e.day).filter(Boolean))];
      workingDays = daysInEntries.length > 0
        ? DAY_NAMES.filter((d) => daysInEntries.includes(d))
        : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }

    let teachers = [];
    if (activeVersion.teachers && activeVersion.teachers.length > 0) {
      teachers = activeVersion.teachers;
    } else {
      const meta = await loadSchedulingMetadata();
      teachers = meta.teachers;
    }

    const workload = calculateTeacherWorkload(allEntries, workingDays, teachers);
    res.json(workload);
  } catch (err) {
    console.error('GET /api/timetable/workload error:', err);
    res.status(500).json({ error: 'Unable to calculate teacher workload: ' + err.message });
  }
});

app.delete('/api/timetable', checkDatabase, async (req, res) => {
  try {
    const deptQuery = String(req.query.department || req.body?.department || '').trim();
    if (deptQuery && deptQuery.toLowerCase() !== 'all' && deptQuery.toLowerCase() !== 'all departments') {
      const allEntries = loadTimetableLocally();
      const remaining = allEntries.filter((e) => {
        const d = String(e.department || '').trim();
        return d.toLowerCase() !== deptQuery.toLowerCase();
      });
      saveTimetableLocally(remaining);
      let history = loadTimetableHistory();
      if (history.length > 0 && history[0].is_active) {
        history[0].entries = remaining;
        history[0].entry_count = remaining.length;
        saveTimetableHistory(history);
      }
      return res.json({ message: `Timetable for ${deptQuery} cleared successfully.` });
    }

    clearTimetableLocally();
    let history = loadTimetableHistory();
    history = history.map((v) => ({ ...v, is_active: false }));
    saveTimetableHistory(history);

    if (supabase) {
      try {
        await withTimeout(supabase.from('timetable').delete().neq('id', '00000000-0000-0000-0000-000000000000'), 1000);
      } catch (_) {}
    }

    res.json({ message: 'Timetable cleared successfully.' });
  } catch (error) {
    console.error('DELETE /api/timetable error:', error);
    res.status(500).json({ error: 'Unable to clear timetable: ' + error.message });
  }
});

// Update / edit active timetable entries in-place
app.put('/api/timetable', checkDatabase, async (req, res) => {
  try {
    let updatedEntries = null;
    if (Array.isArray(req.body)) {
      updatedEntries = req.body;
    } else if (req.body && Array.isArray(req.body.timetable)) {
      updatedEntries = req.body.timetable;
    } else if (req.body && Array.isArray(req.body.entries)) {
      updatedEntries = req.body.entries;
    }

    if (!Array.isArray(updatedEntries)) {
      return res.status(400).json({ error: 'Expected an array of timetable entries.' });
    }

    saveTimetableLocally(updatedEntries);

    let history = loadTimetableHistory();
    const now = new Date().toISOString();
    if (history.length > 0 && history[0].is_active) {
      history[0].entries = updatedEntries;
      history[0].entry_count = updatedEntries.length;
      history[0].updated_at = now;
    } else {
      history.unshift({
        version_id: 'gen_edit_' + Date.now(),
        timestamp: now,
        created_at: now,
        updated_at: now,
        is_active: true,
        entry_count: updatedEntries.length,
        sections: [...new Set(updatedEntries.map((e) => e.section || e.class_name).filter(Boolean))],
        teachers: [...new Set(updatedEntries.map((e) => e.teacher_name).filter(Boolean))],
        subjects: [...new Set(updatedEntries.map((e) => e.course_name || e.subject).filter(Boolean))],
        rooms: [...new Set(updatedEntries.map((e) => e.room_name).filter(Boolean))],
        entries: updatedEntries
      });
      if (history.length > MAX_RETAINED_GENERATIONS) {
        history = history.slice(0, MAX_RETAINED_GENERATIONS);
      }
    }
    saveTimetableHistory(history);

    res.json({
      success: true,
      message: 'Timetable updated successfully.',
      updated_at: now,
      entries_count: updatedEntries.length
    });
  } catch (error) {
    console.error('PUT /api/timetable error:', error);
    res.status(500).json({ error: 'Unable to update timetable: ' + error.message });
  }
});

/**
 * Loads scheduling metadata (teachers, subjects, sections, rooms, working days, time slots)
 * for validation and timetable editing interfaces.
 */
async function loadSchedulingMetadata() {
  const history = loadTimetableHistory();
  const activeGen = history.find((v) => v.is_active) || history[0] || {};
  const currentEntries = loadTimetableLocally();

  // 1. Working Days
  const daysInEntries = [...new Set(currentEntries.map((e) => e.day).filter(Boolean))];
  const combinedDays = [...new Set([...(activeGen.working_days || []), ...daysInEntries])];
  let workingDays = combinedDays.length > 0
    ? DAY_NAMES.filter((d) => combinedDays.includes(d))
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // 2. Sections
  const sections = activeGen.sections && activeGen.sections.length > 0
    ? activeGen.sections
    : [...new Set(currentEntries.map((e) => e.section || e.class_name).filter(Boolean))];

  // 3. Subjects
  const subjects = activeGen.subjects && activeGen.subjects.length > 0
    ? activeGen.subjects
    : [...new Set(currentEntries.map((e) => e.course_name || e.subject).filter(Boolean))];

  // 4. Teachers
  let teachers = [];
  if (activeGen.teachers && activeGen.teachers.length > 0) {
    teachers = activeGen.teachers.map(formatTeacherRecord).filter(Boolean);
  } else if (supabase) {
    try {
      const { data } = await Promise.race([
        supabase.from('teachers').select('*'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase timeout')), 1000))
      ]);
      if (data && data.length > 0) {
        teachers = data.map(formatTeacherRecord).filter(Boolean);
      }
    } catch (_) {}
  }

  const teacherMap = new Map();
  for (const t of teachers) {
    teacherMap.set(t.teacher_name.toLowerCase(), t);
  }

  for (const entry of currentEntries) {
    const tName = entry.teacher_name;
    const cName = entry.course_name || entry.subject;
    if (tName && cName) {
      const lowerT = tName.toLowerCase();
      if (!teacherMap.has(lowerT)) {
        teacherMap.set(lowerT, {
          teacher_id: `teacher_${lowerT}`,
          teacher_name: tName,
          assigned_subject: cName,
          assigned_subjects: [cName.toLowerCase()],
          availability: {}
        });
      } else {
        const exist = teacherMap.get(lowerT);
        if (!exist.assigned_subjects || exist.assigned_subjects.length === 0) {
          exist.assigned_subject = cName;
          exist.assigned_subjects = [cName.toLowerCase()];
        } else if (!exist.assigned_subjects.includes(cName.toLowerCase())) {
          exist.assigned_subjects.push(cName.toLowerCase());
          exist.assigned_subject = exist.assigned_subjects.join(', ');
        }
      }
    }
  }
  const allTeachers = Array.from(teacherMap.values());

  // 5. Rooms
  let rooms = [];
  if (activeGen.rooms && activeGen.rooms.length > 0) {
    rooms = activeGen.rooms.map(formatRoomRecord).filter(Boolean);
  } else if (supabase) {
    try {
      const { data } = await Promise.race([
        supabase.from('rooms').select('*'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase timeout')), 1000))
      ]);
      if (data && data.length > 0) {
        rooms = data.map(formatRoomRecord).filter(Boolean);
      }
    } catch (_) {}
  }
  if (rooms.length === 0) {
    const roomNames = [...new Set(currentEntries.map((e) => e.room_name).filter(Boolean))];
    rooms = roomNames.map((rn) => {
      const match = currentEntries.find((e) => e.room_name === rn);
      return {
        room_id: `room_${rn}`,
        room_name: rn,
        room_type: match?.room_type || 'Classroom',
        capacity: 40,
        availability: 'Available'
      };
    });
  }

  // 6. Time Slots
  const distinctSlots = new Map();
  for (const entry of currentEntries) {
    const s = String(entry.start_time).substring(0, 5);
    const e = String(entry.end_time).substring(0, 5);
    if (!distinctSlots.has(s)) {
      distinctSlots.set(s, { start_time: s, end_time: e });
    }
  }
  let timeSlots = Array.from(distinctSlots.values()).sort((a, b) => a.start_time.localeCompare(b.start_time));
  if (timeSlots.length === 0) {
    timeSlots = [
      { start_time: '09:00', end_time: '10:00' },
      { start_time: '10:00', end_time: '11:00' },
      { start_time: '11:00', end_time: '12:00' },
      { start_time: '12:00', end_time: '13:00' },
      { start_time: '13:00', end_time: '14:00' },
      { start_time: '14:00', end_time: '15:00' },
      { start_time: '15:00', end_time: '16:00' }
    ];
  }

  // 7. Teacher Availability
  let dbTeacherAvailability = [];
  if (supabase) {
    try {
      const { data } = await Promise.race([
        supabase.from('teacher_availability').select('*, time_slots(*)'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 500))
      ]);
      if (data) dbTeacherAvailability = data;
    } catch (_) {}
  }

  return {
    working_days: workingDays,
    day_periods: activeGen.day_periods || null,
    period_counts: activeGen.period_counts || null,
    breaks: activeGen.breaks || [],
    sections,
    subjects,
    teachers: allTeachers,
    rooms,
    time_slots: timeSlots,
    teacher_availability: dbTeacherAvailability,
    lab_classes: activeGen.lab_classes || []
  };
}

// 8C. TIMETABLE METADATA FOR EDIT MODAL
app.get('/api/timetable/metadata', checkDatabase, async (req, res) => {
  try {
    const meta = await loadSchedulingMetadata();
    res.json({
      working_days: meta.working_days,
      workingDays: meta.working_days,
      day_periods: meta.day_periods,
      period_counts: meta.period_counts,
      breaks: meta.breaks,
      time_slots: meta.time_slots,
      timeSlots: meta.time_slots,
      sections: meta.sections,
      subjects: meta.subjects,
      teachers: meta.teachers.map((t) => ({
        teacher_id: t.teacher_id,
        teacher_name: t.teacher_name,
        name: t.teacher_name,
        assigned_subject: t.assigned_subject || (t.assigned_subjects ? t.assigned_subjects.join(', ') : ''),
        subject: t.assigned_subject || (t.assigned_subjects ? t.assigned_subjects.join(', ') : ''),
        assigned_subjects: t.assigned_subjects || [],
        subjects: t.assigned_subjects || [],
        is_na: Boolean(t.is_na)
      })),
      rooms: meta.rooms.map((r) => ({
        room_id: r.room_id,
        room_name: r.room_name,
        room_number: r.room_name,
        room_type: r.room_type
      })),
      lab_classes: meta.lab_classes || []
    });
  } catch (err) {
    console.error('GET /api/timetable/metadata error:', err);
    res.status(500).json({ error: 'Unable to load timetable metadata: ' + err.message });
  }
});

// 8D. EDIT SINGLE TIMETABLE ENTRY (WITH REAL-TIME CONFLICT VALIDATION)
app.put(['/api/timetable/entry/:id', '/api/timetable/entry'], checkDatabase, async (req, res) => {
  try {
    const entryId = req.params.id || req.body.timetable_id || req.body.id;
    if (!entryId) {
      return res.status(400).json({ error: 'Timetable entry ID is required for editing.' });
    }

    let entries = loadTimetableLocally();
    const targetIdx = entries.findIndex(
      (e) => String(e.timetable_id || e.id) === String(entryId)
    );

    if (targetIdx === -1) {
      return res.status(404).json({ error: 'Timetable entry not found.' });
    }

    const currentEntry = entries[targetIdx];
    const proposed = {
      ...currentEntry,
      day: req.body.day !== undefined ? String(req.body.day).trim() : currentEntry.day,
      start_time: req.body.start_time !== undefined ? String(req.body.start_time).trim() : (req.body.startTime !== undefined ? String(req.body.startTime).trim() : currentEntry.start_time),
      end_time: req.body.end_time !== undefined ? String(req.body.end_time).trim() : (req.body.endTime !== undefined ? String(req.body.endTime).trim() : currentEntry.end_time),
      section: req.body.section !== undefined ? String(req.body.section).trim() : currentEntry.section,
      class_name: req.body.section !== undefined ? String(req.body.section).trim() : (req.body.class_name !== undefined ? String(req.body.class_name).trim() : currentEntry.class_name),
      course_name: req.body.course_name !== undefined ? String(req.body.course_name).trim() : (req.body.subject !== undefined ? String(req.body.subject).trim() : currentEntry.course_name),
      teacher_name: req.body.teacher_name !== undefined ? String(req.body.teacher_name).trim() : (req.body.teacher !== undefined ? String(req.body.teacher).trim() : currentEntry.teacher_name),
      room_name: req.body.room_name !== undefined ? String(req.body.room_name).trim() : (req.body.room !== undefined ? String(req.body.room).trim() : currentEntry.room_name),
      department: req.body.department !== undefined ? String(req.body.department).trim() : (currentEntry.department || ''),
      room_type: req.body.room_type !== undefined ? String(req.body.room_type).trim() : currentEntry.room_type,
      session_type: req.body.session_type !== undefined ? String(req.body.session_type).trim().toUpperCase() : (currentEntry.session_type || 'THEORY'),
      duration: req.body.duration !== undefined ? Number(req.body.duration) : (currentEntry.duration || 1),
      is_lab: (req.body.session_type ? String(req.body.session_type).trim().toUpperCase() === 'LAB' : Boolean(currentEntry.is_lab || currentEntry.session_type === 'LAB'))
    };

    proposed.room = proposed.room_name;
    proposed.teacher = proposed.teacher_name;
    proposed.subject = proposed.course_name;
    proposed.id = proposed.timetable_id || proposed.id;
    proposed.timetable_id = proposed.id;

    proposed.day_of_week = getDayNumber(proposed.day);

    const sMin = timeToMinutes(proposed.start_time);
    const eMin = timeToMinutes(proposed.end_time);
    if (isNaN(sMin) || isNaN(eMin) || eMin <= sMin) {
      return res.status(400).json({ error: 'Start time must be strictly earlier than end time.' });
    }

    const meta = await loadSchedulingMetadata();

    const validation = validateTimetableAssignment({
      entry: proposed,
      allEntries: entries,
      excludeId: entryId,
      teacherRecords: meta.teachers,
      candidateRooms: meta.rooms,
      workingDays: meta.working_days,
      dbTeacherAvailability: meta.teacher_availability
    });

    if (!validation.valid) {
      return res.status(409).json({
        error: validation.error,
        status: 'INVALID',
        message: validation.error
      });
    }

    entries[targetIdx] = proposed;
    entries.sort((a, b) => {
      const dayA = a.day_of_week || getDayNumber(a.day);
      const dayB = b.day_of_week || getDayNumber(b.day);
      if (dayA !== dayB) return dayA - dayB;
      const pA = a.period_number || 0;
      const pB = b.period_number || 0;
      if (pA !== pB) return pA - pB;
      return String(a.start_time).localeCompare(String(b.start_time));
    });

    // Detect all conflicts across timetable after edit
    const { conflicts, conflictingEntryIds } = detectTimetableConflicts(
      entries,
      meta.teachers,
      meta.rooms,
      meta.teacher_availability
    );

    for (const e of entries) {
      if (conflictingEntryIds.has(String(e.timetable_id || e.id))) {
        e.has_conflict = true;
      } else {
        e.has_conflict = false;
        delete e.conflict_details;
      }
    }

    saveTimetableLocally(entries);

    let history = loadTimetableHistory();
    const now = new Date().toISOString();
    if (history.length > 0 && history[0].is_active) {
      history[0].entries = entries;
      history[0].updated_at = now;
      saveTimetableHistory(history);
    }

    if (supabase) {
      try {
        await supabase
          .from('timetable')
          .update({
            day: proposed.day,
            day_of_week: proposed.day_of_week,
            start_time: proposed.start_time,
            end_time: proposed.end_time,
            class_name: proposed.class_name,
            section: proposed.section,
            course_name: proposed.course_name,
            teacher_name: proposed.teacher_name,
            room_name: proposed.room_name,
            room_type: proposed.room_type
          })
          .eq('timetable_id', entryId);
      } catch (_) {}
    }

    const updatedWorkload = calculateTeacherWorkload(entries, meta.working_days, meta.teachers);
    if (history.length > 0 && history[0].is_active) {
      history[0].teacher_workload = updatedWorkload;
      saveTimetableHistory(history);
    }

    const hasConflict = conflictingEntryIds.has(String(proposed.timetable_id || proposed.id));
    const status = conflicts.length === 0 ? 'VALID' : 'WARNING';
    const message = conflicts.length === 0
      ? 'Timetable updated successfully. All conflicts resolved.'
      : (hasConflict
          ? 'Timetable updated with warnings. The edited class still has scheduling conflicts.'
          : 'Timetable updated with warnings. Other classes still have scheduling conflicts.');

    return res.json({
      success: true,
      status,
      message,
      entry: proposed,
      conflicts,
      summary: {
        total_required: entries.length,
        successfully_scheduled: entries.filter((e) => !e.has_conflict).length,
        requiring_attention: entries.filter((e) => e.has_conflict).length,
        detected_conflicts: conflicts.length
      },
      timetable: entries,
      teacher_workload: updatedWorkload
    });
  } catch (err) {
    console.error('PUT /api/timetable/entry error:', err);
    return res.status(500).json({ error: 'Unable to update timetable entry: ' + err.message });
  }
});

// Endpoint for live validating an entry before or during manual conflict resolution
app.post('/api/timetable/validate-entry', checkDatabase, async (req, res) => {
  try {
    const { entry, excludeId } = req.body;
    if (!entry) return res.status(400).json({ error: 'Entry is required for validation.' });
    const entries = loadTimetableLocally();
    const meta = await loadSchedulingMetadata();
    const validation = validateTimetableAssignment({
      entry,
      allEntries: entries,
      excludeId: excludeId || entry.timetable_id || entry.id,
      teacherRecords: meta.teachers,
      candidateRooms: meta.rooms,
      workingDays: meta.working_days,
      dbTeacherAvailability: meta.teacher_availability
    });
    return res.json({ valid: validation.valid, error: validation.error || null });
  } catch (err) {
    return res.status(500).json({ error: 'Validation check failed: ' + err.message });
  }
});

// 8E. DELETE SINGLE TIMETABLE ENTRY (WITH REAL-TIME WORKLOAD RECALCULATION)
app.delete('/api/timetable/entry/:id', checkDatabase, async (req, res) => {
  try {
    const entryId = req.params.id;
    let entries = loadTimetableLocally();
    const targetIdx = entries.findIndex(
      (e) => String(e.timetable_id || e.id) === String(entryId)
    );

    if (targetIdx === -1) {
      return res.status(404).json({ error: 'Timetable entry not found.' });
    }

    const removed = entries.splice(targetIdx, 1)[0];
    saveTimetableLocally(entries);

    let history = loadTimetableHistory();
    const now = new Date().toISOString();
    const meta = await loadSchedulingMetadata();
    const updatedWorkload = calculateTeacherWorkload(entries, meta.working_days, meta.teachers);

    if (history.length > 0 && history[0].is_active) {
      history[0].entries = entries;
      history[0].entry_count = entries.length;
      history[0].updated_at = now;
      history[0].teacher_workload = updatedWorkload;
      saveTimetableHistory(history);
    }

    if (supabase) {
      try {
        await withTimeout(supabase.from('timetable').delete().eq('timetable_id', entryId), 1000);
      } catch (_) {}
    }

    return res.json({
      success: true,
      message: 'Timetable entry deleted successfully.',
      deleted_entry: removed,
      teacher_workload: updatedWorkload
    });
  } catch (err) {
    console.error('DELETE /api/timetable/entry error:', err);
    return res.status(500).json({ error: 'Unable to delete timetable entry: ' + err.message });
  }
});

// ==============================================================================
// 8B. STORAGE DASHBOARD & REPOSITORY METRICS (Feature Box 9)
// ==============================================================================
app.get('/api/storage', checkDatabase, async (req, res) => {
  try {
    // 1. Teachers count & safe summary
    let teachersCount = 0;
    let teachersList = [];
    try {
      if (supabase) {
        const { data, error } = await withTimeout(
          supabase.from('teachers').select('id, name, department, working_days_per_week'),
          500
        );
        if (!error && data) {
          teachersCount = data.length;
          teachersList = data.map((t) => ({
            name: t.name || 'Instructor',
            department: t.department || 'General',
            working_days: t.working_days_per_week || 5
          }));
        }
      }
    } catch (_) {}

    if (teachersCount === 0) {
      const localTeachers = loadTeachersLocally();
      if (localTeachers.length > 0) {
        teachersList = localTeachers.map((t) => ({
          name: t.name || t.teacher_name || 'Instructor',
          department: t.department || 'General',
          working_days: t.working_days_per_week || 5
        }));
        teachersCount = teachersList.length;
      }
    }

    // 2. Rooms count & safe summary
    let roomsCount = 0;
    let roomsList = [];
    try {
      if (supabase) {
        const { data, error } = await withTimeout(
          supabase.from('rooms').select('id, room_number, room_type, capacity, availability'),
          500
        );
        if (!error && data) {
          roomsCount = data.length;
          roomsList = data.map((r) => ({
            room_name: r.room_number || 'Room',
            room_type: r.room_type || 'Classroom',
            capacity: r.capacity || 40,
            availability: r.availability || 'Available'
          }));
        }
      }
    } catch (_) {}

    if (roomsCount === 0) {
      const localRooms = loadRoomsLocally();
      if (localRooms.length > 0) {
        roomsList = localRooms.map((r) => ({
          room_name: r.room_number || r.room_name || 'Room',
          room_type: r.room_type || 'Classroom',
          capacity: r.capacity || 40,
          availability: r.availability || 'Available'
        }));
        roomsCount = roomsList.length;
      }
    }

    // 3. Timetable History & Generations
    const history = loadTimetableHistory();
    const activeEntries = loadTimetableLocally();
    const retainedTimetablesCount = history.length;

    let lastGenerated = null;
    if (history.length > 0 && (history[0].timestamp || history[0].created_at)) {
      lastGenerated = history[0].timestamp || history[0].created_at;
    }

    // 4. Extract distinct sections & subjects
    const allSections = new Set();
    const allSubjects = new Set();

    history.forEach((v) => {
      if (Array.isArray(v.sections)) {
        v.sections.forEach((s) => allSections.add(typeof s === 'object' ? s.name : s));
      }
      if (Array.isArray(v.subjects)) {
        v.subjects.forEach((s) => allSubjects.add(typeof s === 'object' ? s.name : s));
      }
    });

    activeEntries.forEach((e) => {
      if (e.section || e.class_name) allSections.add(e.section || e.class_name);
      if (e.course_name || e.subject) allSubjects.add(e.course_name || e.subject);
    });

    if (teachersCount === 0) {
      const tNames = new Set();
      history.forEach((v) => {
        if (Array.isArray(v.teachers)) {
          v.teachers.forEach((t) => {
            const n = typeof t === 'object' ? (t.name || t.teacher_name) : t;
            if (n && String(n).trim()) tNames.add(String(n).trim());
          });
        }
      });
      activeEntries.forEach((e) => {
        if (e.teacher_name && String(e.teacher_name).trim()) tNames.add(String(e.teacher_name).trim());
      });
      teachersList = [...tNames].map((name) => ({ name, department: 'General', working_days: 5 }));
      teachersCount = teachersList.length;
    }
    teachersList = teachersList.filter((t) => t && t.name && String(t.name).trim());

    const sectionsList = [...allSections].filter(Boolean);
    const subjectsList = [...allSubjects].filter(Boolean);

    const timetableSummaries = history.map((v, idx) => ({
      version_id: v.is_active ? 'current' : `history_${idx + 1}`,
      title: `${v.department || 'General'} Timetable`,
      department: v.department || 'General',
      status: v.status || 'VALID',
      timestamp: v.timestamp || v.created_at,
      is_active: Boolean(v.is_active),
      entry_count: v.entry_count || (v.entries ? v.entries.length : 0),
      sections: v.sections || [],
      teachers_count: v.teachers ? v.teachers.length : 0,
      subjects_count: v.subjects ? v.subjects.length : 0,
      rooms_count: v.rooms ? v.rooms.length : 0,
      room_type: v.room_type || 'Classroom',
      working_days: v.working_days || []
    }));

    return res.json({
      success: true,
      counts: {
        teachers: teachersCount,
        subjects: subjectsList.length,
        sections: sectionsList.length,
        rooms: roomsCount,
        generatedTimetables: retainedTimetablesCount,
        activeEntriesCount: activeEntries.length
      },
      lastGenerated: lastGenerated,
      retentionPolicy: 'Latest 2 generations retained',
      maxRetained: MAX_RETAINED_GENERATIONS,
      details: {
        teachers: teachersList,
        rooms: roomsList,
        subjects: subjectsList,
        sections: sectionsList,
        timetables: timetableSummaries
      }
    });
  } catch (error) {
    console.error('GET /api/storage error:', error);
    return res.status(500).json({ error: 'Unable to retrieve storage data at this time.' });
  }
});

/**
 * Helper to locate a retained timetable version from history
 * Accepts 'current', 'history_1', 'history_2', full version_id, or department name.
 */
function findHistoryVersion(identifier) {
  const history = loadTimetableHistory();
  if (!history || history.length === 0) return null;
  if (!identifier || identifier === 'current') {
    return history.find((v) => v.is_active) || history[0];
  }
  if (identifier.startsWith('history_')) {
    const idx = parseInt(identifier.replace('history_', ''), 10) - 1;
    if (!isNaN(idx) && history[idx]) return history[idx];
    return null;
  }
  const exact = history.find((v) => v.version_id === identifier);
  if (exact) return exact;

  const byDept = history.find((v) => (v.department || '').toLowerCase() === identifier.toLowerCase());
  if (byDept) return byDept;

  return null;
}

// Retrieve full saved timetable details by version id or label (Features Storage)
app.get('/api/storage/timetable/:id', checkDatabase, async (req, res) => {
  try {
    const version = findHistoryVersion(req.params.id);
    if (!version) {
      return res.status(404).json({ success: false, error: 'Saved timetable version not found.' });
    }

    const history = loadTimetableHistory();
    const vIdx = history.indexOf(version);
    const versionLabel = version.is_active ? 'current' : (vIdx >= 0 ? `history_${vIdx + 1}` : version.version_id);

    // Isolate department entries if the version represents a specific department
    const targetDept = req.query.department || version.department;
    let deptEntries = version.entries || [];
    if (targetDept && targetDept !== 'all' && deptEntries.some((e) => (e.department || '').toLowerCase() === targetDept.toLowerCase())) {
      deptEntries = deptEntries.filter((e) => (e.department || '').toLowerCase() === targetDept.toLowerCase());
    }

    return res.json({
      success: true,
      timetable: {
        version_id: versionLabel,
        title: `${version.department || 'General'} Timetable`,
        department: version.department || 'General',
        status: version.status || 'VALID',
        timestamp: version.timestamp || version.created_at,
        summary: version.summary || {},
        entry_count: deptEntries.length,
        working_days: version.working_days || [],
        day_periods: version.day_periods || null,
        period_counts: version.period_counts || null,
        breaks: version.breaks || [],
        sections: version.sections || [],
        entries: deptEntries,
        conflicts: version.conflicts || []
      }
    });
  } catch (err) {
    console.error('GET /api/storage/timetable/:id error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve saved timetable version.' });
  }
});

// Download PDF of a specific saved timetable version (Features Storage)
app.get('/api/storage/timetable/:id/pdf', checkDatabase, async (req, res) => {
  try {
    const version = findHistoryVersion(req.params.id);
    if (!version) {
      return res.status(404).json({ error: 'Saved timetable not found.' });
    }

    const targetDept = req.query.department || version.department;
    let deptEntries = version.entries || [];
    if (targetDept && targetDept !== 'all' && deptEntries.some((e) => (e.department || '').toLowerCase() === targetDept.toLowerCase())) {
      deptEntries = deptEntries.filter((e) => (e.department || '').toLowerCase() === targetDept.toLowerCase());
    }

    const pdfVersionData = {
      ...version,
      entries: deptEntries
    };

    const pdfBuf = generateTimetablePdf(pdfVersionData, {
      department: targetDept || version.department,
      section: req.query.section || null
    });
    const filename = createSafePdfFilename(version.department, req.query.section);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuf.length);
    res.setHeader('Cache-Control', 'no-cache');
    return res.end(pdfBuf);
  } catch (err) {
    console.error('GET /api/storage/timetable/:id/pdf error:', err);
    return res.status(500).json({ error: 'Failed to generate timetable PDF.' });
  }
});

// Download PDF of current active or department timetable (Generate page)
app.get('/api/timetable/pdf', checkDatabase, async (req, res) => {
  try {
    const history = loadTimetableHistory();
    let target = null;
    if (req.query.department && req.query.department !== 'all') {
      target = history.find((v) => (v.department || '').toLowerCase() === req.query.department.toLowerCase());
    }
    if (!target) {
      target = history.find((v) => v.is_active) || history[0];
    }
    const localEntries = loadTimetableLocally();
    if (!target && (!localEntries || localEntries.length === 0)) {
      return res.status(404).json({ error: 'No generated timetable found to export.' });
    }
    const versionData = target || {
      department: req.query.department || 'General',
      entries: localEntries,
      status: 'VALID',
      timestamp: new Date().toISOString()
    };
    const pdfBuf = generateTimetablePdf(versionData, {
      department: req.query.department || versionData.department,
      section: req.query.section || null
    });
    const filename = createSafePdfFilename(versionData.department, req.query.section);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuf.length);
    res.setHeader('Cache-Control', 'no-cache');
    return res.end(pdfBuf);
  } catch (err) {
    console.error('GET /api/timetable/pdf error:', err);
    return res.status(500).json({ error: 'Failed to generate timetable PDF.' });
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
      const { data } = await withTimeout(supabase.from('timetable').select('*'), 250);
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
    return res.status(500).json({ error: 'Unable to check active class at this time.' });
  }
});

// ==============================================================================
// 9B. SCHEDX TO DO API ENDPOINTS (Calendar-based Planner)
// ==============================================================================

// GET /api/todos — Retrieve tasks (supports ?date=YYYY-MM-DD or ?month=YYYY-MM)
app.get('/api/todos', (req, res) => {
  try {
    let todos = loadTodosLocally();
    const { date, month } = req.query;

    if (date) {
      const cleanDate = String(date).trim();
      todos = todos.filter((t) => t.todo_date === cleanDate);
    } else if (month) {
      const cleanMonth = String(month).trim();
      todos = todos.filter((t) => t.todo_date && t.todo_date.startsWith(cleanMonth));
    }

    // Sort: uncompleted first, then by todo_time (if present), then by created_at
    todos.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.todo_time && b.todo_time) return a.todo_time.localeCompare(b.todo_time);
      if (a.todo_time && !b.todo_time) return -1;
      if (!a.todo_time && b.todo_time) return 1;
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });

    return res.json({
      success: true,
      count: todos.length,
      todos
    });
  } catch (err) {
    console.error('GET /api/todos error:', err);
    return res.status(500).json({ error: 'Unable to load your tasks. Please try again.' });
  }
});

// POST /api/todos — Create a new task
app.post('/api/todos', (req, res) => {
  try {
    const { title, description, todo_date, todo_time, priority } = req.body || {};

    const trimmedTitle = String(title || '').trim();
    if (!trimmedTitle) {
      return res.status(400).json({ error: 'Task title is required and cannot be empty.' });
    }
    if (trimmedTitle.length > 200) {
      return res.status(400).json({ error: 'Task title cannot exceed 200 characters.' });
    }

    const trimmedDate = String(todo_date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      return res.status(400).json({ error: 'Valid task date in YYYY-MM-DD format is required.' });
    }

    const validPriorities = ['Low', 'Medium', 'High'];
    const rawPriority = String(priority || 'Medium').trim();
    const cleanPriority = validPriorities.includes(rawPriority) ? rawPriority : 'Medium';

    let cleanTime = null;
    if (todo_time) {
      const trimmedTime = String(todo_time).trim();
      if (trimmedTime.length > 0 && trimmedTime.length <= 20) {
        cleanTime = trimmedTime;
      }
    }

    const cleanDescription = description ? String(description).trim().substring(0, 1000) : '';

    const now = new Date().toISOString();
    const newTodo = {
      todo_id: `todo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: trimmedTitle,
      description: cleanDescription,
      todo_date: trimmedDate,
      todo_time: cleanTime,
      priority: cleanPriority,
      completed: false,
      created_at: now,
      updated_at: now
    };

    const todos = loadTodosLocally();
    todos.push(newTodo);
    saveTodosLocally(todos);

    if (supabase) {
      supabase.from('todos').insert([newTodo]).then(() => {}).catch(() => {});
    }

    return res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      todo: newTodo
    });
  } catch (err) {
    console.error('POST /api/todos error:', err);
    return res.status(500).json({ error: 'Unable to save this task. Please try again.' });
  }
});

// PUT /api/todos/:id — Update existing task
app.put('/api/todos/:id', (req, res) => {
  try {
    const todoId = String(req.params.id || '').trim();
    if (!todoId) {
      return res.status(400).json({ error: 'Task ID is required.' });
    }

    const todos = loadTodosLocally();
    const index = todos.findIndex((t) => t.todo_id === todoId);
    if (index === -1) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const existing = todos[index];
    const { title, description, todo_date, todo_time, priority, completed } = req.body || {};

    if (title !== undefined) {
      const trimmed = String(title).trim();
      if (!trimmed) {
        return res.status(400).json({ error: 'Task title cannot be empty.' });
      }
      if (trimmed.length > 200) {
        return res.status(400).json({ error: 'Task title cannot exceed 200 characters.' });
      }
      existing.title = trimmed;
    }

    if (description !== undefined) {
      existing.description = String(description).trim().substring(0, 1000);
    }

    if (todo_date !== undefined) {
      const trimmedDate = String(todo_date).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
        return res.status(400).json({ error: 'Valid task date in YYYY-MM-DD format is required.' });
      }
      existing.todo_date = trimmedDate;
    }

    if (todo_time !== undefined) {
      existing.todo_time = todo_time ? String(todo_time).trim().substring(0, 20) : null;
    }

    if (priority !== undefined) {
      const p = String(priority).trim();
      if (['Low', 'Medium', 'High'].includes(p)) {
        existing.priority = p;
      }
    }

    if (completed !== undefined) {
      existing.completed = Boolean(completed);
    }

    existing.updated_at = new Date().toISOString();
    todos[index] = existing;
    saveTodosLocally(todos);

    if (supabase) {
      supabase.from('todos').update(existing).eq('todo_id', todoId).then(() => {}).catch(() => {});
    }

    return res.json({
      success: true,
      message: 'Task updated successfully.',
      todo: existing
    });
  } catch (err) {
    console.error('PUT /api/todos/:id error:', err);
    return res.status(500).json({ error: 'Unable to update this task. Please try again.' });
  }
});

// DELETE /api/todos/:id — Remove task
app.delete('/api/todos/:id', (req, res) => {
  try {
    const todoId = String(req.params.id || '').trim();
    if (!todoId) {
      return res.status(400).json({ error: 'Task ID is required.' });
    }

    const todos = loadTodosLocally();
    const exists = todos.some((t) => t.todo_id === todoId);
    if (!exists) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const remaining = todos.filter((t) => t.todo_id !== todoId);
    saveTodosLocally(remaining);

    if (supabase) {
      supabase.from('todos').delete().eq('todo_id', todoId).then(() => {}).catch(() => {});
    }

    return res.json({
      success: true,
      message: 'Task deleted successfully.'
    });
  } catch (err) {
    console.error('DELETE /api/todos/:id error:', err);
    return res.status(500).json({ error: 'Unable to delete this task. Please try again.' });
  }
});

// ==============================================================================
// 9b. FORMSPARK FEEDBACK PROXY (Requirement Form ID: k2ffqAiIu)
// ==============================================================================
app.post('/api/feedback', async (req, res) => {
  try {
    const { name, email, category, message, source } = req.body || {};
    const trimmedMessage = String(message || '').trim();

    if (!trimmedMessage) {
      return res.status(400).json({
        success: false,
        error: 'Feedback message is required and cannot be empty.'
      });
    }

    const payload = {
      name: name ? String(name).trim() : undefined,
      email: email ? String(email).trim() : undefined,
      category: category ? String(category).trim() : 'General Feedback',
      message: trimmedMessage,
      source: source || 'SchedX Website'
    };

    const FORMSPARK_URL = 'https://submit-form.com/k2ffqAiIu';
    const formsparkRes = await fetch(FORMSPARK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!formsparkRes.ok) {
      return res.status(formsparkRes.status).json({
        success: false,
        error: 'Your feedback could not be submitted. Please try again.'
      });
    }

    const data = await formsparkRes.json().catch(() => ({ success: true }));
    return res.json({
      success: true,
      message: 'Thank you! Your feedback has been submitted successfully.',
      data
    });
  } catch (err) {
    console.error('Feedback submission proxy error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Your feedback could not be submitted. Please try again.'
    });
  }
});

// ==============================================================================
// 10. PAGE ROUTING (Requirement 22)
// ==============================================================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/generate', (req, res) => res.sendFile(path.join(__dirname, 'public', 'generate.html')));
app.get('/features', (req, res) => res.sendFile(path.join(__dirname, 'public', 'features.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));
app.get('/teacher-availability', (req, res) => res.sendFile(path.join(__dirname, 'public', 'teacher-availability.html')));
app.get('/teacher-info', (req, res) => res.sendFile(path.join(__dirname, 'public', 'teacher-info.html')));
app.get('/rooms', (req, res) => res.sendFile(path.join(__dirname, 'public', 'rooms.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Server startup listener
if (require.main === module) {
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
}

app.timeToMinutes = timeToMinutes;
app.minutesToTime = minutesToTime;
app.normalizeTime24 = normalizeTime24;
app.formatTime12 = formatTime12;
app.buildTimeSlots = buildTimeSlots;
app.matchLabToDayPeriods = matchLabToDayPeriods;
app.calculateDayTeachingPeriods = calculateDayTeachingPeriods;

module.exports = app;

