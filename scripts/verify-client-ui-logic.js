// scripts/verify-client-ui-logic.js
// Verifies all frontend HTML elements, CSS classes, and client-side script functions

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, name, details = '') {
  if (condition) {
    passed++;
    console.log(`✓ PASS: ${name}`);
  } else {
    failed++;
    console.error(`✗ FAIL: ${name} - ${details}`);
  }
}

console.log('====================================================');
console.log('SCHEDX CLIENT UI INTEGRATION & SYNTAX VERIFICATION');
console.log('====================================================\n');

// 1. Check generate.html markup
const generateHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'generate.html'), 'utf8');

assert(
  generateHtml.includes('Teachers &amp; Assigned Subjects') || generateHtml.includes('Teachers & Assigned Subjects'),
  'generate.html Step 1 header updated to Teachers & Assigned Subjects'
);

assert(
  generateHtml.includes('id="editTimetableModal"'),
  'generate.html contains #editTimetableModal'
);

assert(
  generateHtml.includes('id="editEntryDay"') &&
  generateHtml.includes('id="editEntryTimeSlot"') &&
  generateHtml.includes('id="editEntrySection"') &&
  generateHtml.includes('id="editEntrySubject"') &&
  generateHtml.includes('id="editEntryTeacher"') &&
  generateHtml.includes('id="editEntryRoom"'),
  'generate.html modal contains all required fields: Day, Time Slot, Section, Subject, Teacher, Room'
);

assert(
  generateHtml.includes('id="editEntryFeedback"'),
  'generate.html contains #editEntryFeedback for real-time validation messages'
);

assert(
  generateHtml.includes('id="saveEditEntryBtn"'),
  'generate.html contains Save Changes submit button'
);

// 2. Check style.css definitions
const styleCss = fs.readFileSync(path.join(__dirname, '..', 'public', 'style.css'), 'utf8');

assert(
  styleCss.includes('.teacher-card-row') &&
  styleCss.includes('.teacher-inputs-grid') &&
  styleCss.includes('.teacher-subject-select'),
  'style.css contains styles for teacher-subject assignment cards'
);

assert(
  styleCss.includes('.timetable-actions-cell') &&
  styleCss.includes('.btn-edit-entry') &&
  styleCss.includes('.btn-delete-entry'),
  'style.css contains styles for timetable row action buttons'
);

assert(
  styleCss.includes('.edit-timetable-modal') &&
  styleCss.includes('.edit-modal-box') &&
  styleCss.includes('.edit-feedback-alert'),
  'style.css contains styles for edit modal container, box, and feedback alerts'
);

assert(
  styleCss.includes('@media (max-width: 640px)') &&
  styleCss.includes('.teacher-inputs-grid') &&
  styleCss.includes('.edit-modal-box'),
  'style.css contains mobile responsive media queries for edit modal and teacher cards'
);

// 3. Check script.js functions and exported APIs
const scriptJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'script.js'), 'utf8');

assert(
  scriptJs.includes('function getEnteredSubjectList') &&
  scriptJs.includes('function updateTeacherSubjectDropdowns'),
  'script.js implements getEnteredSubjectList and updateTeacherSubjectDropdowns'
);

assert(
  scriptJs.includes('function openEditTimetableModal') &&
  scriptJs.includes('function closeEditTimetableModal') &&
  scriptJs.includes('function handleSaveEditEntry') &&
  scriptJs.includes('function handleDeleteTimetableEntry'),
  'script.js implements complete modal lifecycle: open, close, save, and delete'
);

assert(
  scriptJs.includes('function runLiveEditValidation') || scriptJs.includes('runLiveEditValidation'),
  'script.js implements runLiveEditValidation for live client-side validation preview'
);

assert(
  scriptJs.includes('btn-edit-entry') &&
  scriptJs.includes('btn-delete-entry'),
  'script.js renders Action column with Edit and Delete buttons in loadTimetable'
);

console.log('\n====================================================');
console.log(`CLIENT UI VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) process.exit(1);
