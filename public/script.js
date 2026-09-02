// API Base URL
const API = '/api';

// Setup Navigation for all pages
function setupNavigation() {
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('.site-nav');
  const navLinks = document.querySelectorAll('.nav-link');

  if (!navToggle || !siteNav) return;

  // Hamburger Menu Toggle
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Close menu on link click (mobile)
  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        siteNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Set active nav based on current page
  setActiveNavLink();
}

function setActiveNavLink() {
  const navLinks = document.querySelectorAll('.nav-link');
  const currentPath = window.location.pathname;

  navLinks.forEach((link) => {
    let href = link.getAttribute('href');
    let isActive = false;

    // Handle home page
    if ((currentPath === '/' || currentPath.startsWith('/index')) && href === '/') {
      isActive = true;
    }
    // Handle other pages
    else if (currentPath.startsWith(href) && href !== '/') {
      isActive = true;
    }
    // Handle About Us anchor
    else if (href === '/#about' && currentPath === '/') {
      // About Us is on home page
    }

    link.classList.toggle('active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

// Message Utilities
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
  const toast = document.getElementById('toast');
  if (!toast) {
    // Create toast if it doesn't exist
    const newToast = document.createElement('div');
    newToast.id = 'toast';
    newToast.className = 'toast';
    document.body.appendChild(newToast);
    return showToast(message, duration);
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
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Server is not running. Start it with: npm start');
    }
    throw error;
  }
}

// Load Timetable (for Generate page)
async function loadTimetable() {
  const timetableBody = document.getElementById('timetableBody');
  const timetableSection = document.getElementById('timetableSection');

  if (!timetableBody || !timetableSection) return;

  try {
    const timetable = await apiRequest('GET', '/timetable');

    if (timetable.length === 0) {
      timetableBody.innerHTML = '<tr><td colspan="8" class="no-data">No timetable generated yet. Fill the form and click "Generate Timetable".</td></tr>';
      timetableSection.style.display = 'none';
      return;
    }

    timetableBody.innerHTML = timetable.map((entry) => `
      <tr>
        <td>${entry.day}</td>
        <td>${entry.start_time.substring(0, 5)} - ${entry.end_time.substring(0, 5)}</td>
        <td>${entry.class_name}</td>
        <td>${entry.section}</td>
        <td>${entry.course_name}</td>
        <td>${entry.teacher_name}</td>
        <td>${entry.room_name}</td>
        <td>${entry.room_type}</td>
      </tr>
    `).join('');

    timetableSection.style.display = 'block';
  } catch (error) {
    console.error('Error loading timetable:', error);
    showMessage(`Error loading timetable: ${error.message}`, 'error');
  }
}

// Form Submission Handler (for Generate page)
function setupTimetableForm() {
  const form = document.getElementById('timetableForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    hideMessage();

    const teacherName = document.getElementById('teacherName').value.trim();
    const teacherSpec = document.getElementById('teacherSpec').value.trim();
    const department = document.getElementById('department').value.trim();
    const courseName = document.getElementById('courseName').value.trim();
    const className = document.getElementById('className').value.trim();
    const section = document.getElementById('section').value.trim();
    const studentCount = parseInt(document.getElementById('studentCount').value, 10);
    const roomType = document.getElementById('roomType').value;
    const workingDays = parseInt(document.getElementById('workingDays').value, 10);
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;

    if (!teacherName) {
      showMessage('Please enter teacher name', 'error');
      return;
    }
    if (!department) {
      showMessage('Please enter department name', 'error');
      return;
    }
    if (!courseName) {
      showMessage('Please enter course/subject name', 'error');
      return;
    }
    if (!className) {
      showMessage('Please enter class name', 'error');
      return;
    }
    if (!studentCount || studentCount < 1) {
      showMessage('Please enter valid number of students', 'error');
      return;
    }
    if (!roomType) {
      showMessage('Please select room type', 'error');
      return;
    }
    if (!workingDays || workingDays < 1 || workingDays > 7) {
      showMessage('Working days must be between 1 and 7', 'error');
      return;
    }
    if (!startTime || !endTime) {
      showMessage('Please select working hours', 'error');
      return;
    }

    form.querySelector('button[type="submit"]').disabled = true;
    showMessage('Generating timetable...', 'info');

    try {
      const rooms = await apiRequest('GET', '/rooms');
      const roomExists = rooms.some((r) => r.room_type === roomType && r.capacity >= studentCount);

      if (!roomExists) {
        const roomData = {
          room_name: `${roomType}-${Date.now()}`,
          room_type: roomType,
          capacity: Math.max(studentCount + 10, 40)
        };
        await apiRequest('POST', '/rooms', roomData);
        showToast('Room created for this timetable');
      }

      const result = await apiRequest('POST', '/generate-timetable', {
        teacher_name: teacherName,
        teacher_specialization: teacherSpec,
        course_name: courseName,
        department_name: department,
        class_name: className,
        class_section: section,
        student_count: studentCount,
        room_type: roomType,
        working_days_per_week: workingDays,
        working_start_time: startTime,
        working_end_time: endTime
      });

      showMessage(`✓ ${result.message} (${result.entries_created} periods scheduled)`, 'success');
      showToast('Timetable generated successfully!');

      form.reset();
      document.getElementById('workingDays').value = '5';
      document.getElementById('startTime').value = '09:00';
      document.getElementById('endTime').value = '16:00';

      await loadTimetable();
    } catch (error) {
      showMessage(`Error: ${error.message}`, 'error');
      showToast(error.message);
    } finally {
      form.querySelector('button[type="submit"]').disabled = false;
    }
  });

  // Refresh button
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      try {
        await loadTimetable();
        showToast('Timetable refreshed');
      } catch (error) {
        showMessage(`Error refreshing timetable: ${error.message}`, 'error');
      }
    });
  }

  // Clear button
  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete the entire timetable? This action cannot be undone.')) {
        return;
      }

      try {
        await apiRequest('DELETE', '/timetable');
        showMessage('✓ Timetable cleared successfully', 'success');
        showToast('Timetable cleared');
        document.getElementById('timetableSection').style.display = 'none';
        document.getElementById('timetableBody').innerHTML = '';
      } catch (error) {
        showMessage(`Error clearing timetable: ${error.message}`, 'error');
        showToast(error.message);
      }
    });
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupTimetableForm();
  loadTimetable();
});
