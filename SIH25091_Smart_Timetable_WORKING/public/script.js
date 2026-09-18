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

// Load Persisted Timetable from Supabase (Requirement 19)
async function loadTimetable() {
  const timetableBody = document.getElementById('timetableBody');
  const timetableSection = document.getElementById('timetableSection');

  if (!timetableBody || !timetableSection) return;

  try {
    const timetable = await apiRequest('GET', '/timetable');

    if (!timetable || timetable.length === 0) {
      timetableBody.innerHTML = '<tr><td colspan="8" class="no-data">No timetable generated yet. Fill the form and click "Generate Timetable".</td></tr>';
      timetableSection.style.display = 'none';
      return;
    }

    timetableBody.innerHTML = timetable.map((entry) => `
      <tr>
        <td><strong>${escapeHtml(entry.day)}</strong></td>
        <td>${escapeHtml(String(entry.start_time).substring(0, 5))} - ${escapeHtml(String(entry.end_time).substring(0, 5))}</td>
        <td>${escapeHtml(entry.class_name || 'General')}</td>
        <td>${escapeHtml(entry.section || 'A')}</td>
        <td>${escapeHtml(entry.course_name || 'Course')}</td>
        <td>${escapeHtml(entry.teacher_name || 'Faculty')}</td>
        <td>${escapeHtml(entry.room_name || 'Room')}</td>
        <td><span class="status-badge status-available">${escapeHtml(entry.room_type || 'Classroom')}</span></td>
      </tr>
    `).join('');

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

// Generate Page Form Setup (Requirements 13, 14, 15)
function setupTimetableForm() {
  const form = document.getElementById('timetableForm');
  if (!form) return;

  const teacherCountInput = document.getElementById('teacherCount');
  const teacherFields = document.getElementById('teacherFields');
  const subjectCountInput = document.getElementById('subjectCount');
  const subjectFields = document.getElementById('subjectFields');

  let teachers = [];
  let subjects = [];

  // Dynamic Teacher Fields (Teacher Name + Specialization per teacher)
  function renderTeacherFields() {
    const count = Number.parseInt(teacherCountInput.value, 10);
    if (!Number.isInteger(count) || count < 1) {
      teacherFields.innerHTML = '';
      teachers = [];
      return;
    }

    teachers = Array.from({ length: count }, (_, index) => ({
      name: teachers[index] ? teachers[index].name : '',
      specialization: teachers[index] ? teachers[index].specialization : ''
    }));

    teacherFields.innerHTML = teachers.map((teacher, index) => `
      <div class="teacher-item" style="background: #f8fafc; padding: 16px; border-radius: 10px; margin-bottom: 12px; border-left: 4px solid #4f46e5;">
        <strong style="display: block; margin-bottom: 8px; color: #1e293b;">Teacher ${index + 1}</strong>
        <div class="form-group" style="margin-bottom: 8px;">
          <label for="teacher-name-${index}">Teacher Name <span class="required">*</span></label>
          <input type="text" id="teacher-name-${index}" data-teacher-idx="${index}" data-field="name" placeholder="e.g., Dr. Alan Turing" value="${escapeHtml(teacher.name)}" required>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label for="teacher-spec-${index}">Specialization</label>
          <input type="text" id="teacher-spec-${index}" data-teacher-idx="${index}" data-field="specialization" placeholder="e.g., Artificial Intelligence" value="${escapeHtml(teacher.specialization)}">
        </div>
      </div>
    `).join('');

    teacherFields.querySelectorAll('[data-teacher-idx]').forEach((input) => {
      input.addEventListener('input', (event) => {
        const idx = Number(event.target.dataset.teacherIdx);
        const field = event.target.dataset.field;
        if (teachers[idx]) teachers[idx][field] = event.target.value;
      });
    });
  }

  teacherCountInput.addEventListener('input', renderTeacherFields);
  teacherCountInput.addEventListener('change', renderTeacherFields);

  // Dynamic Subject Fields
  function renderSubjectFields() {
    const count = Number.parseInt(subjectCountInput.value, 10);
    if (!Number.isInteger(count) || count < 1) {
      subjectFields.innerHTML = '';
      subjects = [];
      return;
    }

    subjects = Array.from({ length: count }, (_, index) => {
      const currentInput = document.getElementById(`subject-${index}`);
      return currentInput ? currentInput.value : (subjects[index] || '');
    });

    subjectFields.innerHTML = subjects.map((subject, index) => `
      <div class="form-group">
        <label for="subject-${index}">Subject / Course ${index + 1} <span class="required">*</span></label>
        <input type="text" id="subject-${index}" data-subject-index="${index}" placeholder="e.g., Operating Systems" value="${escapeHtml(subject)}" required>
      </div>
    `).join('');
  }

  subjectCountInput.addEventListener('input', renderSubjectFields);
  subjectCountInput.addEventListener('change', renderSubjectFields);

  // Form Submit Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage();

    const teacherCount = Number.parseInt(teacherCountInput.value, 10);
    const subjectCount = Number.parseInt(subjectCountInput.value, 10);

    if (!Number.isInteger(teacherCount) || teacherCount < 1) {
      showMessage('Please specify a valid number of teachers.', 'error');
      return;
    }

    if (!Number.isInteger(subjectCount) || subjectCount < 1) {
      showMessage('Please specify a valid number of subjects.', 'error');
      return;
    }

    // REQUIREMENT 14: Validation - Number of subjects MUST NOT be greater than number of teachers
    if (subjectCount > teacherCount) {
      showMessage(`Validation Error: Number of subjects (${subjectCount}) cannot be greater than the number of teachers (${teacherCount}).`, 'error');
      showToast('Subjects count cannot exceed teachers count');
      return;
    }

    // Collect teacher names and specializations
    const teacherData = Array.from(teacherFields.querySelectorAll('.teacher-item')).map((item, idx) => {
      const nameInput = item.querySelector('[data-field="name"]');
      const specInput = item.querySelector('[data-field="specialization"]');
      return {
        name: nameInput ? nameInput.value.trim() : '',
        specialization: specInput ? specInput.value.trim() : ''
      };
    });

    const missingTeacher = teacherData.findIndex((t) => !t.name);
    if (missingTeacher !== -1) {
      showMessage(`Please enter a name for Teacher ${missingTeacher + 1}.`, 'error');
      return;
    }

    const subjectNames = Array.from(subjectFields.querySelectorAll('[data-subject-index]'))
      .sort((a, b) => Number(a.dataset.subjectIndex) - Number(b.dataset.subjectIndex))
      .map((input) => input.value.trim());

    if (subjectNames.length !== subjectCount || subjectNames.some((s) => !s)) {
      showMessage('Please enter a name for every subject.', 'error');
      return;
    }

    if (new Set(subjectNames.map((s) => s.toLowerCase())).size !== subjectNames.length) {
      showMessage('Subject names must be unique.', 'error');
      return;
    }

    const roomType = document.getElementById('roomType').value;
    if (!roomType) {
      showMessage('Please select a room type preference.', 'error');
      return;
    }

    const workingDays = parseInt(document.getElementById('workingDays').value, 10) || 5;
    const startTime = document.getElementById('startTime').value || '09:00';
    const endTime = document.getElementById('endTime').value || '16:00';

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    showMessage('Generating timetable and persisting to Supabase...', 'info');

    try {
      const payload = {
        teachers: teacherData,
        subjects: subjectNames,
        room_type: roomType,
        working_days_per_week: workingDays,
        working_start_time: startTime,
        working_end_time: endTime
      };

      const result = await apiRequest('POST', '/generate', payload);

      showMessage(`✓ ${result.message} (${result.entries_created} periods scheduled)`, 'success');
      showToast('Timetable generated and saved to Supabase!');

      await loadTimetable();
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
      subjectFields.innerHTML = '';
      subjects = [];
      hideMessage();
    }, 0);
  });

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
        const timetableBody = document.getElementById('timetableBody');
        if (timetableBody) timetableBody.innerHTML = '';
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
