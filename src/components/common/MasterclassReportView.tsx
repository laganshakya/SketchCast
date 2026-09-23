import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FileText,
  Copy,
  Download,
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Globe,
  FileCode,
  ChevronDown,
  Layers,
  HelpCircle,
  Users,
  Zap,
  BarChart2,
  Check,
  BookOpen,
  Printer,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  generateSessionSummaryReport,
  generateTechnicalCheatSheet,
  getStoredMeshKey,
} from '../../lib/meshApi';
import type { QuizQuestion, LivePoll, Question, LeaderboardEntry } from '../../types';
import { playClickSound, playPopSound, playWhoosh } from '../../lib/soundFx';

interface MasterclassReportViewProps {
  roomTitle: string;
  roomCode: string;
  totalAttendees: number;
  quizzes: QuizQuestion[];
  polls: LivePoll[];
  questions: Question[];
  leaderboard: LeaderboardEntry[];
  isHost?: boolean;
  initialReportMarkdown?: string;
  userQuizAnswers?: Record<string, string>;
  userPollVotes?: Record<string, string>;
  onReportGenerated?: (markdown: string) => void;
  onOpenAISettings?: () => void;
}

function getCategoryBadgeStyle(category?: string): { bg: string; text: string; border: string } {
  const lower = (category || '').toLowerCase();
  if (lower.includes('concept') || lower.includes('engineer')) {
    return { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/25' };
  }
  if (lower.includes('trend') || lower.includes('disrupt')) {
    return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/25' };
  }
  if (lower.includes('agent') || lower.includes('ai')) {
    return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/25' };
  }
  if (lower.includes('secur') || lower.includes('auth')) {
    return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/25' };
  }
  return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/25' };
}

function parseMarkdownToStyledHtml(
  markdown: string,
  roomTitle: string,
  roomCode: string,
  timeStr: string,
  quizzes: QuizQuestion[],
  polls: LivePoll[]
): string {
  const lines = markdown.split('\n');
  const sectionsHtml: string[] = [];
  let currentSectionTitle = '';
  let currentSectionContent: string[] = [];

  const flushSection = () => {
    if (!currentSectionTitle && currentSectionContent.length === 0) return;

    const isQuizSec = /quiz/i.test(currentSectionTitle);
    const isPollSec = /poll/i.test(currentSectionTitle);

    let contentInner = currentSectionContent.join('\n');
    contentInner = contentInner.replace(/###\s+(.+)/g, '<h3 class="section-subtitle">$1</h3>');
    contentInner = contentInner.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    contentInner = contentInner.replace(/\*(.+?)\*/g, '<em>$1</em>');
    contentInner = contentInner.replace(/`([^`]+)`/g, '<code class="code-badge">$1</code>');

    const formattedLines = contentInner.split('\n').map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        const itemText = trimmed.substring(2);
        return `<div class="bullet-item"><span class="bullet-arrow">▸</span><span>${itemText}</span></div>`;
      }
      if (/^\d+\.\s+/.test(trimmed)) {
        return `<div class="numbered-item"><span class="item-num">${trimmed.match(/^\d+\./)?.[0] || '•'}</span><span>${trimmed.replace(/^\d+\.\s+/, '')}</span></div>`;
      }
      if (trimmed === '---') {
        return '<hr class="divider"/>';
      }
      if (trimmed.length === 0) {
        return '';
      }
      // If quiz section and line is table, skip it because we render rich cards below
      if ((isQuizSec || isPollSec) && trimmed.startsWith('|') && trimmed.endsWith('|')) {
        return '';
      }
      return `<p class="paragraph">${trimmed}</p>`;
    }).filter(Boolean);

    let richCardsHtml = '';
    if (isQuizSec && quizzes.length > 0) {
      richCardsHtml = `
        <div class="rich-drilldown-header">Technical Question Breakdown (${quizzes.length} Questions)</div>
        ${quizzes.map((q, qIdx) => {
          if (q.questionType === 'short_answer') {
            return `
            <div class="quiz-card-html">
              <div class="quiz-header-html">
                <span class="q-badge">#${qIdx + 1}</span>
                <span class="q-title-html">${q.question}</span>
                <span class="category-chip">${q.category || 'Architecture'}</span>
              </div>
              <div class="correct-banner">
                <span class="correct-label">✓ EXPECTED ANSWER:</span>
                <span class="correct-value">${q.expectedAnswer || q.correctOptionId}</span>
              </div>
              ${q.acceptableAnswers && q.acceptableAnswers.length > 0 ? `
              <div class="options-grid-html">
                <div class="opt-row-html is-correct">
                  <span class="opt-body"><strong>Accepted Synonyms:</strong> ${q.acceptableAnswers.join(', ')}</span>
                </div>
              </div>` : ''}
              ${q.explanation ? `<div class="explanation-box"><strong>Key Architectural Takeaway:</strong> ${q.explanation}</div>` : ''}
            </div>
            `;
          }
          const correctOpt = (q.options || []).find((o) => o.id.toUpperCase() === q.correctOptionId.toUpperCase());
          const correctText = correctOpt ? `${correctOpt.id}. ${correctOpt.text}` : `Option ${q.correctOptionId}`;
          return `
            <div class="quiz-card-html">
              <div class="quiz-header-html">
                <span class="q-badge">#${qIdx + 1}</span>
                <span class="q-title-html">${q.question}</span>
                <span class="category-chip">${q.category || 'Architecture'}</span>
              </div>
              <div class="correct-banner">
                <span class="correct-label">✓ CORRECT OPTION:</span>
                <span class="correct-value">${correctText}</span>
              </div>
              <div class="options-grid-html">
                ${(q.options || []).map((opt) => `
                  <div class="opt-row-html ${opt.id.toUpperCase() === q.correctOptionId.toUpperCase() ? 'is-correct' : ''}">
                    <span class="opt-key">${opt.id}</span>
                    <span class="opt-body">${opt.text}</span>
                    ${opt.id.toUpperCase() === q.correctOptionId.toUpperCase() ? '<span class="correct-tag">CORRECT</span>' : ''}
                  </div>
                `).join('')}
              </div>
              ${q.explanation ? `<div class="explanation-box"><strong>Key Architectural Takeaway:</strong> ${q.explanation}</div>` : ''}
            </div>
          `;
        }).join('')}
      `;
    }

    if (isPollSec && polls.length > 0) {
      richCardsHtml = `
        <div class="rich-drilldown-header">Live Poll Insights (${polls.length} Polls)</div>
        ${polls.map((p, pIdx) => {
          const totalVotes = (p.options || []).reduce((sum, o) => sum + (o.votesCount || 0), 0);
          return `
            <div class="quiz-card-html">
              <div class="quiz-header-html">
                <span class="q-badge">#${pIdx + 1}</span>
                <span class="q-title-html">${p.question}</span>
                <span class="category-chip">${totalVotes} Total Votes</span>
              </div>
              <div class="options-grid-html">
                ${(p.options || []).map((opt) => {
                  const pct = totalVotes > 0 ? Math.round(((opt.votesCount || 0) / totalVotes) * 100) : 0;
                  return `
                    <div class="opt-row-html">
                      <span class="opt-key">${pct}%</span>
                      <span class="opt-body">${opt.text} (${opt.votesCount || 0} votes)</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      `;
    }

    sectionsHtml.push(`
      <div class="blueprint-card">
        ${currentSectionTitle ? `<div class="card-header"><h2>${currentSectionTitle}</h2></div>` : ''}
        <div class="card-body">
          ${formattedLines.join('\n')}
          ${richCardsHtml}
        </div>
      </div>
    `);

    currentSectionTitle = '';
    currentSectionContent = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      flushSection();
      const titleText = trimmed.replace(/^#\s+/, '').replace(/[⚡🧠📊💬🏆🚀]/gu, '').trim();
      sectionsHtml.push(`
        <div class="hero-banner">
          <div class="hero-tag">SKETCHCAST MASTERCLASS REPORT • ROOM ${roomCode} • ${timeStr}</div>
          <h1 class="hero-title">${titleText || roomTitle}</h1>
        </div>
      `);
    } else if (trimmed.startsWith('## ')) {
      flushSection();
      currentSectionTitle = trimmed.replace(/^##\s+/, '').trim();
    } else {
      currentSectionContent.push(line);
    }
  }
  flushSection();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${roomTitle} - Masterclass Session Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0A0A0C; color: #FAFAFA; padding: 40px; margin: 0; line-height: 1.6; }
    .hero-banner { background: #121216; border: 1px solid #27272A; border-radius: 16px; padding: 32px; margin-bottom: 24px; text-align: center; }
    .hero-tag { font-size: 11px; font-weight: 700; color: #3B82F6; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; font-family: monospace; }
    .hero-title { margin: 0; font-size: 28px; font-weight: 800; color: #FFFFFF; }
    .blueprint-card { background: #121216; border: 1px solid #27272A; border-radius: 16px; padding: 24px; margin-bottom: 20px; }
    .card-header h2 { margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #60A5FA; }
    .bullet-item { display: flex; gap: 8px; margin: 8px 0; color: #D4D4D8; }
    .bullet-arrow { color: #3B82F6; }
    .paragraph { color: #D4D4D8; margin: 8px 0; }
    .divider { border: 0; border-top: 1px solid #27272A; margin: 16px 0; }
    strong { color: #FFFFFF; }
    .rich-drilldown-header { font-size: 13px; font-weight: 700; color: #93C5FD; text-transform: uppercase; letter-spacing: 0.05em; margin: 20px 0 12px; font-family: monospace; }
    .quiz-card-html { background: #17171C; border: 1px solid #27272A; border-radius: 12px; padding: 16px; margin-bottom: 14px; }
    .quiz-header-html { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
    .q-badge { font-family: monospace; font-size: 12px; font-weight: 700; color: #3B82F6; background: rgba(59,130,246,0.1); padding: 2px 8px; border-radius: 6px; }
    .q-title-html { font-size: 14px; font-weight: 700; color: #FFFFFF; flex: 1; min-width: 200px; }
    .category-chip { font-family: monospace; font-size: 11px; background: rgba(255,255,255,0.06); color: #A1A1AA; padding: 2px 8px; border-radius: 6px; }
    .correct-banner { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25); border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; font-size: 13px; color: #34D399; }
    .correct-label { font-weight: 700; margin-right: 6px; }
    .options-grid-html { display: grid; gap: 6px; margin-bottom: 10px; }
    .opt-row-html { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); font-size: 12px; }
    .opt-row-html.is-correct { background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.3); color: #6EE7B7; }
    .opt-key { font-family: monospace; font-weight: 700; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 4px; background: rgba(255,255,255,0.08); }
    .opt-body { flex: 1; }
    .correct-tag { font-size: 10px; font-weight: 700; background: #059669; color: white; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    .explanation-box { background: rgba(59,130,246,0.05); border: 1px solid rgba(59,130,246,0.2); border-radius: 8px; padding: 10px 12px; font-size: 12px; color: #93C5FD; }
  </style>
</head>
<body>
  ${sectionsHtml.join('\n')}
</body>
</html>`;
}

interface ParsedSection {
  title: string;
  icon?: string;
  lines: string[];
}

function parseMarkdownIntoSections(markdown: string): { heroTitle: string; sections: ParsedSection[] } {
  const lines = markdown.split('\n');
  let heroTitle = '';
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('# ')) {
      heroTitle = trimmed.replace(/^#\s+/, '').replace(/[⚡🧠📊💬🏆🚀]/gu, '').trim();
    } else if (trimmed.startsWith('## ')) {
      if (currentSection) {
        sections.push(currentSection);
      }
      const rawTitle = trimmed.replace(/^##\s+/, '').trim();
      currentSection = {
        title: rawTitle,
        lines: [],
      };
    } else {
      if (currentSection) {
        currentSection.lines.push(rawLine);
      }
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return { heroTitle, sections };
}

// Fallback: parse quiz questions from markdown table if quizzes queue is empty
function parseQuizzesFromTable(lines: string[]): QuizQuestion[] {
  const tableRows: string[][] = [];
  let inTable = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (lines[i + 1]?.includes('---')) {
        inTable = true;
        i++; // skip separator
        continue;
      }
      if (inTable) {
        const cols = trimmed.split('|').slice(1, -1).map((c) => c.trim());
        if (cols.length >= 2) {
          tableRows.push(cols);
        }
      }
    } else {
      inTable = false;
    }
  }
  return tableRows.map((row, idx) => {
    const correctId = (row[1] || 'A').toUpperCase().trim();
    return {
      id: `parsed_q_${idx + 1}`,
      question: row[0] || `Question #${idx + 1}`,
      correctOptionId: correctId,
      category: row[2] || 'Technical Analysis',
      options: [
        { id: 'A', text: correctId === 'A' ? 'Primary recommended architecture solution' : 'Alternative pattern' },
        { id: 'B', text: correctId === 'B' ? 'Primary recommended architecture solution' : 'Alternative pattern' },
        { id: 'C', text: correctId === 'C' ? 'Primary recommended architecture solution' : 'Alternative pattern' },
        { id: 'D', text: correctId === 'D' ? 'Primary recommended architecture solution' : 'Alternative pattern' },
      ],
      explanation: `Evaluates critical core architectural principles in ${row[2] || 'system design'}.`,
      timeLimitSeconds: 25,
    };
  });
}

// Helper for inline bold, italic, code
function formatInlineText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="px-1.5 py-0.5 rounded bg-white/[0.06] text-blue-300 font-mono text-[11px] border border-white/[0.08]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// Render formatted lines (tables, bullets, bold text, paragraphs)
const FormattedSectionBody: React.FC<{ lines: string[]; skipTables?: boolean }> = ({ lines, skipTables = false }) => {
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Fenced Code Blocks
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <div key={`code-${i}`} className="my-3 rounded-xl bg-[#09090C] border border-white/[0.08] overflow-hidden">
          {lang && (
            <div className="px-3.5 py-1.5 bg-white/[0.04] border-b border-white/[0.06] text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
              {lang}
            </div>
          )}
          <pre className="p-3.5 font-mono text-xs text-cyan-300 overflow-x-auto leading-relaxed">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Table detection: line contains |
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
      const headerCols = trimmed.split('|').slice(1, -1).map((c) => c.trim());
      i += 2; // skip header and separator
      const tableRows: string[][] = [];

      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        const rowCols = lines[i].trim().split('|').slice(1, -1).map((c) => c.trim());
        tableRows.push(rowCols);
        i++;
      }

      if (!skipTables) {
        elements.push(
          <div key={`table-${i}`} className="my-4 overflow-x-auto table-responsive rounded-xl border border-white/[0.08] shadow-sm max-w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/[0.04] border-b border-white/[0.08] text-zinc-300 font-semibold uppercase tracking-wider text-[11px]">
                  {headerCols.map((col, cIdx) => (
                    <th key={cIdx} className="p-3">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {tableRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-3 text-zinc-300 font-normal leading-relaxed">
                        {formatInlineText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Bullet items
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = trimmed.substring(2);
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start space-x-2.5 my-1.5 text-xs text-zinc-300 leading-relaxed">
          <span className="text-blue-400 font-bold shrink-0 mt-0.5">▸</span>
          <span className="flex-1">{formatInlineText(itemText)}</span>
        </div>
      );
      i++;
      continue;
    }

    // Numbered items
    if (/^\d+\.\s+/.test(trimmed)) {
      const numMatch = trimmed.match(/^(\d+)\.\s+/);
      const num = numMatch ? numMatch[1] : '1';
      const itemText = trimmed.replace(/^\d+\.\s+/, '');
      elements.push(
        <div key={`num-${i}`} className="flex items-start space-x-2.5 my-1.5 text-xs text-zinc-300 leading-relaxed">
          <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 font-mono text-[10px] font-bold shrink-0 mt-0.5 border border-blue-500/20">
            {num}
          </span>
          <span className="flex-1">{formatInlineText(itemText)}</span>
        </div>
      );
      i++;
      continue;
    }

    // Subheadings ###
    if (trimmed.startsWith('### ')) {
      const headingText = trimmed.replace(/^###\s+/, '');
      elements.push(
        <h4 key={`sub-${i}`} className="text-xs sm:text-sm font-semibold text-white mt-4 mb-2 flex items-center gap-1.5 text-blue-400">
          <span>{formatInlineText(headingText)}</span>
        </h4>
      );
      i++;
      continue;
    }

    // Horizontal dividers
    if (trimmed === '---') {
      elements.push(<hr key={`hr-${i}`} className="border-0 border-t border-white/[0.08] my-3" />);
      i++;
      continue;
    }

    // Paragraphs
    if (trimmed.length > 0) {
      elements.push(
        <p key={`p-${i}`} className="text-xs text-zinc-300 leading-relaxed my-2">
          {formatInlineText(trimmed)}
        </p>
      );
    }

    i++;
  }

  return <div className="space-y-1">{elements}</div>;
};

// ==========================================
// INTERACTIVE QUIZ ACCORDION CARDS
// ==========================================
interface QuizAccordionProps {
  quizzes: QuizQuestion[];
  userQuizAnswers?: Record<string, string>;
  isHost?: boolean;
}

const QuizQuestionsAccordion: React.FC<QuizAccordionProps> = ({ quizzes, userQuizAnswers = {}, isHost = false }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    playClickSound();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3 my-4">
      {quizzes.map((quiz, qIdx) => {
        const cardId = quiz.id || `quiz_${qIdx + 1}`;
        const isExpanded = expandedIds.has(cardId);

        // Find user's answer
        const userChoiceId =
          userQuizAnswers[quiz.id] ||
          userQuizAnswers[quiz.question.trim().toLowerCase()] ||
          null;

        const isUserCorrect =
          userChoiceId !== null
            ? userChoiceId.toUpperCase() === quiz.correctOptionId.toUpperCase()
            : null;

        // Correct Option details
        const correctOptionObj = (quiz.options || []).find(
          (o) => o.id.toUpperCase() === quiz.correctOptionId.toUpperCase()
        );
        const correctOptionText = correctOptionObj ? correctOptionObj.text : `Option ${quiz.correctOptionId}`;

        // User Option details
        const userOptionObj = userChoiceId
          ? (quiz.options || []).find((o) => o.id.toUpperCase() === userChoiceId.toUpperCase())
          : null;
        const userOptionText = userOptionObj ? userOptionObj.text : userChoiceId ? `Option ${userChoiceId}` : null;

        const catStyle = getCategoryBadgeStyle(quiz.category);

        return (
          <div
            key={cardId}
            className="rounded-xl bg-[#121217] border border-white/[0.08] hover:border-white/[0.14] transition-all overflow-hidden shadow-sm"
          >
            {/* Clickable Header */}
            <button
              type="button"
              onClick={() => toggleExpand(cardId)}
              className="w-full text-left p-4 flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="font-mono text-xs font-bold text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06] shrink-0">
                  #{String(qIdx + 1).padStart(2, '0')}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-semibold text-white group-hover:text-blue-300 transition-colors line-clamp-2">
                    {quiz.question}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                    >
                      {quiz.category || 'Architecture'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Badge on Right */}
              <div className="flex items-center gap-2.5 shrink-0">
                {isHost ? (
                  <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono text-[11px] font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                    <span>
                      {quiz.questionType === 'short_answer'
                        ? `Answer: ${quiz.expectedAnswer || quiz.correctOptionId}`
                        : `Answer: ${quiz.correctOptionId}`}
                    </span>
                  </span>
                ) : userChoiceId !== null ? (
                  isUserCorrect ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[11px] font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Correct</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono text-[11px] font-bold flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Incorrect</span>
                    </span>
                  )
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-white/[0.08] font-mono text-[11px] font-medium">
                    Not Attempted
                  </span>
                )}

                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-7 h-7 rounded-lg bg-white/[0.04] text-zinc-400 group-hover:text-white flex items-center justify-center border border-white/[0.06]"
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.div>
              </div>
            </button>

            {/* Expanded Detailed Breakdown */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="border-t border-white/[0.06] bg-[#0E0E12] p-4 sm:p-5 space-y-4"
                >
                  {/* Side-by-Side Comparison Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Correct Option Card */}
                    <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 mb-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{quiz.questionType === 'short_answer' ? 'EXPECTED ANSWER' : 'CORRECT OPTION'}</span>
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-emerald-300">
                        {quiz.questionType === 'short_answer' ? (
                          <div>
                            <span className="font-mono text-emerald-300">{quiz.expectedAnswer || correctOptionText}</span>
                            {quiz.acceptableAnswers && quiz.acceptableAnswers.length > 0 && (
                              <div className="text-[11px] font-mono text-zinc-400 mt-1">
                                (Accepted: {quiz.acceptableAnswers.join(', ')})
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <span className="font-mono mr-1.5 font-bold">{quiz.correctOptionId}.</span>
                            {correctOptionText}
                          </>
                        )}
                      </div>
                    </div>

                    {/* User Selected Answer Card */}
                    <div
                      className={`p-3.5 rounded-xl border ${
                        isHost
                          ? 'bg-blue-950/20 border-blue-500/30'
                          : userChoiceId !== null
                          ? isUserCorrect
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : 'bg-rose-950/20 border-rose-500/30'
                          : 'bg-zinc-900/40 border-white/[0.08]'
                      }`}
                    >
                      <div
                        className={`flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider mb-1 ${
                          isHost
                            ? 'text-blue-400'
                            : userChoiceId !== null
                            ? isUserCorrect
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                            : 'text-zinc-400'
                        }`}
                      >
                        {isHost ? (
                          <>
                            <Users className="w-3.5 h-3.5" />
                            <span>HOST RECOGNITION</span>
                          </>
                        ) : userChoiceId !== null ? (
                          isUserCorrect ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>YOUR ANSWER (CORRECT)</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>YOUR ANSWER (INCORRECT)</span>
                            </>
                          )
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>YOUR ANSWER</span>
                          </>
                        )}
                      </div>

                      <div
                        className={`text-xs sm:text-sm font-semibold ${
                          isHost
                            ? 'text-blue-300'
                            : userChoiceId !== null
                            ? isUserCorrect
                              ? 'text-emerald-300'
                              : 'text-rose-300'
                            : 'text-zinc-400 italic'
                        }`}
                      >
                        {isHost ? (
                          <span>Verified correct key: Option {quiz.correctOptionId}</span>
                        ) : userChoiceId !== null ? (
                          <>
                            <span className="font-mono mr-1.5 font-bold">{userChoiceId}.</span>
                            {userOptionText}
                          </>
                        ) : (
                          'No response submitted during live round'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Question Options or Short-Answer Reference */}
                  {quiz.questionType === 'short_answer' ? (
                    <div>
                      <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>GROUND TRUTH & ACCEPTABLE SYNONYMS</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
                        <div className="text-xs text-zinc-300 flex items-center gap-2 flex-wrap">
                          <span className="text-zinc-400 font-mono font-semibold">Canonical Answer:</span>
                          <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                            {quiz.expectedAnswer || quiz.correctOptionId}
                          </span>
                        </div>
                        {quiz.acceptableAnswers && quiz.acceptableAnswers.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/[0.04]">
                            <span className="text-zinc-400 font-mono text-[11px] mr-1">Accepted Variations:</span>
                            {quiz.acceptableAnswers.map((syn, synIdx) => (
                              <span
                                key={synIdx}
                                className="px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-300 font-mono text-[10px] border border-white/[0.08]"
                              >
                                {syn}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                        <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>ALL OPTIONS BREAKDOWN</span>
                      </div>

                      <div className="space-y-2">
                        {(quiz.options || []).map((opt) => {
                          const isThisCorrect = opt.id.toUpperCase() === quiz.correctOptionId.toUpperCase();
                          const isThisUser = userChoiceId !== null && opt.id.toUpperCase() === userChoiceId.toUpperCase();

                          return (
                            <div
                              key={opt.id}
                              className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                                isThisCorrect
                                  ? 'bg-emerald-500/[0.06] border-emerald-500/35 text-zinc-100'
                                  : isThisUser && !isThisCorrect
                                  ? 'bg-rose-500/[0.06] border-rose-500/35 text-zinc-200'
                                  : 'bg-white/[0.02] border-white/[0.06] text-zinc-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span
                                  className={`w-6 h-6 rounded-md font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                                    isThisCorrect
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : isThisUser && !isThisCorrect
                                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                      : 'bg-white/[0.06] text-zinc-400 border border-white/[0.08]'
                                  }`}
                                >
                                  {opt.id}
                                </span>
                                <span className="font-medium text-xs leading-relaxed">{opt.text}</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {isThisCorrect && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                                    CORRECT OPTION
                                  </span>
                                )}
                                {isThisUser && (
                                  <span
                                    className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                                      isThisCorrect
                                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                        : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                    }`}
                                  >
                                    YOU CHOSE
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Architectural Takeaway Box */}
                  {(quiz.explanation || quiz.aiDeepDive) && (
                    <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/20 flex items-start gap-2.5">
                      <BookOpen className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 mb-0.5">
                          ARCHITECTURAL TAKEAWAY & EXPLANATION
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          {quiz.explanation || quiz.aiDeepDive}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

// ==========================================
// INTERACTIVE LIVE POLLS ACCORDION CARDS
// ==========================================
interface PollAccordionProps {
  polls: LivePoll[];
  userPollVotes?: Record<string, string>;
  isHost?: boolean;
}

const PollsAccordion: React.FC<PollAccordionProps> = ({ polls, userPollVotes = {} }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    playClickSound();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3 my-4">
      {polls.map((poll, pIdx) => {
        const cardId = poll.id || `poll_${pIdx + 1}`;
        const isExpanded = expandedIds.has(cardId);
        const totalVotes = (poll.options || []).reduce((sum, o) => sum + (o.votesCount || 0), 0);
        const userVotedOptId = userPollVotes[poll.id] || null;

        return (
          <div
            key={cardId}
            className="rounded-xl bg-[#121217] border border-white/[0.08] hover:border-white/[0.14] transition-all overflow-hidden shadow-sm"
          >
            {/* Clickable Header */}
            <button
              type="button"
              onClick={() => toggleExpand(cardId)}
              className="w-full text-left p-4 flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="font-mono text-xs font-bold text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06] shrink-0">
                  POLL #{String(pIdx + 1).padStart(2, '0')}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-semibold text-white group-hover:text-blue-300 transition-colors line-clamp-2">
                    {poll.question}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
                      {totalVotes} {totalVotes === 1 ? 'Vote' : 'Votes'} Recorded
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {userVotedOptId ? (
                  <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono text-[11px] font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Voted</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-white/[0.08] font-mono text-[11px] font-medium">
                    No Vote
                  </span>
                )}

                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-7 h-7 rounded-lg bg-white/[0.04] text-zinc-400 group-hover:text-white flex items-center justify-center border border-white/[0.06]"
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.div>
              </div>
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="border-t border-white/[0.06] bg-[#0E0E12] p-4 sm:p-5 space-y-3"
                >
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    VOTING DISTRIBUTION & AUDIENCE CONSENSUS
                  </div>

                  <div className="space-y-2.5">
                    {(poll.options || []).map((opt) => {
                      const count = opt.votesCount || 0;
                      const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                      const isUserChoice = userVotedOptId === opt.id;

                      return (
                        <div
                          key={opt.id}
                          className={`p-3 rounded-xl border relative overflow-hidden transition-all ${
                            isUserChoice
                              ? 'bg-cyan-500/[0.06] border-cyan-500/30'
                              : 'bg-white/[0.02] border-white/[0.06]'
                          }`}
                        >
                          {/* Progress Bar Background */}
                          <div
                            className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${
                              isUserChoice ? 'bg-cyan-500/10' : 'bg-blue-500/[0.08]'
                            }`}
                            style={{ width: `${pct}%` }}
                          />

                          <div className="relative z-10 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="font-semibold text-zinc-200">{opt.text}</span>
                              {isUserChoice && (
                                <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[9px] font-bold border border-cyan-500/30">
                                  YOU VOTED
                                </span>
                              )}
                            </div>

                            <div className="font-mono text-xs font-bold text-zinc-300 shrink-0 flex items-center gap-2">
                              <span>{count} votes</span>
                              <span className="text-blue-400">({pct}%)</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {poll.aiConsensusNote && (
                    <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 flex items-start gap-2.5 mt-3">
                      <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 mb-0.5">
                          AI COMMUNITY CONSENSUS TAKEAWAY
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed">{poll.aiConsensusNote}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export const MasterclassReportView: React.FC<MasterclassReportViewProps> = ({
  roomTitle,
  roomCode,
  totalAttendees,
  quizzes,
  polls,
  questions,
  leaderboard,
  isHost = false,
  initialReportMarkdown,
  userQuizAnswers = {},
  userPollVotes = {},
  onReportGenerated,
  onOpenAISettings,
}) => {
  const [activeMarkdown, setActiveMarkdown] = useState<string>(initialReportMarkdown || '');
  const [cheatSheetMarkdown, setCheatSheetMarkdown] = useState<string>('');
  const [activeDocType, setActiveDocType] = useState<'report' | 'cheatsheet'>('report');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCheatSheet, setIsGeneratingCheatSheet] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [prevInitialMarkdown, setPrevInitialMarkdown] = useState(initialReportMarkdown);
  if (initialReportMarkdown !== prevInitialMarkdown) {
    setPrevInitialMarkdown(initialReportMarkdown);
    if (initialReportMarkdown) {
      setActiveMarkdown(initialReportMarkdown);
    }
  }

  // Click outside to dismiss dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const parsedReport = useMemo(() => {
    if (!activeMarkdown) return null;
    return parseMarkdownIntoSections(activeMarkdown);
  }, [activeMarkdown]);

  const parsedCheatSheet = useMemo(() => {
    if (!cheatSheetMarkdown) return null;
    return parseMarkdownIntoSections(cheatSheetMarkdown);
  }, [cheatSheetMarkdown]);

  // Handle Full Masterclass Report Generation
  const handleGenerateReport = async () => {
    const apiKey = getStoredMeshKey();
    if (!apiKey) {
      setErrorNotice('Mesh API Key missing. Please click AI Settings to configure your key.');
      onOpenAISettings?.();
      return;
    }

    setIsGenerating(true);
    setErrorNotice(null);
    playWhoosh();

    try {
      const topQuestions = questions
        .slice()
        .sort((a, b) => b.upvotes_count - a.upvotes_count)
        .slice(0, 8)
        .map((q) => ({
          content: q.content,
          upvotes: q.upvotes_count,
          author: q.author_name,
        }));

      const pollData = polls.map((p) => {
        const topOpt = (p.options || []).slice().sort((a, b) => b.votesCount - a.votesCount)[0];
        const totalV = (p.options || []).reduce((sum, o) => sum + o.votesCount, 0);
        return {
          question: p.question,
          totalVotes: totalV,
          topOption: topOpt ? `${topOpt.text} (${topOpt.votesCount} votes)` : 'No votes',
          aiConsensusNote: p.aiConsensusNote,
        };
      });

      const quizData = quizzes.map((q) => ({
        question: q.question,
        correctOption: q.questionType === 'short_answer'
          ? (q.expectedAnswer || q.correctOptionId)
          : `${q.correctOptionId}: ${(q.options || []).find((o) => o.id === q.correctOptionId)?.text || ''}`,
        category: q.category,
        explanation: q.explanation,
      }));

      const report = await generateSessionSummaryReport({
        roomTitle,
        roomCode,
        totalAttendees,
        quizzes: quizData,
        polls: pollData,
        topQuestions,
        leaderboardTop3: leaderboard.slice(0, 3).map((l) => ({ name: l.name, score: l.correct_quizzes * 100 })),
      });

      if (report && report.trim().length > 20) {
        setActiveMarkdown(report);
        onReportGenerated?.(report);
        playPopSound();
      } else {
        throw new Error('Received an empty report from the AI synthesis engine.');
      }
    } catch (err: any) {
      console.error('[MasterclassReportView] generation error:', err);
      setErrorNotice(err?.message || 'Failed to generate session report. Please verify API key.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle 1-Page Technical Cheat Sheet Generation
  const handleGenerateCheatSheet = async () => {
    const apiKey = getStoredMeshKey();
    if (!apiKey) {
      setErrorNotice('Mesh API Key missing. Please click AI Settings to configure your key.');
      onOpenAISettings?.();
      return;
    }

    setIsGeneratingCheatSheet(true);
    setErrorNotice(null);
    playWhoosh();

    try {
      const topQuestions = questions
        .slice()
        .sort((a, b) => b.upvotes_count - a.upvotes_count)
        .slice(0, 10)
        .map((q) => ({
          content: q.content,
          upvotes: q.upvotes_count,
        }));

      const pollData = polls.map((p) => ({
        question: p.question,
        aiConsensusNote: p.aiConsensusNote,
      }));

      const quizData = quizzes.map((q) => ({
        question: q.question,
        expectedAnswer: q.questionType === 'short_answer'
          ? (q.expectedAnswer || q.correctOptionId)
          : (q.options || []).find((o) => o.id === q.correctOptionId)?.text || q.correctOptionId,
        explanation: q.explanation,
      }));

      const sheet = await generateTechnicalCheatSheet({
        roomTitle,
        quizzes: quizData,
        questions: topQuestions,
        polls: pollData,
      });

      if (sheet && sheet.trim().length > 20) {
        setCheatSheetMarkdown(sheet);
        playPopSound();
      } else {
        throw new Error('Received an empty cheat sheet from the AI engine.');
      }
    } catch (err: any) {
      console.error('[MasterclassReportView] cheat sheet generation error:', err);
      setErrorNotice(err?.message || 'Failed to generate technical cheat sheet. Please verify API key.');
    } finally {
      setIsGeneratingCheatSheet(false);
    }
  };

  const currentMarkdown = activeDocType === 'report' ? activeMarkdown : cheatSheetMarkdown;

  const handleCopy = () => {
    if (!currentMarkdown) return;
    navigator.clipboard.writeText(currentMarkdown);
    setCopied(true);
    playPopSound();
    setTimeout(() => setCopied(false), 2000);
  };

  // Download formats
  const handleDownloadHtml = () => {
    if (!currentMarkdown) return;
    playClickSound();
    const timeStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const fullHtml = activeDocType === 'report'
      ? parseMarkdownToStyledHtml(currentMarkdown, roomTitle, roomCode, timeStr, quizzes, polls)
      : parseMarkdownToStyledHtml(currentMarkdown, roomTitle, roomCode, timeStr, [], []);
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeDocType === 'report' ? `Masterclass_Report_${roomCode}.html` : `Technical_CheatSheet_${roomCode}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setIsDropdownOpen(false);
  };

  const handleDownloadMarkdown = () => {
    if (!currentMarkdown) return;
    playClickSound();

    let enrichedMd = currentMarkdown;
    if (activeDocType === 'report' && quizzes.length > 0 && !currentMarkdown.includes('### Detailed Question Analysis')) {
      const detailedQuizMd = quizzes
        .map((q, idx) => {
          if (q.questionType === 'short_answer') {
            return `\n#### Question ${idx + 1}: ${q.question}\n- **Category:** ${q.category || 'Architecture'}\n- **Question Type:** Freeform Short-Answer\n- **Expected Answer:** ${q.expectedAnswer || q.correctOptionId}\n${q.acceptableAnswers && q.acceptableAnswers.length > 0 ? `- **Accepted Synonyms:** ${q.acceptableAnswers.join(', ')}\n` : ''}${q.explanation ? `- **Architectural Takeaway:** ${q.explanation}\n` : ''}`;
          }
          const correctOpt = (q.options || []).find((o) => o.id.toUpperCase() === q.correctOptionId.toUpperCase());
          return `\n#### Question ${idx + 1}: ${q.question}\n- **Category:** ${q.category || 'Architecture'}\n- **Correct Answer:** Option ${q.correctOptionId} (${correctOpt?.text || ''})\n- **All Options:**\n${(q.options || []).map((o) => `  - [${o.id}] ${o.text}`).join('\n')}\n${q.explanation ? `- **Architectural Takeaway:** ${q.explanation}\n` : ''}`;
        })
        .join('\n');
      enrichedMd += `\n\n### Detailed Question Analysis\n${detailedQuizMd}`;
    }

    const blob = new Blob([enrichedMd], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeDocType === 'report' ? `Masterclass_Report_${roomCode}.md` : `Technical_CheatSheet_${roomCode}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setIsDropdownOpen(false);
  };

  const handleDownloadTxt = () => {
    if (!currentMarkdown) return;
    playClickSound();
    const plainText = currentMarkdown
      .replace(/^#+\s+/gm, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\|/g, ' ');

    const blob = new Blob([plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeDocType === 'report' ? `Masterclass_Report_${roomCode}.txt` : `Technical_CheatSheet_${roomCode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setIsDropdownOpen(false);
  };

  const handleDownloadJson = () => {
    if (!currentMarkdown) return;
    playClickSound();
    const jsonPayload = {
      roomTitle,
      roomCode,
      generatedAt: new Date().toISOString(),
      documentType: activeDocType,
      totalAttendees,
      quizzesCount: quizzes.length,
      pollsCount: polls.length,
      questionsCount: questions.length,
      quizzes,
      polls,
      reportMarkdown: currentMarkdown,
    };
    const blob = new Blob([JSON.stringify(jsonPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeDocType === 'report' ? `Masterclass_Report_${roomCode}.json` : `Technical_CheatSheet_${roomCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsDropdownOpen(false);
  };

  const handlePrint = () => {
    if (!currentMarkdown) return;
    playClickSound();
    setIsDropdownOpen(false);
    window.print();
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col flex-1">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-white/[0.08]">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 shadow-sm">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Masterclass Report & Technical Cheat Sheet
              </h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                {roomCode}
              </span>
              {currentMarkdown && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold tracking-wide border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Ready
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Unified executive synthesis with core architectural principles, technical FAQ, interactive question drilldowns, and community consensus.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        {currentMarkdown && (
          <div className="flex items-center space-x-2 flex-wrap gap-y-2 shrink-0">
            {/* Quick Copy Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-semibold border border-white/[0.08] flex items-center space-x-1.5 cursor-pointer transition-all shadow-sm"
              title="Copy markdown to clipboard"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-blue-400" />}
              <span>{copied ? 'Copied' : activeDocType === 'report' ? 'Copy Report' : 'Copy Cheat Sheet'}</span>
            </motion.button>

            {/* Download Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  playClickSound();
                  setIsDropdownOpen(!isDropdownOpen);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold border border-blue-400/30 flex items-center space-x-2 cursor-pointer transition-all shadow-md shadow-blue-500/20"
              >
                <Download className="w-4 h-4" />
                <span>{activeDocType === 'report' ? 'Download Report' : 'Download Cheat Sheet'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </motion.button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-32px)] rounded-xl bg-[#121216] border border-white/[0.1] shadow-2xl p-1.5 z-50 backdrop-blur-xl"
                  >
                    <button
                      onClick={handleDownloadHtml}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/[0.06] flex items-center space-x-2.5 cursor-pointer transition-colors"
                    >
                      <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-white">Styled HTML (.html)</div>
                        <div className="text-[10px] text-zinc-400">Standalone styled document</div>
                      </div>
                    </button>

                    <button
                      onClick={handleDownloadMarkdown}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/[0.06] flex items-center space-x-2.5 cursor-pointer transition-colors"
                    >
                      <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-white">Markdown (.md)</div>
                        <div className="text-[10px] text-zinc-400">Standard GitHub markdown</div>
                      </div>
                    </button>

                    <button
                      onClick={handleDownloadTxt}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/[0.06] flex items-center space-x-2.5 cursor-pointer transition-colors"
                    >
                      <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-white">Plain Text (.txt)</div>
                        <div className="text-[10px] text-zinc-400">Clean text without tags</div>
                      </div>
                    </button>

                    <button
                      onClick={handleDownloadJson}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/[0.06] flex items-center space-x-2.5 cursor-pointer transition-colors"
                    >
                      <FileCode className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-white">Structured JSON (.json)</div>
                        <div className="text-[10px] text-zinc-400">Raw session data & analytics</div>
                      </div>
                    </button>

                    <div className="my-1 border-t border-white/[0.06]" />

                    <button
                      onClick={handlePrint}
                      className="w-full px-3 py-2 rounded-lg text-left text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/[0.06] flex items-center space-x-2.5 cursor-pointer transition-colors"
                    >
                      <Printer className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-white">Print / Save as PDF</div>
                        <div className="text-[10px] text-zinc-400">Printable cheat sheet & report</div>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Print / PDF Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-semibold border border-white/[0.08] flex items-center space-x-1.5 cursor-pointer transition-all shadow-sm"
              title="Print or Save as PDF"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>Print / PDF</span>
            </motion.button>

            {/* Re-generate Button (For Host) */}
            {isHost && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  playWhoosh();
                  if (activeDocType === 'report') {
                    handleGenerateReport();
                  } else {
                    handleGenerateCheatSheet();
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium border border-white/[0.08] flex items-center space-x-1.5 cursor-pointer transition-colors"
                title="Synthesize fresh AI content"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                <span>Re-generate</span>
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* Quick Session Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
        <div className="p-4 rounded-xl bg-[#0E0E12]/90 border border-white/[0.08] flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold font-mono text-white leading-none">
              {quizzes.length}
            </div>
            <div className="text-[11px] font-medium text-zinc-400 mt-1">Quizzes Run</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0E0E12]/90 border border-white/[0.08] flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold font-mono text-white leading-none">
              {polls.length}
            </div>
            <div className="text-[11px] font-medium text-zinc-400 mt-1">Live Polls</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0E0E12]/90 border border-white/[0.08] flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold font-mono text-white leading-none">
              {questions.length}
            </div>
            <div className="text-[11px] font-medium text-zinc-400 mt-1">Inquiries & Q&A</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0E0E12]/90 border border-white/[0.08] flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold font-mono text-white leading-none">
              {totalAttendees}
            </div>
            <div className="text-[11px] font-medium text-zinc-400 mt-1">Total Attendees</div>
          </div>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorNotice && (
        <div className="p-3.5 mb-6 rounded-xl bg-red-950/80 border border-red-500/30 text-red-200 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorNotice}</span>
          </div>
          <div className="flex items-center space-x-2">
            {onOpenAISettings && (
              <button
                onClick={onOpenAISettings}
                className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-white font-mono text-[10px] font-bold border border-red-500/40 cursor-pointer"
              >
                OPEN AI SETTINGS
              </button>
            )}
            <button
              onClick={() => setErrorNotice(null)}
              className="p-1 hover:bg-white/[0.06] text-zinc-400 hover:text-white rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Document Selector Tabs */}
      <div className="flex items-center space-x-2 mb-6 p-1.5 rounded-xl bg-[#0E0E12]/90 border border-white/[0.08] w-fit">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setActiveDocType('report');
          }}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            activeDocType === 'report'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Full Masterclass Report</span>
          {activeMarkdown && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            setActiveDocType('cheatsheet');
          }}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            activeDocType === 'cheatsheet'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>⚡ 1-Page Technical Cheat Sheet</span>
          {cheatSheetMarkdown && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </button>
      </div>

      {activeDocType === 'report' && (
        <>
          {/* State 1: Generation Trigger Card (If Report Not Generated) */}
          {!activeMarkdown && !isGenerating && (
            <div className="p-8 sm:p-12 rounded-2xl bg-[#0E0E12]/90 border border-white/[0.08] text-center max-w-xl mx-auto my-auto shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center mb-4">
                <FileText className="w-7 h-7" />
              </div>

              <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                {isHost ? 'Synthesize Masterclass Report & Technical Cheat Sheet' : 'Report Pending Generation'}
              </h3>

              <p className="text-xs text-zinc-400 max-w-md mx-auto mb-6 leading-relaxed">
                {isHost
                  ? `Ready to generate the masterclass synthesis for Room ${roomCode}. AI will unify technical architectural principles, audience FAQ, quiz drilldowns, community poll consensus, and code recipes into a single high-density document.`
                  : `The session host has not generated the AI Masterclass Report for Room ${roomCode} yet. Once synthesized, the executive report will appear here automatically.`}
              </p>

              {isHost ? (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    playWhoosh();
                    handleGenerateReport();
                  }}
                  className="py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold uppercase tracking-wider inline-flex items-center space-x-2.5 cursor-pointer transition-all shadow-lg shadow-blue-500/25"
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Generate Report</span>
                </motion.button>
              ) : (
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] text-zinc-400 text-xs border border-white/[0.06]">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  <span>Waiting for host to publish...</span>
                </div>
              )}
            </div>
          )}

          {/* State 2: Generating Loader */}
          {isGenerating && (
            <div className="p-12 rounded-2xl bg-[#0E0E12]/90 border border-white/[0.08] text-center max-w-md mx-auto my-auto shadow-xl">
              <RefreshCw className="w-8 h-8 text-blue-400 mx-auto animate-spin mb-4" />
              <h4 className="text-base font-bold text-white mb-1.5">Synthesizing Masterclass Report...</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Analyzing quiz outcomes, voting consensus, and top architectural Q&A threads via Xiaomi MiMo-V2.5.
              </p>
            </div>
          )}

          {/* State 3: Formatted Executive Dashboard */}
          {activeMarkdown && parsedReport && (
            <div className="space-y-6 pb-12">
              {/* Executive Hero Banner */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/30 via-[#101015] to-[#0E0E12] border border-blue-500/20 shadow-md">
                <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest font-mono mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>SKETCHCAST MASTERCLASS SYNTHESIS</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {parsedReport.heroTitle || roomTitle}
                </h1>
                <p className="text-xs text-zinc-400 mt-2">
                  Keynote Executive Brief • Published for Room {roomCode}
                </p>
              </div>

              {/* Rendered Section Cards */}
              <div className="grid grid-cols-1 gap-5">
                {parsedReport.sections.map((sec, idx) => {
                  const isQuizSection = /quiz/i.test(sec.title);
                  const isPollSection = /poll/i.test(sec.title);

                  const activeQuizzesList =
                    quizzes.length > 0 ? quizzes : parseQuizzesFromTable(sec.lines);

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.05 }}
                      className="p-5 sm:p-6 rounded-2xl bg-[#0E0E12]/90 border border-white/[0.08] shadow-md transition-all hover:border-white/[0.12]"
                    >
                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                            {isQuizSection ? (
                              <Zap className="w-4 h-4" />
                            ) : isPollSection ? (
                              <Layers className="w-4 h-4" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </div>
                          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                            {sec.title}
                          </h3>
                        </div>

                        {isQuizSection && activeQuizzesList.length > 0 && (
                          <span className="font-mono text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                            {activeQuizzesList.length} QUESTIONS
                          </span>
                        )}

                        {isPollSection && polls.length > 0 && (
                          <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {polls.length} POLLS
                          </span>
                        )}
                      </div>

                      {isQuizSection && activeQuizzesList.length > 0 ? (
                        <div>
                          <FormattedSectionBody lines={sec.lines} skipTables={true} />
                          <QuizQuestionsAccordion
                            quizzes={activeQuizzesList}
                            userQuizAnswers={userQuizAnswers}
                            isHost={isHost}
                          />
                        </div>
                      ) : isPollSection && polls.length > 0 ? (
                        <div>
                          <FormattedSectionBody lines={sec.lines} skipTables={true} />
                          <PollsAccordion
                            polls={polls}
                            userPollVotes={userPollVotes}
                            isHost={isHost}
                          />
                        </div>
                      ) : (
                        <FormattedSectionBody lines={sec.lines} />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {activeDocType === 'cheatsheet' && (
        <>
          {/* State 1: Generation Trigger Card (If Cheat Sheet Not Generated) */}
          {!cheatSheetMarkdown && !isGeneratingCheatSheet && (
            <div className="p-8 sm:p-12 rounded-2xl bg-[#0E0E12]/90 border border-white/[0.08] text-center max-w-xl mx-auto my-auto shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-4">
                <Zap className="w-7 h-7" />
              </div>

              <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                {isHost ? 'Synthesize 1-Page Technical Cheat Sheet & FAQ' : 'Cheat Sheet Pending Generation'}
              </h3>

              <p className="text-xs text-zinc-400 max-w-md mx-auto mb-6 leading-relaxed">
                {isHost
                  ? `Generate an ultra high-density, 1-page executive cheat sheet for Room ${roomCode}. Condenses core architectural principles, attendee FAQ, poll trade-offs, and code recipes into an actionable single-page reference.`
                  : `The session host has not generated the 1-Page Technical Cheat Sheet for Room ${roomCode} yet. Once synthesized, the cheat sheet will appear here.`}
              </p>

              {isHost ? (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    playWhoosh();
                    handleGenerateCheatSheet();
                  }}
                  className="py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-amber-600 hover:from-blue-500 hover:to-amber-500 text-white text-xs font-semibold uppercase tracking-wider inline-flex items-center space-x-2.5 cursor-pointer transition-all shadow-lg shadow-blue-500/25"
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Synthesize 1-Page Cheat Sheet</span>
                </motion.button>
              ) : (
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] text-zinc-400 text-xs border border-white/[0.06]">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>Waiting for host to publish...</span>
                </div>
              )}
            </div>
          )}

          {/* State 2: Generating Loader */}
          {isGeneratingCheatSheet && (
            <div className="p-12 rounded-2xl bg-[#0E0E12]/90 border border-white/[0.08] text-center max-w-md mx-auto my-auto shadow-xl">
              <RefreshCw className="w-8 h-8 text-amber-400 mx-auto animate-spin mb-4" />
              <h4 className="text-base font-bold text-white mb-1.5">Synthesizing 1-Page Technical Cheat Sheet...</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Extracting core principles, resolving audience questions, and distilling code recipes.
              </p>
            </div>
          )}

          {/* State 3: Formatted Cheat Sheet View */}
          {cheatSheetMarkdown && parsedCheatSheet && (
            <div className="space-y-6 pb-12">
              {/* Executive Hero Banner */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/30 via-[#101015] to-[#0E0E12] border border-amber-500/20 shadow-md">
                <div className="flex items-center space-x-2 text-[10px] font-bold text-amber-400 uppercase tracking-widest font-mono mb-2">
                  <Zap className="w-3.5 h-3.5" />
                  <span>1-PAGE SESSION TECHNICAL CHEAT SHEET & FAQ</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {parsedCheatSheet.heroTitle || `${roomTitle} — Technical Cheat Sheet`}
                </h1>
                <p className="text-xs text-zinc-400 mt-2">
                  Curated Architectural Principles, Audience FAQ & Actionable Code Recipes • Room {roomCode}
                </p>
              </div>

              {/* Rendered Section Cards */}
              <div className="grid grid-cols-1 gap-5">
                {parsedCheatSheet.sections.map((sec, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.05 }}
                    className="p-5 sm:p-6 rounded-2xl bg-[#0E0E12]/90 border border-white/[0.08] shadow-md transition-all hover:border-white/[0.12]"
                  >
                    <div className="flex items-center space-x-3 pb-3 mb-4 border-b border-white/[0.06]">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                        {sec.title}
                      </h3>
                    </div>
                    <FormattedSectionBody lines={sec.lines} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
