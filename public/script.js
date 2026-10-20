// ==============================================================================
// SchedX — Frontend Application Script
// ==============================================================================

const API = '/api';

// Navigation Setup
function setupNavigation() {
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('.site-nav');
  const navLinks = document.querySelectorAll('.nav-link');

  if (!navToggle || !siteNav) return;

  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        siteNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });

  setActiveNavLink();
}

function setActiveNavLink() {
  const navLinks = document.querySelectorAll('.nav-link');
  const currentPath = window.location.pathname;

  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    let isActive = false;

    if ((currentPath === '/' || currentPath.startsWith('/index')) && href === '/') {
      isActive = true;
    } else if (href && currentPath.startsWith(href) && href !== '/' && href !== '/#about') {
      isActive = true;
    }

    link.classList.toggle('active', isActive);
    if (isActive) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

// Message & Toast Utilities
function showMessage(text, type = 'success') {
  const messageDiv = document.getElementById('message');
  if (messageDiv) {
    messageDiv.textContent = text;
    messageDiv.className = `message show ${type}`;
    messageDiv.style.display = 'block';
  }
  if (type === 'error' || type === 'info') {
    showToast(text);
  }
}

function hideMessage() {
  const messageDiv = document.getElementById('message');
  if (!messageDiv) return;
  messageDiv.classList.remove('show');
  messageDiv.style.display = 'none';
}

function showToast(message, duration = 3000) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// API Request Helper
async function apiRequest(method, endpoint, data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API}${endpoint}`, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Server error: ${response.status}`);
    }

    return result;
  } catch (error) {
    if (error.message && error.message.includes('Failed to fetch')) {
      throw new Error('Server is unreachable. Ensure the backend server is running.');
    }
    throw error;
  }
}

// Day Names Order for Sorting
const WORKING_DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Convert HH:MM(:SS) or HH:MM AM/PM string or numeric minutes to integer minutes from midnight [0, 1440)
function timeToMinutes(timeValue) {
  if (timeValue === null || timeValue === undefined || timeValue === '') return NaN;
  if (typeof timeValue === 'number') {
    return isNaN(timeValue) ? NaN : Math.max(0, Math.floor(timeValue));
  }
  const clean = String(timeValue).trim();
  if (!clean) return NaN;
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i);
  if (!match) return NaN;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 24 || minutes < 0 || minutes >= 60) return NaN;
  const ampm = match[4] ? match[4].toUpperCase() : null;
  if (ampm) {
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
  }
  return hours * 60 + minutes;
}

// Convert total minutes to HH:MM (24-hour internal representation)
function minutesToTime(totalMinutes) {
  if (totalMinutes === null || totalMinutes === undefined || isNaN(totalMinutes)) return '00:00';
  const safeMinutes = Math.max(0, Math.floor(Number(totalMinutes) || 0)) % 1440;
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Normalize any time string to 24-hour HH:MM format
function normalizeTime24(timeValue) {
  const mins = timeToMinutes(timeValue);
  if (isNaN(mins)) return String(timeValue || '').trim();
  return minutesToTime(mins);
}

// Format time as HH:MM AM/PM with 12-hour precision
function formatTime12(timeValue) {
  if (timeValue === null || timeValue === undefined || timeValue === '') return '';
  const totalMinutes = typeof timeValue === 'number' ? timeValue : timeToMinutes(timeValue);
  if (isNaN(totalMinutes)) return String(timeValue).trim();
  const safeMinutes = Math.max(0, Math.floor(totalMinutes)) % 1440;
  const hours24 = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  const meridian = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${meridian}`;
}

function formatTimeSlot(startTime, endTime) {
  if (!startTime && !endTime) return '';
  return `${formatTime12(startTime)} – ${formatTime12(endTime)}`;
}

function formatDurationText(startTime, endTime) {
  if (!startTime || !endTime) return '—';
  const sMin = timeToMinutes(startTime);
  const eMin = timeToMinutes(endTime);
  if (isNaN(sMin) || isNaN(eMin) || eMin <= sMin) {
    return 'Invalid interval';
  }
  const diff = eMin - sMin;
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hrs > 0 && mins > 0) return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins} min${mins > 1 ? 's' : ''}`;
  if (hrs > 0) return `${hrs} hour${hrs > 1 ? 's' : ''}`;
  return `${mins} minutes`;
}

// Render Compact Current Class / Active Lecture Card (Requirement 14)
function renderCurrentClass(timetable) {
  const wrapper = document.getElementById('currentClassWrapper');
  if (!wrapper) return;

  if (!timetable || timetable.length === 0) {
    wrapper.innerHTML = '';
    return;
  }

  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDay = dayNames[now.getDay()];
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMins = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${currentHours}:${currentMins}`;

  // Find currently ongoing class
  const activeClass = timetable.find((entry) => {
    const d = String(entry.day || '');
    const st = String(entry.start_time || '00:00').substring(0, 5);
    const et = String(entry.end_time || '23:59').substring(0, 5);
    return d.toLowerCase() === currentDay.toLowerCase() && st <= currentTime && currentTime < et;
  });

  if (activeClass) {
    wrapper.innerHTML = `
      <div class="current-class-card active-session">
        <div class="current-class-header">
          <div class="current-class-pill live-pill">
            <span class="live-dot" aria-hidden="true"></span>
            <span>CURRENT CLASS &bull; LIVE</span>
          </div>
          <span class="current-class-day">${escapeHtml(activeClass.day)}</span>
        </div>
        <div class="current-class-body">
          <div class="current-class-title-wrap">
            <span class="current-class-tag">ACTIVE LECTURE</span>
            <h3 class="current-class-subject">${escapeHtml(activeClass.course_name || activeClass.subject || 'Course')}</h3>
          </div>
          <div class="current-class-grid">
            <div class="current-metric">
              <span class="metric-label">TEACHER</span>
              <span class="metric-value">👨‍🏫 ${escapeHtml(activeClass.teacher_name || 'Faculty')}</span>
            </div>
            <div class="current-metric">
              <span class="metric-label">SECTION</span>
              <span class="metric-value">👥 ${escapeHtml(activeClass.section || activeClass.class_name || 'General')}</span>
            </div>
            <div class="current-metric">
              <span class="metric-label">ROOM</span>
              <span class="metric-value">🚪 ${escapeHtml(activeClass.room_name || 'Room')} (${escapeHtml(activeClass.room_type || 'Classroom')})</span>
            </div>
            <div class="current-metric">
              <span class="metric-label">TIME</span>
              <span class="metric-value">⏰ ${escapeHtml(formatTimeSlot(activeClass.start_time, activeClass.end_time))}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // Check next upcoming class today
    const todayClasses = timetable
      .filter((entry) => String(entry.day || '').toLowerCase() === currentDay.toLowerCase() && String(entry.start_time || '').substring(0, 5) > currentTime)
      .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));

    const nextClass = todayClasses[0];
    if (nextClass) {
      wrapper.innerHTML = `
        <div class="current-class-card upcoming-session">
          <div class="current-class-header">
            <div class="current-class-pill upcoming-pill">
              <span class="upcoming-dot" aria-hidden="true"></span>
              <span>NEXT UPCOMING CLASS TODAY</span>
            </div>
            <span class="current-class-day">${escapeHtml(nextClass.day)}</span>
          </div>
          <div class="current-class-body">
            <div class="current-class-title-wrap">
              <span class="current-class-tag">SCHEDULED NEXT</span>
              <h3 class="current-class-subject">${escapeHtml(nextClass.course_name || nextClass.subject || 'Course')}</h3>
            </div>
            <div class="current-class-grid">
              <div class="current-metric">
                <span class="metric-label">TEACHER</span>
                <span class="metric-value">👨‍🏫 ${escapeHtml(nextClass.teacher_name || 'Faculty')}</span>
              </div>
              <div class="current-metric">
                <span class="metric-label">SECTION</span>
                <span class="metric-value">👥 ${escapeHtml(nextClass.section || nextClass.class_name || 'General')}</span>
              </div>
              <div class="current-metric">
                <span class="metric-label">ROOM</span>
                <span class="metric-value">🚪 ${escapeHtml(nextClass.room_name || 'Room')} (${escapeHtml(nextClass.room_type || 'Classroom')})</span>
              </div>
              <div class="current-metric">
                <span class="metric-label">TIME</span>
                <span class="metric-value">⏰ ${escapeHtml(formatTimeSlot(nextClass.start_time, nextClass.end_time))}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      // Idle session notice
      wrapper.innerHTML = `
        <div class="current-class-card idle-session">
          <div class="current-class-header">
            <div class="current-class-pill idle-pill">
              <span class="idle-dot" aria-hidden="true"></span>
              <span>LIVE MONITOR &bull; CURRENT STATUS</span>
            </div>
            <span class="current-class-day">${escapeHtml(currentDay)}</span>
          </div>
          <div class="current-class-idle-body">
            <p>No active or pending lectures in session right now for ${escapeHtml(currentDay)}. Full day-by-day timetable is detailed below.</p>
          </div>
        </div>
      `;
    }
  }
}

// ==============================================================================
// EDITABLE TIMETABLE MODAL & ACTION HANDLERS (Requirements 10-15, 28, 33, 47)
// ==============================================================================
let activeTimetableEntries = [];
window.activeTimetableEntries = activeTimetableEntries;
let activeSchedulingMetadata = null;
let isEditDirty = false;
let isTimetableEditMode = false;
let currentlyInlineEditingId = null;

function setEditDirty(dirty) {
  isEditDirty = Boolean(dirty);
  const badge = document.getElementById('editModalDirtyBadge');
  if (badge) badge.style.display = isEditDirty ? 'inline-block' : 'none';
}

async function ensureSchedulingMetadata() {
  if (activeSchedulingMetadata && activeSchedulingMetadata.teachers && activeSchedulingMetadata.teachers.length > 0) {
    return activeSchedulingMetadata;
  }
  try {
    const meta = await apiRequest('GET', '/timetable/metadata');
    activeSchedulingMetadata = meta;
  } catch (_) {}

  if (!activeSchedulingMetadata) {
    activeSchedulingMetadata = {
      working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      sections: [],
      subjects: [],
      teachers: [],
      rooms: [],
      time_slots: []
    };
  }

  const entries = activeTimetableEntries || [];
  const meta = activeSchedulingMetadata;

  // Merge working days
  const entryDays = [...new Set(entries.map((e) => e.day).filter(Boolean))];
  const combinedDays = [...new Set([...(meta.working_days || []), ...entryDays])];
  meta.working_days = combinedDays.length > 0 ? combinedDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Merge sections
  const entrySections = [...new Set(entries.map((e) => e.section || e.class_name).filter(Boolean))];
  meta.sections = [...new Set([...(meta.sections || []).map((s) => typeof s === 'object' ? (s.section_name || s.name || s.class_name) : String(s)), ...entrySections])].filter(Boolean);

  // Merge subjects
  const entrySubjects = [...new Set(entries.map((e) => e.course_name || e.subject).filter(Boolean))];
  meta.subjects = [...new Set([...(meta.subjects || []).map((s) => typeof s === 'object' ? (s.course_name || s.name || s.subject_name) : String(s)), ...entrySubjects])].filter(Boolean);

  // Merge teachers with assigned subjects
  const teacherMap = new Map();
  (meta.teachers || []).forEach((t) => {
    const tName = t.teacher_name || t.name;
    if (tName) {
      const lower = tName.toLowerCase();
      const subs = Array.isArray(t.assigned_subjects) ? t.assigned_subjects.map((s) => String(s).toLowerCase()) : [];
      if (t.assigned_subject) subs.push(String(t.assigned_subject).toLowerCase());
      teacherMap.set(lower, {
        teacher_name: tName,
        assigned_subjects: subs,
        is_na: Boolean(t.is_na || String(t.subjectPreference || '').toUpperCase() === 'NA')
      });
    }
  });

  entries.forEach((e) => {
    if (e.teacher_name) {
      const lower = e.teacher_name.toLowerCase();
      const sub = String(e.course_name || e.subject || '').toLowerCase();
      if (!teacherMap.has(lower)) {
        teacherMap.set(lower, {
          teacher_name: e.teacher_name,
          assigned_subjects: sub ? [sub] : [],
          is_na: false
        });
      } else {
        const exist = teacherMap.get(lower);
        if (sub && !exist.assigned_subjects.includes(sub)) {
          exist.assigned_subjects.push(sub);
        }
      }
    }
  });
  meta.teachers = Array.from(teacherMap.values());

  // Merge rooms
  const roomMap = new Map();
  (meta.rooms || []).forEach((r) => {
    const rName = r.room_name || r.name || r.room_number;
    if (rName) {
      roomMap.set(rName.toLowerCase(), {
        room_name: rName,
        room_type: r.room_type || 'Classroom'
      });
    }
  });

  entries.forEach((e) => {
    if (e.room_name) {
      const lower = e.room_name.toLowerCase();
      if (!roomMap.has(lower)) {
        roomMap.set(lower, {
          room_name: e.room_name,
          room_type: e.room_type || (e.is_lab || e.session_type === 'LAB' ? 'Laboratory' : 'Classroom')
        });
      }
    }
  });
  meta.rooms = Array.from(roomMap.values());

  return meta;
}

function getPeriodsForDay(dayName, meta, entries) {
  let slots = [];
  if (meta && meta.day_periods && Array.isArray(meta.day_periods[dayName]) && meta.day_periods[dayName].length > 0) {
    slots = meta.day_periods[dayName].map((p, idx) => ({
      period: p.period || (idx + 1),
      start_time: String(p.start_time || p.start || '').substring(0, 5),
      end_time: String(p.end_time || p.end || '').substring(0, 5)
    })).filter((s) => s.start_time && s.end_time);
  } else if (meta && meta.time_slots && meta.time_slots.length > 0) {
    slots = meta.time_slots.map((ts, idx) => ({
      period: idx + 1,
      start_time: String(ts.start_time || '').substring(0, 5),
      end_time: String(ts.end_time || '').substring(0, 5)
    })).filter((s) => s.start_time && s.end_time);
  } else {
    const distinctTimes = new Map();
    for (const e of entries || []) {
      if (!e.day || e.day.toLowerCase() === dayName.toLowerCase()) {
        const s = String(e.start_time || '').substring(0, 5);
        const end = String(e.end_time || '').substring(0, 5);
        if (s && end && !distinctTimes.has(s)) {
          distinctTimes.set(s, { period: e.period_number || 1, start_time: s, end_time: end });
        }
      }
    }
    slots = Array.from(distinctTimes.values()).sort((a, b) => a.start_time.localeCompare(b.start_time));
    if (slots.length === 0) {
      for (const e of entries || []) {
        const s = String(e.start_time || '').substring(0, 5);
        const end = String(e.end_time || '').substring(0, 5);
        if (s && end && !distinctTimes.has(s)) {
          distinctTimes.set(s, { period: e.period_number || 1, start_time: s, end_time: end });
        }
      }
      slots = Array.from(distinctTimes.values()).sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
  }
  return slots;
}

function getEligibleTeachersForSubject(subjectName, allTeachers, currentTeacherName = '') {
  const subLower = (subjectName || '').trim().toLowerCase();
  const baseSub = subLower.replace(/\s+lab$/i, '').trim();

  const eligible = (allTeachers || []).filter((t) => {
    if (t.is_na) return true;
    const assigned = (t.assigned_subjects || []).map((s) => String(s).toLowerCase());
    if (assigned.length === 0) return true;
    return assigned.includes(subLower) || assigned.includes(baseSub);
  });

  if (currentTeacherName && !eligible.some((t) => t.teacher_name.toLowerCase() === currentTeacherName.toLowerCase())) {
    eligible.unshift({
      teacher_name: currentTeacherName,
      assigned_subjects: [subLower],
      is_na: false
    });
  }
  return eligible;
}

function getEligibleRooms(isLab, allRooms, currentRoomName = '') {
  let eligible = (allRooms || []).map((r) => ({
    room_name: r.room_name || r.name || r.room_number || 'Room',
    room_type: r.room_type || (isLab ? 'Laboratory' : 'Classroom')
  }));

  if (isLab) {
    const labsOnly = eligible.filter((r) => String(r.room_type || '').toLowerCase() === 'laboratory');
    eligible = labsOnly.length > 0 ? labsOnly : eligible;
  }

  if (currentRoomName && !eligible.some((r) => r.room_name.toLowerCase() === currentRoomName.toLowerCase())) {
    eligible.unshift({
      room_name: currentRoomName,
      room_type: isLab ? 'Laboratory' : 'Classroom'
    });
  }
  return eligible;
}

function runLiveInlineConflictCheck(entryId) {
  const daySelect = document.getElementById(`inlineDay_${entryId}`);
  const timeSelect = document.getElementById(`inlineTime_${entryId}`);
  const teacherSelect = document.getElementById(`inlineTeacher_${entryId}`);
  const sectionSelect = document.getElementById(`inlineSection_${entryId}`);
  const roomSelect = document.getElementById(`inlineRoom_${entryId}`);
  const saveBtn = document.getElementById(`btnSaveInline_${entryId}`);

  const teacherWarn = document.getElementById(`inlineTeacherConflict_${entryId}`);
  const roomWarn = document.getElementById(`inlineRoomConflict_${entryId}`);
  const timeWarn = document.getElementById(`inlineTimeConflict_${entryId}`);
  const sectionWarn = document.getElementById(`inlineSectionConflict_${entryId}`);

  if (teacherWarn) { teacherWarn.style.display = 'none'; teacherWarn.textContent = ''; }
  if (roomWarn) { roomWarn.style.display = 'none'; roomWarn.textContent = ''; }
  if (timeWarn) { timeWarn.style.display = 'none'; timeWarn.textContent = ''; }
  if (sectionWarn) { sectionWarn.style.display = 'none'; sectionWarn.textContent = ''; }
  if (saveBtn) saveBtn.disabled = false;

  teacherSelect?.classList.remove('has-conflict-border');
  roomSelect?.classList.remove('has-conflict-border');
  timeSelect?.classList.remove('has-conflict-border');
  sectionSelect?.classList.remove('has-conflict-border');

  if (!daySelect || !timeSelect) return true;

  const selDay = (daySelect.value || '').trim();
  const selTimeOpt = timeSelect.options[timeSelect.selectedIndex];
  if (!selTimeOpt) return true;

  const sStartMin = timeToMinutes(selTimeOpt.dataset.start);
  const sEndMin = timeToMinutes(selTimeOpt.dataset.end);

  const selTeacher = (teacherSelect?.value || '').trim();
  const selSection = (sectionSelect?.value || '').trim();
  const selRoom = (roomSelect?.value || '').trim();

  let hasConflict = false;

  for (const other of activeTimetableEntries || []) {
    const oId = String(other.timetable_id || other.id);
    if (oId === String(entryId)) continue;

    if ((other.day || '').toLowerCase() === selDay.toLowerCase()) {
      const oStartMin = timeToMinutes(other.start_time);
      const oEndMin = timeToMinutes(other.end_time);

      // Exact interval overlap: startA < endB AND startB < endA
      const isOverlapping = sStartMin < oEndMin && oStartMin < sEndMin;

      if (isOverlapping) {
        // Teacher conflict check
        if (selTeacher && (other.teacher_name || '').toLowerCase() === selTeacher.toLowerCase()) {
          if (teacherWarn) {
            teacherWarn.textContent = `⚠️ Teacher ${selTeacher} is already assigned at ${formatTime12(oStartMin)} (${other.section || other.class_name}).`;
            teacherWarn.style.display = 'block';
          }
          teacherSelect?.classList.add('has-conflict-border');
          hasConflict = true;
        }

        // Section conflict check
        if (selSection && (other.section || other.class_name || '').toLowerCase() === selSection.toLowerCase()) {
          if (sectionWarn) {
            sectionWarn.textContent = `⚠️ Section ${selSection} already has ${other.course_name || other.subject} at this time.`;
            sectionWarn.style.display = 'block';
          }
          sectionSelect?.classList.add('has-conflict-border');
          hasConflict = true;
        }

        // Room conflict check
        if (selRoom && (other.room_name || '').toLowerCase() === selRoom.toLowerCase()) {
          if (roomWarn) {
            roomWarn.textContent = `⚠️ Room ${selRoom} is already assigned at ${formatTime12(oStartMin)} to ${other.section || other.class_name}.`;
            roomWarn.style.display = 'block';
          }
          roomSelect?.classList.add('has-conflict-border');
          hasConflict = true;
        }
      }
    }
  }

  return !hasConflict;
}

async function startInlineRowEdit(entryId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (!activeTimetableEntries || activeTimetableEntries.length === 0) {
    try {
      activeTimetableEntries = (await apiRequest('GET', '/timetable')) || [];
      window.activeTimetableEntries = activeTimetableEntries;
    } catch (_) {}
  }

  const entry = (activeTimetableEntries || []).find((e) => String(e.timetable_id || e.id) === String(entryId));
  if (!entry) {
    showToast('Assignment not found for editing.');
    return;
  }

  // Revert any previously active inline edit cleanly
  if (currentlyInlineEditingId && currentlyInlineEditingId !== String(entryId)) {
    cancelInlineRowEdit(currentlyInlineEditingId);
  }

  const row = document.querySelector(`tr[data-entry-id="${entryId}"]`);
  if (!row) {
    showToast('Timetable row not found in view.');
    return;
  }

  row.dataset.originalInnerHtml = row.innerHTML;
  row._originalEntry = { ...entry };
  currentlyInlineEditingId = String(entryId);

  row.classList.add('is-inline-editing', 'timetable-row--inline-editing');

  const meta = await ensureSchedulingMetadata();

  const isLab = entry.session_type === 'LAB' || Boolean(entry.is_lab) || /lab/i.test(entry.course_name || entry.subject || '');
  const dayName = entry.day || 'Monday';
  const startShort = String(entry.start_time || '09:00').substring(0, 5);
  const endShort = String(entry.end_time || '10:00').substring(0, 5);

  // 1. Working days dropdown
  const workingDays = meta.working_days && meta.working_days.length > 0
    ? meta.working_days
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const dayOptionsHtml = workingDays.map((d) => {
    const dStr = typeof d === 'object' ? (d.day_name || d.name || String(d)) : String(d);
    const isSel = dStr.toLowerCase() === dayName.toLowerCase();
    return `<option value="${escapeHtml(dStr)}" ${isSel ? 'selected' : ''}>${escapeHtml(dStr)}</option>`;
  }).join('');

  // 2. Periods & Time Slots for current day
  const slots = getPeriodsForDay(dayName, meta, activeTimetableEntries);
  let timeOptionsHtml = slots.map((ts) => {
    const isSel = ts.start_time === startShort;
    const pLabel = ts.period ? `P${ts.period}: ` : '';
    return `<option value="${ts.start_time}-${ts.end_time}" data-start="${ts.start_time}" data-end="${ts.end_time}" data-period="${ts.period || ''}" ${isSel ? 'selected' : ''}>${pLabel}${formatTimeSlot(ts.start_time, ts.end_time)}</option>`;
  }).join('');

  if (!slots.some((ts) => ts.start_time === startShort)) {
    timeOptionsHtml = `<option value="${startShort}-${endShort}" data-start="${startShort}" data-end="${endShort}" data-period="${entry.period_number || 1}" selected>P${entry.period_number || 1}: ${formatTimeSlot(startShort, endShort)}</option>` + timeOptionsHtml;
  }

  // 3. Sections
  const rawSections = meta.sections && meta.sections.length > 0 ? meta.sections : [entry.section || 'Section A'];
  const sectionOptionsHtml = rawSections.map((s) => {
    const isSel = String(s).toLowerCase() === String(entry.section || entry.class_name || '').toLowerCase();
    return `<option value="${escapeHtml(s)}" ${isSel ? 'selected' : ''}>${escapeHtml(s)}</option>`;
  }).join('');

  // 4. Subjects
  const rawSubjects = meta.subjects && meta.subjects.length > 0 ? meta.subjects : [entry.course_name || entry.subject || 'Course'];
  const subjectOptionsHtml = rawSubjects.map((sub) => {
    const isSel = String(sub).toLowerCase() === String(entry.course_name || entry.subject || '').toLowerCase();
    return `<option value="${escapeHtml(sub)}" ${isSel ? 'selected' : ''}>${escapeHtml(sub)}</option>`;
  }).join('');

  // 5. Eligible Teachers for current subject
  const currentSubject = entry.course_name || entry.subject || '';
  const eligibleTeachers = getEligibleTeachersForSubject(currentSubject, meta.teachers, entry.teacher_name);
  const teacherOptionsHtml = eligibleTeachers.map((t) => {
    const isSel = t.teacher_name.toLowerCase() === String(entry.teacher_name || '').toLowerCase();
    return `<option value="${escapeHtml(t.teacher_name)}" ${isSel ? 'selected' : ''}>${escapeHtml(t.teacher_name)}</option>`;
  }).join('');

  // 6. Eligible Rooms
  const eligibleRooms = getEligibleRooms(isLab, meta.rooms, entry.room_name);
  const roomOptionsHtml = eligibleRooms.map((r) => {
    const isSel = r.room_name.toLowerCase() === String(entry.room_name || '').toLowerCase();
    return `<option value="${escapeHtml(r.room_name)}" data-type="${escapeHtml(r.room_type || 'Classroom')}" ${isSel ? 'selected' : ''}>${escapeHtml(r.room_name)} (${escapeHtml(r.room_type || 'Classroom')})</option>`;
  }).join('');

  const currentConflictText = entry.has_conflict && entry.conflict_details && entry.conflict_details.length > 0
    ? entry.conflict_details[0]
    : '';

  row.innerHTML = `
    <td>
      <div class="inline-cell-wrapper inline-cell-day">
        <select class="inline-select inline-select-day" id="inlineDay_${entryId}" title="Select Working Day">
          ${dayOptionsHtml}
        </select>
        <span class="period-num-badge" id="inlinePeriodBadge_${entryId}" style="align-self: flex-start; margin-top: 2px;">P${entry.period_number || 1}</span>
      </div>
    </td>
    <td>
      <span class="dept-badge">${escapeHtml(entry.department || 'General')}</span>
      <input type="hidden" id="inlineDept_${entryId}" value="${escapeHtml(entry.department || '')}">
    </td>
    <td>
      <div class="inline-cell-wrapper inline-cell-time">
        <select class="inline-select inline-select-time" id="inlineTime_${entryId}" title="Select Time Slot / Period">
          ${timeOptionsHtml}
        </select>
        <div id="inlineTimeConflict_${entryId}" class="inline-conflict-warn" style="display:none;"></div>
      </div>
    </td>
    <td>
      <div class="inline-cell-wrapper inline-cell-section">
        <select class="inline-select inline-select-section" id="inlineSection_${entryId}" title="Select Section">
          ${sectionOptionsHtml}
        </select>
        <div id="inlineSectionConflict_${entryId}" class="inline-conflict-warn" style="display:none;"></div>
      </div>
    </td>
    <td>
      <div class="inline-cell-wrapper inline-cell-subject">
        <select class="inline-select inline-select-subject" id="inlineSubject_${entryId}" title="Select Subject">
          ${subjectOptionsHtml}
        </select>
        ${currentConflictText ? `<div id="inlineExistingConflict_${entryId}" class="inline-conflict-hint">⚠️ ${escapeHtml(currentConflictText)}</div>` : ''}
      </div>
    </td>
    <td>
      <span class="session-badge ${isLab ? 'session-badge-lab' : 'session-badge-theory'}">
        ${isLab ? '🔬 LAB' : 'THEORY'}
      </span>
      <input type="hidden" id="inlineType_${entryId}" value="${isLab ? 'LAB' : 'THEORY'}">
      <input type="hidden" id="inlineDuration_${entryId}" value="${entry.duration || 1}">
    </td>
    <td>
      <div class="inline-cell-wrapper inline-cell-teacher">
        <select class="inline-select inline-select-teacher" id="inlineTeacher_${entryId}" title="Select Teacher">
          ${teacherOptionsHtml}
        </select>
        <div id="inlineTeacherConflict_${entryId}" class="inline-conflict-warn" style="display:none;"></div>
      </div>
    </td>
    <td>
      <div class="inline-cell-wrapper inline-cell-room">
        <select class="inline-select inline-select-room" id="inlineRoom_${entryId}" title="Select Room">
          ${roomOptionsHtml}
        </select>
        <div id="inlineRoomConflict_${entryId}" class="inline-conflict-warn" style="display:none;"></div>
      </div>
    </td>
    <td>
      <span class="status-badge status-available" id="inlineRoomType_${entryId}">
        ${escapeHtml(entry.room_type || (isLab ? 'Laboratory' : 'Classroom'))}
      </span>
    </td>
    <td class="timetable-actions-cell" style="text-align: right;">
      <div class="inline-actions-wrapper">
        <button type="button" class="btn-inline-save" id="btnSaveInline_${entryId}" onclick="saveInlineRowEdit('${entryId}', event)" title="Save changes">💾 Save</button>
        <button type="button" class="btn-inline-cancel" id="btnCancelInline_${entryId}" onclick="cancelInlineRowEdit('${entryId}', event)" title="Cancel changes">✕ Cancel</button>
      </div>
    </td>
  `;

  // Attach dynamic event handlers
  const daySelect = document.getElementById(`inlineDay_${entryId}`);
  const timeSelect = document.getElementById(`inlineTime_${entryId}`);
  const subjectSelect = document.getElementById(`inlineSubject_${entryId}`);
  const teacherSelect = document.getElementById(`inlineTeacher_${entryId}`);
  const roomSelect = document.getElementById(`inlineRoom_${entryId}`);
  const sectionSelect = document.getElementById(`inlineSection_${entryId}`);
  const roomTypeEl = document.getElementById(`inlineRoomType_${entryId}`);
  const periodBadge = document.getElementById(`inlinePeriodBadge_${entryId}`);

  function updateTimesForDay(targetDay) {
    const daySlots = getPeriodsForDay(targetDay, meta, activeTimetableEntries);
    const currStart = timeSelect.options[timeSelect.selectedIndex]?.dataset.start || startShort;
    let html = daySlots.map((ts) => {
      const isSel = ts.start_time === currStart;
      const pLabel = ts.period ? `P${ts.period}: ` : '';
      return `<option value="${ts.start_time}-${ts.end_time}" data-start="${ts.start_time}" data-end="${ts.end_time}" data-period="${ts.period || ''}" ${isSel ? 'selected' : ''}>${pLabel}${formatTimeSlot(ts.start_time, ts.end_time)}</option>`;
    }).join('');
    timeSelect.innerHTML = html;
    updatePeriodBadge();
  }

  function updatePeriodBadge() {
    const selOpt = timeSelect.options[timeSelect.selectedIndex];
    if (selOpt && selOpt.dataset.period && periodBadge) {
      periodBadge.textContent = `P${selOpt.dataset.period}`;
    }
  }

  function updateTeachersForSubject(selectedSub) {
    const eligible = getEligibleTeachersForSubject(selectedSub, meta.teachers, teacherSelect.value || entry.teacher_name);
    teacherSelect.innerHTML = eligible.map((t) => {
      const isSel = t.teacher_name.toLowerCase() === (teacherSelect.value || entry.teacher_name || '').toLowerCase();
      return `<option value="${escapeHtml(t.teacher_name)}" ${isSel ? 'selected' : ''}>${escapeHtml(t.teacher_name)}</option>`;
    }).join('');
    if (eligible.length === 0) {
      teacherSelect.innerHTML = `<option value="">-- No eligible faculty --</option>`;
    }
  }

  if (daySelect) {
    daySelect.onchange = () => {
      updateTimesForDay(daySelect.value);
      runLiveInlineConflictCheck(entryId);
    };
  }

  if (timeSelect) {
    timeSelect.onchange = () => {
      updatePeriodBadge();
      runLiveInlineConflictCheck(entryId);
    };
  }

  if (subjectSelect) {
    subjectSelect.onchange = () => {
      updateTeachersForSubject(subjectSelect.value);
      runLiveInlineConflictCheck(entryId);
    };
  }

  if (teacherSelect) {
    teacherSelect.onchange = () => {
      runLiveInlineConflictCheck(entryId);
    };
  }

  if (sectionSelect) {
    sectionSelect.onchange = () => {
      runLiveInlineConflictCheck(entryId);
    };
  }

  if (roomSelect) {
    roomSelect.onchange = () => {
      const selOpt = roomSelect.options[roomSelect.selectedIndex];
      if (selOpt && roomTypeEl) {
        roomTypeEl.textContent = selOpt.dataset.type || 'Classroom';
      }
      runLiveInlineConflictCheck(entryId);
    };
  }

  runLiveInlineConflictCheck(entryId);
}

function cancelInlineRowEdit(entryId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const row = document.querySelector(`tr[data-entry-id="${entryId}"]`);
  if (!row) return;

  if (row.dataset.originalInnerHtml) {
    row.innerHTML = row.dataset.originalInnerHtml;
    delete row.dataset.originalInnerHtml;
  }

  row.classList.remove('is-inline-editing', 'timetable-row--inline-editing');
  currentlyInlineEditingId = null;

  const editBtn = row.querySelector('.btn-edit-entry');
  if (editBtn) {
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      startInlineRowEdit(entryId, e);
    });
  }
  const deleteBtn = row.querySelector('.btn-delete-entry');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      await handleDeleteTimetableEntry(entryId);
    });
  }

  showToast('Row edit cancelled.');
}

async function saveInlineRowEdit(entryId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const row = document.querySelector(`tr[data-entry-id="${entryId}"]`);
  if (!row) return;

  const daySelect = document.getElementById(`inlineDay_${entryId}`);
  const timeSelect = document.getElementById(`inlineTime_${entryId}`);
  const subjectSelect = document.getElementById(`inlineSubject_${entryId}`);
  const teacherSelect = document.getElementById(`inlineTeacher_${entryId}`);
  const roomSelect = document.getElementById(`inlineRoom_${entryId}`);
  const sectionSelect = document.getElementById(`inlineSection_${entryId}`);
  const deptInput = document.getElementById(`inlineDept_${entryId}`);
  const typeInput = document.getElementById(`inlineType_${entryId}`);
  const durationInput = document.getElementById(`inlineDuration_${entryId}`);
  const saveBtn = document.getElementById(`btnSaveInline_${entryId}`);

  const day = daySelect ? daySelect.value : '';
  const slotOption = timeSelect ? timeSelect.options[timeSelect.selectedIndex] : null;
  const startTime = slotOption ? (slotOption.dataset.start + ':00') : '09:00:00';
  const endTime = slotOption ? (slotOption.dataset.end + ':00') : '10:00:00';
  const periodNumber = slotOption ? Number(slotOption.dataset.period || 1) : 1;
  const section = sectionSelect ? sectionSelect.value : '';
  const courseName = subjectSelect ? subjectSelect.value : '';
  const teacherName = teacherSelect ? teacherSelect.value : '';
  const roomOption = roomSelect ? roomSelect.options[roomSelect.selectedIndex] : null;
  const roomName = roomOption ? roomOption.value : '';
  const roomType = roomOption ? (roomOption.dataset.type || 'Classroom') : 'Classroom';
  const department = deptInput ? deptInput.value : '';
  const sessionType = typeInput ? typeInput.value : 'THEORY';
  const duration = durationInput ? Number(durationInput.value || 1) : 1;
  const isLab = sessionType === 'LAB';

  if (!teacherName) {
    showToast('Please choose an eligible teacher.');
    return;
  }
  if (!roomName) {
    showToast('Please select a valid room.');
    return;
  }
  if (isLab && roomType !== 'Laboratory') {
    showToast('Laboratory session requires a laboratory room.');
    return;
  }

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
  }

  try {
    const payload = {
      timetable_id: entryId,
      department,
      day,
      period_number: periodNumber,
      start_time: startTime,
      end_time: endTime,
      section,
      course_name: courseName,
      teacher_name: teacherName,
      room_name: roomName,
      room_type: roomType,
      session_type: sessionType,
      duration: duration,
      is_lab: isLab
    };

    const res = await apiRequest('PUT', `/timetable/entry/${encodeURIComponent(entryId)}`, payload);
    currentlyInlineEditingId = null;

    if (res.summary || res.conflicts) {
      latestGenerationResult = {
        summary: res.summary || {
          total_required: res.entries_count || (res.timetable ? res.timetable.length : 0),
          successfully_scheduled: (res.timetable ? res.timetable.length : 0) - (res.conflicts ? res.conflicts.length : 0),
          requiring_attention: res.conflicts ? res.conflicts.length : 0,
          detected_conflicts: res.conflicts ? res.conflicts.length : 0
        },
        conflicts: res.conflicts || [],
        unscheduled_classes: latestGenerationResult?.unscheduled_classes || [],
        status: res.status || (res.conflicts && res.conflicts.length === 0 ? 'VALID' : 'WARNING')
      };
    }

    if (res.status === 'VALID' || (res.conflicts && res.conflicts.length === 0)) {
      showMessage('✓ Timetable updated successfully. All conflicts resolved.', 'success');
      showToast('✓ Assignment saved! All conflicts resolved.');
    } else {
      showMessage('⚠️ Timetable updated with warnings. Please review the highlighted conflicts.', 'warning');
      showToast('Assignment saved with remaining conflicts.');
    }

    await loadTimetable();

    setTimeout(() => {
      const updatedRow = document.querySelector(`tr[data-entry-id="${entryId}"]`);
      if (updatedRow) {
        updatedRow.classList.add('row-highlight-pulse');
        setTimeout(() => updatedRow.classList.remove('row-highlight-pulse'), 2500);
      }
    }, 150);
  } catch (err) {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Save';
    }
    showToast(`Edit failed: ${err.message}`);
    const teacherWarn = document.getElementById(`inlineTeacherConflict_${entryId}`);
    if (teacherWarn) {
      teacherWarn.textContent = `⚠️ ${err.message}`;
      teacherWarn.style.display = 'block';
    }
  }
}

window.startInlineRowEdit = startInlineRowEdit;
window.cancelInlineRowEdit = cancelInlineRowEdit;
window.saveInlineRowEdit = saveInlineRowEdit;
window.runLiveInlineConflictCheck = runLiveInlineConflictCheck;

function toggleTimetableEditMode(forceState = null) {
  const nextState = forceState !== null ? Boolean(forceState) : !isTimetableEditMode;

  if (!nextState && isTimetableEditMode) {
    const modal = document.getElementById('editTimetableModal');
    if (modal && modal.style.display !== 'none' && isEditDirty) {
      if (!confirm('You have unsaved changes in the timetable editor. Do you want to discard them and exit edit mode?')) {
        return;
      }
      closeEditTimetableModal();
    }
  }

  isTimetableEditMode = nextState;

  const editBtn = document.getElementById('editTimetableBtn');
  const banner = document.getElementById('timetableEditModeBanner');
  const headerBadge = document.getElementById('editModeHeaderBadge');
  const container = document.getElementById('daywiseTimetableContainer');

  if (editBtn) {
    if (isTimetableEditMode) {
      editBtn.innerHTML = '✓ Done Editing';
      editBtn.classList.add('is-active', 'btn-success');
      editBtn.classList.remove('btn-secondary');
      editBtn.setAttribute('aria-pressed', 'true');
    } else {
      editBtn.innerHTML = '✎ Edit';
      editBtn.classList.remove('is-active', 'btn-success');
      editBtn.classList.add('btn-secondary');
      editBtn.setAttribute('aria-pressed', 'false');
    }
  }

  if (banner) {
    banner.style.display = isTimetableEditMode ? 'block' : 'none';
  }

  if (headerBadge) {
    headerBadge.style.display = isTimetableEditMode ? 'inline-flex' : 'none';
  }

  if (container) {
    container.classList.toggle('is-edit-mode', isTimetableEditMode);
  }

  if (isTimetableEditMode) {
    showToast('✏️ Edit mode activated. Click any timetable cell or row to edit.');
    if (banner) {
      banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  } else {
    showToast('Exited edit mode.');
  }
}
window.toggleTimetableEditMode = toggleTimetableEditMode;

function openFirstEditableEntry() {
  const firstRow = document.querySelector('.timetable-entry-row:not(.timetable-row--break):not(.timetable-row--free)');
  if (firstRow && firstRow.dataset.entryId) {
    firstRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    startInlineRowEdit(firstRow.dataset.entryId);
  } else if (activeTimetableEntries && activeTimetableEntries.length > 0) {
    startInlineRowEdit(activeTimetableEntries[0].timetable_id || activeTimetableEntries[0].id);
  } else {
    showToast('No class entry available to edit.');
  }
}
window.openFirstEditableEntry = openFirstEditableEntry;

function setupTimetableActions() {
  const editTimetableBtn = document.getElementById('editTimetableBtn');
  if (editTimetableBtn && !editTimetableBtn.dataset.listenerAttached) {
    editTimetableBtn.dataset.listenerAttached = 'true';
    editTimetableBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleTimetableEditMode();
    });
  }

  const doneEditingBannerBtn = document.getElementById('doneEditingBannerBtn');
  if (doneEditingBannerBtn && !doneEditingBannerBtn.dataset.listenerAttached) {
    doneEditingBannerBtn.dataset.listenerAttached = 'true';
    doneEditingBannerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleTimetableEditMode(false);
    });
  }

  const openFirstEditBannerBtn = document.getElementById('openFirstEditBannerBtn');
  if (openFirstEditBannerBtn && !openFirstEditBannerBtn.dataset.listenerAttached) {
    openFirstEditBannerBtn.dataset.listenerAttached = 'true';
    openFirstEditBannerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openFirstEditableEntry();
    });
  }
}
window.setupTimetableActions = setupTimetableActions;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupTimetableActions);
} else {
  setupTimetableActions();
}

async function openEditTimetableModal(entryId, currentEntries, initialField = null) {
  activeTimetableEntries = currentEntries || [];
  const entry = activeTimetableEntries.find((e) => String(e.timetable_id || e.id) === String(entryId));
  if (!entry) {
    showToast('Entry not found for editing.');
    return;
  }

  const modal = document.getElementById('editTimetableModal');
  if (!modal) return;

  const idInput = document.getElementById('editEntryId');
  const daySelect = document.getElementById('editEntryDay');
  const timeSlotSelect = document.getElementById('editEntryTimeSlot');
  const sectionSelect = document.getElementById('editEntrySection');
  const subjectSelect = document.getElementById('editEntrySubject');
  const teacherSelect = document.getElementById('editEntryTeacher');
  const roomSelect = document.getElementById('editEntryRoom');
  const feedbackEl = document.getElementById('editEntryFeedback');

  setEditDirty(false);

  idInput.value = entryId;
  const deptInput = document.getElementById('editEntryDepartment');
  const deptDisplay = document.getElementById('editEntryDeptDisplay') || document.getElementById('editEntryDepartmentDisplay');
  if (deptInput) deptInput.value = entry.department || '';
  if (deptDisplay) deptDisplay.value = entry.department || 'General';

  const isLab = entry.session_type === 'LAB' || Boolean(entry.is_lab) || /lab/i.test(entry.course_name || entry.subject || '');
  const sessionTypeInput = document.getElementById('editEntrySessionType');
  const durationInput = document.getElementById('editEntryDuration');
  if (sessionTypeInput) sessionTypeInput.value = isLab ? 'LAB' : 'THEORY';
  if (durationInput) durationInput.value = entry.duration || 1;

  const modalTitle = document.getElementById('editTimetableModalTitle');
  if (modalTitle) {
    modalTitle.innerHTML = isLab 
      ? `Edit Lab Session <span class="session-badge session-badge-lab" style="margin-left: 8px;">🔬 LAB</span>`
      : `Edit Timetable Entry <span class="session-badge session-badge-theory" style="margin-left: 8px;">THEORY</span>`;
  }

  if (feedbackEl) {
    feedbackEl.style.display = 'none';
    feedbackEl.textContent = '';
  }

  // Fetch or populate active metadata
  try {
    const meta = await apiRequest('GET', '/timetable/metadata');
    activeSchedulingMetadata = meta;
  } catch (_) {
    if (!activeSchedulingMetadata) {
      activeSchedulingMetadata = {
        working_days: entry.working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        sections: [...new Set(activeTimetableEntries.map((e) => e.section || e.class_name).filter(Boolean))],
        subjects: [...new Set(activeTimetableEntries.map((e) => e.course_name || e.subject).filter(Boolean))],
        teachers: [...new Set(activeTimetableEntries.map((e) => e.teacher_name).filter(Boolean))].map((name) => {
          const match = activeTimetableEntries.find((e) => e.teacher_name === name);
          return { teacher_name: name, assigned_subjects: [String(match?.course_name || match?.subject || '').toLowerCase()] };
        }),
        rooms: [...new Set(activeTimetableEntries.map((e) => e.room_name).filter(Boolean))].map((rn) => {
          const match = activeTimetableEntries.find((e) => e.room_name === rn);
          return { room_name: rn, room_type: match?.room_type || 'Classroom' };
        }),
        time_slots: []
      };
    }
  }

  const meta = activeSchedulingMetadata;

  // 1. Working Days options (respect configured working days only)
  const workingDays = meta.working_days && meta.working_days.length > 0
    ? meta.working_days
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  daySelect.innerHTML = workingDays.map((d) => {
    const dName = typeof d === 'object' ? (d.day_name || d.name || String(d)) : String(d);
    return `
      <option value="${escapeHtml(dName)}" ${dName.toLowerCase() === (entry.day || '').toLowerCase() ? 'selected' : ''}>
        ${escapeHtml(dName)}
      </option>
    `;
  }).join('');

  // 2. Dynamic Time Slots options per destination day (respect destination day's period schedule)
  function populateTimeSlotsForDay(targetDay, preferredStartTime) {
    let slots = [];
    if (meta.day_periods && Array.isArray(meta.day_periods[targetDay]) && meta.day_periods[targetDay].length > 0) {
      slots = meta.day_periods[targetDay].map((p, idx) => ({
        period: p.period || (idx + 1),
        start_time: String(p.start_time || p.start || '').substring(0, 5),
        end_time: String(p.end_time || p.end || '').substring(0, 5)
      })).filter((s) => s.start_time && s.end_time);
    } else if (meta.time_slots && meta.time_slots.length > 0) {
      slots = meta.time_slots.map((ts, idx) => ({
        period: idx + 1,
        start_time: String(ts.start_time || '').substring(0, 5),
        end_time: String(ts.end_time || '').substring(0, 5)
      })).filter((s) => s.start_time && s.end_time);
    } else {
      const distinctTimes = new Map();
      for (const e of activeTimetableEntries) {
        if (!e.day || e.day.toLowerCase() === targetDay.toLowerCase()) {
          const s = String(e.start_time).substring(0, 5);
          const end = String(e.end_time).substring(0, 5);
          if (!distinctTimes.has(s)) distinctTimes.set(s, { period: e.period_number || 1, start_time: s, end_time: end });
        }
      }
      slots = Array.from(distinctTimes.values()).sort((a, b) => a.start_time.localeCompare(b.start_time));
      if (slots.length === 0) {
        // Fallback to all entries distinct times
        const distinctTimesAll = new Map();
        for (const e of activeTimetableEntries) {
          const s = String(e.start_time).substring(0, 5);
          const end = String(e.end_time).substring(0, 5);
          if (!distinctTimesAll.has(s)) distinctTimesAll.set(s, { period: e.period_number || 1, start_time: s, end_time: end });
        }
        slots = Array.from(distinctTimesAll.values()).sort((a, b) => a.start_time.localeCompare(b.start_time));
      }
    }

    const prefStartShort = preferredStartTime ? String(preferredStartTime).substring(0, 5) : '';
    let hasMatch = false;

    timeSlotSelect.innerHTML = slots.map((ts) => {
      const sShort = ts.start_time;
      const eShort = ts.end_time;
      const isSelected = sShort === prefStartShort;
      if (isSelected) hasMatch = true;
      const pLabel = ts.period ? `Period ${ts.period}: ` : '';
      return `
        <option value="${sShort}-${eShort}" data-start="${sShort}" data-end="${eShort}" data-period="${ts.period || ''}" ${isSelected ? 'selected' : ''}>
          ${pLabel}${formatTimeSlot(sShort, eShort)}
        </option>
      `;
    }).join('');

    if (!hasMatch && slots.length > 0) {
      timeSlotSelect.selectedIndex = 0;
    }
  }

  // Populate time slots for current entry day
  populateTimeSlotsForDay(entry.day, entry.start_time);

  // 3. Sections options
  const rawSections = meta.sections && meta.sections.length > 0
    ? meta.sections.map((s) => typeof s === 'object' ? (s.section_name || s.name || s.class_name || '') : String(s)).filter(Boolean)
    : [entry.section || 'General'];
  const sections = [...new Set(rawSections)];
  sectionSelect.innerHTML = sections.map((s) => `
    <option value="${escapeHtml(s)}" ${s.toLowerCase() === (entry.section || entry.class_name || '').toLowerCase() ? 'selected' : ''}>
      ${escapeHtml(s)}
    </option>
  `).join('');

  // 4. Subjects options
  const rawSubjects = meta.subjects && meta.subjects.length > 0
    ? meta.subjects.map((sub) => typeof sub === 'object' ? (sub.course_name || sub.subject_name || sub.name || '') : String(sub)).filter(Boolean)
    : [entry.course_name || 'Course'];
  const subjects = [...new Set(rawSubjects)];
  subjectSelect.innerHTML = subjects.map((sub) => `
    <option value="${escapeHtml(sub)}" ${sub.toLowerCase() === (entry.course_name || entry.subject || '').toLowerCase() ? 'selected' : ''}>
      ${escapeHtml(sub)}
    </option>
  `).join('');

  // 5. Dynamic Teacher options filtered by Subject (Requirements 13-15)
  function updateModalTeacherDropdown(selectedSubjectName) {
    const subLower = (selectedSubjectName || '').trim().toLowerCase();
    const allTeachers = meta.teachers || [];
    const qualifiedTeachers = allTeachers.filter((t) => {
      const assignedList = (t.assigned_subjects || t.subjects || []).map((x) => String(x).toLowerCase());
      if (t.assigned_subject) {
        assignedList.push(String(t.assigned_subject).toLowerCase());
      }
      return assignedList.length === 0 || assignedList.includes(subLower);
    });

    if (qualifiedTeachers.length === 0) {
      teacherSelect.innerHTML = `<option value="">-- No faculty assigned to ${escapeHtml(selectedSubjectName)} --</option>`;
      teacherSelect.disabled = true;
      if (feedbackEl) {
        feedbackEl.textContent = `Warning: No registered teacher is assigned to teach '${selectedSubjectName}'.`;
        feedbackEl.className = 'edit-feedback-alert warning';
        feedbackEl.style.display = 'block';
      }
    } else {
      teacherSelect.disabled = false;
      const currentTeacherName = (entry.teacher_name || '').toLowerCase();
      teacherSelect.innerHTML = qualifiedTeachers.map((t) => {
        const isSelected = t.teacher_name.toLowerCase() === currentTeacherName;
        return `
          <option value="${escapeHtml(t.teacher_name)}" ${isSelected ? 'selected' : ''}>
            ${escapeHtml(t.teacher_name)}
          </option>
        `;
      }).join('');

      if (!qualifiedTeachers.some((t) => t.teacher_name.toLowerCase() === currentTeacherName)) {
        teacherSelect.selectedIndex = 0;
      }
    }
  }

  updateModalTeacherDropdown(entry.course_name || entry.subject);

  subjectSelect.onchange = () => {
    updateModalTeacherDropdown(subjectSelect.value);
    runLiveEditValidation();
    setEditDirty(true);
  };

  // 6. Rooms options (enforce Laboratory room for labs - Requirement 35)
  const allRooms = (meta.rooms && meta.rooms.length > 0 ? meta.rooms : [
    { room_name: entry.room_name || '101', room_type: entry.room_type || (isLab ? 'Laboratory' : 'Classroom') }
  ]).map((r) => {
    if (typeof r === 'object') {
      return {
        room_name: r.room_name || r.name || r.room_number || '101',
        room_type: r.room_type || (isLab ? 'Laboratory' : 'Classroom')
      };
    }
    return { room_name: String(r), room_type: isLab ? 'Laboratory' : 'Classroom' };
  });

  if (entry.room_name && !allRooms.some((r) => r.room_name.toLowerCase() === entry.room_name.toLowerCase())) {
    allRooms.unshift({
      room_name: entry.room_name,
      room_type: entry.room_type || (isLab ? 'Laboratory' : 'Classroom')
    });
  }
  
  const eligibleRooms = isLab
    ? allRooms.filter((r) => String(r.room_type || '').toLowerCase() === 'laboratory')
    : allRooms;

  if (isLab && eligibleRooms.length === 0) {
    roomSelect.innerHTML = `<option value="">No laboratory rooms are configured</option>`;
    roomSelect.disabled = true;
    if (feedbackEl) {
      feedbackEl.textContent = 'This session requires a laboratory room, but no laboratory rooms are configured.';
      feedbackEl.className = 'edit-feedback-alert error';
      feedbackEl.style.display = 'block';
    }
  } else {
    roomSelect.disabled = false;
    roomSelect.innerHTML = eligibleRooms.map((r) => `
      <option value="${escapeHtml(r.room_name)}" data-type="${escapeHtml(r.room_type || 'Classroom')}" ${r.room_name.toLowerCase() === (entry.room_name || '').toLowerCase() ? 'selected' : ''}>
        ${escapeHtml(r.room_name)} (${escapeHtml(r.room_type || 'Classroom')})
      </option>
    `).join('');
  }

  // Live client-side conflict checking preview (Requirements 3, 4, 35)
  function runLiveEditValidation() {
    if (!feedbackEl) return;
    feedbackEl.style.display = 'none';
    feedbackEl.textContent = '';

    const selectedDay = daySelect.value;
    const selectedSlotOption = timeSlotSelect.options[timeSlotSelect.selectedIndex];
    const sStart = selectedSlotOption ? selectedSlotOption.dataset.start : '';
    const selectedSection = sectionSelect.value;
    const selectedTeacher = teacherSelect.value;
    const selectedRoom = roomSelect.value;
    const selectedRoomOption = roomSelect.options[roomSelect.selectedIndex];
    const roomType = selectedRoomOption ? selectedRoomOption.dataset.type : '';

    if (isLab && (!selectedRoomOption || roomType !== 'Laboratory')) {
      feedbackEl.textContent = 'This session requires a laboratory room.';
      feedbackEl.className = 'edit-feedback-alert error';
      feedbackEl.style.display = 'block';
      return;
    }

    if (!selectedTeacher) {
      feedbackEl.textContent = 'Please choose a valid teacher.';
      feedbackEl.className = 'edit-feedback-alert error';
      feedbackEl.style.display = 'block';
      return;
    }

    const sStartMin = timeToMinutes(sStart);
    const selectedSlotEnd = selectedSlotOption ? selectedSlotOption.dataset.end : '';
    const sEndMin = timeToMinutes(selectedSlotEnd);

    for (const other of activeTimetableEntries) {
      if (String(other.timetable_id || other.id) === String(entryId)) continue;
      if (other.day.toLowerCase() === selectedDay.toLowerCase()) {
        const oStartMin = timeToMinutes(other.start_time);
        const oEndMin = timeToMinutes(other.end_time);
        // Interval overlap condition: startA < endB AND startB < endA
        if (sStartMin < oEndMin && oStartMin < sEndMin) {
          if (other.teacher_name.toLowerCase() === selectedTeacher.toLowerCase()) {
            feedbackEl.textContent = `Warning: Teacher ${selectedTeacher} is already scheduled on ${selectedDay} at ${formatTime12(oStartMin)} (${other.section || other.class_name}).`;
            feedbackEl.className = 'edit-feedback-alert error';
            feedbackEl.style.display = 'block';
            return;
          }
          if ((other.section || other.class_name).toLowerCase() === selectedSection.toLowerCase()) {
            feedbackEl.textContent = `Warning: Section ${selectedSection} already has a class scheduled on ${selectedDay} at ${formatTime12(oStartMin)} (${other.course_name || other.subject}).`;
            feedbackEl.className = 'edit-feedback-alert error';
            feedbackEl.style.display = 'block';
            return;
          }
          if (other.room_name.toLowerCase() === selectedRoom.toLowerCase()) {
            feedbackEl.textContent = `Warning: Room ${selectedRoom} is already occupied on ${selectedDay} at ${formatTime12(oStartMin)} by section ${other.section || other.class_name}.`;
            feedbackEl.className = 'edit-feedback-alert error';
            feedbackEl.style.display = 'block';
            return;
          }
        }
      }
    }
  }

  daySelect.onchange = () => {
    const currentStart = timeSlotSelect.options[timeSlotSelect.selectedIndex]?.dataset.start;
    populateTimeSlotsForDay(daySelect.value, currentStart);
    runLiveEditValidation();
    setEditDirty(true);
  };

  timeSlotSelect.onchange = () => {
    runLiveEditValidation();
    setEditDirty(true);
  };

  sectionSelect.onchange = () => {
    runLiveEditValidation();
    setEditDirty(true);
  };

  teacherSelect.onchange = () => {
    runLiveEditValidation();
    setEditDirty(true);
  };

  roomSelect.onchange = () => {
    runLiveEditValidation();
    setEditDirty(true);
  };

  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');

  setTimeout(() => {
    const f = (initialField || '').toLowerCase();
    if (f === 'time' || f === 'timeslot' || f === 'period') {
      timeSlotSelect.focus();
    } else if (f === 'day') {
      daySelect.focus();
    } else if (f === 'teacher' || f === 'faculty') {
      teacherSelect.focus();
    } else if (f === 'subject' || f === 'course') {
      subjectSelect.focus();
    } else if (f === 'room') {
      roomSelect.focus();
    } else if (f === 'section' || f === 'class') {
      sectionSelect.focus();
    } else {
      daySelect.focus();
    }
  }, 50);
}
window.openEditTimetableModal = openEditTimetableModal;

function closeEditTimetableModal(event) {
  if (event && event.target && event.target.closest('.edit-modal-box')) return;
  if (isEditDirty) {
    if (!confirm('You have unsaved changes in the timetable editor. Do you want to discard them?')) {
      return;
    }
  }
  setEditDirty(false);
  const modal = document.getElementById('editTimetableModal');
  if (modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }
}
window.closeEditTimetableModal = closeEditTimetableModal;

async function handleSaveEditEntry(event) {
  event.preventDefault();
  const entryId = document.getElementById('editEntryId').value;
  const day = document.getElementById('editEntryDay').value;
  const slotOption = document.getElementById('editEntryTimeSlot').options[document.getElementById('editEntryTimeSlot').selectedIndex];
  const startTime = slotOption ? (slotOption.dataset.start + ':00') : '09:00:00';
  const endTime = slotOption ? (slotOption.dataset.end + ':00') : '10:00:00';
  const section = document.getElementById('editEntrySection').value;
  const courseName = document.getElementById('editEntrySubject').value;
  const teacherName = document.getElementById('editEntryTeacher').value;
  const roomOption = document.getElementById('editEntryRoom').options[document.getElementById('editEntryRoom').selectedIndex];
  const roomName = roomOption ? roomOption.value : '';
  const roomType = roomOption ? roomOption.dataset.type : 'Classroom';
  const feedbackEl = document.getElementById('editEntryFeedback');
  const submitBtn = document.getElementById('saveEditEntryBtn');

  if (!teacherName) {
    if (feedbackEl) {
      feedbackEl.textContent = 'Please choose a valid teacher for this subject.';
      feedbackEl.className = 'edit-feedback-alert error';
      feedbackEl.style.display = 'block';
    }
    return;
  }

  const sessionType = document.getElementById('editEntrySessionType')?.value || 'THEORY';
  const duration = Number(document.getElementById('editEntryDuration')?.value || 1);
  const isLab = sessionType === 'LAB';

  if (isLab && roomType !== 'Laboratory') {
    if (feedbackEl) {
      feedbackEl.textContent = 'This session requires a laboratory room.';
      feedbackEl.className = 'edit-feedback-alert error';
      feedbackEl.style.display = 'block';
    }
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    const department = document.getElementById('editEntryDepartment')?.value || '';
    const payload = {
      timetable_id: entryId,
      department,
      day,
      start_time: startTime,
      end_time: endTime,
      section,
      course_name: courseName,
      teacher_name: teacherName,
      room_name: roomName,
      room_type: roomType,
      session_type: sessionType,
      duration: duration,
      is_lab: isLab
    };

    const res = await apiRequest('PUT', `/timetable/entry/${encodeURIComponent(entryId)}`, payload);
    setEditDirty(false);
    const modal = document.getElementById('editTimetableModal');
    if (modal) {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    }

    if (res.summary || res.conflicts) {
      latestGenerationResult = {
        summary: res.summary || {
          total_required: res.entries_count || (res.timetable ? res.timetable.length : 0),
          successfully_scheduled: (res.timetable ? res.timetable.length : 0) - (res.conflicts ? res.conflicts.length : 0),
          requiring_attention: res.conflicts ? res.conflicts.length : 0,
          detected_conflicts: res.conflicts ? res.conflicts.length : 0
        },
        conflicts: res.conflicts || [],
        unscheduled_classes: latestGenerationResult?.unscheduled_classes || [],
        status: res.status || (res.conflicts && res.conflicts.length === 0 ? 'VALID' : 'WARNING')
      };
    }
    if (res.status === 'VALID' || (res.conflicts && res.conflicts.length === 0)) {
      showMessage('✓ Timetable updated successfully. All conflicts resolved.', 'success');
      showToast('✓ Timetable updated. All conflicts resolved!');
    } else {
      showMessage('⚠️ Timetable updated with warnings. Please review the highlighted conflicts.', 'warning');
      showToast('Timetable updated with remaining conflicts.');
    }
    await loadTimetable();
  } catch (err) {
    if (feedbackEl) {
      feedbackEl.textContent = err.message || 'Unable to update entry due to conflict.';
      feedbackEl.className = 'edit-feedback-alert error';
      feedbackEl.style.display = 'block';
    }
    showToast(`Edit failed: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Changes';
  }
}

async function handleDeleteTimetableEntry(entryId) {
  if (!confirm('Are you sure you want to delete this class period from the timetable?')) {
    return;
  }
  try {
    const res = await apiRequest('DELETE', `/timetable/entry/${encodeURIComponent(entryId)}`);
    showToast(res.message || 'Class period deleted successfully.');
    await loadTimetable();
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

window.openEditTimetableModal = openEditTimetableModal;
window.closeEditTimetableModal = closeEditTimetableModal;
window.handleSaveEditEntry = handleSaveEditEntry;
window.handleDeleteTimetableEntry = handleDeleteTimetableEntry;

// Saved Timetables Quick Card Renderer (Requirements 7, 33, 35)
async function renderSavedTimetablesList() {
  const container = document.getElementById('savedTimetablesList');
  const badge = document.getElementById('savedDeptCountBadge');
  if (!container) return;

  try {
    const res = await apiRequest('GET', '/departments/saved-timetables');
    if (res && res.success && Array.isArray(res.departments)) {
      if (badge) {
        badge.textContent = `${res.departments.length} Department${res.departments.length === 1 ? '' : 's'}`;
      }
      if (res.departments.length === 0) {
        container.innerHTML = '<span class="no-chips-hint" style="padding: 10px;">No saved department timetables yet. Generate a timetable to save it here.</span>';
        return;
      }
      container.innerHTML = res.departments.map((dept) => `
        <div class="saved-dept-item" data-dept="${escapeHtml(dept.name)}">
          <div class="saved-dept-info">
            <span class="saved-dept-name">🏛️ ${escapeHtml(dept.name)}</span>
            <span class="saved-dept-meta">${dept.entries_count} classes • ${dept.days_count} days ${dept.has_labs ? '• 🔬 Labs' : ''}</span>
          </div>
          <div class="saved-dept-actions">
            <button type="button" class="btn-open-tt" data-open-dept="${escapeHtml(dept.name)}" title="Open ${escapeHtml(dept.name)} timetable">Open</button>
            <button type="button" class="btn-edit-tt" data-edit-dept="${escapeHtml(dept.name)}" title="Edit / Load ${escapeHtml(dept.name)}">Edit</button>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('[data-open-dept]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const deptName = btn.dataset.openDept;
          const deptFilterSelect = document.getElementById('timetableDeptFilter');
          if (deptFilterSelect) {
            deptFilterSelect.value = deptName;
            if (deptFilterSelect.onchange) deptFilterSelect.onchange();
          }
          const departmentNameInput = document.getElementById('departmentNameInput');
          const departmentSelect = document.getElementById('departmentSelect');
          if (departmentNameInput) departmentNameInput.value = deptName;
          if (departmentSelect) departmentSelect.value = deptName;
          showToast(`Filtered to ${deptName} timetable.`);
          document.getElementById('timetableSection')?.scrollIntoView({ behavior: 'smooth' });
        });
      });

      container.querySelectorAll('[data-edit-dept]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const deptName = btn.dataset.editDept;
          const departmentNameInput = document.getElementById('departmentNameInput');
          const departmentSelect = document.getElementById('departmentSelect');
          if (departmentNameInput) departmentNameInput.value = deptName;
          if (departmentSelect) departmentSelect.value = deptName;
          showToast(`Ready to edit configuration for ${deptName}.`);
          document.getElementById('stepDepartmentCard')?.scrollIntoView({ behavior: 'smooth' });
        });
      });
    }
  } catch (_) {}
}

// ==============================================================================
// TEACHER WORKLOAD RENDERING (Requirements Part 14-24)
// ==============================================================================
let currentWorkloadData = null;
let currentWorkloadView = 'daily';

function renderTeacherWorkload(workloadData) {
  const section = document.getElementById('teacherWorkloadSection');
  const container = document.getElementById('teacherWorkloadContainer');
  if (!section || !container) return;

  if (!workloadData || (!workloadData.by_day && !workloadData.weekly_summary)) {
    section.style.display = 'none';
    return;
  }

  currentWorkloadData = workloadData;
  section.style.display = 'block';

  const workingDays = workloadData.working_days || Object.keys(workloadData.by_day || {});
  const byDay = workloadData.by_day || {};
  const weeklySummary = workloadData.weekly_summary || [];

  const dailyBtn = document.getElementById('workloadDailyViewBtn');
  const weeklyBtn = document.getElementById('workloadWeeklyViewBtn');
  if (dailyBtn && weeklyBtn) {
    if (currentWorkloadView === 'weekly') {
      weeklyBtn.classList.add('active');
      dailyBtn.classList.remove('active');
    } else {
      dailyBtn.classList.add('active');
      weeklyBtn.classList.remove('active');
    }

    if (!dailyBtn._bound) {
      dailyBtn._bound = true;
      dailyBtn.addEventListener('click', () => {
        currentWorkloadView = 'daily';
        if (currentWorkloadData) renderTeacherWorkload(currentWorkloadData);
      });
    }
    if (!weeklyBtn._bound) {
      weeklyBtn._bound = true;
      weeklyBtn.addEventListener('click', () => {
        currentWorkloadView = 'weekly';
        if (currentWorkloadData) renderTeacherWorkload(currentWorkloadData);
      });
    }
  }

  if (currentWorkloadView === 'weekly') {
    // Render Weekly Summary view (Part 19)
    container.innerHTML = `
      <div class="workload-weekly-card">
        <div class="workload-table-wrapper">
          <table class="workload-weekly-table">
            <thead>
              <tr>
                <th>Teacher</th>
                ${workingDays.map((d) => `<th>${escapeHtml(d.substring(0, 3).toUpperCase())}</th>`).join('')}
                <th>Weekly Classes</th>
                <th>Periods Used</th>
                <th>Teaching Time</th>
                <th>Avg / Day</th>
              </tr>
            </thead>
            <tbody>
              ${weeklySummary.length === 0 ? '<tr><td colspan="12" style="text-align: center; color: var(--text-muted); padding: 20px;">No teaching workload records available.</td></tr>' : ''}
              ${weeklySummary.map((t) => `
                <tr>
                  <td>
                    <div class="workload-teacher-name">
                      <span class="workload-teacher-avatar">${escapeHtml(t.teacher_name.charAt(0).toUpperCase())}</span>
                      <span>${escapeHtml(t.teacher_name)}</span>
                    </div>
                  </td>
                  ${workingDays.map((d) => {
                    const count = t.daily_breakdown ? (t.daily_breakdown[d] || 0) : 0;
                    return `<td><span class="weekly-day-count ${count === 0 ? 'weekly-day-count--zero' : ''}">${count}</span></td>`;
                  }).join('')}
                  <td><span class="weekly-total-badge">${t.weekly_classes}</span></td>
                  <td><strong>${t.weekly_periods}</strong></td>
                  <td><span class="workload-time-pill">${escapeHtml(t.total_teaching_time || '0h')}</span></td>
                  <td><strong>${t.average_per_day || '0.0'}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    // Render Daily Breakdown (Requirements Part 14, 15, 16, 17, 18, 20)
    container.innerHTML = `
      <div class="workload-days-grid">
        ${workingDays.map((day) => {
          const dayInfo = byDay[day] || { teachers: [], total_classes: 0, total_periods: 0 };
          const teachersList = dayInfo.teachers || [];

          return `
            <div class="workload-day-card">
              <div class="workload-day-header">
                <div class="workload-day-title">
                  <span>📅</span>
                  <span>${escapeHtml(day.toUpperCase())}</span>
                </div>
                <span class="workload-day-badge">${dayInfo.total_classes} Classes (${dayInfo.total_periods} Periods)</span>
              </div>
              <div class="workload-table-wrapper">
                <table class="workload-table">
                  <thead>
                    <tr>
                      <th>Teacher</th>
                      <th>Classes</th>
                      <th>Periods</th>
                      <th>Duration</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${teachersList.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 16px;">No teaching allocations for this day.</td></tr>' : ''}
                    ${teachersList.map((t) => `
                      <tr>
                        <td>
                          <div class="workload-teacher-name">
                            <span class="workload-teacher-avatar">${escapeHtml(t.teacher_name.charAt(0).toUpperCase())}</span>
                            <span>${escapeHtml(t.teacher_name)}</span>
                          </div>
                        </td>
                        <td>
                          <span class="workload-classes-count">${t.classes}</span>
                        </td>
                        <td>
                          <span class="workload-periods-pill">${t.periods} Period${t.periods === 1 ? '' : 's'}</span>
                        </td>
                        <td>
                          <span class="workload-time-pill">${escapeHtml(t.teaching_time || '0h')}</span>
                        </td>
                        <td>
                          ${t.is_free ? '<span class="workload-free-pill">Free</span>' : `<span class="status-badge status-available">${t.classes} Class${t.classes === 1 ? '' : 'es'}</span>`}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
}

// Latest generation result state for conflict and summary rendering
let latestGenerationResult = null;

// Load Persisted Day-by-Day Timetable from Supabase / Backend Store
async function loadTimetable() {
  const container = document.getElementById('daywiseTimetableContainer');
  const timetableSection = document.getElementById('timetableSection');
  const dayTabsContainer = document.getElementById('timetableDayTabs');
  const workloadSection = document.getElementById('teacherWorkloadSection');

  if (typeof setupTimetableActions === 'function') {
    setupTimetableActions();
  }

  if (!container || !timetableSection) return;

  try {
    const timetable = await apiRequest('GET', '/timetable');
    activeTimetableEntries = timetable || [];

    // Also refresh saved department list
    await renderSavedTimetablesList();

    if (!timetable || timetable.length === 0) {
      container.innerHTML = '<div class="empty-day-notice">No timetable generated yet. Fill the form above and click "Generate Timetable".</div>';
      if (dayTabsContainer) dayTabsContainer.innerHTML = '';
      renderCurrentClass([]);
      timetableSection.style.display = 'none';
      if (workloadSection) workloadSection.style.display = 'none';
      const summaryCard = document.getElementById('timetableSummaryCard');
      if (summaryCard) summaryCard.style.display = 'none';
      const conflictPanel = document.getElementById('timetableConflictPanel');
      if (conflictPanel) conflictPanel.style.display = 'none';
      const unscheduledCard = document.getElementById('unscheduledClassesCard');
      if (unscheduledCard) unscheduledCard.style.display = 'none';
      return;
    }

    renderCurrentClass(timetable);

    // Fetch active metadata to get configured day_periods, period_counts, breaks, and workload (Requirements Part 2-23)
    let metaDayPeriods = null;
    let metaPeriodCounts = null;
    let metaBreaks = null;
    let metaTeacherWorkload = null;
    try {
      const metaRes = await apiRequest('GET', '/timetable/active-metadata');
      if (metaRes && metaRes.activeVersion) {
        metaDayPeriods = metaRes.activeVersion.day_periods || null;
        metaPeriodCounts = metaRes.activeVersion.period_counts || null;
        metaBreaks = metaRes.activeVersion.breaks || null;
        metaTeacherWorkload = metaRes.activeVersion.teacher_workload || null;
        if (!latestGenerationResult || (metaRes.activeVersion.summary && !latestGenerationResult.summary)) {
          latestGenerationResult = {
            summary: metaRes.activeVersion.summary || null,
            status: metaRes.activeVersion.status || null,
            conflicts: metaRes.activeVersion.conflicts || [],
            unscheduled_classes: metaRes.activeVersion.unscheduled_classes || []
          };
        }
      }
    } catch (_) {}

    if (!latestGenerationResult && timetable && timetable.length > 0) {
      const conflictEntries = timetable.filter((e) => Boolean(e.has_conflict));
      latestGenerationResult = {
        summary: {
          total_required: timetable.length,
          successfully_scheduled: timetable.length - conflictEntries.length,
          requiring_attention: conflictEntries.length,
          detected_conflicts: conflictEntries.length
        },
        conflicts: [],
        unscheduled_classes: [],
        status: conflictEntries.length > 0 ? 'WARNING' : 'VALID'
      };
    }

    // Determine configured working days from response metadata or entries
    let configuredDays = null;
    if (timetable[0] && Array.isArray(timetable[0].working_days) && timetable[0].working_days.length > 0) {
      configuredDays = timetable[0].working_days;
    } else {
      const distinctDays = [...new Set(timetable.map((e) => e.day).filter(Boolean))];
      configuredDays = distinctDays.length > 0
        ? WORKING_DAYS_ORDER.filter((d) => distinctDays.includes(d))
        : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }

    // Populate and manage Department Filter dropdown (Requirements 42, 44)
    const deptFilterSelect = document.getElementById('timetableDeptFilter');
    const deptFilterWrap = document.getElementById('timetableDeptFilterWrap');
    const distinctDepts = [...new Set(timetable.map((e) => e.department).filter(Boolean))];

    if (deptFilterSelect) {
      if (distinctDepts.length > 0) {
        if (deptFilterWrap) deptFilterWrap.style.display = 'flex';
        const currentSelectedDept = deptFilterSelect.value || 'all';
        let deptOpts = '<option value="all">All Departments</option>';
        distinctDepts.forEach((d) => {
          const isSel = currentSelectedDept.toLowerCase() === d.toLowerCase();
          deptOpts += `<option value="${escapeHtml(d)}" ${isSel ? 'selected' : ''}>${escapeHtml(d)}</option>`;
        });
        deptFilterSelect.innerHTML = deptOpts;
      } else {
        if (deptFilterWrap) deptFilterWrap.style.display = 'none';
      }
    }

    // Group entries by Day
    const dayMap = new Map();
    for (const d of configuredDays) {
      dayMap.set(d, []);
    }

    // Populate dayMap
    for (const entry of timetable) {
      const day = entry.day || 'Monday';
      if (!dayMap.has(day)) {
        dayMap.set(day, []);
      }
      dayMap.get(day).push(entry);
    }

    // Sort entries within each day chronologically by start_time and period
    for (const [day, entries] of dayMap.entries()) {
      entries.sort((a, b) => {
        const pA = a.period_number || 0;
        const pB = b.period_number || 0;
        if (pA !== pB) return pA - pB;
        return String(a.start_time).localeCompare(String(b.start_time));
      });
    }

    // Render Day Filter Tabs (Requirement 45)
    if (dayTabsContainer) {
      const totalEntries = timetable.length;
      dayTabsContainer.innerHTML = `
        <button type="button" class="day-tab-btn active" data-tab="all">
          All Days <span class="tab-badge">${totalEntries}</span>
        </button>
        ${Array.from(dayMap.keys()).map((day) => {
          const count = (dayMap.get(day) || []).length;
          return `
            <button type="button" class="day-tab-btn" data-tab="${escapeHtml(day)}">
              ${escapeHtml(day)} <span class="tab-badge ${count === 0 ? 'zero' : ''}">${count}</span>
            </button>
          `;
        }).join('')}
      `;

      dayTabsContainer.querySelectorAll('.day-tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          dayTabsContainer.querySelectorAll('.day-tab-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          const targetDay = btn.dataset.tab;
          const allDayCards = container.querySelectorAll('.day-card');
          allDayCards.forEach((card) => {
            if (targetDay === 'all' || card.dataset.day === targetDay) {
              card.style.display = 'block';
            } else {
              card.style.display = 'none';
            }
          });
        });
      });
    }

    // Render ALL configured working days with Breaks, Day-Specific Period Counts & Free Periods (Requirements Part 4, 6, 24)
    const effectiveBreaks = metaBreaks || (typeof breaksState !== 'undefined' ? breaksState : []);

    container.innerHTML = Array.from(dayMap.keys()).map((day) => {
      const entries = dayMap.get(day) || [];
      const classCount = entries.length;

      // Determine day's configured periods
      const dayPeriodList = metaDayPeriods && Array.isArray(metaDayPeriods[day]) && metaDayPeriods[day].length > 0
        ? metaDayPeriods[day]
        : null;

      const configuredCount = dayPeriodList ? dayPeriodList.length : (metaPeriodCounts && metaPeriodCounts[day] ? metaPeriodCounts[day] : 0);

      // Breaks for this day
      const dayBreaks = effectiveBreaks.filter((b) => (b.day || '').toLowerCase() === day.toLowerCase());

      // Empty Configured Day Display
      if (classCount === 0 && !dayPeriodList && dayBreaks.length === 0) {
        return `
          <div class="day-card" data-day="${escapeHtml(day)}">
            <div class="day-card-header">
              <h3 class="day-title">
                <span>📅 ${escapeHtml(day.toUpperCase())}</span>
              </h3>
              <span class="day-count-badge day-count-badge--empty">0 Classes</span>
            </div>
            <div class="empty-day-notice">
              <strong>${escapeHtml(day)}</strong>: No classes scheduled.
            </div>
          </div>
        `;
      }

      // Build chronological timeline of periods and breaks (Requirements Part 4, 6, 24)
      const timelineItems = [];

      if (dayPeriodList && dayPeriodList.length > 0) {
        for (let pIdx = 0; pIdx < dayPeriodList.length; pIdx++) {
          const pConfig = dayPeriodList[pIdx];
          const pNum = pConfig.period || (pIdx + 1);
          const pStart = pConfig.start;
          const pEnd = pConfig.end;
          timelineItems.push({
            type: 'period',
            pConfig,
            pNum,
            pStart,
            pEnd,
            startMin: timeToMinutes(pStart),
            endMin: timeToMinutes(pEnd)
          });
        }
      } else {
        entries.forEach((e, idx) => {
          timelineItems.push({
            type: 'entry',
            entry: e,
            pNum: e.period_number || (idx + 1),
            pStart: e.start_time,
            pEnd: e.end_time,
            startMin: timeToMinutes(e.start_time),
            endMin: timeToMinutes(e.end_time)
          });
        });
      }

      dayBreaks.forEach((b) => {
        timelineItems.push({
          type: 'break',
          break: b,
          startMin: timeToMinutes(b.start_time || b.startTime),
          endMin: timeToMinutes(b.end_time || b.endTime)
        });
      });

      timelineItems.sort((a, b) => a.startMin - b.startMin);

      let tableRowsHtml = '';

      for (const item of timelineItems) {
        if (item.type === 'break') {
          const b = item.break;
          const isLunch = (b.name || '').toLowerCase().includes('lunch') || (b.type || '').toLowerCase().includes('lunch');
          tableRowsHtml += `
            <tr class="timetable-entry-row timetable-row--break" data-department="all">
              <td><span class="period-num-badge period-num-badge--break">${isLunch ? '🍽️ LUNCH' : '☕ BREAK'}</span></td>
              <td><span class="dept-badge" style="opacity: 0.6;">All</span></td>
              <td><strong class="break-time-text">${escapeHtml(formatTimeSlot(b.start_time || b.startTime, b.end_time || b.endTime))}</strong></td>
              <td><span class="status-badge" style="background: #fef3c7; color: #92400e; font-weight: 700;">${escapeHtml(b.type || 'Break')}</span></td>
              <td>
                <div class="break-badge-wrap">
                  <span class="break-banner-badge">${isLunch ? '🍽️' : '☕'} ${escapeHtml(b.name || 'Break')}</span>
                  <span class="break-type-subtext">(${escapeHtml(b.type || 'Break')})</span>
                </div>
              </td>
              <td><span class="session-badge" style="background: #fef3c7; color: #b45309; border: 1px solid rgba(245, 158, 11, 0.4); font-weight: 700;">PAUSE</span></td>
              <td><span style="color: #94a3b8;">—</span></td>
              <td><span style="color: #94a3b8;">—</span></td>
              <td><span style="color: #94a3b8;">—</span></td>
              <td style="text-align: right; color: #cbd5e1;">—</td>
            </tr>
          `;
        } else if (item.type === 'period') {
          const pConfig = item.pConfig;
          const pNum = item.pNum;
          const pStart = pConfig.start;
          const pEnd = pConfig.end;

          const matchingEntries = entries.filter((e) =>
            (e.period_number === pNum) ||
            (timeToMinutes(e.start_time) === timeToMinutes(pStart))
          );

          if (matchingEntries.length > 0) {
            matchingEntries.forEach((matchedEntry) => {
              const isConflict = Boolean(matchedEntry.has_conflict);
              const conflictDetails = matchedEntry.conflict_details || [];
              const conflictHtml = isConflict && conflictDetails.length > 0
                ? `<div class="entry-conflict-explanation">⚠️ ${escapeHtml(conflictDetails[0])}</div>`
                : '';
              const conflictBadge = isConflict
                ? `<span class="conflict-row-badge">⚠️ CONFLICT</span>`
                : '';

              tableRowsHtml += `
                <tr class="timetable-entry-row ${matchedEntry.session_type === 'LAB' || matchedEntry.is_lab ? 'timetable-row--lab' : ''} ${isConflict ? 'timetable-row--conflict' : ''}" data-entry-id="${escapeHtml(matchedEntry.timetable_id || matchedEntry.id)}" data-department="${escapeHtml(matchedEntry.department || '')}">
                  <td class="editable-cell" data-edit-field="period" title="Click to edit Period / Day"><span class="period-num-badge ${isConflict ? 'period-num-badge--conflict' : ''}">P${pNum}</span> ${conflictBadge}</td>
                  <td class="editable-cell" data-edit-field="department" title="Click to edit Department"><span class="dept-badge">${escapeHtml(matchedEntry.department || 'General')}</span></td>
                  <td class="editable-cell" data-edit-field="time" title="Click to edit Time Slot"><strong>${escapeHtml(formatTimeSlot(matchedEntry.start_time, matchedEntry.end_time))}</strong></td>
                  <td class="editable-cell" data-edit-field="section" title="Click to edit Section">
                    <span class="status-badge" style="background: rgba(45, 108, 223, 0.1); color: var(--primary-dark); font-weight: 700;">
                      ${escapeHtml(matchedEntry.section || matchedEntry.class_name || 'General')}
                    </span>
                  </td>
                  <td class="editable-cell" data-edit-field="subject" title="Click to edit Subject / Course">
                    <strong>${escapeHtml(matchedEntry.course_name || matchedEntry.subject || 'Course')}</strong>
                    ${(matchedEntry.session_type === 'LAB' || matchedEntry.is_lab) && matchedEntry.duration > 1 ? `<span class="lab-duration-indicator">(${matchedEntry.duration} slots)</span>` : ''}
                    ${conflictHtml}
                  </td>
                  <td class="editable-cell" data-edit-field="type" title="Session Type">
                    <span class="session-badge ${(matchedEntry.session_type === 'LAB' || matchedEntry.is_lab) ? 'session-badge-lab' : 'session-badge-theory'}">
                      ${(matchedEntry.session_type === 'LAB' || matchedEntry.is_lab) ? '🔬 LAB' : 'THEORY'}
                    </span>
                  </td>
                  <td class="editable-cell" data-edit-field="teacher" title="Click to edit Teacher">${escapeHtml(matchedEntry.teacher_name || 'Faculty')}</td>
                  <td class="editable-cell" data-edit-field="room" title="Click to edit Room">
                    <span class="status-badge" style="background: ${(matchedEntry.session_type === 'LAB' || matchedEntry.is_lab) ? '#eff6ff' : '#ecfdf5'}; color: ${(matchedEntry.session_type === 'LAB' || matchedEntry.is_lab) ? '#1d4ed8' : '#047857'}; font-weight: 700;">
                      ${(matchedEntry.session_type === 'LAB' || matchedEntry.is_lab) ? '🔬' : '🚪'} ${escapeHtml(matchedEntry.room_name || 'Room')}
                    </span>
                  </td>
                  <td class="editable-cell" data-edit-field="room_type" title="Room Type">
                    <span class="status-badge status-available">
                      ${escapeHtml(matchedEntry.room_type || ((matchedEntry.session_type === 'LAB' || matchedEntry.is_lab) ? 'Laboratory' : 'Classroom'))}
                    </span>
                  </td>
                  <td class="timetable-actions-cell" style="text-align: right;">
                    <div class="table-row-actions">
                      <button type="button" class="btn-entry-action btn-edit-entry" data-edit-entry="${escapeHtml(matchedEntry.timetable_id || matchedEntry.id)}" onclick="startInlineRowEdit('${escapeHtml(matchedEntry.timetable_id || matchedEntry.id)}', event)" title="Edit class period">✎ Edit</button>
                      <button type="button" class="btn-entry-action btn-delete-entry" data-delete-entry="${escapeHtml(matchedEntry.timetable_id || matchedEntry.id)}" title="Delete class period">🗑</button>
                    </div>
                  </td>
                </tr>
              `;
            });
          } else {
            tableRowsHtml += `
              <tr class="timetable-entry-row timetable-row--free" data-department="all">
                <td><span class="period-num-badge">P${pNum}</span></td>
                <td><span class="dept-badge" style="opacity: 0.6;">—</span></td>
                <td><span style="color: #64748b; font-weight: 600;">${escapeHtml(formatTimeSlot(pStart, pEnd))}</span></td>
                <td><span style="color: #94a3b8;">—</span></td>
                <td><span class="free-period-badge">Free</span></td>
                <td><span style="color: #94a3b8;">—</span></td>
                <td><span style="color: #94a3b8;">—</span></td>
                <td><span style="color: #94a3b8;">—</span></td>
                <td><span style="color: #94a3b8;">—</span></td>
                <td style="text-align: right; color: #cbd5e1;">—</td>
              </tr>
            `;
          }
        } else if (item.type === 'entry') {
          const entry = item.entry;
          const isConflict = Boolean(entry.has_conflict);
          const conflictDetails = entry.conflict_details || [];
          const conflictHtml = isConflict && conflictDetails.length > 0
            ? `<div class="entry-conflict-explanation">⚠️ ${escapeHtml(conflictDetails[0])}</div>`
            : '';
          const conflictBadge = isConflict
            ? `<span class="conflict-row-badge">⚠️ CONFLICT</span>`
            : '';

          tableRowsHtml += `
            <tr class="timetable-entry-row ${entry.session_type === 'LAB' || entry.is_lab ? 'timetable-row--lab' : ''} ${isConflict ? 'timetable-row--conflict' : ''}" data-entry-id="${escapeHtml(entry.timetable_id || entry.id)}" data-department="${escapeHtml(entry.department || '')}">
              <td class="editable-cell" data-edit-field="period" title="Click to edit Period / Day"><span class="period-num-badge ${isConflict ? 'period-num-badge--conflict' : ''}">P${item.pNum}</span> ${conflictBadge}</td>
              <td class="editable-cell" data-edit-field="department" title="Click to edit Department"><span class="dept-badge">${escapeHtml(entry.department || 'General')}</span></td>
              <td class="editable-cell" data-edit-field="time" title="Click to edit Time Slot"><strong>${escapeHtml(formatTimeSlot(entry.start_time, entry.end_time))}</strong></td>
              <td class="editable-cell" data-edit-field="section" title="Click to edit Section">
                <span class="status-badge" style="background: rgba(45, 108, 223, 0.1); color: var(--primary-dark); font-weight: 700;">
                  ${escapeHtml(entry.section || entry.class_name || 'General')}
                </span>
              </td>
              <td class="editable-cell" data-edit-field="subject" title="Click to edit Subject / Course">
                <strong>${escapeHtml(entry.course_name || entry.subject || 'Course')}</strong>
                ${(entry.session_type === 'LAB' || entry.is_lab) && entry.duration > 1 ? `<span class="lab-duration-indicator">(${entry.duration} slots)</span>` : ''}
                ${conflictHtml}
              </td>
              <td class="editable-cell" data-edit-field="type" title="Session Type">
                <span class="session-badge ${(entry.session_type === 'LAB' || entry.is_lab) ? 'session-badge-lab' : 'session-badge-theory'}">
                  ${(entry.session_type === 'LAB' || entry.is_lab) ? '🔬 LAB' : 'THEORY'}
                </span>
              </td>
              <td class="editable-cell" data-edit-field="teacher" title="Click to edit Teacher">${escapeHtml(entry.teacher_name || 'Faculty')}</td>
              <td class="editable-cell" data-edit-field="room" title="Click to edit Room">
                <span class="status-badge" style="background: ${(entry.session_type === 'LAB' || entry.is_lab) ? '#eff6ff' : '#ecfdf5'}; color: ${(entry.session_type === 'LAB' || entry.is_lab) ? '#1d4ed8' : '#047857'}; font-weight: 700;">
                  ${(entry.session_type === 'LAB' || entry.is_lab) ? '🔬' : '🚪'} ${escapeHtml(entry.room_name || 'Room')}
                </span>
              </td>
              <td class="editable-cell" data-edit-field="room_type" title="Room Type">
                <span class="status-badge status-available">
                  ${escapeHtml(entry.room_type || ((entry.session_type === 'LAB' || entry.is_lab) ? 'Laboratory' : 'Classroom'))}
                </span>
              </td>
              <td class="timetable-actions-cell" style="text-align: right;">
                <div class="table-row-actions">
                  <button type="button" class="btn-entry-action btn-edit-entry" data-edit-entry="${escapeHtml(entry.timetable_id || entry.id)}" onclick="startInlineRowEdit('${escapeHtml(entry.timetable_id || entry.id)}', event)" title="Edit class period">✎ Edit</button>
                  <button type="button" class="btn-entry-action btn-delete-entry" data-delete-entry="${escapeHtml(entry.timetable_id || entry.id)}" title="Delete class period">🗑</button>
                </div>
              </td>
            </tr>
          `;
        }
      }

      const totalDisplayCount = dayPeriodList ? dayPeriodList.length : classCount;

      return `
        <div class="day-card" data-day="${escapeHtml(day)}">
          <div class="day-card-header">
            <h3 class="day-title">
              <span>📅 ${escapeHtml(day.toUpperCase())}</span>
            </h3>
            <span class="day-count-badge">${classCount} / ${totalDisplayCount} Periods Scheduled</span>
          </div>
          <div class="day-table-container">
            <table class="timetable">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Department</th>
                  <th>Time Slot</th>
                  <th>Section / Class</th>
                  <th>Subject / Course</th>
                  <th>Type</th>
                  <th>Teacher</th>
                  <th>Room</th>
                  <th>Room Type</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');

    // Wire up Department Filter onchange event (Requirement 44)
    if (deptFilterSelect) {
      deptFilterSelect.onchange = () => {
        const filterDept = (deptFilterSelect.value || 'all').trim().toLowerCase();
        const allRows = container.querySelectorAll('.timetable-entry-row');
        allRows.forEach((row) => {
          const rowDept = (row.dataset.department || '').trim().toLowerCase();
          if (filterDept === 'all' || rowDept === 'all' || rowDept === filterDept) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      };
    }

    // Maintain edit mode state on container
    container.classList.toggle('is-edit-mode', Boolean(isTimetableEditMode));

    // Wire up row & cell click editing (Requirements 2, 3, 4)
    container.querySelectorAll('.timetable-entry-row:not(.timetable-row--break):not(.timetable-row--free)').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('[data-delete-entry]') || e.target.closest('.inline-select') || e.target.closest('.btn-inline-save') || e.target.closest('.btn-inline-cancel')) return;
        const entryId = row.dataset.entryId;
        if (!entryId) return;
        if (row.classList.contains('is-inline-editing')) return;
        if (isTimetableEditMode) {
          startInlineRowEdit(entryId, e);
        }
      });
    });

    // Wire up Edit & Delete Buttons (Requirements 10, 11, 33)
    container.querySelectorAll('[data-edit-entry]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const entryId = btn.dataset.editEntry;
        startInlineRowEdit(entryId, e);
      });
    });

    container.querySelectorAll('[data-delete-entry]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const entryId = btn.dataset.deleteEntry;
        await handleDeleteTimetableEntry(entryId);
      });
    });

    timetableSection.style.display = 'block';

    // Render TEACHER WORKLOAD section at the end of the timetable (Requirements Part 14-23)
    if (metaTeacherWorkload) {
      renderTeacherWorkload(metaTeacherWorkload);
    } else {
      try {
        const wData = await apiRequest('GET', '/timetable/workload');
        renderTeacherWorkload(wData);
      } catch (_) {}
    }

    // Render Generation Summary, Conflict Warning Panel, and Unscheduled Classes
    renderTimetableSummaryAndConflicts(timetable);

    // Re-verify timetable action button bindings
    if (typeof setupTimetableActions === 'function') {
      setupTimetableActions();
    }
  } catch (error) {
    console.error('Error loading timetable from Supabase:', error);
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Render Summary Metrics, Conflict Warnings, and Unscheduled Classes
function renderTimetableSummaryAndConflicts(timetableEntries = []) {
  const summaryCard = document.getElementById('timetableSummaryCard');
  const conflictPanel = document.getElementById('timetableConflictPanel');
  const unscheduledCard = document.getElementById('unscheduledClassesCard');
  if (!summaryCard) return;

  const summary = latestGenerationResult?.summary || null;
  const conflicts = latestGenerationResult?.conflicts || [];
  const unscheduled = latestGenerationResult?.unscheduled_classes || [];

  const totalEntries = timetableEntries.length;
  const conflictEntries = timetableEntries.filter((e) => Boolean(e.has_conflict));
  const detectedConflictCount = conflicts.length > 0 ? conflicts.length : conflictEntries.length;

  const totalClasses = summary?.total_required ?? summary?.total_required_classes ?? (totalEntries + unscheduled.length);
  const schedClasses = summary?.successfully_scheduled ?? summary?.successfully_scheduled_classes ?? (totalEntries - conflictEntries.length);
  const attentionClasses = summary?.requiring_attention ?? summary?.classes_requiring_attention ?? (conflictEntries.length + unscheduled.length);
  const conflictCount = summary?.detected_conflicts ?? detectedConflictCount;

  // 1. Summary Metrics Display (Binds to both metric* and legacy summary* IDs)
  const totalEl = document.getElementById('metricTotalClasses') || document.getElementById('summaryTotalClasses');
  const schedEl = document.getElementById('metricScheduledClasses') || document.getElementById('summaryScheduledClasses');
  const attEl = document.getElementById('metricAttentionClasses') || document.getElementById('summaryAttentionClasses');
  const confEl = document.getElementById('metricDetectedConflicts') || document.getElementById('summaryConflictCount');
  if (totalEl) totalEl.textContent = String(totalClasses);
  if (schedEl) schedEl.textContent = String(schedClasses);
  if (attEl) attEl.textContent = String(attentionClasses);
  if (confEl) confEl.textContent = String(conflictCount);

  // 2. Summary Status Pill (All 7 required states - Requirement 6)
  const statusPill = document.getElementById('summaryStatusPill');
  if (statusPill) {
    statusPill.className = 'summary-status-pill';
    if (totalEntries === 0 && (!summary || totalClasses === 0)) {
      statusPill.textContent = 'Not Generated';
      statusPill.classList.add('status-not-generated');
    } else if (latestGenerationResult?.status === 'GENERATING') {
      statusPill.textContent = 'Generating...';
      statusPill.classList.add('status-generating');
    } else if (latestGenerationResult?.status === 'VALIDATING') {
      statusPill.textContent = 'Validating...';
      statusPill.classList.add('status-validating');
    } else if (latestGenerationResult?.status === 'FAILED' || latestGenerationResult?.status === 'ERROR') {
      statusPill.textContent = 'Generation Failed';
      statusPill.classList.add('status-failed');
    } else if (conflictCount > 0) {
      statusPill.textContent = 'Conflicts Detected';
      statusPill.classList.add('status-conflict');
    } else if (unscheduled.length > 0 || (totalClasses > 0 && schedClasses < totalClasses)) {
      statusPill.textContent = 'Incomplete Timetable';
      statusPill.classList.add('status-incomplete');
    } else if (schedClasses > 0 && conflictCount === 0 && unscheduled.length === 0) {
      statusPill.textContent = 'Valid Timetable';
      statusPill.classList.add('status-valid');
    } else {
      statusPill.textContent = 'Not Generated';
      statusPill.classList.add('status-not-generated');
    }
  }

  summaryCard.style.display = totalEntries > 0 || unscheduled.length > 0 ? 'block' : 'none';

  // 3. Scheduling Conflicts Detected Panel (Requirements 4, 7)
  if (conflictPanel) {
    const badgeCount = document.getElementById('conflictPanelCount') || document.getElementById('conflictBadgeCount');
    const conflictList = document.getElementById('conflictItemsList') || document.getElementById('timetableConflictList');

    let displayConflicts = [...conflicts];
    if (displayConflicts.length === 0 && conflictEntries.length > 0) {
      conflictEntries.forEach((ce) => {
        const details = ce.conflict_details || ['Scheduling constraint conflict detected.'];
        details.forEach((d, idx) => {
          displayConflicts.push({
            id: `synth_${ce.timetable_id || ce.id}_${idx}`,
            type: 'conflict',
            day: ce.day || 'Monday',
            time_slot: formatTimeSlot(ce.start_time, ce.end_time),
            affected_ids: [ce.timetable_id || ce.id],
            section: ce.section || ce.class_name,
            teacher: ce.teacher_name,
            title: `Conflict: ${ce.course_name || ce.subject || 'Class'} (${ce.section || ''})`,
            description: d
          });
        });
      });
    }

    if (badgeCount) {
      badgeCount.textContent = `${displayConflicts.length} Conflict${displayConflicts.length === 1 ? '' : 's'}`;
    }

    if (displayConflicts.length > 0) {
      conflictPanel.style.display = 'block';
      if (conflictList) {
        conflictList.innerHTML = displayConflicts.map((c) => {
          const jumpId = (c.affected_ids && c.affected_ids[0]) ? c.affected_ids[0] : '';
          return `
            <div class="conflict-item-card" data-conflict-id="${escapeHtml(c.id)}">
              <div class="conflict-item-text">
                <strong>🚨 ${escapeHtml(c.title || 'Scheduling Conflict')} • 📅 ${escapeHtml(c.day || '')} ⏰ ${escapeHtml(c.time_slot || '')}</strong>
                <p>${escapeHtml(c.description || '')}</p>
              </div>
              <div class="conflict-item-actions">
                ${jumpId ? `<button type="button" class="conflict-jump-btn" data-jump-entry="${escapeHtml(jumpId)}">🔍 View in Timetable</button>` : ''}
                ${jumpId ? `<button type="button" class="conflict-edit-btn" data-edit-entry="${escapeHtml(jumpId)}" title="Edit class to resolve conflict">✎ Edit</button>` : ''}
              </div>
            </div>
          `;
        }).join('');

        // Wire up jump buttons
        conflictList.querySelectorAll('[data-jump-entry]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const entryId = btn.dataset.jumpEntry;
            const targetRow = document.querySelector(`tr[data-entry-id="${entryId}"]`);
            if (targetRow) {
              const dayCard = targetRow.closest('.day-card');
              if (dayCard) {
                const dayName = dayCard.dataset.day;
                const tabBtn = document.querySelector(`.day-tab-btn[data-tab="${dayName}"]`) || document.querySelector('.day-tab-btn[data-tab="all"]');
                if (tabBtn) tabBtn.click();
              }
              targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
              targetRow.classList.remove('row-highlight-pulse');
              void targetRow.offsetWidth;
              targetRow.classList.add('row-highlight-pulse');
            } else {
              showToast('Class assignment located in timetable.');
            }
          });
        });

        // Wire up conflict edit buttons (Requirement 3, 7)
        conflictList.querySelectorAll('[data-edit-entry]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const entryId = btn.dataset.editEntry;
            const targetRow = document.querySelector(`tr[data-entry-id="${entryId}"]`);
            if (targetRow) {
              const dayCard = targetRow.closest('.day-card');
              if (dayCard) {
                const dayName = dayCard.dataset.day;
                const tabBtn = document.querySelector(`.day-tab-btn[data-tab="${dayName}"]`) || document.querySelector('.day-tab-btn[data-tab="all"]');
                if (tabBtn) tabBtn.click();
              }
              targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
              startInlineRowEdit(entryId);
            } else {
              openEditTimetableModal(entryId, timetableEntries);
            }
          });
        });
      }
    } else {
      // Consistent no-conflict state: never show alarming red conflict panel when 0 conflicts exist
      conflictPanel.style.display = 'none';
      if (conflictList) conflictList.innerHTML = '';
    }
  }

  // 4. Unscheduled Classes Card
  if (unscheduledCard) {
    const unscheduledList = document.getElementById('unscheduledItemsGrid') || document.getElementById('unscheduledClassesList');
    const unscheduledBadge = document.getElementById('unscheduledCountBadge');
    if (unscheduledBadge) {
      unscheduledBadge.textContent = `${unscheduled.length} Pending`;
    }

    if (unscheduled && unscheduled.length > 0) {
      unscheduledCard.style.display = 'block';
      if (unscheduledList) {
        unscheduledList.innerHTML = unscheduled.map((u) => `
          <div class="unscheduled-item-row">
            <div class="unscheduled-item-header">
              <div class="unscheduled-item-title">
                <span class="unscheduled-item-icon">⚠️</span>
                <span>${escapeHtml(u.course_name || u.subject || 'Unscheduled Class')}</span>
                <span class="status-badge" style="background: rgba(245, 158, 11, 0.15); color: #b45309; font-weight: 700;">
                  ${escapeHtml(u.section || 'All Sections')}
                </span>
              </div>
              <div class="unscheduled-item-meta">
                <span>Teacher: ${escapeHtml(u.teacher_name || 'Unassigned')}</span>
                ${u.session_type === 'LAB' ? '<span class="session-badge session-badge-lab">🔬 LAB</span>' : ''}
              </div>
            </div>
            <div class="unscheduled-item-reason">
              ${escapeHtml(u.reason || 'Insufficient available time slots or conflicting resources.')}
            </div>
          </div>
        `).join('');
      }
    } else {
      unscheduledCard.style.display = 'none';
      if (unscheduledList) unscheduledList.innerHTML = '';
    }
  }
}

// Generate Page Form Setup
function setupTimetableForm() {
  const form = document.getElementById('timetableForm');
  if (!form) return;

  // Department Management (Requirements 3-8, 33-36, 65)
  const departmentNameInput = document.getElementById('departmentNameInput');
  const saveDepartmentBtn = document.getElementById('saveDepartmentBtn');
  const newDepartmentBtn = document.getElementById('newDepartmentBtn');
  const departmentSelect = document.getElementById('departmentSelect');

  async function initDepartments(selectName = null) {
    if (!departmentSelect) return;
    try {
      const depts = await apiRequest('GET', '/departments');
      if (Array.isArray(depts) && depts.length > 0) {
        const targetVal = selectName || departmentSelect.value || (departmentNameInput ? departmentNameInput.value : '') || 'Computer Science & Engineering';
        let html = '<option value="">-- Select Existing Department --</option>';
        depts.forEach((d) => {
          const name = d.name || d.department_name;
          const isSel = targetVal && (targetVal.toLowerCase() === name.toLowerCase());
          html += `<option value="${escapeHtml(name)}" ${isSel ? 'selected' : ''}>${escapeHtml(name)}</option>`;
        });
        departmentSelect.innerHTML = html;
        if (targetVal) {
          departmentSelect.value = targetVal;
          if (departmentNameInput && (!departmentNameInput.value || selectName)) {
            departmentNameInput.value = targetVal;
          }
        }
      }
    } catch (_) {}
  }
  initDepartments();

  if (departmentSelect) {
    departmentSelect.addEventListener('change', () => {
      if (departmentSelect.value) {
        if (departmentNameInput) {
          departmentNameInput.value = departmentSelect.value;
        }
        // Filter timetable output if loaded
        const deptFilterSelect = document.getElementById('timetableDeptFilter');
        if (deptFilterSelect) {
          deptFilterSelect.value = departmentSelect.value;
          if (deptFilterSelect.onchange) deptFilterSelect.onchange();
        }
      }
    });
  }

  if (newDepartmentBtn) {
    newDepartmentBtn.addEventListener('click', () => {
      if (departmentNameInput) {
        departmentNameInput.value = '';
        departmentNameInput.placeholder = 'Enter new department name (e.g. Information Technology)...';
        departmentNameInput.focus();
      }
      if (departmentSelect) {
        departmentSelect.value = '';
      }
      showToast('Enter new department name and click "Save Department" or generate.');
    });
  }

  if (saveDepartmentBtn) {
    saveDepartmentBtn.addEventListener('click', async () => {
      const name = (departmentNameInput?.value || '').trim();
      if (!name) {
        showMessage('Department name cannot be empty.', 'error');
        if (departmentNameInput) departmentNameInput.focus();
        return;
      }
      try {
        const res = await apiRequest('POST', '/departments', { name });
        showToast(res.message || `Department '${name}' saved successfully!`);
        await initDepartments(name);
        await renderSavedTimetablesList();
      } catch (err) {
        showMessage(err.message || 'Error saving department', 'error');
      }
    });
  }

  const teacherCountInput = document.getElementById('teacherCount');
  const addTeacherBtn = document.getElementById('addTeacherBtn');
  const teacherFields = document.getElementById('teacherFields');
  const subjectFields = document.getElementById('subjectFields');
  const addSubjectBtn = document.getElementById('addSubjectBtn');
  const maxSubjectsAllowedEl = document.getElementById('maxSubjectsAllowed');

  const sectionFields = document.getElementById('sectionFields');
  const addSectionBtn = document.getElementById('addSectionBtn');

  const roomFields = document.getElementById('roomFields');
  const addRoomBtn = document.getElementById('addRoomBtn');

  const labClassFields = document.getElementById('labClassFields');
  const addLabClassBtn = document.getElementById('addLabClassBtn');

  let teachers = [
    { name: 'Dr. Rahul Kumar', subjects: ['DBMS'] },
    { name: 'Prof. Ananya Sharma', subjects: ['DSA'] },
    { name: 'Prof. Rajesh Verma', subjects: ['Java'] }
  ];
  if (teacherCountInput) {
    teacherCountInput.value = teachers.length;
  }
  let subjects = ['DBMS', 'DSA', 'Java']; // initial subjects
  let sections = ['CSE-A']; // initial default section
  let rooms = [
    { room_number: '101', room_type: 'Classroom' },
    { room_number: 'Lab-1', room_type: 'Laboratory' }
  ]; // initial default rooms
  let labClasses = []; // [{ subject: '', teacher: '', section: '', day: 'Monday', startTime: '10:00', endTime: '12:00', duration: 2, room: '' }]

  // Day-Specific Period Configuration (Requirements 10-18, 63)
  const dayPeriodsContainer = document.getElementById('dayPeriodsContainer');
  const autoSyncPeriodsBtn = document.getElementById('autoSyncPeriodsBtn');

  const DEFAULT_DAY_PERIOD_COUNTS = {
    'Monday': 7,
    'Tuesday': 7,
    'Wednesday': 7,
    'Thursday': 7,
    'Friday': 7,
    'Saturday': 4,
    'Sunday': 4
  };

  let dayPeriodsState = {};

  function initDayPeriodsState(resetAll = false) {
    const activeDays = getSelectedWorkingDays();
    const baseStartTime = document.getElementById('startTime')?.value || '09:00';
    const baseEndTime = document.getElementById('endTime')?.value || '16:00';
    const baseStartMinutes = timeToMinutes(baseStartTime);
    const baseEndMinutes = timeToMinutes(baseEndTime);
    const defaultHoursSpan = Math.max(1, Math.min(10, Math.floor((baseEndMinutes - baseStartMinutes) / 60))) || 7;

    activeDays.forEach((day) => {
      if (!dayPeriodsState[day] || resetAll) {
        const isWeekend = (day === 'Saturday' || day === 'Sunday');
        const pCount = isWeekend ? (DEFAULT_DAY_PERIOD_COUNTS[day] || 4) : (DEFAULT_DAY_PERIOD_COUNTS[day] || defaultHoursSpan);
        const periods = [];
        for (let p = 0; p < pCount; p++) {
          const sMin = baseStartMinutes + (p * 60);
          const eMin = sMin + 60;
          periods.push({
            period: p + 1,
            start: minutesToTime(sMin),
            end: minutesToTime(eMin)
          });
        }
        dayPeriodsState[day] = periods;
      }
    });
  }

  function renderDayPeriods() {
    if (!dayPeriodsContainer) return;
    initDayPeriodsState();
    const activeDays = getSelectedWorkingDays();

    dayPeriodsContainer.innerHTML = activeDays.map((day) => {
      const periods = dayPeriodsState[day] || [];
      const currentCount = periods.length;

      let countOptions = '';
      for (let c = 1; c <= 10; c++) {
        countOptions += `<option value="${c}" ${c === currentCount ? 'selected' : ''}>${c} Periods</option>`;
      }

      const rowsHtml = periods.map((p, pIdx) => `
        <div class="period-row-item" data-day="${escapeHtml(day)}" data-period-idx="${pIdx}">
          <span class="period-num-badge">P${p.period || (pIdx + 1)}</span>
          <input type="time" class="period-time-input" data-day="${escapeHtml(day)}" data-period-idx="${pIdx}" data-time-type="start" value="${escapeHtml(p.start)}" aria-label="${escapeHtml(day)} Period ${pIdx + 1} Start Time">
          <span class="period-time-sep">—</span>
          <input type="time" class="period-time-input" data-day="${escapeHtml(day)}" data-period-idx="${pIdx}" data-time-type="end" value="${escapeHtml(p.end)}" aria-label="${escapeHtml(day)} Period ${pIdx + 1} End Time">
          <span class="period-12hr-preview" id="preview-${escapeHtml(day)}-${pIdx}">${escapeHtml(formatTimeSlot(p.start, p.end))}</span>
        </div>
      `).join('');

      return `
        <div class="day-period-card" data-day="${escapeHtml(day)}">
          <div class="day-period-card-header">
            <span class="day-period-day-name">📅 ${escapeHtml(day)}</span>
            <div class="day-period-controls">
              <span class="day-period-label">Periods:</span>
              <select class="period-count-select" data-day="${escapeHtml(day)}" aria-label="Number of periods for ${escapeHtml(day)}">
                ${countOptions}
              </select>
            </div>
          </div>
          <div class="period-rows-container" id="period-rows-${escapeHtml(day)}">
            ${rowsHtml}
          </div>
        </div>
      `;
    }).join('');

    dayPeriodsContainer.querySelectorAll('.period-count-select').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        const day = e.target.dataset.day;
        const newCount = parseInt(e.target.value, 10);
        updateDayPeriodCount(day, newCount);
      });
    });

    dayPeriodsContainer.querySelectorAll('.period-time-input').forEach((input) => {
      const handlePeriodTimeUpdate = (e) => {
        const day = e.target.dataset.day;
        const pIdx = parseInt(e.target.dataset.periodIdx, 10);
        const type = e.target.dataset.timeType;
        if (dayPeriodsState[day] && dayPeriodsState[day][pIdx]) {
          dayPeriodsState[day][pIdx][type] = e.target.value;
          const previewEl = document.getElementById(`preview-${day}-${pIdx}`);
          if (previewEl) {
            previewEl.textContent = formatTimeSlot(dayPeriodsState[day][pIdx].start, dayPeriodsState[day][pIdx].end);
          }
          updateLabClassDropdowns();
        }
      };
      input.addEventListener('input', handlePeriodTimeUpdate);
      input.addEventListener('change', handlePeriodTimeUpdate);
    });

    updateLabClassDropdowns();
    renderPeriodCopyControls();
  }

  function updateDayPeriodCount(day, newCount) {
    if (!dayPeriodsState[day]) {
      dayPeriodsState[day] = [];
    }
    const current = dayPeriodsState[day];
    const baseStartTime = document.getElementById('startTime')?.value || '09:00';
    const baseStartMinutes = timeToMinutes(baseStartTime);

    if (newCount > current.length) {
      for (let p = current.length; p < newCount; p++) {
        let sMin;
        if (p > 0 && current[p - 1].end) {
          sMin = timeToMinutes(current[p - 1].end);
        } else {
          sMin = baseStartMinutes + (p * 60);
        }
        const eMin = sMin + 60;
        current.push({
          period: p + 1,
          start: minutesToTime(sMin),
          end: minutesToTime(eMin)
        });
      }
    } else if (newCount < current.length) {
      dayPeriodsState[day] = current.slice(0, newCount);
    }

    renderDayPeriods();
  }

  // ==============================================================================
  // PERIOD CONFIGURATION COPY TOOL (Requirement 2)
  // ==============================================================================
  const togglePeriodCopyBtn = document.getElementById('togglePeriodCopyBtn');
  const periodCopyContent = document.getElementById('periodCopyContent');
  const copyPeriodSourceDay = document.getElementById('copyPeriodSourceDay');
  const copyPeriodDestDays = document.getElementById('copyPeriodDestDays');
  const executeCopyPeriodBtn = document.getElementById('executeCopyPeriodBtn');
  const periodCopyStatusMsg = document.getElementById('periodCopyStatusMsg');

  function renderPeriodCopyControls() {
    if (!copyPeriodSourceDay || !copyPeriodDestDays) return;
    const activeDays = getSelectedWorkingDays();
    if (activeDays.length === 0) return;

    const currentSource = copyPeriodSourceDay.value;
    const selectedSource = activeDays.includes(currentSource) ? currentSource : activeDays[0];

    copyPeriodSourceDay.innerHTML = activeDays.map((d) =>
      `<option value="${escapeHtml(d)}" ${d === selectedSource ? 'selected' : ''}>${escapeHtml(d)}</option>`
    ).join('');

    const effectiveSource = copyPeriodSourceDay.value || activeDays[0];
    const availableDests = activeDays.filter((d) => d.toLowerCase() !== effectiveSource.toLowerCase());

    // Preserve already-selected destination days if still valid
    const existingActiveDests = Array.from(copyPeriodDestDays.querySelectorAll('.dest-day-chip.active'))
      .map((c) => c.dataset.destDay);

    copyPeriodDestDays.innerHTML = availableDests.map((d) => {
      const isSel = existingActiveDests.includes(d);
      return `<button type="button" class="dest-day-chip ${isSel ? 'active' : ''}" data-dest-day="${escapeHtml(d)}" aria-pressed="${isSel}">${escapeHtml(d)}</button>`;
    }).join('');

    copyPeriodDestDays.querySelectorAll('.dest-day-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const isActive = chip.classList.toggle('active');
        chip.setAttribute('aria-pressed', String(isActive));
      });
    });
  }

  if (togglePeriodCopyBtn && periodCopyContent) {
    togglePeriodCopyBtn.addEventListener('click', () => {
      const isHidden = periodCopyContent.style.display === 'none';
      periodCopyContent.style.display = isHidden ? 'block' : 'none';
      togglePeriodCopyBtn.setAttribute('aria-expanded', String(isHidden));
      togglePeriodCopyBtn.querySelector('.toggle-copy-text').textContent = isHidden ? 'Hide Copy ▲' : 'Copy Configuration ▼';
      if (isHidden) renderPeriodCopyControls();
    });
  }

  if (copyPeriodSourceDay) {
    copyPeriodSourceDay.addEventListener('change', () => {
      renderPeriodCopyControls();
    });
  }

  function showPeriodCopyStatus(msg, type) {
    if (!periodCopyStatusMsg) return;
    periodCopyStatusMsg.textContent = msg;
    periodCopyStatusMsg.className = `copy-status-msg ${type}`;
    setTimeout(() => {
      if (periodCopyStatusMsg && periodCopyStatusMsg.textContent === msg) {
        periodCopyStatusMsg.textContent = '';
      }
    }, 4500);
  }

  if (executeCopyPeriodBtn) {
    executeCopyPeriodBtn.addEventListener('click', () => {
      const sourceDay = copyPeriodSourceDay?.value;
      if (!sourceDay) {
        showPeriodCopyStatus('Please select a source day to copy from.', 'error');
        return;
      }

      const activeDestChips = Array.from(copyPeriodDestDays.querySelectorAll('.dest-day-chip.active'));
      const destDays = activeDestChips.map((c) => c.dataset.destDay).filter(Boolean);

      if (destDays.length === 0) {
        showPeriodCopyStatus('Please select at least one destination day.', 'error');
        return;
      }

      const sourcePeriods = dayPeriodsState[sourceDay] || [];
      if (sourcePeriods.length === 0) {
        showPeriodCopyStatus(`Source day '${sourceDay}' has no periods configured.`, 'error');
        return;
      }

      const modeRadio = document.querySelector('input[name="periodCopyMode"]:checked');
      const copyMode = modeRadio ? modeRadio.value : 'complete';

      // Confirmation before overwrite if destination day has existing configured periods
      const hasExisting = destDays.some((d) => (dayPeriodsState[d] || []).length > 0);
      if (hasExisting) {
        const confirmMsg = `Overwrite period configuration for: ${destDays.join(', ')} with ${copyMode === 'complete' ? 'complete period count & times' : 'timing pattern only'} from ${sourceDay}?`;
        if (typeof window !== 'undefined' && window.confirm && !window.confirm(confirmMsg)) {
          return;
        }
      }

      destDays.forEach((destDay) => {
        if (copyMode === 'complete') {
          // Mode A: Copy complete period configuration (period count, times)
          dayPeriodsState[destDay] = sourcePeriods.map((p, pIdx) => ({
            period: pIdx + 1,
            start: p.start,
            end: p.end
          }));
        } else {
          // Mode B: Timing only (preserves destination day's existing period count)
          const currentDestPeriods = dayPeriodsState[destDay] || [];
          const targetCount = currentDestPeriods.length > 0 ? currentDestPeriods.length : sourcePeriods.length;
          const updated = [];
          for (let i = 0; i < targetCount; i++) {
            if (i < sourcePeriods.length) {
              updated.push({
                period: i + 1,
                start: sourcePeriods[i].start,
                end: sourcePeriods[i].end
              });
            } else {
              // Extrapolate additional periods from previous slot
              const lastEnd = updated[i - 1]?.end || '15:00';
              const sMin = timeToMinutes(lastEnd);
              updated.push({
                period: i + 1,
                start: lastEnd,
                end: minutesToTime(sMin + 60)
              });
            }
          }
          dayPeriodsState[destDay] = updated;
        }
      });

      renderDayPeriods();
      renderPeriodCopyControls();
      showPeriodCopyStatus(`✓ Copied ${sourceDay} period configuration (${copyMode === 'complete' ? 'complete' : 'timing only'}) to ${destDays.join(', ')}.`, 'success');
      showToast(`Period configuration copied to ${destDays.join(', ')}!`);
    });
  }

  if (autoSyncPeriodsBtn) {
    autoSyncPeriodsBtn.addEventListener('click', () => {
      initDayPeriodsState(true);
      renderDayPeriods();
      showToast('Reset periods to standard default spans.');
    });
  }

  // Working Days Pills & Preset Controls (Requirements 2, 32, 33, 34)
  const workingDayPillsContainer = document.getElementById('workingDayPills');
  const workingDaysInput = document.getElementById('workingDays');
  const presetButtons = document.querySelectorAll('.btn-day-preset');

  function getSelectedWorkingDays() {
    if (!workingDayPillsContainer) {
      const count = parseInt(workingDaysInput?.value, 10) || 5;
      return WORKING_DAYS_ORDER.slice(0, Math.max(1, Math.min(7, count)));
    }
    const activePills = Array.from(workingDayPillsContainer.querySelectorAll('.day-toggle-pill.active'));
    const days = activePills.map((p) => p.dataset.day).filter(Boolean);
    if (days.length === 0) {
      return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }
    return WORKING_DAYS_ORDER.filter((d) => days.includes(d));
  }

  function syncWorkingDaysUI() {
    const selected = getSelectedWorkingDays();
    if (workingDaysInput) {
      workingDaysInput.value = selected.length;
    }
    if (presetButtons) {
      presetButtons.forEach((btn) => {
        const pCount = parseInt(btn.dataset.preset, 10);
        const isPresetMatch = (pCount === 5 && selected.length === 5 && selected[selected.length - 1] === 'Friday') ||
                              (pCount === 6 && selected.length === 6 && selected[selected.length - 1] === 'Saturday') ||
                              (pCount === 7 && selected.length === 7);
        btn.classList.toggle('active', isPresetMatch);
      });
    }
    renderDayPeriods();
    if (typeof updateLabClassDropdowns === 'function') {
      updateLabClassDropdowns();
    }
  }

  if (workingDayPillsContainer) {
    workingDayPillsContainer.querySelectorAll('.day-toggle-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const isCurrentlyActive = pill.classList.contains('active');
        const activeCount = workingDayPillsContainer.querySelectorAll('.day-toggle-pill.active').length;
        if (isCurrentlyActive && activeCount <= 1) {
          showMessage('At least one working day must remain selected.', 'error');
          return;
        }
        pill.classList.toggle('active');
        pill.setAttribute('aria-pressed', String(!isCurrentlyActive));
        syncWorkingDaysUI();
      });
    });
  }

  if (presetButtons) {
    presetButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const presetCount = parseInt(btn.dataset.preset, 10) || 5;
        presetButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        if (workingDayPillsContainer) {
          const pills = workingDayPillsContainer.querySelectorAll('.day-toggle-pill');
          pills.forEach((p, idx) => {
            const shouldBeActive = idx < presetCount;
            p.classList.toggle('active', shouldBeActive);
            p.setAttribute('aria-pressed', String(shouldBeActive));
          });
        }
        if (workingDaysInput) {
          workingDaysInput.value = presetCount;
        }
        syncWorkingDaysUI();
      });
    });
  }

  function getMaxAllowedSubjects() {
    const tCount = teachers.length;
    return tCount >= 1 ? tCount + 2 : 3;
  }

  function updateSubjectLimit() {
    const maxAllowed = getMaxAllowedSubjects();
    if (maxSubjectsAllowedEl) {
      maxSubjectsAllowedEl.textContent = String(maxAllowed);
    }

    // If teacher count decreased and current subjects exceed limit, trim excess
    if (subjects.length > maxAllowed) {
      subjects = subjects.slice(0, maxAllowed);
      renderSubjectFields();
    }

    if (addSubjectBtn) {
      const isLimitReached = subjects.length >= maxAllowed;
      const noTeachers = teachers.length < 1;
      addSubjectBtn.disabled = isLimitReached || noTeachers;
      addSubjectBtn.title = noTeachers
        ? 'Enter number of teachers first'
        : isLimitReached
          ? `Maximum of ${maxAllowed} subjects reached (Teachers + 2)`
          : 'Add another subject';
    }
  }

  function getEnteredSubjectList() {
    const inputs = Array.from(subjectFields.querySelectorAll('[data-subject-index]'));
    const list = inputs.map((input) => input.value.trim()).filter(Boolean);
    return [...new Set(list)];
  }

  function getEnteredSectionList() {
    const inputs = Array.from(sectionFields.querySelectorAll('[data-section-index]'));
    const list = inputs.map((input) => input.value.trim()).filter(Boolean);
    return [...new Set(list)];
  }

  function getEnteredLabRooms() {
    return rooms.filter((r) => r.room_type === 'Laboratory' && r.room_number.trim());
  }

  function isTeacherEligibleForSubject(teacher, subject) {
    if (!teacher || !subject) return false;
    const subLower = String(subject).trim().toLowerCase();
    const subBase = subLower.replace(/\s+lab$/i, '').trim();
    if (teacher.subjects.includes('NA')) return true;
    return teacher.subjects.some((s) => {
      const sLower = s.toLowerCase();
      return sLower === subLower || sLower === subBase || sLower.replace(/\s+lab$/i, '').trim() === subBase;
    });
  }

  // Teacher-Subject Dropdowns / Chips Synchronization
  function updateTeacherSubjectDropdowns() {
    const availableSubjects = getEnteredSubjectList();
    teachers.forEach((t, idx) => {
      // Validate existing subjects against global list
      if (!t.subjects.includes('NA')) {
        t.subjects = t.subjects.filter((s) =>
          availableSubjects.some((as) => as.toLowerCase() === s.toLowerCase())
        );
      }
      renderTeacherChips(idx);
    });
    updateLabClassDropdowns();
  }

  // Render individual teacher chips container
  function renderTeacherChips(tIdx) {
    const chipsContainer = document.getElementById(`teacher-chips-${tIdx}`);
    if (!chipsContainer) return;

    const t = teachers[tIdx];
    if (!t) return;

    if (!Array.isArray(t.subjects)) t.subjects = [];

    const availableSubjects = getEnteredSubjectList();
    // Dropdown options: global subjects not already assigned to this teacher + NA
    const unassignedSubjects = availableSubjects.filter(
      (s) => !t.subjects.some((ts) => ts.toLowerCase() === s.toLowerCase())
    );

    let chipsHtml = '';
    if (t.subjects.length === 0) {
      chipsHtml = '<span class="no-chips-hint">No subjects assigned yet.</span>';
    } else {
      chipsHtml = t.subjects.map((sub) => `
        <span class="subject-chip ${sub === 'NA' ? 'chip-na' : ''}">
          <span class="chip-text">${escapeHtml(sub === 'NA' ? 'NA (No specific preference)' : sub)}</span>
          <button type="button" class="chip-remove" data-remove-chip-teacher="${tIdx}" data-remove-chip-sub="${escapeHtml(sub)}" title="Remove ${escapeHtml(sub)}" aria-label="Remove ${escapeHtml(sub)}">&times;</button>
        </span>
      `).join('');
    }

    const hasNA = t.subjects.includes('NA');
    const selectOptions = [
      '<option value="">-- Select Subject to Add --</option>',
      (!hasNA ? '<option value="NA">NA (No specific preference)</option>' : ''),
      ...unassignedSubjects.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
    ].filter(Boolean).join('');

    chipsContainer.innerHTML = `
      <div class="teacher-chips-list">
        ${chipsHtml}
      </div>
      <div class="teacher-add-subject-controls">
        <button type="button" class="btn btn-secondary btn-sm btn-add-subject-inline" data-toggle-subject-select="${tIdx}">
          + Add Subject
        </button>
        <div class="subject-picker-dropdown-wrap hidden" id="subject-picker-wrap-${tIdx}">
          <select class="subject-picker-dropdown" data-picker-teacher-idx="${tIdx}" aria-label="Select subject for Teacher ${tIdx + 1}">
            ${selectOptions}
          </select>
        </div>
      </div>
    `;

    // Event: Toggle inline dropdown
    const toggleBtn = chipsContainer.querySelector(`[data-toggle-subject-select="${tIdx}"]`);
    const pickerWrap = chipsContainer.querySelector(`#subject-picker-wrap-${tIdx}`);
    const pickerSelect = chipsContainer.querySelector(`[data-picker-teacher-idx="${tIdx}"]`);

    if (toggleBtn && pickerWrap && pickerSelect) {
      toggleBtn.addEventListener('click', () => {
        const isHidden = pickerWrap.classList.contains('hidden');
        if (isHidden) {
          pickerWrap.classList.remove('hidden');
          pickerSelect.focus();
        } else {
          pickerWrap.classList.add('hidden');
        }
      });

      pickerSelect.addEventListener('change', (e) => {
        const selectedVal = e.target.value;
        if (!selectedVal) return;

        if (selectedVal === 'NA') {
          // NA replaces all specific subjects (Requirement 11)
          t.subjects = ['NA'];
        } else {
          // Specific subject removes NA (Requirement 11)
          t.subjects = t.subjects.filter((s) => s !== 'NA');
          // Duplicate prevention (Requirement 7)
          if (!t.subjects.some((s) => s.toLowerCase() === selectedVal.toLowerCase())) {
            t.subjects.push(selectedVal);
          }
        }

        renderTeacherChips(tIdx);
        updateLabClassDropdowns();
      });
    }

    // Event: Chip remove button (Requirement 8)
    chipsContainer.querySelectorAll('[data-remove-chip-teacher]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const removeSub = btn.dataset.removeChipSub;
        t.subjects = t.subjects.filter((s) => s !== removeSub);
        renderTeacherChips(tIdx);
        updateLabClassDropdowns();
      });
    });
  }

  // Dynamic Teacher Fields (Teacher Name + Multi-Subject Chips)
  function renderTeacherFields() {
    const count = Number.parseInt(teacherCountInput.value, 10);
    if (!Number.isInteger(count) || count < 1) {
      teacherFields.innerHTML = '';
      teachers = [];
      updateSubjectLimit();
      updateLabClassDropdowns();
      return;
    }

    const existing = [...teachers];
    teachers = Array.from({ length: count }, (_, index) => {
      const item = existing[index];
      if (typeof item === 'string') return { name: item, subjects: [] };
      return {
        name: item?.name || '',
        subjects: Array.isArray(item?.subjects) ? item.subjects : (item?.subject ? [item.subject] : [])
      };
    });

    teacherFields.innerHTML = teachers.map((t, index) => {
      const orderLabel = `TEACHER ${String(index + 1).padStart(2, '0')}`;
      return `
        <div class="teacher-item-card inner-form-card" data-teacher-card-idx="${index}">
          <div class="card-item-header">
            <div class="teacher-order-pill">${orderLabel}</div>
            ${teachers.length > 1 ? `<button type="button" class="btn-remove-card" data-remove-teacher="${index}" aria-label="Remove ${orderLabel}">- Remove</button>` : ''}
          </div>
          <div class="teacher-inner-grid">
            <div class="form-group teacher-name-group">
              <label for="teacher-name-${index}" class="inner-field-label">Teacher Name <span class="required">*</span></label>
              <input type="text" id="teacher-name-${index}" data-teacher-idx="${index}" placeholder="e.g., Rahul" value="${escapeHtml(t.name)}" required>
            </div>
            <div class="form-group teacher-subjects-group">
              <label class="inner-field-label">Subjects This Teacher Can Teach <span class="required">*</span></label>
              <div class="teacher-chips-container" id="teacher-chips-${index}"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    teachers.forEach((_, index) => {
      renderTeacherChips(index);
    });

    teacherFields.querySelectorAll('[data-teacher-idx]').forEach((input) => {
      input.addEventListener('input', (event) => {
        const idx = Number(event.target.dataset.teacherIdx);
        if (teachers[idx]) teachers[idx].name = event.target.value;
        updateLabClassDropdowns();
      });
    });

    teacherFields.querySelectorAll('[data-remove-teacher]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        const idx = Number(event.currentTarget.dataset.removeTeacher);
        if (teachers.length > 1) {
          teachers.splice(idx, 1);
          teacherCountInput.value = teachers.length;
          renderTeacherFields();
          updateLabClassDropdowns();
        }
      });
    });

    updateSubjectLimit();
    updateLabClassDropdowns();
  }

  if (addTeacherBtn) {
    addTeacherBtn.addEventListener('click', () => {
      const current = Number.parseInt(teacherCountInput.value, 10) || 0;
      teacherCountInput.value = current + 1;
      renderTeacherFields();
      const newInput = document.getElementById(`teacher-name-${current}`);
      if (newInput) newInput.focus();
    });
  }

  teacherCountInput.addEventListener('input', renderTeacherFields);
  teacherCountInput.addEventListener('change', renderTeacherFields);

  // Dynamic Subject Fields
  function renderSubjectFields() {
    if (!subjects.length) {
      subjects = [''];
    }

    subjectFields.innerHTML = subjects.map((subject, index) => `
      <div class="subject-item-row">
        <div class="subject-row-header">
          <label for="subject-${index}" class="subject-row-label">Subject / Course ${index + 1} <span class="required">*</span></label>
          ${subjects.length > 1 ? `<button type="button" class="btn-remove-subject" data-remove-subject="${index}" aria-label="Remove Subject ${index + 1}">- Remove</button>` : ''}
        </div>
        <input type="text" id="subject-${index}" data-subject-index="${index}" placeholder="e.g., Operating Systems" value="${escapeHtml(subject)}" required>
      </div>
    `).join('');

    subjectFields.querySelectorAll('[data-subject-index]').forEach((input) => {
      input.addEventListener('input', (event) => {
        const idx = Number(event.target.dataset.subjectIndex);
        subjects[idx] = event.target.value;
        updateTeacherSubjectDropdowns();
      });
    });

    subjectFields.querySelectorAll('[data-remove-subject]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        const idx = Number(event.currentTarget.dataset.removeSubject);
        if (subjects.length > 1) {
          subjects.splice(idx, 1);
          renderSubjectFields();
          updateTeacherSubjectDropdowns();
          updateSubjectLimit();
        }
      });
    });

    updateSubjectLimit();
    updateTeacherSubjectDropdowns();
  }

  if (addSubjectBtn) {
    addSubjectBtn.addEventListener('click', () => {
      const maxAllowed = getMaxAllowedSubjects();
      if (teachers.length < 1) {
        showMessage('Please enter the number of teachers first.', 'error');
        teacherCountInput.focus();
        return;
      }
      if (subjects.length >= maxAllowed) {
        showMessage(`Maximum ${maxAllowed} subjects are allowed for ${teachers.length} teachers.`, 'error');
        return;
      }

      subjects.push('');
      renderSubjectFields();
      updateTeacherSubjectDropdowns();

      const newInput = document.getElementById(`subject-${subjects.length - 1}`);
      if (newInput) newInput.focus();
    });
  }

  // Dynamic Section Fields
  function renderSectionFields() {
    if (!sections.length) {
      sections = ['CSE-A'];
    }

    sectionFields.innerHTML = sections.map((sec, index) => `
      <div class="section-item-card inner-form-card">
        <div class="section-card-header">
          <label for="section-${index}" class="section-card-label">Section ${index + 1} <span class="required">*</span></label>
          ${sections.length > 1 ? `<button type="button" class="btn-remove-card" data-remove-section="${index}" aria-label="Remove Section ${index + 1}">- Remove</button>` : ''}
        </div>
        <input type="text" id="section-${index}" data-section-index="${index}" placeholder="e.g., CSE-A" value="${escapeHtml(sec)}" required>
      </div>
    `).join('');

    sectionFields.querySelectorAll('[data-section-index]').forEach((input) => {
      input.addEventListener('input', (event) => {
        const idx = Number(event.target.dataset.sectionIndex);
        sections[idx] = event.target.value;
        updateLabClassDropdowns();
      });
    });

    sectionFields.querySelectorAll('[data-remove-section]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        const idx = Number(event.currentTarget.dataset.removeSection);
        if (sections.length > 1) {
          sections.splice(idx, 1);
          renderSectionFields();
          updateLabClassDropdowns();
        }
      });
    });
  }

  if (addSectionBtn) {
    addSectionBtn.addEventListener('click', () => {
      const nextLetter = String.fromCharCode(65 + sections.length);
      sections.push(`CSE-${nextLetter}`);
      renderSectionFields();
      updateLabClassDropdowns();

      const newInput = document.getElementById(`section-${sections.length - 1}`);
      if (newInput) newInput.focus();
    });
  }

  // Dynamic Room Fields (CSS Grid 2-column Desktop, 1-column Mobile, Consistent Spacing & Hover)
  function renderRoomFields() {
    if (!rooms.length) {
      rooms = [{ room_number: '101', room_type: 'Classroom' }];
    }

    roomFields.innerHTML = rooms.map((room, index) => {
      const orderLabel = `ROOM ${String(index + 1).padStart(2, '0')}`;
      return `
        <div class="room-item-card inner-form-card" data-room-card-idx="${index}">
          <div class="card-item-header room-card-header">
            <div class="room-order-pill">${orderLabel}</div>
            ${rooms.length > 1 ? `<button type="button" class="btn-remove-card" data-remove-room="${index}" aria-label="Remove ${orderLabel}">- Remove</button>` : ''}
          </div>
          <div class="room-inner-grid">
            <div class="form-group room-name-group">
              <label for="room-num-${index}" class="inner-field-label">Room Number / Name <span class="required">*</span></label>
              <input type="text" id="room-num-${index}" data-room-num-index="${index}" placeholder="e.g., 101 or Lab-1" value="${escapeHtml(room.room_number)}" required>
            </div>
            <div class="form-group room-type-group">
              <label for="room-type-select-${index}" class="inner-field-label">Room Type <span class="required">*</span></label>
              <select id="room-type-select-${index}" data-room-type-index="${index}" class="room-select" required>
                <option value="Classroom" ${room.room_type === 'Classroom' ? 'selected' : ''}>Classroom</option>
                <option value="Laboratory" ${room.room_type === 'Laboratory' ? 'selected' : ''}>Laboratory</option>
              </select>
            </div>
          </div>
        </div>
      `;
    }).join('');

    roomFields.querySelectorAll('[data-room-num-index]').forEach((input) => {
      input.addEventListener('input', (event) => {
        const idx = Number(event.target.dataset.roomNumIndex);
        if (rooms[idx]) rooms[idx].room_number = event.target.value;
        updateLabClassDropdowns();
      });
    });

    roomFields.querySelectorAll('[data-room-type-index]').forEach((select) => {
      select.addEventListener('change', (event) => {
        const idx = Number(event.target.dataset.roomTypeIndex);
        if (rooms[idx]) rooms[idx].room_type = event.target.value;
        updateLabClassDropdowns();
      });
    });

    roomFields.querySelectorAll('[data-remove-room]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        const idx = Number(event.currentTarget.dataset.removeRoom);
        if (rooms.length > 1) {
          rooms.splice(idx, 1);
          renderRoomFields();
          updateLabClassDropdowns();
        }
      });
    });
  }

  if (addRoomBtn) {
    addRoomBtn.addEventListener('click', () => {
      const nextNum = 101 + rooms.length;
      rooms.push({ room_number: String(nextNum), room_type: 'Classroom' });
      renderRoomFields();
      updateLabClassDropdowns();

      const newInput = document.getElementById(`room-num-${rooms.length - 1}`);
      if (newInput) newInput.focus();
    });
  }

  // ============================================================================
  // LAB CLASSES CONFIGURATION (Requirements 19-26, 64)
  // ============================================================================
  // ============================================================================
  // LAB CLASSES CONFIGURATION (Multi-Day & Multi-Section with Scheduling Modes)
  function updateLabClassDropdowns() {
    renderLabClassFields();
  }

  function getLabDayWindowSummary(lc) {
    const labDays = lc.days && lc.days.length > 0 ? lc.days : (lc.day ? [lc.day] : ['Monday']);
    const badges = [];
    labDays.forEach((d) => {
      const periods = dayPeriodsState[d] || [];
      if (periods.length > 0) {
        const s = periods[0].start;
        const e = periods[periods.length - 1].end;
        const sMin = timeToMinutes(s);
        const eMin = timeToMinutes(e);
        if (!isNaN(sMin) && !isNaN(eMin) && eMin <= sMin) {
          badges.push(`<span class="lab-day-window-badge" style="border-color: #fca5a5; background: #fff5f5; color: #b91c1c;">📅 <strong>${escapeHtml(d)}:</strong> ⚠️ Inverted Interval (${escapeHtml(formatTime12(s))} – ${escapeHtml(formatTime12(e))})</span>`);
        } else {
          badges.push(`<span class="lab-day-window-badge">📅 <strong>${escapeHtml(d)}:</strong> ${escapeHtml(formatTime12(s))} – ${escapeHtml(formatTime12(e))} (${periods.length} periods)</span>`);
        }
      } else {
        badges.push(`<span class="lab-day-window-badge">📅 <strong>${escapeHtml(d)}:</strong> No periods configured</span>`);
      }
    });
    return badges.join(' ');
  }

  /**
   * Automatically match a lab time interval [start, end) against a day's configured periods.
   * Follows interval overlap rule: startA < endB AND startB < endA.
   * Validates complete coverage, gap absence, break non-overlap, and valid working day window.
   */
  function matchLabToDayPeriods(labStartTime, labEndTime, dayName, dayPeriods = [], dayBreaks = []) {
    if (!labStartTime || !labEndTime) {
      return {
        valid: false,
        error: 'Lab start time and end time are required.',
        matchedPeriods: [],
        periodPills: [],
        breakConflict: null
      };
    }

    const sMin = timeToMinutes(labStartTime);
    const eMin = timeToMinutes(labEndTime);

    if (isNaN(sMin) || isNaN(eMin)) {
      return {
        valid: false,
        error: 'Please enter valid times in HH:MM format.',
        matchedPeriods: [],
        periodPills: [],
        breakConflict: null
      };
    }

    if (sMin >= eMin) {
      return {
        valid: false,
        error: `End time (${formatTime12(eMin)}) must be strictly later than start time (${formatTime12(sMin)}).`,
        matchedPeriods: [],
        periodPills: [],
        breakConflict: null
      };
    }

    const periods = Array.isArray(dayPeriods) ? dayPeriods : [];
    if (periods.length === 0) {
      return {
        valid: false,
        error: `No configured periods match the selected lab time for ${dayName}.`,
        matchedPeriods: [],
        periodPills: [],
        breakConflict: null
      };
    }

    // Validate day periods configuration integrity (Requirement 1 & 8)
    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      const pS = timeToMinutes(p.start || p.start_time);
      const pE = timeToMinutes(p.end || p.end_time);
      if (isNaN(pS) || isNaN(pE) || pE <= pS) {
        return {
          valid: false,
          error: `${dayName}'s configured end time must be later than its start time.`,
          matchedPeriods: [],
          periodPills: [],
          breakConflict: null
        };
      }
    }

    const dayStartMin = timeToMinutes(periods[0].start || periods[0].start_time);
    const dayEndMin = timeToMinutes(periods[periods.length - 1].end || periods[periods.length - 1].end_time);

    if (dayEndMin <= dayStartMin) {
      return {
        valid: false,
        error: `${dayName}'s configured end time must be later than its start time.`,
        matchedPeriods: [],
        periodPills: [],
        breakConflict: null
      };
    }

    // Overlap condition: period [pS, pE) overlaps lab [sMin, eMin) iff pS < eMin AND sMin < pE
    const intersecting = periods.filter((p) => {
      const pS = timeToMinutes(p.start || p.start_time);
      const pE = timeToMinutes(p.end || p.end_time);
      return pS < eMin && sMin < pE;
    });

    if (intersecting.length === 0) {
      return {
        valid: false,
        error: 'No configured periods match the selected lab time.',
        matchedPeriods: [],
        periodPills: [],
        breakConflict: null
      };
    }

    // Check break overlap on this day (Requirement 4 & 8)
    const dBreaks = Array.isArray(dayBreaks) ? dayBreaks : [];
    for (const b of dBreaks) {
      const bStart = timeToMinutes(b.startTime || b.start_time);
      const bEnd = timeToMinutes(b.endTime || b.end_time);
      if (!isNaN(bStart) && !isNaN(bEnd) && Math.max(sMin, bStart) < Math.min(eMin, bEnd)) {
        const bName = b.name || b.break_name || 'Break';
        return {
          valid: false,
          error: `The selected lab interval overlaps with the configured break '${bName}' (${formatTime12(bStart)} – ${formatTime12(bEnd)}) on ${dayName}.`,
          matchedPeriods: intersecting,
          periodPills: intersecting.map((p, idx) => `P${p.period || (idx + 1)}`),
          breakConflict: b
        };
      }
    }

    // Validate complete coverage across the lab interval [sMin, eMin)
    const firstCoveredStart = timeToMinutes(intersecting[0].start || intersecting[0].start_time);
    const lastCoveredEnd = timeToMinutes(intersecting[intersecting.length - 1].end || intersecting[intersecting.length - 1].end_time);

    if (sMin < firstCoveredStart || eMin > lastCoveredEnd) {
      return {
        valid: false,
        error: 'The selected lab time is not fully covered by the configured periods.',
        matchedPeriods: intersecting,
        periodPills: intersecting.map((p, idx) => `P${p.period || (idx + 1)}`),
        breakConflict: null
      };
    }

    // Check for gaps between matched periods
    for (let k = 0; k < intersecting.length - 1; k++) {
      const currentEnd = timeToMinutes(intersecting[k].end || intersecting[k].end_time);
      const nextStart = timeToMinutes(intersecting[k + 1].start || intersecting[k + 1].start_time);
      if (nextStart > currentEnd) {
        if (Math.max(sMin, currentEnd) < Math.min(eMin, nextStart)) {
          return {
            valid: false,
            error: `The configured periods do not cover the complete lab duration (gap between ${formatTime12(currentEnd)} and ${formatTime12(nextStart)}).`,
            matchedPeriods: intersecting,
            periodPills: intersecting.map((p, idx) => `P${p.period || (idx + 1)}`),
            breakConflict: null
          };
        }
      }
    }

    const periodPills = intersecting.map((p, idx) => `P${p.period || (idx + 1)}`);
    const count = intersecting.length;
    const msg = `${count} period${count > 1 ? 's' : ''} matched successfully.`;

    return {
      valid: true,
      error: null,
      matchedPeriods: intersecting,
      periodPills,
      message: msg,
      breakConflict: null
    };
  }

  function checkLabTimeWarning(lc) {
    const s = lc.startTime || lc.start_time;
    const e = lc.endTime || lc.end_time;
    if (!s || !e) return null;
    const sMin = timeToMinutes(s);
    const eMin = timeToMinutes(e);
    if (isNaN(sMin) || isNaN(eMin)) {
      return 'Please enter valid lab start and end times.';
    }
    if (sMin >= eMin) {
      return `End time (${formatTime12(e)}) must be strictly later than start time (${formatTime12(s)}).`;
    }
    const labDays = lc.days && lc.days.length > 0 ? lc.days : (lc.day ? [lc.day] : ['Monday']);
    const dayMode = lc.day_mode || 'every';

    if (dayMode === 'every') {
      for (const d of labDays) {
        const dPeriods = dayPeriodsState[d] || [];
        const dBreaks = (breaksState || []).filter((b) => (b.day || '').toLowerCase() === d.toLowerCase());
        const matchRes = matchLabToDayPeriods(s, e, d, dPeriods, dBreaks);
        if (!matchRes.valid) {
          return matchRes.error;
        }
      }
      return null;
    } else {
      let validOnAny = false;
      const errors = [];
      for (const d of labDays) {
        const dPeriods = dayPeriodsState[d] || [];
        const dBreaks = (breaksState || []).filter((b) => (b.day || '').toLowerCase() === d.toLowerCase());
        const matchRes = matchLabToDayPeriods(s, e, d, dPeriods, dBreaks);
        if (matchRes.valid) {
          validOnAny = true;
          break;
        } else {
          errors.push(`${d}: ${matchRes.error}`);
        }
      }
      if (!validOnAny) {
        return errors[0] || 'The selected lab time is not fully covered by the configured periods on any selected day.';
      }
      return null;
    }
  }

  function renderLabClassFields() {
    if (!labClassFields) return;

    if (labClasses.length === 0) {
      labClassFields.innerHTML = `
        <div class="empty-lab-notice">
          <p>No laboratory classes configured yet. Click <strong>"+ Add Lab Class"</strong> above to schedule practical lab sessions requiring laboratory rooms.</p>
        </div>
      `;
      return;
    }

    const availableSubjects = getEnteredSubjectList();
    const availableSections = getEnteredSectionList();
    const availableLabRooms = getEnteredLabRooms();
    const workingDays = getSelectedWorkingDays();
    const hasLabRooms = availableLabRooms.length > 0;

    labClassFields.innerHTML = labClasses.map((lc, index) => {
      const orderLabel = `LAB ${String(index + 1).padStart(2, '0')}`;
      const eligibleTeachers = teachers.filter((t) => isTeacherEligibleForSubject(t, lc.subject));

      // Normalize multi-day and multi-section state
      if (!Array.isArray(lc.days) || lc.days.length === 0) {
        lc.days = lc.day ? [lc.day] : (workingDays.length > 0 ? [workingDays[0]] : ['Monday']);
      }
      lc.day_mode = lc.day_mode || 'every';
      lc.day = lc.days[0] || (workingDays[0] || 'Monday');

      if (!Array.isArray(lc.sections) || lc.sections.length === 0) {
        lc.sections = lc.section ? [lc.section] : (availableSections.length > 0 ? [availableSections[0]] : ['CSE-A']);
      }
      lc.section_mode = lc.section_mode || 'separate';
      lc.section = lc.sections.join(' & ');

      const subjectOptions = availableSubjects.length > 0
        ? availableSubjects.map((s) => {
            const isSel = s.toLowerCase() === (lc.subject || '').toLowerCase();
            return `<option value="${escapeHtml(s)}" ${isSel ? 'selected' : ''}>${escapeHtml(s)}</option>`;
          }).join('')
        : '<option value="">-- Add subjects in Step 03 first --</option>';

      let teacherOptions = '<option value="">-- Select Teacher --</option>';
      if (eligibleTeachers.length === 0) {
        teacherOptions += '<option value="" disabled>-- No teacher configured for this subject --</option>';
      } else {
        teacherOptions += eligibleTeachers.map((t) => {
          const isSel = t.name.toLowerCase() === (lc.teacher || '').toLowerCase();
          return `<option value="${escapeHtml(t.name)}" ${isSel ? 'selected' : ''}>${escapeHtml(t.name)}</option>`;
        }).join('');
      }

      // Day chips HTML
      const dayChipsHtml = workingDays.map((d) => {
        const isSel = (lc.days || []).some((x) => x.toLowerCase() === d.toLowerCase());
        return `<button type="button" class="chip-pill ${isSel ? 'active' : ''}" data-lab-day-toggle="${index}" data-day="${escapeHtml(d)}" aria-pressed="${isSel}">${escapeHtml(d)}</button>`;
      }).join('');

      // Section chips HTML
      const sectionChipsHtml = availableSections.map((sec) => {
        const isSel = (lc.sections || []).some((x) => x.toLowerCase() === sec.toLowerCase());
        return `<button type="button" class="chip-pill ${isSel ? 'active' : ''}" data-lab-sec-toggle="${index}" data-section="${escapeHtml(sec)}" aria-pressed="${isSel}">${escapeHtml(sec)}</button>`;
      }).join('');

      // Manual start and end times with precise minutes (Requirement 1)
      const curStart = lc.startTime || lc.start_time || '10:00';
      const curEnd = lc.endTime || lc.end_time || '12:00';
      const durText = formatDurationText(curStart, curEnd);
      const timeWarning = checkLabTimeWarning(lc);

      // Compute automatic period allocation (Requirements 2, 5)
      const primaryDay = lc.days && lc.days[0] ? lc.days[0] : (lc.day || 'Monday');
      const primaryPeriods = dayPeriodsState[primaryDay] || [];
      const primaryBreaks = (breaksState || []).filter((b) => (b.day || '').toLowerCase() === primaryDay.toLowerCase());
      const matchResult = matchLabToDayPeriods(curStart, curEnd, primaryDay, primaryPeriods, primaryBreaks);

      if (matchResult.valid) {
        lc.matched_periods = matchResult.periodPills;
        lc.exactSlotIndices = matchResult.matchedPeriods.map((p) => (p.period || 1) - 1);
        lc.duration = matchResult.matchedPeriods.length;
      }

      let roomOptions = '';
      if (!hasLabRooms) {
        roomOptions = '<option value="" disabled selected>No laboratory rooms are configured</option>';
      } else {
        roomOptions = '<option value="">-- Select Laboratory Room --</option>' +
          availableLabRooms.map((r) => {
            const isSel = r.room_number.toLowerCase() === (lc.room || '').toLowerCase();
            return `<option value="${escapeHtml(r.room_number)}" ${isSel ? 'selected' : ''}>${escapeHtml(r.room_number)} (Lab)</option>`;
          }).join('');
      }

      return `
        <div class="lab-item-card inner-form-card" data-lab-card-idx="${index}">
          <div class="card-item-header">
            <div class="lab-order-pill">${orderLabel}</div>
            <button type="button" class="btn-remove-card btn-remove-lab" data-remove-lab="${index}" aria-label="Remove ${orderLabel}">- Remove</button>
          </div>
          <div class="lab-inner-grid">
            <div class="form-group">
              <label for="lab-subject-${index}" class="inner-field-label">Subject <span class="required">*</span></label>
              <select id="lab-subject-${index}" data-lab-subject-idx="${index}" class="lab-subject-select" required>
                <option value="">-- Select Lab Subject --</option>
                ${subjectOptions}
              </select>
            </div>

            <div class="form-group">
              <label for="lab-teacher-${index}" class="inner-field-label">Teacher <span class="required">*</span></label>
              <select id="lab-teacher-${index}" data-lab-teacher-idx="${index}" class="lab-teacher-select" required>
                ${teacherOptions}
              </select>
            </div>

            <!-- Multi-Section Selection & Mode (Requirement 3) -->
            <div class="form-group lab-sections-group" style="grid-column: 1 / -1;">
              <label class="inner-field-label">Target Sections <span class="required">*</span></label>
              <div class="chips-selector-container" id="lab-sections-chips-${index}">
                ${sectionChipsHtml}
              </div>
              <div class="scheduling-mode-row">
                <span class="mode-label">Section Allocation Mode:</span>
                <label class="mode-radio-label">
                  <input type="radio" name="lab_sec_mode_${index}" value="separate" ${(lc.section_mode || 'separate') === 'separate' ? 'checked' : ''} data-lab-secmode="${index}">
                  Separate lab sessions (independent classes per section)
                </label>
                <label class="mode-radio-label">
                  <input type="radio" name="lab_sec_mode_${index}" value="shared" ${lc.section_mode === 'shared' ? 'checked' : ''} data-lab-secmode="${index}">
                  Shared lab session (combined sections attend together)
                </label>
              </div>
            </div>

            <!-- Multi-Day Selection & Mode (Requirement 2) -->
            <div class="form-group lab-days-group" style="grid-column: 1 / -1;">
              <label class="inner-field-label">Configured Working Days <span class="required">*</span></label>
              <div class="chips-selector-container" id="lab-days-chips-${index}">
                ${dayChipsHtml}
              </div>
              <div class="lab-day-period-window-hint" id="lab-day-window-hint-${index}">
                <span style="font-weight: 700; color: #1e40af;">⏱️ Period Span:</span>
                ${getLabDayWindowSummary(lc)}
              </div>
              <div class="scheduling-mode-row">
                <span class="mode-label">Scheduling Behavior:</span>
                <label class="mode-radio-label">
                  <input type="radio" name="lab_day_mode_${index}" value="every" ${(lc.day_mode || 'every') === 'every' ? 'checked' : ''} data-lab-daymode="${index}">
                  Schedule on every selected day
                </label>
                <label class="mode-radio-label">
                  <input type="radio" name="lab_day_mode_${index}" value="single" ${lc.day_mode === 'single' ? 'checked' : ''} data-lab-daymode="${index}">
                  Schedule on one suitable selected day
                </label>
              </div>
            </div>

            <!-- Manual Start & End Time Selection with Auto-Calculated Duration (Requirement 1) -->
            <div class="lab-time-selection-wrap">
              <div class="lab-time-field">
                <label for="lab-start-time-${index}" class="inner-field-label">
                  Start Time <span class="required">*</span>
                  <span class="fixed-lab-timing-indicator" title="Fixed Lab Timing: scheduler will strictly reserve this exact time">Fixed Timing</span>
                </label>
                <input type="time" id="lab-start-time-${index}" data-lab-start-idx="${index}" class="lab-time-input lab-start-input" value="${escapeHtml(curStart)}" required aria-label="Lab ${index + 1} Start Time">
                <span class="lab-time-preview-text" id="lab-start-preview-${index}">${formatTime12(curStart)}</span>
              </div>

              <div class="lab-time-field">
                <label for="lab-end-time-${index}" class="inner-field-label">End Time <span class="required">*</span></label>
                <input type="time" id="lab-end-time-${index}" data-lab-end-idx="${index}" class="lab-time-input lab-end-input" value="${escapeHtml(curEnd)}" required aria-label="Lab ${index + 1} End Time">
                <span class="lab-time-preview-text" id="lab-end-preview-${index}">${formatTime12(curEnd)}</span>
              </div>

              <div class="lab-duration-info-box">
                <span class="lab-duration-label">Calculated Duration</span>
                <span class="lab-duration-badge" id="lab-duration-badge-${index}">
                  ⏱️ <span id="lab-duration-text-${index}">${escapeHtml(durText)}</span>
                </span>
              </div>
            </div>

            <!-- Automatically Matched Periods Display (Requirements 2, 5) -->
            <div class="lab-auto-allocation-card" id="lab-auto-allocation-${index}">
              <div class="lab-auto-allocation-header">
                <span class="allocation-title">⚡ Automatically Matched Periods</span>
                <span class="allocation-badge ${matchResult.valid ? 'badge-success' : 'badge-warning'}" id="lab-match-badge-${index}">
                  ${matchResult.valid ? `${matchResult.matchedPeriods.length} Period${matchResult.matchedPeriods.length > 1 ? 's' : ''}` : 'No Match'}
                </span>
              </div>
              <div class="lab-matched-periods-list" id="lab-matched-chips-${index}">
                ${matchResult.valid
                  ? matchResult.matchedPeriods.map((p) => `
                    <span class="period-match-pill">
                      <span class="pill-num">P${p.period}</span>
                      <span class="pill-time">${formatTimeSlot(p.start, p.end)}</span>
                    </span>
                  `).join('')
                  : `<span class="period-match-empty">No matching periods found for the selected lab time</span>`
                }
              </div>
              <div class="lab-allocation-status ${matchResult.valid ? 'status-ok' : 'status-error'}" id="lab-allocation-status-${index}">
                ${matchResult.valid ? `✓ ${escapeHtml(matchResult.message)}` : `⚠️ ${escapeHtml(matchResult.error)}`}
              </div>
            </div>

            <div class="lab-time-warning-banner ${timeWarning ? 'error-state' : ''}" id="lab-time-warning-${index}" style="display: ${timeWarning ? 'flex' : 'none'};">
              <span class="warning-icon">⚠️</span>
              <span class="warning-text" id="lab-time-warning-text-${index}">${escapeHtml(timeWarning || '')}</span>
            </div>

            <div class="form-group lab-room-group">
              <label for="lab-room-${index}" class="inner-field-label">Laboratory Room <span class="required">*</span></label>
              <select id="lab-room-${index}" data-lab-room-idx="${index}" class="lab-room-select" required ${hasLabRooms ? '' : 'disabled'}>
                ${roomOptions}
              </select>
              <small class="lab-room-warning" id="lab-room-warning-${index}" style="display: ${hasLabRooms ? 'none' : 'block'};">
                ⚠️ No laboratory rooms are configured. Please add a Laboratory room in Step 05.
              </small>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Wire up remove button
    labClassFields.querySelectorAll('.btn-remove-lab').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.dataset.removeLab);
        labClasses.splice(idx, 1);
        renderLabClassFields();
      });
    });

    // Wire up events for subjects, teachers, duration, room
    labClassFields.querySelectorAll('[data-lab-subject-idx]').forEach((select) => {
      select.addEventListener('change', (e) => {
        const idx = Number(e.target.dataset.labSubjectIdx);
        if (labClasses[idx]) {
          labClasses[idx].subject = e.target.value;
          const teacherSelect = document.getElementById(`lab-teacher-${idx}`);
          if (teacherSelect) {
            const eligible = teachers.filter((t) => isTeacherEligibleForSubject(t, labClasses[idx].subject));
            let opts = '<option value="">-- Select Teacher --</option>';
            if (eligible.length === 0) {
              opts += '<option value="" disabled>-- No teacher configured for this subject --</option>';
            } else {
              opts += eligible.map((t) => {
                const isSel = t.name.toLowerCase() === (labClasses[idx].teacher || '').toLowerCase();
                return `<option value="${escapeHtml(t.name)}" ${isSel ? 'selected' : ''}>${escapeHtml(t.name)}</option>`;
              }).join('');
            }
            teacherSelect.innerHTML = opts;
            if (!eligible.some((t) => t.name.toLowerCase() === (labClasses[idx].teacher || '').toLowerCase())) {
              labClasses[idx].teacher = '';
            }
          }
        }
      });
    });

    labClassFields.querySelectorAll('[data-lab-teacher-idx]').forEach((select) => {
      select.addEventListener('change', (e) => {
        const idx = Number(e.target.dataset.labTeacherIdx);
        if (labClasses[idx]) labClasses[idx].teacher = e.target.value;
      });
    });

    labClassFields.querySelectorAll('[data-lab-duration-idx]').forEach((select) => {
      select.addEventListener('change', (e) => {
        const idx = Number(e.target.dataset.labDurationIdx);
        if (labClasses[idx]) labClasses[idx].duration = parseInt(e.target.value, 10);
      });
    });

    labClassFields.querySelectorAll('[data-lab-room-idx]').forEach((select) => {
      select.addEventListener('change', (e) => {
        const idx = Number(e.target.dataset.labRoomIdx);
        if (labClasses[idx]) labClasses[idx].room = e.target.value;
      });
    });

    // Wire up Section Multi-Select Chips
    labClassFields.querySelectorAll('[data-lab-sec-toggle]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = Number(btn.dataset.labSecToggle);
        const sec = btn.dataset.section;
        if (!labClasses[idx]) return;
        if (!Array.isArray(labClasses[idx].sections)) {
          labClasses[idx].sections = [labClasses[idx].section || sec];
        }
        const exists = labClasses[idx].sections.some((s) => s.toLowerCase() === sec.toLowerCase());
        if (exists) {
          if (labClasses[idx].sections.length > 1) {
            labClasses[idx].sections = labClasses[idx].sections.filter((s) => s.toLowerCase() !== sec.toLowerCase());
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
          } else {
            showToast('A lab class must have at least one section selected.');
          }
        } else {
          labClasses[idx].sections.push(sec);
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
        }
        labClasses[idx].section = labClasses[idx].sections.join(' & ');
      });
    });

    // Wire up Section Mode Radios
    labClassFields.querySelectorAll('[data-lab-secmode]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const idx = Number(e.target.dataset.labSecmode);
        if (labClasses[idx]) labClasses[idx].section_mode = e.target.value;
      });
    });

    // Wire up Day Multi-Select Chips
    labClassFields.querySelectorAll('[data-lab-day-toggle]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = Number(btn.dataset.labDayToggle);
        const day = btn.dataset.day;
        if (!labClasses[idx]) return;
        if (!Array.isArray(labClasses[idx].days)) {
          labClasses[idx].days = [labClasses[idx].day || day];
        }
        const exists = labClasses[idx].days.some((d) => d.toLowerCase() === day.toLowerCase());
        if (exists) {
          if (labClasses[idx].days.length > 1) {
            labClasses[idx].days = labClasses[idx].days.filter((d) => d.toLowerCase() !== day.toLowerCase());
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
          } else {
            showToast('A lab class must have at least one working day selected.');
          }
        } else {
          labClasses[idx].days.push(day);
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
        }
        labClasses[idx].day = labClasses[idx].days[0] || '';

        const hintEl = document.getElementById(`lab-day-window-hint-${idx}`);
        if (hintEl) {
          hintEl.innerHTML = `<span style="font-weight: 700; color: #1e40af;">⏱️ Period Span:</span> ${getLabDayWindowSummary(labClasses[idx])}`;
        }
        handleLabTimeUpdate(idx);
      });
    });

    // Wire up Day Mode Radios
    labClassFields.querySelectorAll('[data-lab-daymode]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const idx = Number(e.target.dataset.labDaymode);
        if (labClasses[idx]) {
          labClasses[idx].day_mode = e.target.value;
          handleLabTimeUpdate(idx);
        }
      });
    });

    // Live Manual Lab Time change handler (Requirement 1)
    const handleLabTimeUpdate = (idx) => {
      if (!labClasses[idx]) return;
      const startInput = document.getElementById(`lab-start-time-${idx}`);
      const endInput = document.getElementById(`lab-end-time-${idx}`);
      if (!startInput || !endInput) return;

      const sVal = startInput.value || '10:00';
      const eVal = endInput.value || '12:00';

      labClasses[idx].startTime = sVal;
      labClasses[idx].endTime = eVal;
      labClasses[idx].start_time = sVal;
      labClasses[idx].end_time = eVal;

      const sMin = timeToMinutes(sVal);
      const eMin = timeToMinutes(eVal);

      if (!isNaN(sMin) && !isNaN(eMin) && eMin > sMin) {
        labClasses[idx].duration = Math.max(1, Math.round((eMin - sMin) / 60));
      }

      const startPrev = document.getElementById(`lab-start-preview-${idx}`);
      if (startPrev) startPrev.textContent = formatTime12(sVal);

      const endPrev = document.getElementById(`lab-end-preview-${idx}`);
      if (endPrev) endPrev.textContent = formatTime12(eVal);

      const durTextEl = document.getElementById(`lab-duration-text-${idx}`);
      if (durTextEl) durTextEl.textContent = formatDurationText(sVal, eVal);

      // Live update automatic period matching display (Requirements 2, 5)
      const primaryDay = labClasses[idx].days && labClasses[idx].days[0] ? labClasses[idx].days[0] : (labClasses[idx].day || 'Monday');
      const primaryPeriods = dayPeriodsState[primaryDay] || [];
      const primaryBreaks = (breaksState || []).filter((b) => (b.day || '').toLowerCase() === primaryDay.toLowerCase());
      const matchRes = matchLabToDayPeriods(sVal, eVal, primaryDay, primaryPeriods, primaryBreaks);

      if (matchRes.valid) {
        labClasses[idx].matched_periods = matchRes.periodPills;
        labClasses[idx].exactSlotIndices = matchRes.matchedPeriods.map((p) => (p.period || 1) - 1);
        labClasses[idx].duration = matchRes.matchedPeriods.length;
      }

      const matchBadge = document.getElementById(`lab-match-badge-${idx}`);
      const matchedChips = document.getElementById(`lab-matched-chips-${idx}`);
      const matchStatus = document.getElementById(`lab-allocation-status-${idx}`);

      if (matchBadge && matchedChips && matchStatus) {
        if (matchRes.valid) {
          matchBadge.className = 'allocation-badge badge-success';
          matchBadge.textContent = `${matchRes.matchedPeriods.length} Period${matchRes.matchedPeriods.length > 1 ? 's' : ''}`;
          matchedChips.innerHTML = matchRes.matchedPeriods.map((p) => `
            <span class="period-match-pill">
              <span class="pill-num">P${p.period}</span>
              <span class="pill-time">${formatTimeSlot(p.start, p.end)}</span>
            </span>
          `).join('');
          matchStatus.className = 'lab-allocation-status status-ok';
          matchStatus.textContent = `✓ ${matchRes.message}`;
        } else {
          matchBadge.className = 'allocation-badge badge-warning';
          matchBadge.textContent = 'No Match';
          matchedChips.innerHTML = `<span class="period-match-empty">No matching periods found for the selected lab time</span>`;
          matchStatus.className = 'lab-allocation-status status-error';
          matchStatus.textContent = `⚠️ ${matchRes.error}`;
        }
      }

      // Re-evaluate live warning banner
      const warningText = checkLabTimeWarning(labClasses[idx]);
      const warnBanner = document.getElementById(`lab-time-warning-${idx}`);
      const warnTextEl = document.getElementById(`lab-time-warning-text-${idx}`);
      if (warnBanner && warnTextEl) {
        if (warningText) {
          warnTextEl.textContent = warningText;
          warnBanner.classList.add('error-state');
          warnBanner.style.display = 'flex';
        } else {
          warnBanner.style.display = 'none';
        }
      }
    };

    labClassFields.querySelectorAll('[data-lab-start-idx]').forEach((input) => {
      const idx = Number(input.dataset.labStartIdx);
      input.addEventListener('input', () => handleLabTimeUpdate(idx));
      input.addEventListener('change', () => handleLabTimeUpdate(idx));
    });

    labClassFields.querySelectorAll('[data-lab-end-idx]').forEach((input) => {
      const idx = Number(input.dataset.labEndIdx);
      input.addEventListener('input', () => handleLabTimeUpdate(idx));
      input.addEventListener('change', () => handleLabTimeUpdate(idx));
    });

    labClassFields.querySelectorAll('[data-lab-room-idx]').forEach((select) => {
      select.addEventListener('change', (e) => {
        const idx = Number(e.target.dataset.labRoomIdx);
        if (labClasses[idx]) labClasses[idx].room = e.target.value;
      });
    });

    labClassFields.querySelectorAll('[data-remove-lab]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.dataset.removeLab);
        labClasses.splice(idx, 1);
        renderLabClassFields();
      });
    });
  }

  if (addLabClassBtn) {
    addLabClassBtn.addEventListener('click', () => {
      const availableSubs = getEnteredSubjectList();
      const availableSecs = getEnteredSectionList();
      const labRooms = getEnteredLabRooms();
      const workingDays = getSelectedWorkingDays();

      const defaultSub = availableSubs[0] || '';
      const eligibleTeachers = teachers.filter((t) => isTeacherEligibleForSubject(t, defaultSub));
      const defaultTeacher = eligibleTeachers[0]?.name || '';
      const defaultSec = availableSecs[0] || 'CSE-A';
      const defaultRoom = labRooms[0]?.room_number || '';
      const defaultDay = workingDays[0] || 'Monday';

      const dayPeriods = dayPeriodsState[defaultDay] || [];
      const defStart = dayPeriods[0]?.start || '10:00';
      const defEnd = (dayPeriods[1] ? dayPeriods[1].end : dayPeriods[0]?.end) || '12:00';
      const sMin = timeToMinutes(defStart);
      const eMin = timeToMinutes(defEnd);
      const dur = (eMin > sMin) ? Math.max(1, Math.round((eMin - sMin) / 60)) : 2;

      labClasses.push({
        subject: defaultSub,
        teacher: defaultTeacher,
        section: defaultSec,
        sections: [defaultSec],
        section_mode: 'separate',
        day: defaultDay,
        days: [defaultDay],
        day_mode: 'every',
        startTime: defStart,
        endTime: defEnd,
        start_time: defStart,
        end_time: defEnd,
        duration: dur,
        room: defaultRoom
      });

      renderLabClassFields();
    });
  }

  // ==============================================================================
  // BREAK MANAGEMENT LOGIC & UI (Requirements Part 2-9)
  // ==============================================================================
  let breaksState = [];
  const breaksListContainer = document.getElementById('breaksListContainer');
  const addBreakBtn = document.getElementById('addBreakBtn');
  const addCommonBreakBtn = document.getElementById('addCommonBreakBtn');

  function renderBreaks() {
    if (!breaksListContainer) return;

    if (!breaksState || breaksState.length === 0) {
      breaksListContainer.innerHTML = `
        <div class="breaks-empty-state">
          <span style="font-size: 1.25rem;">☕</span>
          <span>No breaks configured. Click <strong>"+ Add Break"</strong> to configure day-specific intervals or <strong>"☕ Add Lunch Break (All Days)"</strong>.</span>
        </div>
      `;
      return;
    }

    const workingDays = getSelectedWorkingDays();

    breaksListContainer.innerHTML = breaksState.map((b, idx) => {
      const isLunch = (b.name || '').toLowerCase().includes('lunch') || (b.type || '').toLowerCase().includes('lunch');
      const tagClass = isLunch ? 'break-badge-tag' : 'break-badge-tag break-badge-tag--short';
      const cardClass = isLunch ? 'break-item-card break-item-card--lunch' : 'break-item-card';

      const dayOptions = workingDays.map((d) => {
        const isSel = (b.day || '').toLowerCase() === d.toLowerCase();
        return `<option value="${escapeHtml(d)}" ${isSel ? 'selected' : ''}>${escapeHtml(d)}</option>`;
      }).join('');

      return `
        <div class="${cardClass}" data-break-id="${escapeHtml(b.id)}">
          <div class="break-card-header">
            <div class="break-card-title">
              <span>☕ BREAK ${idx + 1}</span>
              <span class="${tagClass}">${escapeHtml(b.type || 'Break')}</span>
            </div>
            <button type="button" class="btn-remove-break" data-break-remove="${escapeHtml(b.id)}" title="Remove this break" aria-label="Remove break">✕</button>
          </div>
          <div class="break-form-grid">
            <div class="break-field-group">
              <label class="break-field-label">Day</label>
              <select class="break-form-control break-day-select" data-break-field="day" data-break-id="${escapeHtml(b.id)}">
                ${dayOptions}
              </select>
            </div>
            <div class="break-field-group">
              <label class="break-field-label">Break Name</label>
              <input type="text" class="break-form-control break-name-input" data-break-field="name" data-break-id="${escapeHtml(b.id)}" value="${escapeHtml(b.name || 'Short Break')}" placeholder="e.g. Lunch Break" required>
            </div>
            <div class="break-field-group">
              <label class="break-field-label">Start Time</label>
              <input type="time" class="break-form-control break-start-input" data-break-field="start_time" data-break-id="${escapeHtml(b.id)}" value="${escapeHtml((b.start_time || b.startTime || '11:00').substring(0, 5))}" required>
            </div>
            <div class="break-field-group">
              <label class="break-field-label">End Time</label>
              <input type="time" class="break-form-control break-end-input" data-break-field="end_time" data-break-id="${escapeHtml(b.id)}" value="${escapeHtml((b.end_time || b.endTime || '11:15').substring(0, 5))}" required>
            </div>
            <div class="break-field-group">
              <label class="break-field-label">Break Type</label>
              <select class="break-form-control break-type-select" data-break-field="type" data-break-id="${escapeHtml(b.id)}">
                <option value="Short Break" ${(b.type === 'Short Break') ? 'selected' : ''}>Short Break</option>
                <option value="Lunch Break" ${(b.type === 'Lunch Break') ? 'selected' : ''}>Lunch Break</option>
                <option value="Tea Break" ${(b.type === 'Tea Break') ? 'selected' : ''}>Tea Break</option>
                <option value="Assembly" ${(b.type === 'Assembly') ? 'selected' : ''}>Assembly</option>
                <option value="Activity" ${(b.type === 'Activity') ? 'selected' : ''}>Activity</option>
                <option value="Other" ${(b.type === 'Other') ? 'selected' : ''}>Other</option>
              </select>
            </div>
            <div class="break-field-group" style="align-self: flex-end;">
              <button type="button" class="btn-remove-break" data-break-remove="${escapeHtml(b.id)}" title="Remove this break" aria-label="Remove break">🗑</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach field event listeners
    breaksListContainer.querySelectorAll('[data-break-field]').forEach((input) => {
      input.addEventListener('change', (e) => {
        const bId = e.target.dataset.breakId;
        const field = e.target.dataset.breakField;
        const found = breaksState.find((b) => b.id === bId);
        if (found) {
          found[field] = e.target.value.trim();
          if (field === 'start_time') found.startTime = e.target.value.trim();
          if (field === 'end_time') found.endTime = e.target.value.trim();
          if (field === 'type' && !found.name_modified) {
            found.name = e.target.value;
          }
          if (field === 'name') {
            found.name_modified = true;
          }
        }
      });
    });

    breaksListContainer.querySelectorAll('[data-break-remove]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const bId = btn.dataset.breakRemove;
        breaksState = breaksState.filter((b) => b.id !== bId);
        renderBreaks();
      });
    });
  }

  function addBreak(defaults = {}) {
    const activeDays = getSelectedWorkingDays();
    const targetDay = defaults.day || (activeDays.length > 0 ? activeDays[0] : 'Monday');
    const newBreak = {
      id: defaults.id || `brk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: defaults.name || 'Short Break',
      day: targetDay,
      start_time: defaults.start_time || defaults.startTime || '11:00',
      end_time: defaults.end_time || defaults.endTime || '11:15',
      type: defaults.type || 'Short Break'
    };
    breaksState.push(newBreak);
    renderBreaks();
  }

  function addCommonLunchBreak() {
    const activeDays = getSelectedWorkingDays();
    for (const d of activeDays) {
      const alreadyHas = breaksState.some((b) =>
        b.day.toLowerCase() === d.toLowerCase() &&
        (b.name.toLowerCase().includes('lunch') || (b.start_time === '13:00' && b.end_time === '14:00'))
      );
      if (!alreadyHas) {
        breaksState.push({
          id: `brk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: 'Lunch Break',
          day: d,
          start_time: '13:00',
          end_time: '14:00',
          type: 'Lunch Break'
        });
      }
    }
    renderBreaks();
    showToast('Added standard Lunch Break (13:00–14:00) to all active working days.');
  }

  if (addBreakBtn) {
    addBreakBtn.addEventListener('click', () => addBreak());
  }

  if (addCommonBreakBtn) {
    addCommonBreakBtn.addEventListener('click', () => addCommonLunchBreak());
  }

  async function loadBreaks() {
    try {
      const fetched = await apiRequest('GET', '/breaks');
      if (Array.isArray(fetched) && fetched.length > 0) {
        breaksState = fetched.map((b) => ({
          id: b.id || `brk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: b.name || b.break_name || 'Break',
          day: b.day || 'Monday',
          start_time: (b.start_time || b.startTime || '11:00').substring(0, 5),
          end_time: (b.end_time || b.endTime || '11:15').substring(0, 5),
          type: b.type || b.break_type || 'Short Break'
        }));
      } else {
        breaksState = [];
      }
      renderBreaks();
    } catch (_) {
      breaksState = [];
      renderBreaks();
    }
  }
  loadBreaks();

  // ==============================================================================
  // BREAK CONFIGURATION COPY TOOL (Requirement 3)
  // ==============================================================================
  const toggleBreakCopyBtn = document.getElementById('toggleBreakCopyBtn');
  const breakCopyContent = document.getElementById('breakCopyContent');
  const copyBreakSourceDay = document.getElementById('copyBreakSourceDay');
  const copyBreakDestDays = document.getElementById('copyBreakDestDays');
  const breakSelectableList = document.getElementById('breakSelectableList');
  const executeCopyBreakBtn = document.getElementById('executeCopyBreakBtn');
  const breakCopyStatusMsg = document.getElementById('breakCopyStatusMsg');

  function renderBreakCopyControls() {
    if (!copyBreakSourceDay || !copyBreakDestDays) return;
    const activeDays = getSelectedWorkingDays();
    if (activeDays.length === 0) return;

    const currentSource = copyBreakSourceDay.value;
    const selectedSource = activeDays.includes(currentSource) ? currentSource : activeDays[0];

    copyBreakSourceDay.innerHTML = activeDays.map((d) =>
      `<option value="${escapeHtml(d)}" ${d === selectedSource ? 'selected' : ''}>${escapeHtml(d)}</option>`
    ).join('');

    const effectiveSource = copyBreakSourceDay.value || activeDays[0];
    const availableDests = activeDays.filter((d) => d.toLowerCase() !== effectiveSource.toLowerCase());

    const existingActiveDests = Array.from(copyBreakDestDays.querySelectorAll('.dest-day-chip.active'))
      .map((c) => c.dataset.destDay);

    copyBreakDestDays.innerHTML = availableDests.map((d) => {
      const isSel = existingActiveDests.includes(d);
      return `<button type="button" class="dest-day-chip ${isSel ? 'active' : ''}" data-dest-day="${escapeHtml(d)}" aria-pressed="${isSel}">${escapeHtml(d)}</button>`;
    }).join('');

    copyBreakDestDays.querySelectorAll('.dest-day-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const isActive = chip.classList.toggle('active');
        chip.setAttribute('aria-pressed', String(isActive));
      });
    });

    renderBreakSelectableChecklist(effectiveSource);
  }

  function renderBreakSelectableChecklist(sourceDay) {
    if (!breakSelectableList) return;
    const sourceBreaks = (breaksState || []).filter((b) => (b.day || '').toLowerCase() === (sourceDay || '').toLowerCase());
    if (sourceBreaks.length === 0) {
      breakSelectableList.innerHTML = `<span style="font-size: 0.8rem; color: #64748b; padding: 4px;">No breaks configured on ${escapeHtml(sourceDay)}.</span>`;
      return;
    }

    breakSelectableList.innerHTML = sourceBreaks.map((b) => `
      <label class="break-check-item">
        <input type="checkbox" value="${escapeHtml(b.id)}" checked data-copy-break-id="${escapeHtml(b.id)}">
        <span><strong>${escapeHtml(b.name)}</strong> (${formatTimeSlot(b.start_time || b.startTime, b.end_time || b.endTime)}) - <em>${escapeHtml(b.type || 'Break')}</em></span>
      </label>
    `).join('');
  }

  if (toggleBreakCopyBtn && breakCopyContent) {
    toggleBreakCopyBtn.addEventListener('click', () => {
      const isHidden = breakCopyContent.style.display === 'none';
      breakCopyContent.style.display = isHidden ? 'block' : 'none';
      toggleBreakCopyBtn.setAttribute('aria-expanded', String(isHidden));
      toggleBreakCopyBtn.querySelector('.toggle-copy-text').textContent = isHidden ? 'Hide Copy ▲' : 'Copy Break Configuration ▼';
      if (isHidden) renderBreakCopyControls();
    });
  }

  if (copyBreakSourceDay) {
    copyBreakSourceDay.addEventListener('change', () => {
      const sourceDay = copyBreakSourceDay.value;
      renderBreakCopyControls();
    });
  }

  document.querySelectorAll('input[name="breakCopyMode"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      if (breakSelectableList) {
        breakSelectableList.style.display = e.target.value === 'selected' ? 'flex' : 'none';
        if (e.target.value === 'selected') {
          renderBreakSelectableChecklist(copyBreakSourceDay?.value);
        }
      }
    });
  });

  function showBreakCopyStatus(msg, type) {
    if (!breakCopyStatusMsg) return;
    breakCopyStatusMsg.textContent = msg;
    breakCopyStatusMsg.className = `copy-status-msg ${type}`;
    setTimeout(() => {
      if (breakCopyStatusMsg && breakCopyStatusMsg.textContent === msg) {
        breakCopyStatusMsg.textContent = '';
      }
    }, 4500);
  }

  if (executeCopyBreakBtn) {
    executeCopyBreakBtn.addEventListener('click', () => {
      const sourceDay = copyBreakSourceDay?.value;
      if (!sourceDay) {
        showBreakCopyStatus('Please select a source day to copy from.', 'error');
        return;
      }

      const activeDestChips = Array.from(copyBreakDestDays.querySelectorAll('.dest-day-chip.active'));
      const destDays = activeDestChips.map((c) => c.dataset.destDay).filter(Boolean);

      if (destDays.length === 0) {
        showBreakCopyStatus('Please select at least one destination day.', 'error');
        return;
      }

      const sourceBreaks = (breaksState || []).filter((b) => (b.day || '').toLowerCase() === sourceDay.toLowerCase());
      if (sourceBreaks.length === 0) {
        showBreakCopyStatus(`No breaks configured on ${sourceDay} to copy.`, 'error');
        return;
      }

      const modeRadio = document.querySelector('input[name="breakCopyMode"]:checked');
      const copyMode = modeRadio ? modeRadio.value : 'all';

      let breaksToCopy = [];
      if (copyMode === 'all') {
        breaksToCopy = [...sourceBreaks];
      } else {
        const checkedIds = Array.from(breakSelectableList.querySelectorAll('input[data-copy-break-id]:checked'))
          .map((cb) => cb.value);
        breaksToCopy = sourceBreaks.filter((b) => checkedIds.includes(b.id));
      }

      if (breaksToCopy.length === 0) {
        showBreakCopyStatus('Please select at least one break to copy.', 'error');
        return;
      }

      for (const destDay of destDays) {
        const destPeriods = dayPeriodsState[destDay] || [];
        let dayStartMin = 0;
        let dayEndMin = 1440;
        if (destPeriods.length > 0) {
          dayStartMin = timeToMinutes(destPeriods[0].start);
          dayEndMin = timeToMinutes(destPeriods[destPeriods.length - 1].end);
        } else {
          const workStart = document.getElementById('startTime')?.value || '09:00';
          const workEnd = document.getElementById('endTime')?.value || '16:00';
          dayStartMin = timeToMinutes(workStart);
          dayEndMin = timeToMinutes(workEnd);
        }

        for (const b of breaksToCopy) {
          const bStart = b.start_time || b.startTime;
          const bEnd = b.end_time || b.endTime;
          const bStartMin = timeToMinutes(bStart);
          const bEndMin = timeToMinutes(bEnd);

          if (bStartMin >= bEndMin) {
            showBreakCopyStatus(`Break '${b.name}' has invalid times: start must be before end.`, 'error');
            return;
          }

          if (bStartMin < dayStartMin || bEndMin > dayEndMin) {
            showBreakCopyStatus(`Break '${b.name}' (${formatTimeSlot(bStart, bEnd)}) falls outside configured hours on ${destDay} (${formatTime12(dayStartMin)} – ${formatTime12(dayEndMin)}).`, 'error');
            return;
          }
        }
      }

      // Check destination break overlaps
      for (const destDay of destDays) {
        const existingBreaks = breaksState.filter((b) => (b.day || '').toLowerCase() === destDay.toLowerCase());
        for (const bToCopy of breaksToCopy) {
          const s1 = timeToMinutes(bToCopy.start_time || bToCopy.startTime);
          const e1 = timeToMinutes(bToCopy.end_time || bToCopy.endTime);

          for (const eb of existingBreaks) {
            const s2 = timeToMinutes(eb.start_time || eb.startTime);
            const e2 = timeToMinutes(eb.end_time || eb.endTime);
            if (s1 === s2 && e1 === e2) continue; // duplicate exact slot will be skipped
            if (Math.max(s1, s2) < Math.min(e1, e2)) {
              showBreakCopyStatus(`Copied break '${bToCopy.name}' overlaps with existing break '${eb.name}' on ${destDay}.`, 'error');
              return;
            }
          }
        }
      }

      let copiedCount = 0;
      destDays.forEach((destDay) => {
        breaksToCopy.forEach((b) => {
          const bStart = (b.start_time || b.startTime || '').substring(0, 5);
          const bEnd = (b.end_time || b.endTime || '').substring(0, 5);
          const alreadyExists = breaksState.some((existing) =>
            (existing.day || '').toLowerCase() === destDay.toLowerCase() &&
            (existing.start_time === bStart || existing.startTime === bStart) &&
            (existing.end_time === bEnd || existing.endTime === bEnd)
          );

          if (!alreadyExists) {
            breaksState.push({
              id: `brk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              name: b.name,
              day: destDay,
              start_time: bStart,
              end_time: bEnd,
              startTime: bStart,
              endTime: bEnd,
              type: b.type || 'Short Break'
            });
            copiedCount++;
          }
        });
      });

      renderBreaks();
      renderBreakCopyControls();
      showBreakCopyStatus(`✓ Successfully copied ${copiedCount} break(s) to ${destDays.join(', ')}.`, 'success');
      showToast(`Copied ${copiedCount} break(s) to ${destDays.join(', ')}!`);
    });
  }

  function validateBreaks() {
    for (let i = 0; i < breaksState.length; i++) {
      const b = breaksState[i];
      const sMin = timeToMinutes(b.start_time);
      const eMin = timeToMinutes(b.end_time);

      if (sMin >= eMin) {
        return {
          valid: false,
          error: `Break '${b.name}' on ${b.day} has invalid times: start time (${b.start_time}) must be earlier than end time (${b.end_time}).`
        };
      }
      if (eMin - sMin <= 0) {
        return {
          valid: false,
          error: `Break '${b.name}' on ${b.day} cannot have zero duration.`
        };
      }
    }

    // Overlap validation between breaks on the same day (Part 5 Rule 3)
    for (let i = 0; i < breaksState.length; i++) {
      for (let j = i + 1; j < breaksState.length; j++) {
        const bi = breaksState[i];
        const bj = breaksState[j];
        if (bi.day.toLowerCase() === bj.day.toLowerCase()) {
          const s1 = timeToMinutes(bi.start_time);
          const e1 = timeToMinutes(bi.end_time);
          const s2 = timeToMinutes(bj.start_time);
          const e2 = timeToMinutes(bj.end_time);
          if (Math.max(s1, s2) < Math.min(e1, e2)) {
            return {
              valid: false,
              error: `Break times overlap. Break '${bj.name}' overlaps with '${bi.name}' on ${bi.day}.`
            };
          }
        }
      }
    }

    return { valid: true };
  }

  // Validate configured periods per working day against intervals and day boundary validity
  function validateDayPeriodsConfiguration(dayPeriodsState, selectedWorkingDays) {
    for (const day of selectedWorkingDays) {
      const periods = dayPeriodsState[day] || [];
      if (!periods || periods.length === 0) continue;

      const dayStartMin = timeToMinutes(periods[0].start);
      const dayEndMin = timeToMinutes(periods[periods.length - 1].end);
      if (!isNaN(dayStartMin) && !isNaN(dayEndMin) && dayEndMin <= dayStartMin) {
        return {
          valid: false,
          error: `${day}'s configured end time must be later than its start time.`
        };
      }

      for (let i = 0; i < periods.length; i++) {
        const p = periods[i];
        const pNum = p.period || (i + 1);
        const sMin = timeToMinutes(p.start);
        const eMin = timeToMinutes(p.end);

        if (isNaN(sMin) || isNaN(eMin) || sMin >= eMin) {
          return {
            valid: false,
            error: `Period ${pNum} on ${day} has invalid timing: start time (${formatTime12(sMin)}) must be earlier than end time (${formatTime12(eMin)}).`
          };
        }
      }

      for (let i = 0; i < periods.length; i++) {
        for (let j = i + 1; j < periods.length; j++) {
          const pi = periods[i];
          const pj = periods[j];
          const s1 = timeToMinutes(pi.start);
          const e1 = timeToMinutes(pi.end);
          const s2 = timeToMinutes(pj.start);
          const e2 = timeToMinutes(pj.end);
          if (Math.max(s1, s2) < Math.min(e1, e2)) {
            return {
              valid: false,
              error: `Period overlap on ${day}: Period ${pi.period || (i + 1)} (${formatTime12(s1)} – ${formatTime12(e1)}) overlaps with Period ${pj.period || (j + 1)} (${formatTime12(s2)} – ${formatTime12(e2)}).`
            };
          }
        }
      }
    }

    return { valid: true };
  }

  // Form Submit Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage();

    // 0. Validate Department Selection (Requirements 3-8, 32, 65)
    const selectedDepartment = (departmentNameInput?.value || departmentSelect?.value || '').trim();
    if (!selectedDepartment) {
      showMessage('Department name cannot be empty. Please enter or select a department.', 'error');
      if (departmentNameInput) departmentNameInput.focus();
      return;
    }

    const teacherCount = Number.parseInt(teacherCountInput.value, 10);
    if (!Number.isInteger(teacherCount) || teacherCount < 1) {
      showMessage('Please specify a valid number of teachers.', 'error');
      teacherCountInput.focus();
      return;
    }

    // 1. Validate Teachers
    const teacherInputs = Array.from(teacherFields.querySelectorAll('[data-teacher-idx]'));
    if (teacherInputs.length !== teacherCount) {
      showMessage('Please configure all teacher name and assigned subject fields.', 'error');
      return;
    }

    const trimmedTeachers = [];
    for (let i = 0; i < teacherInputs.length; i++) {
      const val = teacherInputs[i].value.trim();
      if (!val) {
        showMessage(`Please enter Teacher ${i + 1} name.`, 'error');
        teacherInputs[i].focus();
        return;
      }
      const tSubjects = teachers[i]?.subjects || [];
      if (!tSubjects.length) {
        showMessage(`Please assign at least one subject or NA to Teacher ${i + 1} (${val}).`, 'error');
        return;
      }
      trimmedTeachers.push({
        name: val,
        subjects: tSubjects,
        is_na: tSubjects.includes('NA')
      });
    }

    // Prevent duplicate teacher names
    const lowerTeacherNames = trimmedTeachers.map((t) => t.name.toLowerCase());
    if (new Set(lowerTeacherNames).size !== lowerTeacherNames.length) {
      showMessage('Teacher names must be unique.', 'error');
      return;
    }

    // 2. Validate Subject Names (Trimmed, Non-Empty, Unique)
    const subjectInputs = Array.from(subjectFields.querySelectorAll('[data-subject-index]'));
    if (!subjectInputs.length) {
      showMessage('Please enter at least one subject/course.', 'error');
      return;
    }

    const trimmedSubjectNames = [];
    for (let i = 0; i < subjectInputs.length; i++) {
      const val = subjectInputs[i].value.trim();
      if (!val) {
        showMessage(`Please enter Subject ${i + 1} name.`, 'error');
        subjectInputs[i].focus();
        return;
      }
      trimmedSubjectNames.push(val);
    }

    // Formula: subjects <= teachers + 2
    const maxAllowedSubjects = teacherCount + 2;
    if (trimmedSubjectNames.length > maxAllowedSubjects) {
      showMessage(`Maximum ${maxAllowedSubjects} subjects are allowed for ${teacherCount} teachers.`, 'error');
      return;
    }

    // Prevent duplicate subject names
    const lowerSubjectNames = trimmedSubjectNames.map((s) => s.toLowerCase());
    if (new Set(lowerSubjectNames).size !== lowerSubjectNames.length) {
      showMessage('Subject names must be unique.', 'error');
      return;
    }

    // Verify every teacher's assigned subjects exist in the subjects list (unless NA)
    for (const t of trimmedTeachers) {
      if (!t.is_na) {
        for (const sub of t.subjects) {
          if (!trimmedSubjectNames.some((s) => s.toLowerCase() === sub.toLowerCase())) {
            showMessage(`Teacher '${t.name}' is assigned to subject '${sub}', which does not exist in the configured subjects list.`, 'error');
            return;
          }
        }
      }
    }

    // Verify every subject has at least one qualified teacher assigned
    for (const s of trimmedSubjectNames) {
      const hasTeacher = trimmedTeachers.some((t) =>
        t.is_na || t.subjects.some((ts) => ts.toLowerCase() === s.toLowerCase() || ts.toLowerCase().replace(/\s+lab$/i, '') === s.toLowerCase())
      );
      if (!hasTeacher) {
        showMessage(`No teacher is assigned to teach subject '${s}'. Please assign at least one teacher to '${s}'.`, 'error');
        return;
      }
    }

    // 3. Validate Sections (Trimmed, Non-Empty, Unique)
    const sectionInputs = Array.from(sectionFields.querySelectorAll('[data-section-index]'));
    if (!sectionInputs.length) {
      showMessage('Please add at least one class/section.', 'error');
      return;
    }

    const trimmedSectionNames = [];
    for (let i = 0; i < sectionInputs.length; i++) {
      const val = sectionInputs[i].value.trim();
      if (!val) {
        showMessage(`Please enter Section ${i + 1} name.`, 'error');
        sectionInputs[i].focus();
        return;
      }
      trimmedSectionNames.push(val);
    }

    // Prevent duplicate section names
    const lowerSectionNames = trimmedSectionNames.map((s) => s.toLowerCase());
    if (new Set(lowerSectionNames).size !== lowerSectionNames.length) {
      showMessage('Section names must be unique.', 'error');
      return;
    }

    // 4. Validate Rooms (Trimmed, Non-Empty, Unique, Valid Room Type)
    const roomNumInputs = Array.from(roomFields.querySelectorAll('[data-room-num-index]'));
    const roomTypeSelects = Array.from(roomFields.querySelectorAll('[data-room-type-index]'));
    if (!roomNumInputs.length) {
      showMessage('Please add at least one room.', 'error');
      return;
    }

    const configuredRooms = [];
    for (let i = 0; i < roomNumInputs.length; i++) {
      const numVal = roomNumInputs[i].value.trim();
      if (!numVal) {
        showMessage(`Please enter Room ${i + 1} number or name.`, 'error');
        roomNumInputs[i].focus();
        return;
      }
      const typeVal = roomTypeSelects[i] ? roomTypeSelects[i].value : 'Classroom';
      configuredRooms.push({
        room_number: numVal,
        room_type: typeVal
      });
    }

    // Prevent duplicate room numbers
    const lowerRoomNumbers = configuredRooms.map((r) => r.room_number.toLowerCase());
    if (new Set(lowerRoomNumbers).size !== lowerRoomNumbers.length) {
      showMessage('Room numbers must be unique.', 'error');
      return;
    }

    const selectedWorkingDays = getSelectedWorkingDays();
    if (!selectedWorkingDays || selectedWorkingDays.length === 0) {
      showMessage('Please select at least one working day.', 'error');
      return;
    }

    // 5. Validate Lab Classes (Requirements 19-26, 64)
    for (let i = 0; i < labClasses.length; i++) {
      const lc = labClasses[i];
      if (!lc.subject) {
        showMessage(`Please select a subject for Lab ${i + 1}.`, 'error');
        return;
      }
      if (!lc.teacher) {
        showMessage(`Please select an eligible teacher for Lab ${i + 1} (${lc.subject}).`, 'error');
        return;
      }
      const labSecs = lc.sections && lc.sections.length > 0 ? lc.sections : (lc.section ? [lc.section] : []);
      if (!labSecs || labSecs.length === 0) {
        showMessage(`Please select at least one section for Lab ${i + 1}.`, 'error');
        return;
      }
      const labDays = lc.days && lc.days.length > 0 ? lc.days : (lc.day ? [lc.day] : []);
      if (!labDays || labDays.length === 0) {
        showMessage('Please select at least one day for the lab class.', 'error');
        return;
      }
      for (const d of labDays) {
        if (!selectedWorkingDays.some((wd) => wd.toLowerCase() === d.toLowerCase())) {
          showMessage(`Lab day must be a working day. '${d}' is not among configured working days.`, 'error');
          return;
        }
      }
      // Check timing against day's periods and working hours
      const labStart = lc.startTime || lc.start_time;
      const labEnd = lc.endTime || lc.end_time;
      if (labStart && labEnd) {
        const labStartMin = timeToMinutes(labStart);
        const labEndMin = timeToMinutes(labEnd);
        if (labStartMin >= labEndMin) {
          showMessage(`Lab class ${i + 1} (${lc.subject || 'Practical'}): Start time must be earlier than end time.`, 'error');
          return;
        }

        const dayMode = lc.day_mode || 'every';
        if (dayMode === 'every') {
          for (const d of labDays) {
            const dPeriods = dayPeriodsState[d] || [];
            const dBreaks = (breaksState || []).filter((b) => (b.day || '').toLowerCase() === d.toLowerCase());
            const matchRes = matchLabToDayPeriods(labStart, labEnd, d, dPeriods, dBreaks);
            if (!matchRes.valid) {
              showMessage(
                `Lab ${i + 1} (${lc.subject || 'Practical'}): ${matchRes.error} Selected lab time is outside the configured timetable period. Please adjust the lab timing or add more periods to ${d} in Step 06.`,
                'error'
              );
              return;
            }
          }
        } else {
          // 'single' mode: check candidate days
          let validOnAny = false;
          let firstError = '';

          for (const d of labDays) {
            const dPeriods = dayPeriodsState[d] || [];
            const dBreaks = (breaksState || []).filter((b) => (b.day || '').toLowerCase() === d.toLowerCase());
            const matchRes = matchLabToDayPeriods(labStart, labEnd, d, dPeriods, dBreaks);
            if (matchRes.valid) {
              validOnAny = true;
              break;
            } else if (!firstError) {
              firstError = matchRes.error;
            }
          }

          if (!validOnAny) {
            showMessage(
              `Lab ${i + 1} (${lc.subject || 'Practical'}): ${firstError || 'Selected lab time is outside the configured timetable period on all candidate days.'} Selected lab time is outside the configured timetable period.`,
              'error'
            );
            return;
          }
        }
      }
      if (!lc.duration || lc.duration < 1) {
        showMessage(`Please specify a valid duration for Lab ${i + 1}.`, 'error');
        return;
      }
    }

    // 6. Global Room Type Filter (Optional, defaults to Both if room requirement box is removed)
    const roomTypeInput = document.getElementById('roomType');
    const roomTypePreference = roomTypeInput ? (roomTypeInput.value || 'Both') : 'Both';

    // 5.5 Validate Breaks (Requirements Part 5)
    const breakValidation = validateBreaks();
    if (!breakValidation.valid) {
      showMessage(breakValidation.error, 'error');
      return;
    }

    const workingDays = selectedWorkingDays.length;

    // Validate Day Periods configuration against intervals and day boundaries
    const periodValidation = validateDayPeriodsConfiguration(dayPeriodsState, selectedWorkingDays);
    if (!periodValidation.valid) {
      showMessage(`⚠️ ${periodValidation.error}`, 'error');
      return;
    }

    // Determine overall working span from the actual configured periods
    let minDayStartMin = Infinity;
    let maxDayEndMin = -Infinity;
    selectedWorkingDays.forEach((day) => {
      const periods = dayPeriodsState[day] || [];
      if (periods.length > 0) {
        const sM = timeToMinutes(periods[0].start);
        const eM = timeToMinutes(periods[periods.length - 1].end);
        if (!isNaN(sM) && sM < minDayStartMin) minDayStartMin = sM;
        if (!isNaN(eM) && eM > maxDayEndMin) maxDayEndMin = eM;
      }
    });

    const startTime = document.getElementById('startTime')?.value || '09:00';
    const endTime = document.getElementById('endTime')?.value || '16:00';

    const effectiveWorkStart = minDayStartMin !== Infinity ? minutesToTime(minDayStartMin) : startTime;
    const effectiveWorkEnd = maxDayEndMin !== -Infinity ? minutesToTime(maxDayEndMin) : endTime;

    const submitBtn = form.querySelector('button[type="submit"]') || document.getElementById('generateSubmitBtn');
    const originalBtnContent = submitBtn.innerHTML;
    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span> <span class="btn-text">Generating weekly timetable...</span>';
    showMessage(`Deploying multi-constraint solver across ${workingDays} configured working day(s) for ${selectedDepartment}...`, 'info');

    try {
      // Persist active breaks to backend
      try {
        await apiRequest('POST', '/breaks', breaksState);
      } catch (_) {}

      const payload = {
        department: selectedDepartment,
        departmentId: selectedDepartment,
        day_periods: dayPeriodsState,
        breaks: breaksState.map((b) => ({
          id: b.id,
          name: b.name,
          day: b.day,
          startTime: b.start_time || b.startTime,
          endTime: b.end_time || b.endTime,
          type: b.type
        })),
        teachers: trimmedTeachers.map((t) => ({
          name: t.name,
          subjects: t.subjects,
          is_na: t.is_na,
          subject: t.subjects.join(', ')
        })),
        subjects: trimmedSubjectNames,
        sections: trimmedSectionNames.map((name) => ({ name })),
        rooms: configuredRooms,
        room_type: roomTypePreference,
        lab_classes: labClasses.map((lc) => ({
          subject: lc.subject,
          teacher: lc.teacher,
          section: (lc.sections && lc.sections.length > 0) ? lc.sections[0] : (lc.section || ''),
          sections: lc.sections && lc.sections.length > 0 ? lc.sections : (lc.section ? [lc.section] : ['CSE-A']),
          section_mode: lc.section_mode || 'separate',
          day: (lc.days && lc.days.length > 0) ? lc.days[0] : (lc.day || 'Monday'),
          days: lc.days && lc.days.length > 0 ? lc.days : (lc.day ? [lc.day] : ['Monday']),
          day_mode: lc.day_mode || 'every',
          start_time: lc.startTime || lc.start_time || '',
          end_time: lc.endTime || lc.end_time || '',
          duration: Number(lc.duration || 2),
          room: lc.room || ''
        })),
        working_days: selectedWorkingDays,
        working_days_per_week: workingDays,
        working_start_time: effectiveWorkStart,
        working_end_time: effectiveWorkEnd
      };

      // Update status pill to Generating state (Requirement 6B)
      const statusPill = document.getElementById('summaryStatusPill');
      if (statusPill) {
        statusPill.textContent = 'Generating...';
        statusPill.className = 'summary-status-pill status-generating';
      }

      const result = await apiRequest('POST', '/generate', payload);

      latestGenerationResult = result;

      if (result.status === 'VALID') {
        showMessage(`✓ Timetable generated successfully. (${result.entries_created} periods scheduled for ${selectedDepartment})`, 'success');
        showToast('Timetable generated successfully.');
      } else if (result.status === 'WARNING') {
        showMessage(`⚠️ Timetable generated with warnings. Please review the highlighted conflicts. (${result.conflicts?.length || 0} conflict(s) detected)`, 'warning');
        showToast('Timetable generated with warnings. Please review highlighted conflicts.');
      } else if (result.status === 'INCOMPLETE') {
        showMessage(`⚠️ Timetable generated partially. Some classes could not be scheduled. (${result.unscheduled_classes?.length || 0} unscheduled)`, 'warning');
        showToast('Timetable generated partially. Some classes could not be scheduled.');
      } else {
        showMessage(`✓ ${result.message || 'Timetable generated.'} (${result.entries_created} periods scheduled)`, 'success');
        showToast(result.message || 'Timetable generated.');
      }

      // Refresh saved departments and load timetable output
      await initDepartments(selectedDepartment);
      await loadTimetable();

      const timetableSection = document.getElementById('timetableSection');
      if (timetableSection) {
        timetableSection.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      const statusPill = document.getElementById('summaryStatusPill');
      if (statusPill) {
        statusPill.textContent = 'Generation Failed';
        statusPill.className = 'summary-status-pill status-failed';
      }
      let friendlyMsg = error.message;
      if (friendlyMsg.includes('Could not generate a conflict-free schedule')) {
        // preserve specific capacity guidance
      } else if (friendlyMsg.includes('violates') || friendlyMsg.includes('postgres') || friendlyMsg.includes('supabase') || friendlyMsg.includes('duplicate key') || friendlyMsg.includes('Internal Server')) {
        friendlyMsg = 'Not enough valid day/time/room combinations are available for the requested timetable. Please review faculty count, room availability, and working hours.';
      } else if (friendlyMsg.includes('No rooms available') || friendlyMsg.includes('No suitable')) {
        friendlyMsg = 'No rooms are available to satisfy the chosen room type filter. Please add more rooms or change the requirement to Both.';
      }
      showMessage(`⚠️ ${friendlyMsg}`, 'error');
      showToast(friendlyMsg);
    } finally {
      submitBtn.classList.remove('is-loading');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnContent;
    }
  });

  form.addEventListener('reset', () => {
    window.setTimeout(() => {
      teachers = [
        { name: 'Dr. Rahul Kumar', subjects: ['DBMS'] },
        { name: 'Prof. Ananya Sharma', subjects: ['DSA'] },
        { name: 'Prof. Rajesh Verma', subjects: ['Java'] }
      ];
      if (teacherCountInput) teacherCountInput.value = teachers.length;
      renderTeacherFields();
      subjects = ['DBMS', 'DSA', 'Java'];
      sections = ['CSE-A'];
      rooms = [
        { room_number: '101', room_type: 'Classroom' },
        { room_number: 'Lab-1', room_type: 'Laboratory' }
      ];
      labClasses = [];
      if (workingDayPillsContainer) {
        workingDayPillsContainer.querySelectorAll('.day-toggle-pill').forEach((p, idx) => {
          const shouldBeActive = idx < 5;
          p.classList.toggle('active', shouldBeActive);
          p.setAttribute('aria-pressed', String(shouldBeActive));
        });
      }
      if (presetButtons) {
        presetButtons.forEach((b) => b.classList.toggle('active', b.dataset.preset === '5'));
      }
      if (workingDaysInput) {
        workingDaysInput.value = 5;
      }
      renderSubjectFields();
      renderSectionFields();
      renderRoomFields();
      renderLabClassFields();
      renderDayPeriods();
      updateSubjectLimit();
      hideMessage();
    }, 0);
  });

  // Initial renders
  renderTeacherFields();
  renderSubjectFields();
  renderSectionFields();
  renderRoomFields();
  renderLabClassFields();
  renderDayPeriods();

  const startTimeInput = document.getElementById('startTime');
  const endTimeInput = document.getElementById('endTime');

  const updateBaselinePreviews = () => {
    const sVal = startTimeInput?.value || '09:00';
    const eVal = endTimeInput?.value || '16:00';
    const sDisp = document.getElementById('startTimeDisplay');
    const eDisp = document.getElementById('endTimeDisplay');
    if (sDisp) sDisp.textContent = formatTime12(sVal);
    if (eDisp) eDisp.textContent = formatTime12(eVal);
  };

  if (startTimeInput) {
    startTimeInput.addEventListener('input', updateBaselinePreviews);
    startTimeInput.addEventListener('change', () => {
      updateBaselinePreviews();
      renderLabClassFields();
    });
  }
  if (endTimeInput) {
    endTimeInput.addEventListener('input', updateBaselinePreviews);
    endTimeInput.addEventListener('change', () => {
      updateBaselinePreviews();
      renderLabClassFields();
    });
  }
  updateBaselinePreviews();

  // ==============================================================================
  // 8-PERIOD DAILY CLASSES WORKFLOW & EXAMPLE GENERATOR
  // ==============================================================================
  const load8PeriodTemplateBtn = document.getElementById('load8PeriodTemplateBtn');
  const load8PeriodExampleBtn = document.getElementById('load8PeriodExampleBtn');
  const toggle8PeriodGuideBtn = document.getElementById('toggle8PeriodGuideBtn');
  const close8PeriodGuideBtn = document.getElementById('close8PeriodGuideBtn');
  const applyGuide8PeriodBtn = document.getElementById('applyGuide8PeriodBtn');
  const guide8PeriodCard = document.getElementById('guide8PeriodCard');
  const guideBtnText = document.getElementById('guideBtnText');

  const STANDARD_8_PERIOD_SLOTS = [
    { period: 1, start: '09:00', end: '09:50' },
    { period: 2, start: '09:50', end: '10:40' },
    { period: 3, start: '10:40', end: '11:30' },
    { period: 4, start: '11:30', end: '12:20' },
    { period: 5, start: '13:00', end: '13:50' },
    { period: 6, start: '13:50', end: '14:40' },
    { period: 7, start: '14:40', end: '15:30' },
    { period: 8, start: '15:30', end: '16:20' }
  ];

  function apply8PeriodTemplate() {
    const activeDays = getSelectedWorkingDays();
    if (activeDays.length === 0) {
      showToast('Please select at least one working day.');
      return;
    }

    activeDays.forEach((day) => {
      dayPeriodsState[day] = STANDARD_8_PERIOD_SLOTS.map((p) => ({ ...p }));
    });

    // Ensure lunch break is configured from 12:20 to 13:00 on each active day
    activeDays.forEach((day) => {
      const existing = breaksState.find(
        (b) => b.day.toLowerCase() === day.toLowerCase() &&
               (b.name.toLowerCase().includes('lunch') || (b.start_time === '12:20' && b.end_time === '13:00'))
      );
      if (existing) {
        existing.start_time = '12:20';
        existing.end_time = '13:00';
      } else {
        breaksState.push({
          id: `brk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: 'Lunch Break',
          day: day,
          start_time: '12:20',
          end_time: '13:00',
          type: 'Lunch Break'
        });
      }
    });

    renderDayPeriods();
    renderBreaks();
    showToast('Applied 8-Period Daily Template (8 periods, lunch 12:20–13:00) across all active days.');
  }

  function load8PeriodFullExample() {
    // 1. Department
    const deptInput = document.getElementById('departmentNameInput');
    const deptSelect = document.getElementById('departmentSelect');
    if (deptInput) deptInput.value = 'Computer Science & Engineering';
    if (deptSelect) deptSelect.value = 'Computer Science & Engineering';

    // 2. Teachers (4 faculty with balanced subject assignments)
    teachers = [
      { name: 'Dr. Rahul Kumar', subjects: ['DBMS', 'Computer Networks'] },
      { name: 'Prof. Ananya Sharma', subjects: ['Data Structures', 'Algorithms'] },
      { name: 'Prof. Rajesh Verma', subjects: ['Operating Systems', 'Computer Networks'] },
      { name: 'Dr. Alan Turing', subjects: ['Theory of Computation', 'Algorithms'] }
    ];
    if (teacherCountInput) teacherCountInput.value = teachers.length;
    renderTeacherFields();

    // 3. Subjects (6 subjects with faculty coverage)
    subjects = [
      'DBMS',
      'Data Structures',
      'Operating Systems',
      'Computer Networks',
      'Theory of Computation',
      'Algorithms'
    ];
    renderSubjectFields();
    updateSubjectLimit();

    // 4. Sections (2 balanced sections)
    sections = ['CSE-A', 'CSE-B'];
    renderSectionFields();

    // 5. Rooms (2 classrooms + 1 lab)
    rooms = [
      { room_number: 'Room 201', room_type: 'Classroom' },
      { room_number: 'Room 202', room_type: 'Classroom' },
      { room_number: 'Lab-A', room_type: 'Laboratory' }
    ];
    renderRoomFields();

    // 6. Working Days (Mon-Fri)
    if (workingDayPillsContainer) {
      workingDayPillsContainer.querySelectorAll('.day-toggle-pill').forEach((p, idx) => {
        const shouldBeActive = idx < 5;
        p.classList.toggle('active', shouldBeActive);
        p.setAttribute('aria-pressed', String(shouldBeActive));
      });
    }
    if (presetButtons) {
      presetButtons.forEach((b) => b.classList.toggle('active', b.dataset.preset === '5'));
    }
    if (workingDaysInput) {
      workingDaysInput.value = 5;
    }

    // 7. Periods (8 periods daily)
    const activeDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    activeDays.forEach((day) => {
      dayPeriodsState[day] = STANDARD_8_PERIOD_SLOTS.map((p) => ({ ...p }));
    });

    // 8. Breaks (Lunch 12:20 - 13:00)
    breaksState = activeDays.map((d) => ({
      id: `brk_${d.toLowerCase()}_lunch`,
      name: 'Lunch Break',
      day: d,
      start_time: '12:20',
      end_time: '13:00',
      type: 'Lunch Break'
    }));
    renderBreaks();

    // 9. Lab Classes (Morning lab blocks for sections A and B)
    labClasses = [
      {
        subject: 'DBMS',
        teacher: 'Dr. Rahul Kumar',
        section: 'CSE-A',
        sections: ['CSE-A'],
        section_mode: 'separate',
        day: 'Monday',
        days: ['Monday'],
        day_mode: 'every',
        startTime: '09:00',
        endTime: '10:40',
        duration: 2,
        room: 'Lab-A'
      },
      {
        subject: 'DBMS',
        teacher: 'Dr. Rahul Kumar',
        section: 'CSE-B',
        sections: ['CSE-B'],
        section_mode: 'separate',
        day: 'Tuesday',
        days: ['Tuesday'],
        day_mode: 'every',
        startTime: '09:00',
        endTime: '10:40',
        duration: 2,
        room: 'Lab-A'
      },
      {
        subject: 'Data Structures',
        teacher: 'Prof. Ananya Sharma',
        section: 'CSE-A',
        sections: ['CSE-A'],
        section_mode: 'separate',
        day: 'Wednesday',
        days: ['Wednesday'],
        day_mode: 'every',
        startTime: '09:00',
        endTime: '10:40',
        duration: 2,
        room: 'Lab-A'
      },
      {
        subject: 'Data Structures',
        teacher: 'Prof. Ananya Sharma',
        section: 'CSE-B',
        sections: ['CSE-B'],
        section_mode: 'separate',
        day: 'Thursday',
        days: ['Thursday'],
        day_mode: 'every',
        startTime: '09:00',
        endTime: '10:40',
        duration: 2,
        room: 'Lab-A'
      }
    ];

    renderDayPeriods();
    renderLabClassFields();
    hideMessage();
    showToast('Loaded 8-Period Daily Example! Click "Generate Timetable" to produce a 100% clash-free schedule.');
  }

  function toggle8PeriodGuide(open) {
    if (!guide8PeriodCard) return;
    const isCurrentlyOpen = guide8PeriodCard.style.display !== 'none';
    const shouldOpen = typeof open === 'boolean' ? open : !isCurrentlyOpen;
    guide8PeriodCard.style.display = shouldOpen ? 'block' : 'none';
    if (toggle8PeriodGuideBtn) {
      toggle8PeriodGuideBtn.setAttribute('aria-expanded', String(shouldOpen));
      if (guideBtnText) {
        guideBtnText.textContent = shouldOpen ? '📖 Hide Setup Guide ▲' : '📖 View Setup Guide ▼';
      }
    }
  }

  if (load8PeriodTemplateBtn) {
    load8PeriodTemplateBtn.addEventListener('click', apply8PeriodTemplate);
  }
  if (load8PeriodExampleBtn) {
    load8PeriodExampleBtn.addEventListener('click', load8PeriodFullExample);
  }
  if (applyGuide8PeriodBtn) {
    applyGuide8PeriodBtn.addEventListener('click', () => {
      load8PeriodFullExample();
      toggle8PeriodGuide(false);
    });
  }
  if (toggle8PeriodGuideBtn) {
    toggle8PeriodGuideBtn.addEventListener('click', () => toggle8PeriodGuide());
  }
  if (close8PeriodGuideBtn) {
    close8PeriodGuideBtn.addEventListener('click', () => toggle8PeriodGuide(false));
  }

  // Interactive Timetable Edit Mode Toggle (Requirements 1, 2)
  const editTimetableBtn = document.getElementById('editTimetableBtn');
  if (editTimetableBtn) {
    editTimetableBtn.addEventListener('click', () => {
      toggleTimetableEditMode();
    });
  }

  const doneEditingBannerBtn = document.getElementById('doneEditingBannerBtn');
  if (doneEditingBannerBtn) {
    doneEditingBannerBtn.addEventListener('click', () => {
      toggleTimetableEditMode(false);
    });
  }

  // Download PDF Button (Requirement 10: PDF must reflect final saved timetable and warn if unsaved edits exist)
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
      const editModal = document.getElementById('editTimetableModal');
      if (editModal && editModal.style.display !== 'none' && typeof isEditDirty !== 'undefined' && isEditDirty) {
        if (!confirm('You have unsaved changes in the timetable editor. Please save your changes before downloading the PDF to ensure the export reflects your latest edits. Do you wish to continue and export without saving your open edits?')) {
          return;
        }
      }
      const deptFilter = document.getElementById('timetableDeptFilter');
      const deptVal = deptFilter ? deptFilter.value : 'all';
      const q = deptVal && deptVal !== 'all' ? `?department=${encodeURIComponent(deptVal)}` : '';
      window.location.href = `/api/timetable/pdf${q}`;
    });
  }

  // Refresh Timetable Button (Safely handles unsaved changes)
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      if (typeof isEditDirty !== 'undefined' && isEditDirty) {
        if (!confirm('You have unsaved changes in the timetable editor. Refreshing will discard unsaved edits. Do you wish to continue?')) {
          return;
        }
      }
      try {
        await loadTimetable();
        showToast('Timetable refreshed from Supabase');
      } catch (err) {
        showMessage(`Error refreshing timetable: ${err.message}`, 'error');
      }
    });
  }

  // Clear Timetable Button
  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete the entire timetable from Supabase?')) {
        return;
      }

      try {
        await apiRequest('DELETE', '/timetable');
        showMessage('✓ Timetable cleared successfully from Supabase.', 'success');
        showToast('Timetable cleared');
        const timetableSection = document.getElementById('timetableSection');
        if (timetableSection) timetableSection.style.display = 'none';
        const container = document.getElementById('daywiseTimetableContainer');
        if (container) container.innerHTML = '';
      } catch (error) {
        showMessage(`Error clearing timetable: ${error.message}`, 'error');
      }
    });
  }

  // Warn on tab closing if there are unsaved edits
  window.addEventListener('beforeunload', (e) => {
    if (typeof isEditDirty !== 'undefined' && isEditDirty) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes in the timetable editor.';
      return e.returnValue;
    }
  });
}

// Rooms Page Setup
function setupRoomsPage() {
  const form = document.getElementById('roomForm');
  const roomsBody = document.getElementById('roomsBody');
  const addButton = document.getElementById('addRoomButton');
  const message = document.getElementById('roomMessage');
  if (!form || !roomsBody || !addButton) return;

  const submitButton = document.getElementById('roomSubmit');
  const cancelButton = document.getElementById('roomCancel');
  let editingId = null;

  function showRoomMsg(text, type) {
    if (!message) return;
    message.textContent = text;
    message.className = `message show ${type}`;
  }

  function clearRoomMsg() {
    if (!message) return;
    message.textContent = '';
    message.className = 'message';
  }

  function resetRoomForm() {
    editingId = null;
    form.reset();
    document.getElementById('roomCapacity').value = '40';
    submitButton.textContent = 'Add Room';
    form.hidden = true;
  }

  async function loadRooms() {
    roomsBody.innerHTML = '<tr><td colspan="4" class="no-data">Loading rooms from Supabase...</td></tr>';
    try {
      const rooms = await apiRequest('GET', '/rooms');
      if (!rooms || rooms.length === 0) {
        roomsBody.innerHTML = '<tr><td colspan="4" class="no-data">No rooms found in Supabase. Click "+ Add Room" to create one.</td></tr>';
        return;
      }

      roomsBody.innerHTML = rooms.map((r) => `
        <tr>
          <td><strong>${escapeHtml(r.room_name)}</strong></td>
          <td><span class="status-badge status-available">${escapeHtml(r.room_type)}</span></td>
          <td>${escapeHtml(r.capacity)} students</td>
          <td class="table-actions">
            <button class="btn-small btn-secondary" type="button" data-edit-room="${r.room_id}">Edit</button>
            <button class="btn-small btn-danger" type="button" data-delete-room="${r.room_id}" data-room-name="${escapeHtml(r.room_name)}">Delete</button>
          </td>
        </tr>
      `).join('');
    } catch (error) {
      roomsBody.innerHTML = `<tr><td colspan="4" class="no-data" style="color: #ef4444;">Unable to load rooms: ${escapeHtml(error.message)}</td></tr>`;
    }
  }

  addButton.addEventListener('click', () => {
    clearRoomMsg();
    form.hidden = false;
    document.getElementById('roomNumber').focus();
  });

  if (cancelButton) cancelButton.addEventListener('click', resetRoomForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitButton.disabled = true;

    const roomName = document.getElementById('roomNumber').value.trim();
    const roomType = document.getElementById('roomType').value;
    const capacity = Number(document.getElementById('roomCapacity').value);

    if (!roomName) {
      showRoomMsg('Room name is required.', 'error');
      submitButton.disabled = false;
      return;
    }

    try {
      const payload = { room_name: roomName, room_type: roomType, capacity };
      await apiRequest(editingId ? 'PUT' : 'POST', editingId ? `/rooms/${editingId}` : '/rooms', payload);
      showRoomMsg(editingId ? '✓ Room updated in Supabase.' : '✓ Room added to Supabase.', 'success');
      resetRoomForm();
      await loadRooms();
    } catch (err) {
      showRoomMsg(`Error: ${err.message}`, 'error');
    } finally {
      submitButton.disabled = false;
    }
  });

  roomsBody.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-edit-room]');
    const deleteBtn = e.target.closest('[data-delete-room]');

    if (editBtn) {
      const roomId = editBtn.dataset.editRoom;
      try {
        const rooms = await apiRequest('GET', '/rooms');
        const room = rooms.find((r) => String(r.room_id) === String(roomId));
        if (room) {
          editingId = room.room_id;
          document.getElementById('roomNumber').value = room.room_name;
          document.getElementById('roomType').value = room.room_type;
          document.getElementById('roomCapacity').value = room.capacity;
          submitButton.textContent = 'Update Room';
          form.hidden = false;
          form.scrollIntoView({ behavior: 'smooth' });
        }
      } catch (err) {
        showRoomMsg(`Error: ${err.message}`, 'error');
      }
    } else if (deleteBtn) {
      const roomId = deleteBtn.dataset.deleteRoom;
      const roomName = deleteBtn.dataset.roomName;
      if (!confirm(`Are you sure you want to delete ${roomName}?`)) return;

      try {
        await apiRequest('DELETE', `/rooms/${roomId}`);
        showRoomMsg('✓ Room deleted successfully.', 'success');
        await loadRooms();
      } catch (err) {
        showRoomMsg(`Error deleting room: ${err.message}`, 'error');
      }
    }
  });

  loadRooms();
}

/**
 * Coordinated Feature Visual Interactions & Scroll Animations
 * Requirement 8, 9, 10 for Features Page Visuals
 */
function initFeatureVisualInteractions() {
  const featureRows = document.querySelectorAll('.features-zigzag-row');
  if (!featureRows || featureRows.length === 0) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  featureRows.forEach((row) => {
    const card = row.querySelector('.zigzag-card');
    const visualWrap = row.querySelector('.zigzag-visual-wrap');

    if (card && visualWrap) {
      // 1. Card hover triggers visual elevation & highlight
      card.addEventListener('mouseenter', () => {
        row.classList.add('is-card-hovered');
      });
      card.addEventListener('mouseleave', () => {
        row.classList.remove('is-card-hovered');
      });

      // 2. Visual hover triggers card highlight
      visualWrap.addEventListener('mouseenter', () => {
        row.classList.add('is-visual-hovered');
      });
      visualWrap.addEventListener('mouseleave', () => {
        row.classList.remove('is-visual-hovered');
      });
    }
  });

  // 3. Scroll Entrance Observer
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    // If reduced motion is requested or observer unavailable, reveal immediately
    document.querySelectorAll('.zigzag-visual-wrap').forEach((el) => {
      el.classList.add('is-revealed');
    });
    return;
  }

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -40px 0px',
    threshold: 0.15
  };

  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const visualWrap = entry.target.querySelector('.zigzag-visual-wrap');
        if (visualWrap) {
          visualWrap.classList.add('is-revealed');
        }
        obs.unobserve(entry.target);
      }
    });
  }, observerOptions);

  featureRows.forEach((row) => {
    revealObserver.observe(row);
  });
}

// ==============================================================================
// FORMSPARK FOOTER FEEDBACK INTEGRATION (Form ID: k2ffqAiIu)
// ==============================================================================
const FORMSPARK_FORM_ID = 'k2ffqAiIu';
const FORMSPARK_ENDPOINT = 'https://submit-form.com/k2ffqAiIu';

let lastFocusedElementBeforeFeedback = null;
let feedbackAutoCloseTimer = null;
let isFeedbackSubmitting = false;

function ensureFeedbackModal() {
  let modal = document.getElementById('feedbackModal');
  if (modal) return modal;

  const modalHtml = `
  <div id="feedbackModal" class="feedback-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="feedbackModalTitle" aria-describedby="feedbackModalDesc" style="display: none;">
    <div class="feedback-modal-backdrop" data-feedback-close></div>
    <div class="feedback-modal-card" role="document">
      <div class="feedback-modal-header">
        <div class="feedback-header-text">
          <h3 id="feedbackModalTitle" class="feedback-modal-title">Share Your Feedback</h3>
          <p id="feedbackModalDesc" class="feedback-modal-desc">Help us improve SchedX. Tell us about your experience, suggestions, or any problems you encountered.</p>
        </div>
        <button type="button" class="feedback-modal-close" data-feedback-close aria-label="Close feedback modal">&times;</button>
      </div>

      <form id="feedbackForm" class="feedback-form" novalidate>
        <div id="feedbackStatusBanner" class="feedback-status-banner" style="display: none;" role="alert"></div>

        <div class="feedback-field-group">
          <label for="feedbackName" class="feedback-label">
            Name <span class="feedback-optional">(optional)</span>
          </label>
          <input 
            type="text" 
            id="feedbackName" 
            name="name" 
            class="feedback-input" 
            placeholder="Your name" 
            autocomplete="name"
            maxlength="100"
          />
        </div>

        <div class="feedback-field-group">
          <label for="feedbackEmail" class="feedback-label">
            Email <span class="feedback-optional">(optional)</span>
          </label>
          <input 
            type="email" 
            id="feedbackEmail" 
            name="email" 
            class="feedback-input" 
            placeholder="you@example.com" 
            autocomplete="email"
            maxlength="120"
          />
        </div>

        <div class="feedback-field-group">
          <label for="feedbackCategory" class="feedback-label">Feedback Category</label>
          <select id="feedbackCategory" name="category" class="feedback-select">
            <option value="General Feedback">General Feedback</option>
            <option value="Feature Request">Feature Request</option>
            <option value="Bug Report">Bug Report</option>
            <option value="UI/UX Suggestion">UI/UX Suggestion</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div class="feedback-field-group">
          <label for="feedbackMessage" class="feedback-label">
            Feedback Message <span class="feedback-required" aria-hidden="true">*</span>
          </label>
          <textarea 
            id="feedbackMessage" 
            name="message" 
            class="feedback-textarea" 
            rows="4" 
            placeholder="Share your thoughts, suggestions, or describe any issue..." 
            required
          ></textarea>
          <div id="feedbackMessageError" class="feedback-inline-error" style="display: none;" role="alert"></div>
        </div>

        <div class="feedback-actions">
          <button type="button" class="feedback-btn feedback-btn-secondary" data-feedback-close id="feedbackCancelBtn">Cancel</button>
          <button type="submit" class="feedback-btn feedback-btn-primary" id="feedbackSubmitBtn">
            <span class="feedback-btn-text">Send Feedback</span>
            <span class="feedback-btn-spinner" aria-hidden="true" style="display: none;"></span>
          </button>
        </div>
      </form>
    </div>
  </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  return document.getElementById('feedbackModal');
}

function openFeedbackModal() {
  const modal = ensureFeedbackModal();
  if (!modal) return;

  if (feedbackAutoCloseTimer) {
    clearTimeout(feedbackAutoCloseTimer);
    feedbackAutoCloseTimer = null;
  }

  lastFocusedElementBeforeFeedback = document.activeElement;

  const errorEl = document.getElementById('feedbackMessageError');
  const bannerEl = document.getElementById('feedbackStatusBanner');
  if (errorEl) {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }
  if (bannerEl) {
    bannerEl.style.display = 'none';
    bannerEl.textContent = '';
    bannerEl.className = 'feedback-status-banner';
  }

  modal.style.display = 'flex';
  void modal.offsetWidth;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  const nameInput = document.getElementById('feedbackName');
  if (nameInput) {
    setTimeout(() => nameInput.focus(), 60);
  }
}

function closeFeedbackModal() {
  const modal = document.getElementById('feedbackModal');
  if (!modal) return;

  if (feedbackAutoCloseTimer) {
    clearTimeout(feedbackAutoCloseTimer);
    feedbackAutoCloseTimer = null;
  }

  modal.classList.remove('active');
  document.body.style.overflow = '';

  setTimeout(() => {
    if (!modal.classList.contains('active')) {
      modal.style.display = 'none';
      if (lastFocusedElementBeforeFeedback && typeof lastFocusedElementBeforeFeedback.focus === 'function') {
        try { lastFocusedElementBeforeFeedback.focus(); } catch (e) {}
      }
    }
  }, 250);
}

async function handleFeedbackSubmit(event) {
  if (event) event.preventDefault();

  if (isFeedbackSubmitting) return;

  const form = document.getElementById('feedbackForm');
  const nameInput = document.getElementById('feedbackName');
  const emailInput = document.getElementById('feedbackEmail');
  const categorySelect = document.getElementById('feedbackCategory');
  const messageInput = document.getElementById('feedbackMessage');
  const errorEl = document.getElementById('feedbackMessageError');
  const bannerEl = document.getElementById('feedbackStatusBanner');
  const submitBtn = document.getElementById('feedbackSubmitBtn');
  const cancelBtn = document.getElementById('feedbackCancelBtn');
  const btnText = submitBtn ? submitBtn.querySelector('.feedback-btn-text') : null;
  const btnSpinner = submitBtn ? submitBtn.querySelector('.feedback-btn-spinner') : null;

  if (errorEl) {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }
  if (bannerEl) {
    bannerEl.style.display = 'none';
    bannerEl.textContent = '';
    bannerEl.className = 'feedback-status-banner';
  }

  const rawMessage = messageInput ? messageInput.value : '';
  const trimmedMessage = rawMessage.trim();

  // Validate required message (not empty, not only whitespace)
  if (!trimmedMessage) {
    if (errorEl) {
      errorEl.textContent = 'Feedback message is required and cannot be empty.';
      errorEl.style.display = 'block';
    }
    if (messageInput) {
      messageInput.focus();
    }
    return;
  }

  // Prevent duplicate submissions and update UI to loading state
  isFeedbackSubmitting = true;
  if (submitBtn) submitBtn.disabled = true;
  if (cancelBtn) cancelBtn.disabled = true;
  if (btnText) btnText.textContent = 'Sending Feedback...';
  if (btnSpinner) btnSpinner.style.display = 'inline-block';

  const payload = {
    name: nameInput && nameInput.value.trim() ? nameInput.value.trim() : undefined,
    email: emailInput && emailInput.value.trim() ? emailInput.value.trim() : undefined,
    category: categorySelect ? categorySelect.value : 'General Feedback',
    message: trimmedMessage,
    source: 'SchedX Website'
  };

  let submitSuccess = false;

  try {
    let response;
    try {
      response = await fetch(FORMSPARK_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (directErr) {
      // Direct request failed (e.g. adblock / CORS / network), fallback to server proxy
      response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    }

    if (response && response.ok) {
      submitSuccess = true;
    } else {
      submitSuccess = false;
    }
  } catch (err) {
    console.error('Feedback submission failed:', err);
    submitSuccess = false;
  }

  if (submitSuccess) {
    // Show success message
    if (bannerEl) {
      bannerEl.textContent = 'Thank you! Your feedback has been submitted successfully.';
      bannerEl.className = 'feedback-status-banner feedback-status-success';
      bannerEl.style.display = 'block';
    }
    // Clear form after successful submission
    if (form) form.reset();

    // Auto-close after brief delay while letting user read success message
    feedbackAutoCloseTimer = setTimeout(() => {
      closeFeedbackModal();
    }, 2400);
  } else {
    // Show error message
    if (bannerEl) {
      bannerEl.textContent = 'Your feedback could not be submitted. Please try again.';
      bannerEl.className = 'feedback-status-banner feedback-status-error';
      bannerEl.style.display = 'block';
    }
    // Entered feedback is preserved in form fields (not reset)
  }

  // Restore button state
  isFeedbackSubmitting = false;
  if (submitBtn) submitBtn.disabled = false;
  if (cancelBtn) cancelBtn.disabled = false;
  if (btnText) btnText.textContent = 'Send Feedback';
  if (btnSpinner) btnSpinner.style.display = 'none';
}

function initFeedbackSystem() {
  ensureFeedbackModal();

  // Global click delegate for open and close triggers
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-feedback-open], .footer-feedback-link, .footer-feedback-btn, #footerFeedbackTrigger, #openFeedbackBtn');
    if (trigger) {
      event.preventDefault();
      openFeedbackModal();
      return;
    }

    const closeBtn = event.target.closest('[data-feedback-close]');
    if (closeBtn) {
      event.preventDefault();
      closeFeedbackModal();
      return;
    }
  });

  // Global keydown listener for Escape
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' || event.key === 'Esc') {
      const modal = document.getElementById('feedbackModal');
      if (modal && modal.classList.contains('active')) {
        closeFeedbackModal();
      }
    }
  });

  // Delegate submit event
  document.addEventListener('submit', (event) => {
    if (event.target && event.target.id === 'feedbackForm') {
      handleFeedbackSubmit(event);
    }
  });
}

window.openFeedbackModal = openFeedbackModal;
window.closeFeedbackModal = closeFeedbackModal;
window.initFeedbackSystem = initFeedbackSystem;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupTimetableForm();
  setupRoomsPage();
  loadTimetable();
  initFeatureVisualInteractions();
  initFeedbackSystem();
});

// Also immediately call initFeedbackSystem if DOM is already ready
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  initFeedbackSystem();
}
