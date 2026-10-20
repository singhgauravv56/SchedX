// ==============================================================================
// SchedX — Interactive Calendar To Do Planner Module (SCHEDX TO DO)
// ==============================================================================

(function () {
  'use strict';

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const WEEKDAY_NAMES = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  // Calendar State
  let currentDate = new Date();
  let viewYear = currentDate.getFullYear();
  let viewMonth = currentDate.getMonth(); // 0-indexed
  let selectedDateStr = formatDateKey(currentDate); // 'YYYY-MM-DD'
  let todosCache = [];
  let isLoading = false;

  // Utility: format Date to YYYY-MM-DD
  function formatDateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Utility: parse YYYY-MM-DD into local Date
  function parseDateKey(str) {
    if (!str) return new Date();
    const parts = str.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  // Utility: format YYYY-MM-DD into readable string
  function formatDisplayDate(dateStr) {
    const d = parseDateKey(dateStr);
    const weekday = WEEKDAY_NAMES[d.getDay()];
    const month = MONTH_NAMES[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    return `${weekday}, ${month} ${day}, ${year}`;
  }

  // Utility: format HH:MM to 12-hour AM/PM
  function formatDisplayTime(timeStr) {
    if (!timeStr) return '';
    try {
      const [hStr, mStr] = timeStr.split(':');
      let hours = parseInt(hStr, 10);
      const minutes = mStr || '00';
      if (isNaN(hours)) return timeStr;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 becomes 12
      return `${hours}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  }

  // Fetch all tasks from API
  async function fetchTodos() {
    const loadingEl = document.getElementById('todoLoadingState');
    if (loadingEl) loadingEl.style.display = 'flex';
    isLoading = true;

    try {
      const res = await fetch('/api/todos');
      if (!res.ok) throw new Error('Failed to load tasks');
      const data = await res.json();
      todosCache = Array.isArray(data.todos) ? data.todos : [];
    } catch (err) {
      console.warn('Unable to retrieve tasks from server:', err.message);
      if (typeof showToast === 'function') {
        showToast('Unable to load tasks. Please try again.');
      }
    } finally {
      isLoading = false;
      if (loadingEl) loadingEl.style.display = 'none';
      renderCalendar();
      renderSelectedDayTasks();
    }
  }

  // Render Calendar Grid
  function renderCalendar() {
    const grid = document.getElementById('todoCalendarGrid');
    const titleEl = document.getElementById('todoMonthYear');
    if (!grid || !titleEl) return;

    titleEl.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

    // Number of days in current view month
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    // Day of week of 1st day of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
    // Convert to Monday-first (0 = Mon, ..., 6 = Sun)
    const firstDayJs = new Date(viewYear, viewMonth, 1).getDay();
    const startOffset = firstDayJs === 0 ? 6 : firstDayJs - 1;

    // Previous month total days for padding
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const todayStr = formatDateKey(new Date());

    let html = '';

    // 1. Previous month padding days
    for (let i = startOffset - 1; i >= 0; i--) {
      const prevDay = daysInPrevMonth - i;
      const prevMonthDate = new Date(viewYear, viewMonth - 1, prevDay);
      const dateKey = formatDateKey(prevMonthDate);
      html += `
        <button type="button" class="todo-date-cell padding-day" 
                onclick="window.SchedXTodo.jumpToDate('${dateKey}')" 
                aria-label="${MONTH_NAMES[prevMonthDate.getMonth()]} ${prevDay}, ${prevMonthDate.getFullYear()}">
          <span class="cell-num">${prevDay}</span>
        </button>
      `;
    }

    // 2. Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(viewYear, viewMonth, day);
      const dateKey = formatDateKey(cellDate);
      const isToday = dateKey === todayStr;
      const isSelected = dateKey === selectedDateStr;

      // Check tasks for this date
      const dateTasks = todosCache.filter((t) => t.todo_date === dateKey);
      const hasTasks = dateTasks.length > 0;
      const allCompleted = hasTasks && dateTasks.every((t) => t.completed);

      let classes = ['todo-date-cell'];
      if (isToday) classes.push('is-today');
      if (isSelected) classes.push('is-selected');
      if (hasTasks) classes.push('has-tasks');
      if (allCompleted) classes.push('all-completed');

      let indicatorHtml = '';
      if (hasTasks) {
        if (allCompleted) {
          indicatorHtml = '<span class="cell-indicator done" title="All tasks completed">✓</span>';
        } else {
          indicatorHtml = `<span class="cell-indicator pending" title="${dateTasks.length} task(s)">•</span>`;
        }
      }

      html += `
        <button type="button" 
                class="${classes.join(' ')}" 
                id="dateCell_${dateKey}"
                data-date="${dateKey}"
                onclick="window.SchedXTodo.selectDate('${dateKey}')"
                role="gridcell"
                tabindex="${isSelected ? '0' : '-1'}"
                aria-selected="${isSelected ? 'true' : 'false'}"
                aria-label="${MONTH_NAMES[viewMonth]} ${day}, ${viewYear}${hasTasks ? (allCompleted ? ' (All tasks completed)' : ' (Tasks pending)') : ''}">
          <span class="cell-num">${day}</span>
          ${indicatorHtml}
        </button>
      `;
    }

    // 3. Next month trailing padding days to fill 7-col grid cleanly
    const totalRendered = startOffset + daysInMonth;
    const remainingSlots = (7 - (totalRendered % 7)) % 7;
    for (let nextDay = 1; nextDay <= remainingSlots; nextDay++) {
      const nextMonthDate = new Date(viewYear, viewMonth + 1, nextDay);
      const dateKey = formatDateKey(nextMonthDate);
      html += `
        <button type="button" class="todo-date-cell padding-day" 
                onclick="window.SchedXTodo.jumpToDate('${dateKey}')" 
                aria-label="${MONTH_NAMES[nextMonthDate.getMonth()]} ${nextDay}, ${nextMonthDate.getFullYear()}">
          <span class="cell-num">${nextDay}</span>
        </button>
      `;
    }

    grid.innerHTML = html;
  }

  // Select a Date and update task panel
  function selectDate(dateKey) {
    selectedDateStr = dateKey;

    // Update cell classes in DOM without full reload
    const cells = document.querySelectorAll('.todo-date-cell');
    cells.forEach((cell) => {
      const isTarget = cell.dataset.date === dateKey;
      cell.classList.toggle('is-selected', isTarget);
      cell.setAttribute('aria-selected', isTarget ? 'true' : 'false');
      cell.setAttribute('tabindex', isTarget ? '0' : '-1');
    });

    renderSelectedDayTasks();
  }

  // Jump to a date (even if in different month)
  function jumpToDate(dateKey) {
    const d = parseDateKey(dateKey);
    viewYear = d.getFullYear();
    viewMonth = d.getMonth();
    selectedDateStr = dateKey;
    renderCalendar();
    renderSelectedDayTasks();
  }

  // Render Tasks for Currently Selected Date
  function renderSelectedDayTasks() {
    const titleEl = document.getElementById('todoSelectedDateTitle');
    const listEl = document.getElementById('todoTasksList');
    const emptyEl = document.getElementById('todoEmptyState');
    if (!titleEl || !listEl) return;

    titleEl.textContent = formatDisplayDate(selectedDateStr);

    const tasks = todosCache.filter((t) => t.todo_date === selectedDateStr);

    if (tasks.length === 0) {
      if (emptyEl) emptyEl.style.display = 'flex';
      listEl.innerHTML = '';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    listEl.innerHTML = tasks.map((task) => {
      const isDone = Boolean(task.completed);
      const priorityClass = `priority-${String(task.priority || 'medium').toLowerCase()}`;
      const timeStr = task.todo_time ? formatDisplayTime(task.todo_time) : '';

      return `
        <article class="todo-task-card ${isDone ? 'is-completed' : ''}" id="taskCard_${task.todo_id}" role="listitem">
          <div class="task-checkbox-col">
            <button type="button" 
                    class="task-check-btn ${isDone ? 'checked' : ''}" 
                    onclick="window.SchedXTodo.toggleComplete('${task.todo_id}')"
                    aria-label="${isDone ? 'Mark task as incomplete' : 'Mark task as complete'}">
              <span class="check-icon" aria-hidden="true">${isDone ? '✓' : ''}</span>
            </button>
          </div>

          <div class="task-content-col">
            <div class="task-title-row">
              <span class="task-title ${isDone ? 'strikethrough' : ''}">${escapeHtml(task.title)}</span>
            </div>

            <div class="task-meta-row">
              ${timeStr ? `<span class="task-badge task-time-badge">⏰ ${timeStr}</span>` : ''}
              <span class="task-badge ${priorityClass}">${escapeHtml(task.priority || 'Medium')}</span>
              ${isDone ? '<span class="task-badge badge-done">Completed</span>' : ''}
            </div>

            ${task.description ? `
              <p class="task-description ${isDone ? 'text-muted' : ''}">${escapeHtml(task.description)}</p>
            ` : ''}
          </div>

          <div class="task-actions-col">
            <button type="button" class="task-action-btn edit-btn" 
                    onclick="window.SchedXTodo.openEditModal('${task.todo_id}')" 
                    aria-label="Edit task: ${escapeHtml(task.title)}" title="Edit task">
              ✏️
            </button>
            <button type="button" class="task-action-btn delete-btn" 
                    onclick="window.SchedXTodo.deleteTask('${task.todo_id}')" 
                    aria-label="Delete task: ${escapeHtml(task.title)}" title="Delete task">
              🗑️
            </button>
          </div>
        </article>
      `;
    }).join('');
  }

  // Open Modal for New Task
  function openAddModal() {
    const modal = document.getElementById('todoTaskModal');
    const titleEl = document.getElementById('todoModalTitle');
    const editingIdEl = document.getElementById('todoEditingId');
    const inputTitle = document.getElementById('todoInputTitle');
    const inputDesc = document.getElementById('todoInputDesc');
    const inputTime = document.getElementById('todoInputTime');
    const inputPriority = document.getElementById('todoInputPriority');

    if (!modal) return;

    if (titleEl) titleEl.textContent = `Add Task (${MONTH_NAMES[parseDateKey(selectedDateStr).getMonth()]} ${parseDateKey(selectedDateStr).getDate()})`;
    if (editingIdEl) editingIdEl.value = '';
    if (inputTitle) inputTitle.value = '';
    if (inputDesc) inputDesc.value = '';
    if (inputTime) inputTime.value = '';
    if (inputPriority) inputPriority.value = 'Medium';

    modal.classList.add('active');
    setTimeout(() => { if (inputTitle) inputTitle.focus(); }, 50);
  }

  // Open Modal to Edit Existing Task
  function openEditModal(todoId) {
    const task = todosCache.find((t) => t.todo_id === todoId);
    if (!task) return;

    const modal = document.getElementById('todoTaskModal');
    const titleEl = document.getElementById('todoModalTitle');
    const editingIdEl = document.getElementById('todoEditingId');
    const inputTitle = document.getElementById('todoInputTitle');
    const inputDesc = document.getElementById('todoInputDesc');
    const inputTime = document.getElementById('todoInputTime');
    const inputPriority = document.getElementById('todoInputPriority');

    if (!modal) return;

    if (titleEl) titleEl.textContent = 'Edit Task';
    if (editingIdEl) editingIdEl.value = task.todo_id;
    if (inputTitle) inputTitle.value = task.title || '';
    if (inputDesc) inputDesc.value = task.description || '';
    if (inputTime) inputTime.value = task.todo_time || '';
    if (inputPriority) inputPriority.value = task.priority || 'Medium';

    modal.classList.add('active');
    setTimeout(() => { if (inputTitle) inputTitle.focus(); }, 50);
  }

  // Close Task Modal
  function closeTodoModal(event) {
    if (event && event.target && event.target.closest('.todo-modal-box')) {
      return;
    }
    const modal = document.getElementById('todoTaskModal');
    if (modal) modal.classList.remove('active');
  }

  // Save Task (POST / PUT)
  async function handleSaveTask(event) {
    if (event) event.preventDefault();

    const editingId = document.getElementById('todoEditingId')?.value;
    const title = document.getElementById('todoInputTitle')?.value.trim();
    const description = document.getElementById('todoInputDesc')?.value.trim();
    const todo_time = document.getElementById('todoInputTime')?.value.trim();
    const priority = document.getElementById('todoInputPriority')?.value;
    const submitBtn = document.getElementById('todoSaveSubmitBtn');

    if (!title) {
      alert('Task title is required.');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    const payload = {
      title,
      description,
      todo_date: selectedDateStr,
      todo_time: todo_time || null,
      priority: priority || 'Medium'
    };

    try {
      let res;
      if (editingId) {
        res = await fetch(`/api/todos/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save task');

      closeTodoModal();
      if (typeof showToast === 'function') {
        showToast(editingId ? '✓ Task updated successfully!' : '✓ Task added to calendar!');
      }

      await fetchTodos();
    } catch (err) {
      alert(err.message || 'Unable to save task. Please try again.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Task';
      }
    }
  }

  // Toggle Completion
  async function toggleComplete(todoId) {
    const task = todosCache.find((t) => t.todo_id === todoId);
    if (!task) return;

    const newCompleted = !task.completed;

    // Optimistic UI update
    task.completed = newCompleted;
    renderCalendar();
    renderSelectedDayTasks();

    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompleted })
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to update task status');
      }
    } catch (err) {
      // Revert on error
      task.completed = !newCompleted;
      renderCalendar();
      renderSelectedDayTasks();
      if (typeof showToast === 'function') {
        showToast('Unable to update task. Please try again.');
      }
    }
  }

  // Delete Task
  async function deleteTask(todoId) {
    const task = todosCache.find((t) => t.todo_id === todoId);
    if (!task) return;

    if (!confirm(`Delete task "${task.title}"?`)) return;

    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: 'DELETE'
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to delete task');

      if (typeof showToast === 'function') {
        showToast('✓ Task deleted successfully.');
      }

      await fetchTodos();
    } catch (err) {
      alert(err.message || 'Unable to delete task. Please try again.');
    }
  }

  // Previous Month
  function prevMonth() {
    viewMonth--;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear--;
    }
    renderCalendar();
  }

  // Next Month
  function nextMonth() {
    viewMonth++;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear++;
    }
    renderCalendar();
  }

  // Today Quick-jump
  function goToToday() {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    selectedDateStr = formatDateKey(now);
    renderCalendar();
    renderSelectedDayTasks();
  }

  // Simple HTML Escaping
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Bind Event Listeners
  function initTodoPlanner() {
    const prevBtn = document.getElementById('todoPrevMonthBtn');
    const nextBtn = document.getElementById('todoNextMonthBtn');
    const todayBtn = document.getElementById('todoTodayBtn');
    const addBtn = document.getElementById('todoOpenAddBtn');
    const emptyAddBtn = document.getElementById('todoEmptyAddBtn');

    if (prevBtn) prevBtn.addEventListener('click', prevMonth);
    if (nextBtn) nextBtn.addEventListener('click', nextMonth);
    if (todayBtn) todayBtn.addEventListener('click', goToToday);
    if (addBtn) addBtn.addEventListener('click', openAddModal);
    if (emptyAddBtn) emptyAddBtn.addEventListener('click', openAddModal);

    // Keyboard accessibility: Escape closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeTodoModal();
      }
    });

    fetchTodos();
  }

  // Expose methods to global scope for inline handlers
  window.SchedXTodo = {
    selectDate,
    jumpToDate,
    openAddModal,
    openEditModal,
    toggleComplete,
    deleteTask
  };
  window.closeTodoModal = closeTodoModal;
  window.handleSaveTask = handleSaveTask;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTodoPlanner);
  } else {
    initTodoPlanner();
  }
})();
