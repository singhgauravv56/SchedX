/**
 * SchedX Built-in Vector PDF Generator
 * Conforms to ISO 32000 (PDF 1.4) specification.
 * Generates clean, professional, publication-quality landscape academic timetables
 * with zero external dependencies.
 */

function sanitizePdfText(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\r\n\t]/g, ' ')
    .trim();
}

/**
 * Splits text into lines that fit within maxChars approximation
 */
function wrapText(text, maxChars = 16) {
  if (!text) return [];
  const words = String(text).split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      if (word.length > maxChars) {
        // truncate or split word
        lines.push(word.slice(0, maxChars - 1) + '…');
        currentLine = '';
      } else {
        currentLine = word;
      }
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Generates an ISO 32000-1 compatible PDF 1.4 binary buffer.
 * Page format: Landscape A4 (842 x 595 points)
 *
 * @param {Object} timetableData - Timetable version or generated result
 * @param {Object} options - Options (department, section, title)
 * @returns {Buffer} PDF binary buffer
 */
function generateTimetablePdf(timetableData = {}, options = {}) {
  const department = options.department || timetableData.department || 'General Department';
  const requestedSection = options.section || options.class_name || null;
  const status = timetableData.status || 'VALID';
  const rawDate = timetableData.timestamp || timetableData.created_at || new Date().toISOString();
  let formattedDate = 'Recently';
  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
  } catch (_) {}

  const allEntries = Array.isArray(timetableData.entries)
    ? timetableData.entries
    : (Array.isArray(timetableData.timetable) ? timetableData.timetable : []);

  // Determine working days
  let workingDays = timetableData.working_days || [];
  if (!workingDays || workingDays.length === 0) {
    const daySet = new Set(allEntries.map((e) => e.day || e.day_name).filter(Boolean));
    const defaultDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    workingDays = defaultDays.filter((d) => daySet.has(d));
    if (workingDays.length === 0) workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  }

  // Determine sections
  let sections = [];
  if (requestedSection && requestedSection.toLowerCase() !== 'all') {
    sections = [requestedSection];
  } else if (Array.isArray(timetableData.sections) && timetableData.sections.length > 0) {
    sections = timetableData.sections.map((s) => (typeof s === 'object' ? s.name : s)).filter(Boolean);
  } else {
    const secSet = new Set(allEntries.map((e) => e.section || e.class_name).filter(Boolean));
    sections = Array.from(secSet);
  }
  if (sections.length === 0) sections = ['Section A'];

  // Determine period slots
  let periodCount = 0;
  const dayPeriodsMap = timetableData.day_periods || {};
  for (const d of workingDays) {
    if (dayPeriodsMap[d] && Array.isArray(dayPeriodsMap[d])) {
      periodCount = Math.max(periodCount, dayPeriodsMap[d].length);
    }
  }
  if (periodCount === 0) {
    for (const e of allEntries) {
      if (e.period_number) periodCount = Math.max(periodCount, Number(e.period_number));
    }
  }
  if (periodCount === 0) periodCount = 5;

  // Build standard slot times reference
  const periodSlots = [];
  for (let p = 1; p <= periodCount; p++) {
    // Find representative times
    let sTime = '';
    let eTime = '';
    for (const d of workingDays) {
      const dList = dayPeriodsMap[d];
      if (Array.isArray(dList)) {
        const found = dList.find((item) => (item.period || item.period_number) === p);
        if (found) {
          sTime = (found.start_time || found.start || '').slice(0, 5);
          eTime = (found.end_time || found.end || '').slice(0, 5);
          break;
        }
      }
    }
    if (!sTime) {
      const ent = allEntries.find((e) => Number(e.period_number) === p);
      if (ent) {
        sTime = (ent.start_time || '').slice(0, 5);
        eTime = (ent.end_time || '').slice(0, 5);
      }
    }
    if (!sTime) {
      const startH = 9 + p - 1;
      const endH = startH + 1;
      sTime = `${String(startH).padStart(2, '0')}:00`;
      eTime = `${String(endH).padStart(2, '0')}:00`;
    }
    periodSlots.push({ period: p, start: sTime, end: eTime });
  }

  // PDF Page Coordinates (Landscape A4: 842 x 595 points)
  const PAGE_WIDTH = 842;
  const PAGE_HEIGHT = 595;
  const MARGIN_LEFT = 36;
  const MARGIN_RIGHT = 36;
  const MARGIN_TOP = 40;
  const MARGIN_BOTTOM = 36;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 770 pt

  const DAY_COL_WIDTH = 76;
  const PERIOD_COL_WIDTH = (CONTENT_WIDTH - DAY_COL_WIDTH) / periodCount;
  const TABLE_TOP = PAGE_HEIGHT - 128; // Start below header
  const HEADER_ROW_HEIGHT = 28;
  const ROW_HEIGHT = Math.min(68, Math.max(48, Math.floor((TABLE_TOP - MARGIN_BOTTOM - HEADER_ROW_HEIGHT - 20) / workingDays.length)));

  // Generate pages stream content
  const pageContents = [];

  for (let secIdx = 0; secIdx < sections.length; secIdx++) {
    const secName = sections[secIdx];
    const secEntries = allEntries.filter((e) => {
      const eSec = String(e.section || e.class_name || '').trim().toLowerCase();
      if (!eSec) return true; // general entry
      return eSec === secName.toLowerCase() || (Array.isArray(e.sections_list) && e.sections_list.some((s) => s.toLowerCase() === secName.toLowerCase()));
    });

    let stream = '';

    // Helper drawing functions
    function rect(x, y, w, h, fillRGB = null, strokeRGB = null, lineWidth = 0.5) {
      let cmd = 'q ';
      if (lineWidth) cmd += `${lineWidth} w `;
      if (fillRGB) cmd += `${fillRGB[0]} ${fillRGB[1]} ${fillRGB[2]} rg `;
      if (strokeRGB) cmd += `${strokeRGB[0]} ${strokeRGB[1]} ${strokeRGB[2]} RG `;
      cmd += `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re `;
      if (fillRGB && strokeRGB) cmd += 'B ';
      else if (fillRGB) cmd += 'f ';
      else if (strokeRGB) cmd += 'S ';
      cmd += 'Q\n';
      return cmd;
    }

    function text(str, x, y, font = 'F1', size = 10, fillRGB = [0, 0, 0]) {
      const clean = sanitizePdfText(str);
      if (!clean) return '';
      return `q ${fillRGB[0]} ${fillRGB[1]} ${fillRGB[2]} rg BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${clean}) Tj ET Q\n`;
    }

    // 1. Header Banner & Branding
    // Top royal blue accent bar
    stream += rect(MARGIN_LEFT, PAGE_HEIGHT - MARGIN_TOP - 4, CONTENT_WIDTH, 4, [0.145, 0.388, 0.922]);

    // Brand Title
    stream += text('SCHEDX — SMART TIMETABLE GENERATOR', MARGIN_LEFT, PAGE_HEIGHT - MARGIN_TOP - 22, 'F2', 14, [0.09, 0.13, 0.22]);

    // Subtitle / Department & Section
    const titleText = `${department} — Cohort: ${secName}`;
    stream += text(titleText, MARGIN_LEFT, PAGE_HEIGHT - MARGIN_TOP - 40, 'F2', 11, [0.18, 0.24, 0.35]);

    // Metadata line (Right aligned / Sub)
    const metaStr = `Generated on: ${formattedDate}  |  Status: ${status}  |  Working Days: ${workingDays.length}  |  Section ${secIdx + 1} of ${sections.length}`;
    stream += text(metaStr, MARGIN_LEFT, PAGE_HEIGHT - MARGIN_TOP - 56, 'F1', 8, [0.42, 0.48, 0.56]);

    // 2. Table Column Headers
    const tableY = TABLE_TOP - HEADER_ROW_HEIGHT;

    // Day Header Cell
    stream += rect(MARGIN_LEFT, tableY, DAY_COL_WIDTH, HEADER_ROW_HEIGHT, [0.13, 0.17, 0.24], [0.25, 0.30, 0.40], 0.75);
    stream += text('DAY / TIME', MARGIN_LEFT + 8, tableY + 10, 'F2', 8.5, [1, 1, 1]);

    // Period Header Cells
    for (let pIdx = 0; pIdx < periodSlots.length; pIdx++) {
      const slot = periodSlots[pIdx];
      const colX = MARGIN_LEFT + DAY_COL_WIDTH + pIdx * PERIOD_COL_WIDTH;
      stream += rect(colX, tableY, PERIOD_COL_WIDTH, HEADER_ROW_HEIGHT, [0.13, 0.17, 0.24], [0.25, 0.30, 0.40], 0.75);
      stream += text(`PERIOD ${slot.period}`, colX + 8, tableY + 15, 'F2', 8, [1, 1, 1]);
      stream += text(`${slot.start} – ${slot.end}`, colX + 8, tableY + 5, 'F1', 7, [0.80, 0.86, 0.94]);
    }

    // 3. Table Rows (Day-by-Day)
    for (let rIdx = 0; rIdx < workingDays.length; rIdx++) {
      const dayName = workingDays[rIdx];
      const rowY = tableY - (rIdx + 1) * ROW_HEIGHT;
      const isAlt = rIdx % 2 === 1;
      const dayBg = isAlt ? [0.96, 0.97, 0.99] : [1, 1, 1];

      // Day Column Cell
      stream += rect(MARGIN_LEFT, rowY, DAY_COL_WIDTH, ROW_HEIGHT, [0.93, 0.95, 0.98], [0.78, 0.82, 0.88], 0.5);
      stream += text(dayName.toUpperCase(), MARGIN_LEFT + 8, rowY + ROW_HEIGHT / 2 - 2, 'F2', 8.5, [0.12, 0.16, 0.24]);

      // Period Cells
      for (let pIdx = 0; pIdx < periodSlots.length; pIdx++) {
        const slot = periodSlots[pIdx];
        const colX = MARGIN_LEFT + DAY_COL_WIDTH + pIdx * PERIOD_COL_WIDTH;

        // Find entry for this day and period
        const entry = secEntries.find((e) => {
          const eDay = String(e.day || e.day_name || '').toLowerCase();
          return eDay === dayName.toLowerCase() && Number(e.period_number) === slot.period;
        });

        // Check if there is a break at this time
        const breaksList = timetableData.breaks || [];
        const isBreak = breaksList.some((b) => {
          const bDay = String(b.day || b.day_name || 'all').toLowerCase();
          if (bDay !== 'all' && bDay !== 'all working days' && bDay !== dayName.toLowerCase()) return false;
          const bStart = (b.startTime || b.start_time || '').slice(0, 5);
          return bStart === slot.start;
        });

        if (isBreak) {
          // Render shaded break cell
          stream += rect(colX, rowY, PERIOD_COL_WIDTH, ROW_HEIGHT, [0.92, 0.93, 0.95], [0.80, 0.83, 0.88], 0.5);
          stream += text('☕ BREAK / RECESS', colX + 8, rowY + ROW_HEIGHT / 2 - 2, 'F2', 7.5, [0.45, 0.50, 0.58]);
        } else if (entry) {
          const isLab = Boolean(entry.session_type === 'LAB' || entry.is_lab);
          const hasConflict = Boolean(entry.has_conflict);

          // Background fill
          let cellFill = dayBg;
          let borderStroke = [0.82, 0.85, 0.90];
          if (hasConflict) {
            cellFill = [1.0, 0.94, 0.94];
            borderStroke = [0.90, 0.30, 0.30];
          } else if (isLab) {
            cellFill = [0.93, 0.97, 1.0];
            borderStroke = [0.40, 0.65, 0.95];
          }

          stream += rect(colX, rowY, PERIOD_COL_WIDTH, ROW_HEIGHT, cellFill, borderStroke, hasConflict ? 1.0 : 0.5);

          // Subject Name
          const subjectStr = entry.course_name || entry.subject || 'Subject';
          const subLines = wrapText(subjectStr, Math.floor(PERIOD_COL_WIDTH / 6));
          const line1 = subLines[0] || subjectStr;
          const line2 = subLines[1] || '';

          let textY = rowY + ROW_HEIGHT - 14;
          const subColor = hasConflict ? [0.80, 0.15, 0.15] : (isLab ? [0.10, 0.35, 0.75] : [0.08, 0.12, 0.20]);
          stream += text(line1, colX + 6, textY, 'F2', 8, subColor);

          if (line2) {
            textY -= 10;
            stream += text(line2, colX + 6, textY, 'F2', 8, subColor);
          }

          // Teacher Name
          textY -= 11;
          const teacherStr = entry.teacher_name || entry.faculty || 'Faculty';
          const cleanTeacher = teacherStr.length > 20 ? teacherStr.slice(0, 19) + '…' : teacherStr;
          stream += text(cleanTeacher, colX + 6, textY, 'F1', 7.2, [0.30, 0.36, 0.44]);

          // Room & Lab Badge
          textY -= 10;
          let roomStr = entry.room_name || entry.room || 'Room';
          if (isLab) roomStr = `[LAB] ${roomStr}`;
          stream += text(roomStr, colX + 6, textY, 'F1', 6.8, [0.45, 0.50, 0.58]);
        } else {
          // Free Period
          stream += rect(colX, rowY, PERIOD_COL_WIDTH, ROW_HEIGHT, dayBg, [0.88, 0.90, 0.93], 0.5);
          stream += text('Free Period', colX + 8, rowY + ROW_HEIGHT / 2 - 2, 'F1', 7.5, [0.65, 0.68, 0.74]);
        }
      }
    }

    // 4. Footer
    const footerY = MARGIN_BOTTOM + 6;
    stream += rect(MARGIN_LEFT, footerY + 12, CONTENT_WIDTH, 0.5, null, [0.80, 0.83, 0.88]);
    const leftFooter = `SchedX Timetable System  •  Institution: ${department}  •  Section: ${secName}`;
    stream += text(leftFooter, MARGIN_LEFT, footerY, 'F1', 7.5, [0.45, 0.50, 0.58]);

    const rightFooter = `Page ${secIdx + 1} of ${sections.length}`;
    stream += text(rightFooter, PAGE_WIDTH - MARGIN_RIGHT - 54, footerY, 'F2', 7.5, [0.45, 0.50, 0.58]);

    pageContents.push(stream);
  }

  // Construct PDF Document Structure (PDF 1.4)
  const numPages = pageContents.length;
  const objects = [];
  let currentObjId = 1;

  // Obj 1: Catalog
  const catalogObjId = currentObjId++;
  // Obj 2: Pages
  const pagesObjId = currentObjId++;

  // Pre-allocate Font Objects
  const fontF1ObjId = currentObjId++;
  const fontF2ObjId = currentObjId++;

  const pageObjIds = [];
  const contentObjIds = [];

  for (let i = 0; i < numPages; i++) {
    pageObjIds.push(currentObjId++);
    contentObjIds.push(currentObjId++);
  }

  // Build Output String
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const byteOffsets = {};

  function writeObj(id, body) {
    byteOffsets[id] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${id} 0 obj\n${body}\nendobj\n`;
  }

  // Catalog
  writeObj(catalogObjId, `<< /Type /Catalog /Pages ${pagesObjId} 0 R >>`);

  // Pages
  const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(' ');
  writeObj(pagesObjId, `<< /Type /Pages /Kids [${kidsStr}] /Count ${numPages} >>`);

  // Fonts
  writeObj(fontF1ObjId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  writeObj(fontF2ObjId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  // Pages & Content Streams
  for (let i = 0; i < numPages; i++) {
    const pageId = pageObjIds[i];
    const contentId = contentObjIds[i];
    const streamData = pageContents[i];
    const streamLen = Buffer.byteLength(streamData, 'utf8');

    // Page object
    writeObj(pageId, `<< /Type /Page /Parent ${pagesObjId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontF1ObjId} 0 R /F2 ${fontF2ObjId} 0 R >> >> /Contents ${contentId} 0 R >>`);

    // Contents stream
    writeObj(contentId, `<< /Length ${streamLen} >>\nstream\n${streamData}endstream`);
  }

  // Cross Reference Table
  const totalObjs = currentObjId;
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${totalObjs}\n0000000000 65535 f \n`;

  for (let id = 1; id < totalObjs; id++) {
    const off = byteOffsets[id] || 0;
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }

  // Trailer
  pdf += `trailer\n<< /Size ${totalObjs} /Root ${catalogObjId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}

/**
 * Sanitizes department and section for safe filename generation
 */
function createSafePdfFilename(department = 'SchedX', section = '') {
  const cleanDept = String(department)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 30);
  const cleanSec = section
    ? '_' + String(section).replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 15)
    : '';
  return `SchedX_${cleanDept}${cleanSec}_Timetable.pdf`;
}

module.exports = {
  generateTimetablePdf,
  createSafePdfFilename
};
