import type { QuizQuestion, QuizOption } from '../types';

export interface ParsedQuizImportResult {
  questions: QuizQuestion[];
  errors: string[];
  formatDetected: 'sketchcast_json' | 'sketchcast_csv' | 'kahoot_csv' | 'unknown';
}

/**
 * Escapes a field for CSV export
 */
function escapeCsv(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Robust CSV Line Splitter supporting quoted values and escaped quotes
 */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          j++; // skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }

    if (insideQuotes) {
      // Line break occurred inside a quoted field
      currentField += '\n';
    } else {
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    }
  }

  if (currentRow.length > 0 && currentRow.some((field) => field.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * 1. Export to SketchCast JSON
 */
export function exportToSketchCastJSON(questions: QuizQuestion[]): string {
  return JSON.stringify(questions, null, 2);
}

/**
 * 2. Export to SketchCast Native CSV
 */
export function exportToSketchCastCSV(questions: QuizQuestion[]): string {
  const headers = [
    'Category',
    'Question',
    'Option A',
    'Option B',
    'Option C',
    'Option D',
    'Correct Option',
    'Explanation',
    'Time Limit (Sec)',
    'AI Deep Dive',
  ];

  const rows = questions.map((q) => {
    const optMap: Record<string, string> = {};
    (q.options || []).forEach((opt) => {
      optMap[opt.id] = opt.text;
    });

    return [
      escapeCsv(q.category || 'General Tech'),
      escapeCsv(q.question),
      escapeCsv(optMap['A'] || ''),
      escapeCsv(optMap['B'] || ''),
      escapeCsv(optMap['C'] || ''),
      escapeCsv(optMap['D'] || ''),
      escapeCsv(q.correctOptionId || 'A'),
      escapeCsv(q.explanation || ''),
      escapeCsv(q.timeLimitSeconds || 25),
      escapeCsv(q.aiDeepDive || ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * 3. Export to Official Kahoot Spreadsheet CSV
 * Format:
 * Question, Answer 1, Answer 2, Answer 3, Answer 4, Time limit (sec), Correct answer(s)
 */
export function exportToKahootCSV(questions: QuizQuestion[]): string {
  const headers = [
    'Question - max 120 characters',
    'Answer 1 - max 75 characters',
    'Answer 2 - max 75 characters',
    'Answer 3 - max 75 characters',
    'Answer 4 - max 75 characters',
    'Time limit (sec) - 5, 10, 20, 30, 60, 90, 120, or 240',
    'Correct answer(s) - choose 1, 2, 3 or 4',
  ];

  const rows = questions.map((q) => {
    const optMap: Record<string, string> = {};
    (q.options || []).forEach((opt) => {
      optMap[opt.id] = opt.text;
    });

    // Map A/B/C/D to Kahoot 1/2/3/4
    let kahootCorrect = 1;
    if (q.correctOptionId === 'B') kahootCorrect = 2;
    if (q.correctOptionId === 'C') kahootCorrect = 3;
    if (q.correctOptionId === 'D') kahootCorrect = 4;

    return [
      escapeCsv(q.question.slice(0, 120)),
      escapeCsv((optMap['A'] || '').slice(0, 75)),
      escapeCsv((optMap['B'] || '').slice(0, 75)),
      escapeCsv((optMap['C'] || '').slice(0, 75)),
      escapeCsv((optMap['D'] || '').slice(0, 75)),
      escapeCsv(q.timeLimitSeconds || 30),
      escapeCsv(kahootCorrect),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * 4. Universal Importer (Auto-detects JSON, SketchCast CSV, or Kahoot CSV)
 */
export function importFromCSVOrJSON(rawText: string): ParsedQuizImportResult {
  const trimmed = rawText.trim();
  const errors: string[] = [];

  if (!trimmed) {
    return { questions: [], errors: ['File is empty.'], formatDetected: 'unknown' };
  }

  // Check if JSON
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const validQuestions: QuizQuestion[] = [];

      list.forEach((item, index) => {
        if (!item.question || !Array.isArray(item.options)) {
          errors.push(`Item ${index + 1}: Missing question text or options array.`);
          return;
        }

        const validOpts: QuizOption[] = item.options.map((opt: any, optIdx: number) => ({
          id: opt.id || ['A', 'B', 'C', 'D'][optIdx] || `OPT_${optIdx}`,
          text: String(opt.text || opt.title || opt),
        }));

        validQuestions.push({
          id: item.id || `imported_json_${Date.now()}_${index}`,
          category: item.category || 'Imported Cartridge',
          question: String(item.question),
          options: validOpts,
          correctOptionId: item.correctOptionId || item.correctAnswer || 'A',
          explanation: item.explanation || 'Imported question challenge.',
          timeLimitSeconds: Number(item.timeLimitSeconds) || 25,
          aiDeepDive: item.aiDeepDive || undefined,
        });
      });

      return {
        questions: validQuestions,
        errors,
        formatDetected: 'sketchcast_json',
      };
    } catch (jsonErr: any) {
      errors.push(`JSON Parse Error: ${jsonErr.message}`);
    }
  }

  // Parse as CSV
  const rows = parseCsvRows(trimmed);
  if (rows.length < 2) {
    return {
      questions: [],
      errors: ['CSV requires at least 1 header row and 1 question data row.'],
      formatDetected: 'unknown',
    };
  }

  const headerRow = rows[0].map((h) => h.toLowerCase());

  // Check if Kahoot Spreadsheet format
  const isKahoot =
    headerRow.some((h) => h.includes('answer 1') || h.includes('max 120') || h.includes('correct answer'));

  if (isKahoot) {
    const kahootQuestions: QuizQuestion[] = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.length < 3 || !row[0]) continue; // Skip empty rows

      const questionText = row[0];
      const optA = row[1] || 'Option A';
      const optB = row[2] || 'Option B';
      const optC = row[3] || 'Option C';
      const optD = row[4] || 'Option D';
      const timeSec = parseInt(row[5], 10) || 30;
      
      const rawCorrect = String(row[6] || '1').trim();
      let correctOptionId: 'A' | 'B' | 'C' | 'D' = 'A';
      if (rawCorrect === '2' || rawCorrect.toUpperCase() === 'B') correctOptionId = 'B';
      else if (rawCorrect === '3' || rawCorrect.toUpperCase() === 'C') correctOptionId = 'C';
      else if (rawCorrect === '4' || rawCorrect.toUpperCase() === 'D') correctOptionId = 'D';

      const options: QuizOption[] = [
        { id: 'A', text: optA },
        { id: 'B', text: optB },
        { id: 'C', text: optC },
        { id: 'D', text: optD },
      ];

      kahootQuestions.push({
        id: `kahoot_imported_${Date.now()}_${r}`,
        category: 'Kahoot Pack',
        question: questionText,
        options,
        correctOptionId,
        explanation: 'Imported from Kahoot spreadsheet format.',
        timeLimitSeconds: timeSec,
      });
    }

    return {
      questions: kahootQuestions,
      errors,
      formatDetected: 'kahoot_csv',
    };
  }

  // Default: SketchCast Native CSV
  const scQuestions: QuizQuestion[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length < 4 || !row[1]) continue;

    const category = row[0] || 'System Design';
    const questionText = row[1];
    const optA = row[2] || 'Option A';
    const optB = row[3] || 'Option B';
    const optC = row[4] || '';
    const optD = row[5] || '';
    const correctOpt = (row[6] || 'A').toUpperCase().trim();
    const explanation = row[7] || 'Technical takeaway breakdown.';
    const timeLimit = parseInt(row[8], 10) || 25;
    const aiDeepDive = row[9] || undefined;

    const options: QuizOption[] = [
      { id: 'A', text: optA },
      { id: 'B', text: optB },
    ];
    if (optC) options.push({ id: 'C', text: optC });
    if (optD) options.push({ id: 'D', text: optD });

    scQuestions.push({
      id: `sketchcast_csv_${Date.now()}_${r}`,
      category,
      question: questionText,
      options,
      correctOptionId: ['A', 'B', 'C', 'D'].includes(correctOpt) ? correctOpt : 'A',
      explanation,
      timeLimitSeconds: timeLimit,
      aiDeepDive,
    });
  }

  return {
    questions: scQuestions,
    errors,
    formatDetected: 'sketchcast_csv',
  };
}

/**
 * Downloads a string file directly in browser
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string = 'text/csv'): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
