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
  if (!messageDiv) return;
  messageDiv.textContent = text;
  messageDiv.className = `message show ${type}`;
  messageDiv.style.display = 'block';
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

function formatTimeSlot(startTime, endTime) {
  const s = String(startTime || '09:00').substring(0, 5);
  const e = String(endTime || '10:00').substring(0, 5);
  return `${s} - ${e}`;
}

// Load Persisted Day-by-Day Timetable from Supabase / Backend Store
async function loadTimetable() {
  const container = document.getElementById('daywiseTimetableContainer');
  const timetableSection = document.getElementById('timetableSection');

  if (!container || !timetableSection) return;

  try {
    const timetable = await apiRequest('GET', '/timetable');

    if (!timetable || timetable.length === 0) {
      container.innerHTML = '<div class="empty-day-notice">No timetable generated yet. Fill the form above and click "Generate Timetable".</div>';
      timetableSection.style.display = 'none';
      return;
    }

    // Group entries by Day
    const dayMap = new Map();
    for (const d of WORKING_DAYS_ORDER) {
      dayMap.set(d, []);
    }

    for (const entry of timetable) {
      const day = entry.day || 'Monday';
      if (!dayMap.has(day)) {
        dayMap.set(day, []);
      }
      dayMap.get(day).push(entry);
    }

    // Sort each day's entries chronologically by start_time
    for (const [day, entries] of dayMap.entries()) {
      entries.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
    }

    // Filter to only days that have entries or configured working days
    const activeDays = Array.from(dayMap.keys()).filter((day) => {
      return (dayMap.get(day) && dayMap.get(day).length > 0);
    });

    if (activeDays.length === 0) {
      container.innerHTML = '<div class="empty-day-notice">No classes scheduled.</div>';
      timetableSection.style.display = 'block';
      return;
    }

    container.innerHTML = activeDays.map((day) => {
      const entries = dayMap.get(day) || [];
      const classCount = entries.length;

      if (classCount === 0) {
        return `
          <div class="day-card">
            <div class="day-card-header">
              <h3 class="day-title">${escapeHtml(day)}</h3>
              <span class="day-count-badge" style="background: #f1f5f9; color: #64748b;">0 Classes</span>
            </div>
            <div class="empty-day-notice">${escapeHtml(day)}: No classes scheduled.</div>
          </div>
        `;
      }

      return `
        <div class="day-card">
          <div class="day-card-header">
            <h3 class="day-title">
              <span>📅 ${escapeHtml(day)}</span>
            </h3>
            <span class="day-count-badge">${classCount} Class${classCount === 1 ? '' : 'es'}</span>
          </div>
          <div class="day-table-container">
            <table class="timetable">
              <thead>
                <tr>
                  <th>Time Slot</th>
                  <th>Section / Class</th>
                  <th>Subject / Course</th>
                  <th>Teacher</th>
                  <th>Room</th>
                  <th>Room Type</th>
                </tr>
              </thead>
              <tbody>
                ${entries.map((entry) => `
                  <tr>
                    <td><strong>${escapeHtml(formatTimeSlot(entry.start_time, entry.end_time))}</strong></td>
                    <td>
                      <span class="status-badge" style="background: rgba(45, 108, 223, 0.1); color: var(--primary-dark); font-weight: 700;">
                        ${escapeHtml(entry.section || entry.class_name || 'General')}
                      </span>
                    </td>
                    <td><strong>${escapeHtml(entry.course_name || entry.subject || 'Course')}</strong></td>
                    <td>${escapeHtml(entry.teacher_name || 'Faculty')}</td>
                    <td>
                      <span class="status-badge" style="background: #ecfdf5; color: #047857; font-weight: 700;">
                        🚪 ${escapeHtml(entry.room_name || 'Room')}
                      </span>
                    </td>
                    <td>
                      <span class="status-badge status-available">
                        ${escapeHtml(entry.room_type || 'Classroom')}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');

    timetableSection.style.display = 'block';
  } catch (error) {
    console.error('Error loading timetable from Supabase:', error);
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Generate Page Form Setup
function setupTimetableForm() {
  const form = document.getElementById('timetableForm');
  if (!form) return;

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

  let teachers = []; // stores strings (teacher names only)
  let subjects = ['']; // initial single subject row
  let sections = ['CSE-A']; // initial default section
  let rooms = [{ room_number: '101', room_type: 'Classroom' }]; // initial default room

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

  // Dynamic Teacher Fields (Teacher Name only)
  function renderTeacherFields() {
    const count = Number.parseInt(teacherCountInput.value, 10);
    if (!Number.isInteger(count) || count < 1) {
      teacherFields.innerHTML = '';
      teachers = [];
      updateSubjectLimit();
      return;
    }

    const existing = [...teachers];
    teachers = Array.from({ length: count }, (_, index) => existing[index] || '');

    teacherFields.innerHTML = teachers.map((name, index) => `
      <div class="teacher-item-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
          <label for="teacher-name-${index}" class="teacher-card-label" style="margin-bottom: 0;">
            Teacher ${index + 1} Name <span class="required">*</span>
          </label>
          ${teachers.length > 1 ? `<button type="button" class="btn-remove-subject" data-remove-teacher="${index}" aria-label="Remove Teacher ${index + 1}">- Remove</button>` : ''}
        </div>
        <input type="text" id="teacher-name-${index}" data-teacher-idx="${index}" placeholder="e.g., Dr. Alan Turing" value="${escapeHtml(name)}" required>
      </div>
    `).join('');

    teacherFields.querySelectorAll('[data-teacher-idx]').forEach((input) => {
      input.addEventListener('input', (event) => {
        const idx = Number(event.target.dataset.teacherIdx);
        teachers[idx] = event.target.value;
      });
    });

    teacherFields.querySelectorAll('[data-remove-teacher]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        const idx = Number(event.currentTarget.dataset.removeTeacher);
        if (teachers.length > 1) {
          teachers.splice(idx, 1);
          teacherCountInput.value = teachers.length;
          renderTeacherFields();
        }
      });
    });

    updateSubjectLimit();
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
      });
    });

    subjectFields.querySelectorAll('[data-remove-subject]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        const idx = Number(event.currentTarget.dataset.removeSubject);
        if (subjects.length > 1) {
          subjects.splice(idx, 1);
          renderSubjectFields();
          updateSubjectLimit();
        }
      });
    });

    updateSubjectLimit();
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
      <div class="section-item-card">
        <div class="section-card-header">
          <label for="section-${index}" class="section-card-label">Section ${index + 1} <span class="required">*</span></label>
          ${sections.length > 1 ? `<button type="button" class="btn-remove-section" data-remove-section="${index}" aria-label="Remove Section ${index + 1}">- Remove</button>` : ''}
        </div>
        <input type="text" id="section-${index}" data-section-index="${index}" placeholder="e.g., CSE-A" value="${escapeHtml(sec)}" required>
      </div>
    `).join('');

    sectionFields.querySelectorAll('[data-section-index]').forEach((input) => {
      input.addEventListener('input', (event) => {
        const idx = Number(event.target.dataset.sectionIndex);
        sections[idx] = event.target.value;
      });
    });

    sectionFields.querySelectorAll('[data-remove-section]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        const idx = Number(event.currentTarget.dataset.removeSection);
        if (sections.length > 1) {
          sections.splice(idx, 1);
          renderSectionFields();
        }
      });
    });
  }

  if (addSectionBtn) {
    addSectionBtn.addEventListener('click', () => {
      const nextLetter = String.fromCharCode(65 + sections.length);
      sections.push(`CSE-${nextLetter}`);
      renderSectionFields();

      const newInput = document.getElementById(`section-${sections.length - 1}`);
      if (newInput) newInput.focus();
    });
  }

  // Dynamic Room Fields
  function renderRoomFields() {
    if (!rooms.length) {
      rooms = [{ room_number: '101', room_type: 'Classroom' }];
    }

    roomFields.innerHTML = rooms.map((room, index) => `
      <div class="room-item-card">
        <div class="room-card-header">
          <label class="room-card-label">Room ${index + 1} <span class="required">*</span></label>
          ${rooms.length > 1 ? `<button type="button" class="btn-remove-room" data-remove-room="${index}" aria-label="Remove Room ${index + 1}">- Remove</button>` : ''}
        </div>
        <div class="room-inputs-grid">
          <div>
            <label for="room-num-${index}" style="font-size: 0.8rem; margin-bottom: 2px; display: block;">Room Number / Name</label>
            <input type="text" id="room-num-${index}" data-room-num-index="${index}" placeholder="e.g., 101 or Lab-1" value="${escapeHtml(room.room_number)}" required>
          </div>
          <div>
            <label for="room-type-select-${index}" style="font-size: 0.8rem; margin-bottom: 2px; display: block;">Room Type</label>
            <select id="room-type-select-${index}" data-room-type-index="${index}" required>
              <option value="Classroom" ${room.room_type === 'Classroom' ? 'selected' : ''}>Classroom</option>
              <option value="Laboratory" ${room.room_type === 'Laboratory' ? 'selected' : ''}>Laboratory</option>
            </select>
          </div>
        </div>
      </div>
    `).join('');

    roomFields.querySelectorAll('[data-room-num-index]').forEach((input) => {
      input.addEventListener('input', (event) => {
        const idx = Number(event.target.dataset.roomNumIndex);
        rooms[idx].room_number = event.target.value;
      });
    });

    roomFields.querySelectorAll('[data-room-type-index]').forEach((select) => {
      select.addEventListener('change', (event) => {
        const idx = Number(event.target.dataset.roomTypeIndex);
        rooms[idx].room_type = event.target.value;
      });
    });

    roomFields.querySelectorAll('[data-remove-room]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        const idx = Number(event.currentTarget.dataset.removeRoom);
        if (rooms.length > 1) {
          rooms.splice(idx, 1);
          renderRoomFields();
        }
      });
    });
  }

  if (addRoomBtn) {
    addRoomBtn.addEventListener('click', () => {
      const nextNum = 101 + rooms.length;
      rooms.push({ room_number: String(nextNum), room_type: 'Classroom' });
      renderRoomFields();

      const newInput = document.getElementById(`room-num-${rooms.length - 1}`);
      if (newInput) newInput.focus();
    });
  }

  // Form Submit Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage();

    const teacherCount = Number.parseInt(teacherCountInput.value, 10);
    if (!Number.isInteger(teacherCount) || teacherCount < 1) {
      showMessage('Please specify a valid number of teachers.', 'error');
      teacherCountInput.focus();
      return;
    }

    // 1. Validate Teacher Names (Trimmed, Non-Empty, Unique)
    const teacherInputs = Array.from(teacherFields.querySelectorAll('[data-teacher-idx]'));
    if (teacherInputs.length !== teacherCount) {
      showMessage('Please configure all teacher name fields.', 'error');
      return;
    }

    const trimmedTeacherNames = [];
    for (let i = 0; i < teacherInputs.length; i++) {
      const val = teacherInputs[i].value.trim();
      if (!val) {
        showMessage(`Please enter Teacher ${i + 1} name.`, 'error');
        teacherInputs[i].focus();
        return;
      }
      trimmedTeacherNames.push(val);
    }

    // Prevent duplicate teacher names
    const lowerTeacherNames = trimmedTeacherNames.map((n) => n.toLowerCase());
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

    // 5. Global Room Type Filter
    const roomTypePreference = document.getElementById('roomType').value;
    if (!roomTypePreference) {
      showMessage('Please select a room type requirement.', 'error');
      document.getElementById('roomType').focus();
      return;
    }

    // Validate that at least one room matches the global room type preference
    if (roomTypePreference === 'Classroom' && !configuredRooms.some((r) => r.room_type === 'Classroom')) {
      showMessage("No configured room is of type 'Classroom' to fulfill your room type requirement.", 'error');
      return;
    }
    if (roomTypePreference === 'Laboratory' && !configuredRooms.some((r) => r.room_type === 'Laboratory')) {
      showMessage("No configured room is of type 'Laboratory' to fulfill your room type requirement.", 'error');
      return;
    }

    const workingDays = parseInt(document.getElementById('workingDays').value, 10) || 5;
    const startTime = document.getElementById('startTime').value || '09:00';
    const endTime = document.getElementById('endTime').value || '16:00';

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    showMessage('Generating conflict-free timetable and saving to Supabase...', 'info');

    try {
      // API Payload: Teacher Name ONLY (NO Specialization), Sections array, Rooms array
      const payload = {
        teachers: trimmedTeacherNames.map((name) => ({ name })),
        subjects: trimmedSubjectNames,
        sections: trimmedSectionNames.map((name) => ({ name })),
        rooms: configuredRooms,
        room_type: roomTypePreference,
        working_days_per_week: workingDays,
        working_start_time: startTime,
        working_end_time: endTime
      };

      const result = await apiRequest('POST', '/generate', payload);

      showMessage(`✓ ${result.message} (${result.entries_created} periods scheduled)`, 'success');
      showToast('Timetable generated and saved to Supabase!');

      await loadTimetable();

      const timetableSection = document.getElementById('timetableSection');
      if (timetableSection) {
        timetableSection.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      showMessage(`Error: ${error.message}`, 'error');
      showToast(error.message);
    } finally {
      submitBtn.disabled = false;
    }
  });

  form.addEventListener('reset', () => {
    window.setTimeout(() => {
      teacherFields.innerHTML = '';
      teachers = [];
      subjects = [''];
      sections = ['CSE-A'];
      rooms = [{ room_number: '101', room_type: 'Classroom' }];
      renderSubjectFields();
      renderSectionFields();
      renderRoomFields();
      updateSubjectLimit();
      hideMessage();
    }, 0);
  });

  // Initial renders
  renderSubjectFields();
  renderSectionFields();
  renderRoomFields();

  // Refresh Timetable Button
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupTimetableForm();
  setupRoomsPage();
  loadTimetable();
});
