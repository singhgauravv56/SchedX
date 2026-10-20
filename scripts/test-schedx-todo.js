const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function runTodoTests() {
  console.log('========================================================');
  console.log('       SCHEDX TO DO — AUTOMATED VERIFICATION SUITE       ');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assertTest(name, condition, details = '') {
    if (condition) {
      console.log(`✅ PASS | ${name}${details ? ' -> ' + details : ''}`);
      passed++;
    } else {
      console.log(`❌ FAIL | ${name}${details ? ' -> ' + details : ''}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // 1. HTML DOM VERIFICATION (generate.html)
  // ----------------------------------------------------
  console.log('--- 1. Generate Page HTML Structure ---');
  const genHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'generate.html'), 'utf8');

  assertTest('Heading "SCHEDX TO DO" present', genHtml.includes('<h2 id="todoSectionHeading">SCHEDX TO DO</h2>'));
  assertTest('Todo Planner card container present', genHtml.includes('todo-planner-card'));
  assertTest('Calendar column present', genHtml.includes('todo-calendar-column'));
  assertTest('Calendar nav buttons (prev/next/today) present', 
    genHtml.includes('id="todoPrevMonthBtn"') && 
    genHtml.includes('id="todoNextMonthBtn"') && 
    genHtml.includes('id="todoTodayBtn"')
  );
  assertTest('Weekday header row (MON..SUN) present', 
    genHtml.includes('MON') && genHtml.includes('WED') && genHtml.includes('SUN')
  );
  assertTest('Calendar date grid container present', genHtml.includes('id="todoCalendarGrid"'));
  assertTest('Selected date title element present', genHtml.includes('id="todoSelectedDateTitle"'));
  assertTest('Tasks list container present', genHtml.includes('id="todoTasksList"'));
  assertTest('+ Add Task button present', genHtml.includes('id="todoOpenAddBtn"'));
  assertTest('Add/Edit Task modal dialog present', genHtml.includes('id="todoTaskModal"'));
  assertTest('Task title input with maxlength 200 present', genHtml.includes('id="todoInputTitle"') && genHtml.includes('maxlength="200"'));
  assertTest('Task time input present', genHtml.includes('id="todoInputTime"'));
  assertTest('Task priority select present with Low/Medium/High', 
    genHtml.includes('id="todoInputPriority"') && genHtml.includes('value="Low"') && genHtml.includes('value="High"')
  );
  assertTest('todo.js script tag included', genHtml.includes('<script src="/todo.js"></script>'));

  // ----------------------------------------------------
  // 2. CSS STYLING VERIFICATION (style.css)
  // ----------------------------------------------------
  console.log('\n--- 2. CSS Design System Verification ---');
  const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'style.css'), 'utf8');

  assertTest('Section styling .schedx-todo-section exists', css.includes('.schedx-todo-section'));
  assertTest('Planner 2-column grid layout .todo-planner-card exists', css.includes('.todo-planner-card'));
  assertTest('Calendar date cell base styles .todo-date-cell exist', css.includes('.todo-date-cell'));
  assertTest('Selected date indicator .is-selected exists', css.includes('.todo-date-cell.is-selected'));
  assertTest('Today indicator .is-today exists', css.includes('.todo-date-cell.is-today'));
  assertTest('Task card .todo-task-card exists', css.includes('.todo-task-card'));
  assertTest('Completed task .is-completed strikethrough exists', css.includes('.todo-task-card.is-completed'));
  assertTest('Mobile / Tablet media query exists', css.includes('@media (max-width: 900px)'));
  assertTest('Compact mobile media query exists', css.includes('@media (max-width: 480px)'));

  // ----------------------------------------------------
  // 3. API ENDPOINTS & CRUD LIFECYCLE
  // ----------------------------------------------------
  console.log('\n--- 3. API Endpoints & CRUD Lifecycle ---');

  let task1Id = null;
  let task2Id = null;
  let task3Id = null;

  // 3.1 Initial Fetch
  const resInitial = await fetch(`${BASE_URL}/api/todos`);
  assertTest('GET /api/todos returns 200', resInitial.status === 200);

  // 3.2 Create Task A (2026-09-20)
  const resPost1 = await fetch(`${BASE_URL}/api/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Complete DBMS Assignment',
      description: 'Solve Unit 3 relational algebra questions',
      todo_date: '2026-09-20',
      todo_time: '10:30',
      priority: 'High'
    })
  });
  const dataPost1 = await resPost1.json();
  assertTest('POST /api/todos Task A on 2026-09-20', resPost1.status === 201 && dataPost1.todo?.title === 'Complete DBMS Assignment');
  task1Id = dataPost1.todo?.todo_id;

  // 3.3 Create Task B (2026-09-21)
  const resPost2 = await fetch(`${BASE_URL}/api/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Prepare Operating Systems Presentation',
      description: 'Slide deck on scheduling algorithms',
      todo_date: '2026-09-21',
      todo_time: '14:00',
      priority: 'Medium'
    })
  });
  const dataPost2 = await resPost2.json();
  assertTest('POST /api/todos Task B on 2026-09-21', resPost2.status === 201 && dataPost2.todo?.title === 'Prepare Operating Systems Presentation');
  task2Id = dataPost2.todo?.todo_id;

  // 3.4 Create Task C (2026-09-25)
  const resPost3 = await fetch(`${BASE_URL}/api/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Submit Network Security Lab Report',
      description: 'Upload packet tracer analysis report',
      todo_date: '2026-09-25',
      todo_time: '16:30',
      priority: 'Low'
    })
  });
  const dataPost3 = await resPost3.json();
  assertTest('POST /api/todos Task C on 2026-09-25', resPost3.status === 201 && dataPost3.todo?.title === 'Submit Network Security Lab Report');
  task3Id = dataPost3.todo?.todo_id;

  // 3.5 Date Association Isolation
  const resDate20 = await fetch(`${BASE_URL}/api/todos?date=2026-09-20`);
  const dataDate20 = await resDate20.json();
  assertTest('Date Filter 2026-09-20: contains only Task A', 
    dataDate20.todos.length === 1 && dataDate20.todos[0].title === 'Complete DBMS Assignment'
  );

  const resDate21 = await fetch(`${BASE_URL}/api/todos?date=2026-09-21`);
  const dataDate21 = await resDate21.json();
  assertTest('Date Filter 2026-09-21: contains only Task B', 
    dataDate21.todos.length === 1 && dataDate21.todos[0].title === 'Prepare Operating Systems Presentation'
  );

  const resDate25 = await fetch(`${BASE_URL}/api/todos?date=2026-09-25`);
  const dataDate25 = await resDate25.json();
  assertTest('Date Filter 2026-09-25: contains only Task C', 
    dataDate25.todos.length === 1 && dataDate25.todos[0].title === 'Submit Network Security Lab Report'
  );

  // 3.6 Edit Task (PUT)
  const resEdit = await fetch(`${BASE_URL}/api/todos/${task1Id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Complete DBMS Assignment (Updated Unit 3 & 4)',
      priority: 'High'
    })
  });
  const dataEdit = await resEdit.json();
  assertTest('PUT /api/todos/:id edits task title without duplicate', 
    resEdit.status === 200 && dataEdit.todo?.title === 'Complete DBMS Assignment (Updated Unit 3 & 4)'
  );

  // 3.7 Toggle Completion (PUT completed: true)
  const resComplete = await fetch(`${BASE_URL}/api/todos/${task1Id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: true })
  });
  const dataComplete = await resComplete.json();
  assertTest('PUT /api/todos/:id sets completed: true', 
    resComplete.status === 200 && dataComplete.todo?.completed === true
  );

  // Toggle back to incomplete
  const resIncomplete = await fetch(`${BASE_URL}/api/todos/${task1Id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: false })
  });
  const dataIncomplete = await resIncomplete.json();
  assertTest('PUT /api/todos/:id sets completed: false', 
    resIncomplete.status === 200 && dataIncomplete.todo?.completed === false
  );

  // 3.8 Persistence on Disk
  const todosDisk = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'todos.json'), 'utf8'));
  assertTest('Persistence: tasks saved to data/todos.json file on disk', 
    Array.isArray(todosDisk) && todosDisk.some(t => t.todo_id === task1Id)
  );

  // 3.9 Delete Task (DELETE)
  const resDel = await fetch(`${BASE_URL}/api/todos/${task3Id}`, {
    method: 'DELETE'
  });
  const dataDel = await resDel.json();
  assertTest('DELETE /api/todos/:id deletes task', 
    resDel.status === 200 && dataDel.success === true
  );

  const resAfterDel = await fetch(`${BASE_URL}/api/todos?date=2026-09-25`);
  const dataAfterDel = await resAfterDel.json();
  assertTest('After Delete: 2026-09-25 has 0 tasks', dataAfterDel.todos.length === 0);

  // ----------------------------------------------------
  // 4. API VALIDATION CHECKS
  // ----------------------------------------------------
  console.log('\n--- 4. API Input Validation & Security ---');

  // Empty title rejected
  const resEmptyTitle = await fetch(`${BASE_URL}/api/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '   ', todo_date: '2026-09-20' })
  });
  assertTest('Validation: rejects empty title with 400', resEmptyTitle.status === 400);

  // Title > 200 characters rejected
  const longTitle = 'A'.repeat(201);
  const resLongTitle = await fetch(`${BASE_URL}/api/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: longTitle, todo_date: '2026-09-20' })
  });
  assertTest('Validation: rejects title > 200 chars with 400', resLongTitle.status === 400);

  // Malformed date rejected
  const resBadDate = await fetch(`${BASE_URL}/api/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Valid Title', todo_date: '20-09-2026' })
  });
  assertTest('Validation: rejects invalid date format with 400', resBadDate.status === 400);

  // Non-existent ID update returns 404
  const resNotFound = await fetch(`${BASE_URL}/api/todos/non_existent_id_999`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'New Title' })
  });
  assertTest('Validation: returns 404 for unknown task ID', resNotFound.status === 404);

  // Clean up remaining test tasks
  if (task1Id) await fetch(`${BASE_URL}/api/todos/${task1Id}`, { method: 'DELETE' });
  if (task2Id) await fetch(`${BASE_URL}/api/todos/${task2Id}`, { method: 'DELETE' });

  console.log('\n========================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('========================================================\n');

  if (failed > 0) process.exit(1);
}

runTodoTests();
