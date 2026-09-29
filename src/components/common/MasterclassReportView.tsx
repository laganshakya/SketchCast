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
  getStoredMeshKey,
} from '../../lib/meshApi';
import type { QuizQuestion, LivePoll, Question, LeaderboardEntry, SponsorCTA } from '../../types';
import { playClickSound, playPopSound, playWhoosh } from '../../lib/soundFx';
import { ContextualAffiliateCard } from '../affiliate/ContextualAffiliateCard';
import { useAffiliateRecommendation } from '../../hooks/useAffiliateRecommendation';

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
  sponsorCTA?: SponsorCTA | null;
}

function getCategoryBadgeStyle(category?: string): { bg: string; text: string; border: string } {
  const lower = (category || '').toLowerCase();
  if (lower.includes('concept') || lower.includes('engineer')) {
    return { bg: 'bg-paper', text: 'text-ink', border: 'border-hairline' };
  }
  if (lower.includes('trend') || lower.includes('disrupt')) {
    return { bg: 'bg-orange/15', text: 'text-orange-950', border: 'border-orange/25' };
  }
  if (lower.includes('agent') || lower.includes('ai')) {
    return { bg: 'bg-lime/25', text: 'text-ink', border: 'border-ink/15' };
  }
  if (lower.includes('secur') || lower.includes('auth')) {
    return { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200' };
  }
  return { bg: 'bg-paper-surface', text: 'text-ink', border: 'border-hairline' };
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
        return `<div class="bullet-item"><span class="bullet-arrow">▪</span><span>${itemText}</span></div>`;
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
          <div class="hero-tag">STUDIO NOMA &bull; SKETCHCAST MASTERCLASS REPORT &bull; ROOM ${roomCode} &bull; ${timeStr}</div>
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Serif+Display:ital@0;1&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --ink: #101313;
      --paper: #F5F0E9;
      --paper-surface: #FFFFFF;
      --lime: #D7FF2F;
      --orange: #FF6337;
      --border-hairline: rgba(16, 19, 19, 0.12);
      --muted: #65655F;
    }
    body { font-family: 'Manrope', system-ui, -apple-system, sans-serif; background: var(--paper); color: var(--ink); padding: 48px 24px; margin: 0; line-height: 1.6; }
    .hero-banner { background: var(--paper-surface); border: 1px solid var(--border-hairline); border-radius: 24px; padding: 36px 32px; margin-bottom: 24px; text-align: center; }
    .hero-tag { font-size: 11px; font-weight: 700; color: var(--orange); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; font-family: 'DM Mono', monospace; }
    .hero-title { margin: 0; font-size: 32px; font-weight: 800; color: var(--ink); font-family: 'DM Serif Display', serif; }
    .blueprint-card { background: var(--paper-surface); border: 1px solid var(--border-hairline); border-radius: 20px; padding: 28px; margin-bottom: 24px; }
    .card-header h2 { margin: 0 0 16px; font-size: 20px; font-weight: 700; color: var(--ink); font-family: 'DM Serif Display', serif; }
    .bullet-item { display: flex; gap: 10px; margin: 8px 0; color: var(--ink); font-size: 13px; }
    .bullet-arrow { color: var(--orange); font-weight: 700; }
    .paragraph { color: var(--muted); margin: 8px 0; font-size: 13px; }
    .divider { border: 0; border-top: 1px solid var(--border-hairline); margin: 20px 0; }
    strong { color: var(--ink); }
    .rich-drilldown-header { font-size: 12px; font-weight: 700; color: var(--ink); text-transform: uppercase; letter-spacing: 0.05em; margin: 24px 0 14px; font-family: 'DM Mono', monospace; }
    .quiz-card-html { background: var(--paper); border: 1px solid var(--border-hairline); border-radius: 16px; padding: 18px; margin-bottom: 14px; }
    .quiz-header-html { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
    .q-badge { font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 700; color: var(--ink); background: var(--lime); padding: 2px 8px; border-radius: 6px; }
    .q-title-html { font-size: 14px; font-weight: 700; color: var(--ink); flex: 1; min-width: 200px; }
    .category-chip { font-family: 'DM Mono', monospace; font-size: 11px; background: var(--paper-surface); color: var(--muted); border: 1px solid var(--border-hairline); padding: 2px 8px; border-radius: 6px; }
    .correct-banner { background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 10px; padding: 8px 12px; margin-bottom: 12px; font-size: 13px; color: #065F46; }
    .correct-label { font-weight: 700; margin-right: 6px; }
    .options-grid-html { display: grid; gap: 6px; margin-bottom: 10px; }
    .opt-row-html { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 10px; background: var(--paper-surface); border: 1px solid var(--border-hairline); font-size: 12px; }
    .opt-row-html.is-correct { background: #ECFDF5; border-color: #6EE7B7; color: #065F46; font-weight: 600; }
    .opt-key { font-family: 'DM Mono', monospace; font-weight: 700; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: var(--paper); border: 1px solid var(--border-hairline); }
    .opt-body { flex: 1; }
    .correct-tag { font-size: 10px; font-weight: 700; background: var(--lime); color: var(--ink); padding: 2px 6px; border-radius: 4px; font-family: 'DM Mono', monospace; border: 1px solid rgba(16,19,19,0.15); }
    .explanation-box { background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #9A3412; }
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
  const segments = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((raw, pos) => ({
    raw,
    key: `text_seg_${pos}_${raw.slice(0, 8)}`,
    isBold: raw.startsWith('**') && raw.endsWith('**'),
    isCode: raw.startsWith('`') && raw.endsWith('`'),
  }));

  return segments.map((seg) => {
    if (seg.isBold) {
      return (
        <strong key={seg.key} className="text-ink font-bold">
          {seg.raw.slice(2, -2)}
        </strong>
      );
    }
    if (seg.isCode) {
      return (
        <code key={seg.key} className="px-1.5 py-0.5 rounded-md bg-paper text-ink font-mono text-[11px] border border-hairline">
          {seg.raw.slice(1, -1)}
        </code>
      );
    }
    return seg.raw;
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
        <div key={`code-${i}`} className="my-3 rounded-2xl bg-ink text-paper border border-ink overflow-hidden shadow-xs">
          {lang && (
            <div className="px-4 py-2 bg-ink/90 border-b border-paper/10 text-[10px] font-mono font-bold text-lime uppercase tracking-wider">
              {lang}
            </div>
          )}
          <pre className="p-4 font-mono text-xs text-lime/90 overflow-x-auto leading-relaxed">
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
        const headerItems = headerCols.map((col, cIdx) => ({
          col,
          colKey: `th_${cIdx}_${col.slice(0, 10)}`,
        }));
        const rowItems = tableRows.map((row, rIdx) => ({
          rowKey: `tr_${rIdx}_${row[0] || ''}`,
          cells: row.map((cell, cIdx) => ({
            cell,
            cellKey: `cell_${rIdx}_${cIdx}`,
          })),
        }));

        elements.push(
          <div key={`table-${i}`} className="my-4 overflow-x-auto table-responsive rounded-2xl border border-hairline bg-paper-surface shadow-xs max-w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-paper border-b border-hairline text-ink font-bold uppercase tracking-wider text-[11px]">
                  {headerItems.map((h) => (
                    <th key={h.colKey} className="p-3.5">
                      {h.col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {rowItems.map((r) => (
                  <tr key={r.rowKey} className="hover:bg-paper/40 transition-colors">
                    {r.cells.map((c) => (
                      <td key={c.cellKey} className="p-3.5 text-ink font-normal leading-relaxed">
                        {formatInlineText(c.cell)}
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
        <div key={`bullet-${i}`} className="flex items-start space-x-2.5 my-1.5 text-xs text-ink leading-relaxed">
          <span className="text-orange font-bold shrink-0 mt-0.5">▪</span>
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
        <div key={`num-${i}`} className="flex items-start space-x-2.5 my-1.5 text-xs text-ink leading-relaxed">
          <span className="px-2 py-0.5 rounded-lg bg-lime/25 text-ink font-mono text-[10px] font-bold shrink-0 mt-0.5 border border-ink/15">
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
        <h4 key={`sub-${i}`} className="text-xs sm:text-sm font-serif font-bold text-ink mt-4 mb-2 flex items-center gap-1.5">
          <span>{formatInlineText(headingText)}</span>
        </h4>
      );
      i++;
      continue;
    }

    // Horizontal dividers
    if (trimmed === '---') {
      elements.push(<hr key={`hr-${i}`} className="border-0 border-t border-hairline my-3" />);
      i++;
      continue;
    }

    // Paragraphs
    if (trimmed.length > 0) {
      elements.push(
        <p key={`p-${i}`} className="text-xs text-muted leading-relaxed my-2">
          {formatInlineText(trimmed)}
        </p>
      );
    }

    i++;
  }

  return <div className="space-y-1">{elements}</div>;
};

const EMPTY_RECORD: Record<string, string> = {};

// ==========================================
// INTERACTIVE QUIZ ACCORDION CARDS
// ==========================================
interface QuizAccordionProps {
  quizzes: QuizQuestion[];
  userQuizAnswers?: Record<string, string>;
  isHost?: boolean;
}

const QuizQuestionsAccordion: React.FC<QuizAccordionProps> = ({ quizzes, userQuizAnswers = EMPTY_RECORD, isHost = false }) => {
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
            className="rounded-2xl bg-paper-surface border border-hairline hover:border-ink/20 transition-all overflow-hidden shadow-xs"
          >
            {/* Clickable Header */}
            <button
              type="button"
              onClick={() => toggleExpand(cardId)}
              className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="font-mono text-xs font-bold text-ink bg-paper px-2 py-0.5 rounded-lg border border-hairline shrink-0">
                  #{String(qIdx + 1).padStart(2, '0')}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-bold text-ink group-hover:text-orange transition-colors line-clamp-2">
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
                  <span className="px-2.5 py-1 rounded-full bg-lime/25 text-ink border border-ink/15 font-mono text-[11px] font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-ink" />
                    <span>
                      {quiz.questionType === 'short_answer'
                        ? `Answer: ${quiz.expectedAnswer || quiz.correctOptionId}`
                        : `Answer: ${quiz.correctOptionId}`}
                    </span>
                  </span>
                ) : userChoiceId !== null ? (
                  isUserCorrect ? (
                    <span className="px-2.5 py-1 rounded-full bg-lime text-ink border border-ink/20 font-mono text-[11px] font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-ink" />
                      <span>Correct</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-950 border border-orange-200 font-mono text-[11px] font-bold flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-orange-600" />
                      <span>Incorrect</span>
                    </span>
                  )
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-paper text-muted border border-hairline font-mono text-[11px] font-medium">
                    Not Attempted
                  </span>
                )}

                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-7 h-7 rounded-lg bg-paper text-muted group-hover:text-ink flex items-center justify-center border border-hairline"
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
                  className="border-t border-hairline bg-paper/40 p-4 sm:p-5 space-y-4"
                >
                  {/* Side-by-Side Comparison Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Correct Option Card */}
                    <div className="p-4 rounded-2xl bg-lime/15 border border-ink/15 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-ink mb-1">
                        <CheckCircle className="w-3.5 h-3.5 text-ink" />
                        <span>{quiz.questionType === 'short_answer' ? 'EXPECTED ANSWER' : 'CORRECT OPTION'}</span>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-ink">
                        {quiz.questionType === 'short_answer' ? (
                          <div>
                            <span className="font-mono text-ink font-bold">{quiz.expectedAnswer || correctOptionText}</span>
                            {quiz.acceptableAnswers && quiz.acceptableAnswers.length > 0 && (
                              <div className="text-[11px] font-mono text-muted mt-1">
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
                      className={`p-4 rounded-2xl border shadow-2xs ${
                        isHost
                          ? 'bg-paper-surface border-hairline'
                          : userChoiceId !== null
                          ? isUserCorrect
                            ? 'bg-lime/15 border-ink/15'
                            : 'bg-orange-50 border-orange-200'
                          : 'bg-paper border-hairline'
                      }`}
                    >
                      <div
                        className={`flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider mb-1 ${
                          isHost
                            ? 'text-ink'
                            : userChoiceId !== null
                            ? isUserCorrect
                              ? 'text-ink'
                              : 'text-orange-900'
                            : 'text-muted'
                        }`}
                      >
                        {isHost ? (
                          <>
                            <Users className="w-3.5 h-3.5" />
                            <span>HOST VERIFICATION</span>
                          </>
                        ) : userChoiceId !== null ? (
                          isUserCorrect ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-ink" />
                              <span>YOUR ANSWER (CORRECT)</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-orange-600" />
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
                        className={`text-xs sm:text-sm font-bold ${
                          isHost
                            ? 'text-ink'
                            : userChoiceId !== null
                            ? isUserCorrect
                              ? 'text-ink'
                              : 'text-orange-950'
                            : 'text-muted italic'
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
                      <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-ink" />
                        <span>GROUND TRUTH & ACCEPTABLE SYNONYMS</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-paper-surface border border-hairline space-y-2.5 shadow-2xs">
                        <div className="text-xs text-ink flex items-center gap-2 flex-wrap">
                          <span className="text-muted font-mono font-semibold">Canonical Answer:</span>
                          <span className="font-mono text-ink font-bold bg-lime px-2.5 py-1 rounded-lg border border-ink/15">
                            {quiz.expectedAnswer || quiz.correctOptionId}
                          </span>
                        </div>
                        {quiz.acceptableAnswers && quiz.acceptableAnswers.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-hairline">
                            <span className="text-muted font-mono text-[11px] mr-1">Accepted Variations:</span>
                            {quiz.acceptableAnswers.map((syn) => (
                              <span
                                key={`${quiz.id}-${syn}`}
                                className="px-2 py-0.5 rounded-md bg-paper text-ink font-mono text-[10px] border border-hairline"
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
                      <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                        <BarChart2 className="w-3.5 h-3.5 text-ink" />
                        <span>ALL OPTIONS BREAKDOWN</span>
                      </div>

                      <div className="space-y-2">
                        {(quiz.options || []).map((opt) => {
                          const isThisCorrect = opt.id.toUpperCase() === quiz.correctOptionId.toUpperCase();
                          const isThisUser = userChoiceId !== null && opt.id.toUpperCase() === userChoiceId.toUpperCase();

                          return (
                            <div
                              key={opt.id}
                              className={`p-3 sm:p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors shadow-2xs ${
                                isThisCorrect
                                  ? 'bg-lime/20 border-ink/20 text-ink font-semibold'
                                  : isThisUser && !isThisCorrect
                                  ? 'bg-orange-50 border-orange-200 text-orange-950 font-medium'
                                  : 'bg-paper-surface border-hairline text-ink'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span
                                  className={`w-6 h-6 rounded-md font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                                    isThisCorrect
                                      ? 'bg-lime text-ink border border-ink/20'
                                      : isThisUser && !isThisCorrect
                                      ? 'bg-orange-100 text-orange-900 border border-orange-300'
                                      : 'bg-paper text-muted border border-hairline'
                                  }`}
                                >
                                  {opt.id}
                                </span>
                                <span className="font-medium text-xs leading-relaxed">{opt.text}</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {isThisCorrect && (
                                  <span className="px-2 py-0.5 rounded bg-lime text-ink font-mono text-[10px] font-bold border border-ink/15">
                                    CORRECT OPTION
                                  </span>
                                )}
                                {isThisUser && (
                                  <span
                                    className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                                      isThisCorrect
                                        ? 'bg-paper-surface text-ink border-hairline'
                                        : 'bg-orange-200 text-orange-950 border-orange-300'
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
                    <div className="p-4 rounded-2xl bg-paper-surface border border-hairline flex items-start gap-3 shadow-2xs">
                      <BookOpen className="w-4 h-4 text-orange shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange mb-1">
                          ARCHITECTURAL TAKEAWAY & EXPLANATION
                        </div>
                        <p className="text-xs text-muted leading-relaxed">
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

const PollsAccordion: React.FC<PollAccordionProps> = ({ polls, userPollVotes = EMPTY_RECORD }) => {
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
            className="rounded-2xl bg-paper-surface border border-hairline hover:border-ink/20 transition-all overflow-hidden shadow-xs"
          >
            {/* Clickable Header */}
            <button
              type="button"
              onClick={() => toggleExpand(cardId)}
              className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="font-mono text-xs font-bold text-ink bg-paper px-2 py-0.5 rounded-lg border border-hairline shrink-0">
                  POLL #{String(pIdx + 1).padStart(2, '0')}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-bold text-ink group-hover:text-orange transition-colors line-clamp-2">
                    {poll.question}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-paper text-muted border border-hairline">
                      {totalVotes} {totalVotes === 1 ? 'Vote' : 'Votes'} Recorded
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {userVotedOptId ? (
                  <span className="px-2.5 py-1 rounded-full bg-lime/25 text-ink border border-ink/15 font-mono text-[11px] font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-ink" />
                    <span>Voted</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-paper text-muted border border-hairline font-mono text-[11px] font-medium">
                    No Vote
                  </span>
                )}

                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-7 h-7 rounded-lg bg-paper text-muted group-hover:text-ink flex items-center justify-center border border-hairline"
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
                  className="border-t border-hairline bg-paper/40 p-4 sm:p-5 space-y-3"
                >
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted mb-2">
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
                          className={`p-3.5 rounded-xl border relative overflow-hidden transition-all shadow-2xs ${
                            isUserChoice
                              ? 'border-orange/30 bg-orange/5'
                              : 'bg-paper-surface border-hairline'
                          }`}
                        >
                          {/* Progress Bar Background */}
                          <div
                            className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${
                              isUserChoice ? 'bg-orange/15' : 'bg-lime/20'
                            }`}
                            style={{ width: `${pct}%` }}
                          />

                          <div className="relative z-10 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="font-bold text-ink">{opt.text}</span>
                              {isUserChoice && (
                                <span className="px-1.5 py-0.5 rounded bg-orange text-paper font-mono text-[9px] font-bold shadow-xs">
                                  YOU VOTED
                                </span>
                              )}
                            </div>

                            <div className="font-mono text-xs font-bold text-ink shrink-0 flex items-center gap-2">
                              <span>{count} votes</span>
                              <span className="text-orange font-bold">({pct}%)</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {poll.aiConsensusNote && (
                    <div className="p-4 rounded-2xl bg-paper-surface border border-hairline flex items-start gap-3 mt-3 shadow-2xs">
                      <Sparkles className="w-4 h-4 text-orange shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange mb-1">
                          AI COMMUNITY CONSENSUS TAKEAWAY
                        </div>
                        <p className="text-xs text-muted leading-relaxed">{poll.aiConsensusNote}</p>
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
  userQuizAnswers = EMPTY_RECORD,
  userPollVotes = EMPTY_RECORD,
  onReportGenerated,
  onOpenAISettings,
  sponsorCTA,
}) => {
  const [activeMarkdown, setActiveMarkdown] = useState<string>(initialReportMarkdown || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const contextKeywords = useMemo(() => {
    const list = [roomTitle];
    quizzes.forEach((q) => {
      if (q.category) list.push(q.category);
      if (q.question) list.push(q.question);
    });
    return list;
  }, [roomTitle, quizzes]);

  const affiliateRec = useAffiliateRecommendation({
    placement: 'report',
    contextKeywords,
    roomCode,
    sponsorCTA,
  });

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

  const handleCopy = () => {
    if (!activeMarkdown) return;
    let textToCopy = activeMarkdown;
    if (affiliateRec && !textToCopy.includes('### Recommended Next-Step Deep Dive')) {
      textToCopy += `\n\n### Recommended Next-Step Deep Dive & Certification\n- **Resource:** [${affiliateRec.title}](${affiliateRec.ctaUrl})\n- **Provider:** ${affiliateRec.provider}\n- **Takeaway:** ${affiliateRec.customCopy || affiliateRec.description}${affiliateRec.discountCode ? `\n- **Promo Code:** \`${affiliateRec.discountCode}\`` : ''}\n`;
    }
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    playPopSound();
    setTimeout(() => setCopied(false), 2000);
  };

  // Download formats
  const handleDownloadHtml = () => {
    if (!activeMarkdown) return;
    playClickSound();
    const timeStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    let fullHtml = parseMarkdownToStyledHtml(activeMarkdown, roomTitle, roomCode, timeStr, quizzes, polls);

    if (affiliateRec && !fullHtml.includes('recommended-resource-card')) {
      const affiliateSection = `
      <div class="recommended-resource-card" style="margin-top: 32px; padding: 20px; border-radius: 12px; background: #121218; border: 1px solid rgba(59,130,246,0.3); font-family: sans-serif;">
        <div style="font-size: 11px; font-weight: bold; color: #60a5fa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">RECOMMENDED DEEP DIVE & CERTIFICATION</div>
        <div style="font-size: 16px; font-weight: bold; color: #ffffff; margin-bottom: 6px;">${affiliateRec.title} &mdash; <span style="font-size: 13px; color: #93c5fd;">${affiliateRec.provider}</span></div>
        <p style="font-size: 13px; color: #a1a1aa; line-height: 1.5; margin-bottom: 12px;">${affiliateRec.customCopy || affiliateRec.description}</p>
        <a href="${affiliateRec.ctaUrl}" target="_blank" rel="noopener noreferrer sponsored" style="display: inline-block; padding: 8px 16px; border-radius: 8px; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 12px;">${affiliateRec.ctaText || 'Learn More'} &rarr;</a>
        ${affiliateRec.discountCode ? `<span style="margin-left: 12px; font-size: 11px; color: #34d399; font-family: monospace;">Use Code: ${affiliateRec.discountCode}</span>` : ''}
        <div style="font-size: 10px; color: #71717a; margin-top: 10px;">Partner referral link &bull; Supports SketchCast educational platform</div>
      </div>
      `;
      fullHtml = fullHtml.replace('</div>\n</body>', `${affiliateSection}\n</div>\n</body>`);
    }

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Masterclass_Report_${roomCode}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setIsDropdownOpen(false);
  };

  const handleDownloadMarkdown = () => {
    if (!activeMarkdown) return;
    playClickSound();

    let enrichedMd = activeMarkdown;
    if (quizzes.length > 0 && !activeMarkdown.includes('### Detailed Question Analysis')) {
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

    if (affiliateRec && !enrichedMd.includes('### Recommended Next-Step Deep Dive')) {
      enrichedMd += `\n\n### Recommended Next-Step Deep Dive & Certification\n- **Resource:** [${affiliateRec.title}](${affiliateRec.ctaUrl})\n- **Provider:** ${affiliateRec.provider}\n- **Takeaway:** ${affiliateRec.customCopy || affiliateRec.description}${affiliateRec.discountCode ? `\n- **Promo Code:** \`${affiliateRec.discountCode}\`` : ''}\n`;
    }

    const blob = new Blob([enrichedMd], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Masterclass_Report_${roomCode}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setIsDropdownOpen(false);
  };

  const handleDownloadTxt = () => {
    if (!activeMarkdown) return;
    playClickSound();
    const plainText = activeMarkdown
      .replace(/^#+\s+/gm, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\|/g, ' ');

    const blob = new Blob([plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Masterclass_Report_${roomCode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setIsDropdownOpen(false);
  };

  const handleDownloadJson = () => {
    if (!activeMarkdown) return;
    playClickSound();
    const jsonPayload = {
      roomTitle,
      roomCode,
      generatedAt: new Date().toISOString(),
      totalAttendees,
      quizzesCount: quizzes.length,
      pollsCount: polls.length,
      questionsCount: questions.length,
      quizzes,
      polls,
      reportMarkdown: activeMarkdown,
    };
    const blob = new Blob([JSON.stringify(jsonPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Masterclass_Report_${roomCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsDropdownOpen(false);
  };

  const handlePrint = () => {
    if (!activeMarkdown) return;
    playClickSound();
    setIsDropdownOpen(false);
    window.print();
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col flex-1 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-hairline">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-ink text-lime flex items-center justify-center shrink-0 shadow-sm">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-ink tracking-tight">
                Masterclass Session Report
              </h2>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-paper text-ink border border-hairline font-bold">
                {roomCode}
              </span>
              {activeMarkdown && (
                <span className="px-2.5 py-0.5 rounded-full bg-lime text-ink text-[10px] font-mono font-bold tracking-wide border border-ink/10 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-ink" /> Ready
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Unified executive editorial synthesis with architectural takeaways, interactive drilldowns, and consensus analytics.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        {activeMarkdown && (
          <div className="flex items-center space-x-2 flex-wrap gap-y-2 shrink-0">
            {/* Quick Copy Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleCopy}
              className="btn-noma-ghost px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-xs"
              title="Copy markdown to clipboard"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-ink" />}
              <span>{copied ? 'Copied' : 'Copy Report'}</span>
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
                className="btn-noma-orange px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-2 cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download Report</span>
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
                    className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-32px)] rounded-2xl bg-paper-surface border border-hairline shadow-2xl p-2 z-50 text-ink"
                  >
                    <button
                      onClick={handleDownloadHtml}
                      className="w-full px-3 py-2.5 rounded-xl text-left text-xs font-medium text-ink hover:bg-paper flex items-center space-x-2.5 cursor-pointer transition-colors"
                    >
                      <Globe className="w-4 h-4 text-orange shrink-0" />
                      <div>
                        <div className="font-bold text-ink">Styled HTML (.html)</div>
                        <div className="text-[10px] text-muted">Standalone Studio Noma doc</div>
                      </div>
                    </button>

                    <button
                      onClick={handleDownloadMarkdown}
                      className="w-full px-3 py-2.5 rounded-xl text-left text-xs font-medium text-ink hover:bg-paper flex items-center space-x-2.5 cursor-pointer transition-colors"
                    >
                      <FileText className="w-4 h-4 text-ink shrink-0" />
                      <div>
                        <div className="font-bold text-ink">Markdown (.md)</div>
                        <div className="text-[10px] text-muted">Standard GitHub markdown</div>
                      </div>
                    </button>

                    <button
                      onClick={handleDownloadTxt}
                      className="w-full px-3 py-2.5 rounded-xl text-left text-xs font-medium text-ink hover:bg-paper flex items-center space-x-2.5 cursor-pointer transition-colors"
                    >
                      <FileText className="w-4 h-4 text-muted shrink-0" />
                      <div>
                        <div className="font-bold text-ink">Plain Text (.txt)</div>
                        <div className="text-[10px] text-muted">Clean text without tags</div>
                      </div>
                    </button>

                    <button
                      onClick={handleDownloadJson}
                      className="w-full px-3 py-2.5 rounded-xl text-left text-xs font-medium text-ink hover:bg-paper flex items-center space-x-2.5 cursor-pointer transition-colors"
                    >
                      <FileCode className="w-4 h-4 text-ink shrink-0" />
                      <div>
                        <div className="font-bold text-ink">Structured JSON (.json)</div>
                        <div className="text-[10px] text-muted">Raw session telemetry data</div>
                      </div>
                    </button>

                    <div className="my-1 border-t border-hairline" />

                    <button
                      onClick={handlePrint}
                      className="w-full px-3 py-2.5 rounded-xl text-left text-xs font-medium text-ink hover:bg-paper flex items-center space-x-2.5 cursor-pointer transition-colors"
                    >
                      <Printer className="w-4 h-4 text-ink shrink-0" />
                      <div>
                        <div className="font-bold text-ink">Print / Save as PDF</div>
                        <div className="text-[10px] text-muted">Printable executive report</div>
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
              className="btn-noma-ghost px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-xs"
              title="Print or Save as PDF"
            >
              <Printer className="w-4 h-4 text-ink" />
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
                  handleGenerateReport();
                }}
                className="btn-noma-ghost px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
                title="Synthesize fresh AI report"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-generate</span>
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* Quick Session Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
        <div className="p-4 sm:p-5 rounded-2xl bg-paper-surface border border-hairline shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-paper text-ink flex items-center justify-center shrink-0 border border-hairline">
            <Zap className="w-5 h-5 text-orange" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-serif font-bold text-ink leading-none">
              {quizzes.length}
            </div>
            <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted mt-1">Quizzes Run</div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-paper-surface border border-hairline shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-paper text-ink flex items-center justify-center shrink-0 border border-hairline">
            <Layers className="w-5 h-5 text-ink" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-serif font-bold text-ink leading-none">
              {polls.length}
            </div>
            <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted mt-1">Live Polls</div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-paper-surface border border-hairline shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-paper text-ink flex items-center justify-center shrink-0 border border-hairline">
            <HelpCircle className="w-5 h-5 text-ink" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-serif font-bold text-ink leading-none">
              {questions.length}
            </div>
            <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted mt-1">Q&A Threads</div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-paper-surface border border-hairline shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-paper text-ink flex items-center justify-center shrink-0 border border-hairline">
            <Users className="w-5 h-5 text-ink" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-serif font-bold text-ink leading-none">
              {totalAttendees}
            </div>
            <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted mt-1">Total Attendees</div>
          </div>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorNotice && (
        <div className="p-4 mb-6 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorNotice}</span>
          </div>
          <div className="flex items-center space-x-2">
            {onOpenAISettings && (
              <button
                onClick={onOpenAISettings}
                className="px-2.5 py-1 rounded bg-red-100 hover:bg-red-200 text-red-900 font-mono text-[10px] font-bold border border-red-300 cursor-pointer"
              >
                OPEN AI SETTINGS
              </button>
            )}
            <button
              onClick={() => setErrorNotice(null)}
              className="p-1 hover:bg-red-100 text-red-700 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* State 1: Generation Trigger Card (If Report Not Generated) */}
      {!activeMarkdown && !isGenerating && (
        <div className="p-8 sm:p-12 rounded-3xl bg-paper-surface border border-hairline text-center max-w-xl mx-auto my-auto shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-paper border border-hairline text-ink mx-auto flex items-center justify-center mb-4 shadow-2xs">
            <FileText className="w-7 h-7" />
          </div>

          <h3 className="text-lg sm:text-xl font-serif font-bold text-ink mb-2">
            {isHost ? 'Synthesize Masterclass Session Report' : 'Report Pending Generation'}
          </h3>

          <p className="text-xs text-muted max-w-md mx-auto mb-6 leading-relaxed">
            {isHost
              ? `Ready to generate the masterclass synthesis for Room ${roomCode}. AI will unify technical architectural principles, quiz drilldowns, community poll consensus, and code recipes into a single high-density editorial document.`
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
              className="btn-noma-orange py-3.5 px-7 rounded-xl text-xs font-mono uppercase tracking-wider inline-flex items-center space-x-2.5 cursor-pointer shadow-sm"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Generate Report</span>
            </motion.button>
          ) : (
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-paper text-muted text-xs border border-hairline">
              <span className="w-2 h-2 rounded-full bg-orange animate-ping" />
              <span>Waiting for host to publish...</span>
            </div>
          )}
        </div>
      )}

      {/* State 2: Generating Loader */}
      {isGenerating && (
        <div className="p-12 rounded-3xl bg-paper-surface border border-hairline text-center max-w-md mx-auto my-auto shadow-xs">
          <RefreshCw className="w-8 h-8 text-orange mx-auto animate-spin mb-4" />
          <h4 className="text-base font-serif font-bold text-ink mb-1.5">Synthesizing Masterclass Report...</h4>
          <p className="text-xs text-muted leading-relaxed">
            Analyzing quiz outcomes, voting consensus, and top architectural Q&A threads via Mesh API router.
          </p>
        </div>
      )}

      {/* State 3: Formatted Executive Dashboard */}
      {activeMarkdown && parsedReport && (
        <div className="space-y-6 pb-12">
          {/* Executive Hero Banner */}
          <div className="p-6 sm:p-8 rounded-3xl bg-paper-surface border border-hairline shadow-xs">
            <div className="flex items-center space-x-2 text-[10px] font-bold text-orange uppercase tracking-widest font-mono mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SKETCHCAST MASTERCLASS SYNTHESIS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink tracking-tight">
              {parsedReport.heroTitle || roomTitle}
            </h1>
            <p className="text-xs text-muted mt-2">
              Keynote Executive Brief &bull; Published for Room {roomCode}
            </p>
          </div>

          {/* Rendered Section Cards */}
          <div className="grid grid-cols-1 gap-5">
            {parsedReport.sections.map((sec, idx) => ({
              sec,
              key: `report_sec_${idx}_${sec.title}`,
              delay: idx * 0.05,
              isQuizSection: /quiz/i.test(sec.title),
              isPollSection: /poll/i.test(sec.title),
            })).map(({ sec, key, delay, isQuizSection, isPollSection }) => {
              const activeQuizzesList =
                quizzes.length > 0 ? quizzes : parseQuizzesFromTable(sec.lines);

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay }}
                  className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-paper-surface border border-hairline shadow-xs transition-all hover:border-ink/20"
                >
                  <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-hairline">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-paper text-ink border border-hairline flex items-center justify-center shrink-0">
                        {isQuizSection ? (
                          <Zap className="w-4 h-4 text-orange" />
                        ) : isPollSection ? (
                          <Layers className="w-4 h-4 text-ink" />
                        ) : (
                          <FileText className="w-4 h-4 text-ink" />
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-serif font-bold text-ink tracking-tight">
                        {sec.title}
                      </h3>
                    </div>

                    {isQuizSection && activeQuizzesList.length > 0 && (
                      <span className="font-mono text-[10px] font-bold text-ink bg-lime/25 px-2.5 py-0.5 rounded-full border border-ink/10">
                        {activeQuizzesList.length} QUESTIONS
                      </span>
                    )}

                    {isPollSection && polls.length > 0 && (
                      <span className="font-mono text-[10px] font-bold text-ink bg-lime/25 px-2.5 py-0.5 rounded-full border border-ink/10">
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

          {/* Contextual Career & Certification Deep Dive */}
          {affiliateRec && (
            <div className="pt-2">
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted font-bold mb-3 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-orange" />
                <span>CURATED DEEP-DIVE & PROFESSIONAL CERTIFICATION</span>
              </div>
              <ContextualAffiliateCard recommendation={affiliateRec} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
