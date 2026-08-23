import React, { useState } from 'react';
import { X, FileText, Copy, Download, CheckCircle, AlertCircle, RefreshCw, Sparkles, Globe, FileCode } from 'lucide-react';
import { generateSessionSummaryReport, getStoredMeshKey } from '../../lib/meshApi';
import type { QuizQuestion, LivePoll, Question, LeaderboardEntry } from '../../types';

interface AISessionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomTitle: string;
  roomCode: string;
  totalAttendees: number;
  quizzes: QuizQuestion[];
  polls: LivePoll[];
  questions: Question[];
  leaderboard: LeaderboardEntry[];
  onOpenAISettings?: () => void;
}

function parseMarkdownToStyledHtml(markdown: string, roomTitle: string, roomCode: string, timeStr: string): string {
  // Split markdown into lines
  const lines = markdown.split('\n');
  const sectionsHtml: string[] = [];
  let currentSectionTitle = '';
  let currentSectionContent: string[] = [];

  const flushSection = () => {
    if (!currentSectionTitle && currentSectionContent.length === 0) return;

    let contentInner = currentSectionContent.join('\n');

    // Parse subheadings ###
    contentInner = contentInner.replace(/###\s+(.+)/g, '<h3 class="section-subtitle">$1</h3>');

    // Parse bold & italic
    contentInner = contentInner.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    contentInner = contentInner.replace(/\*(.+?)\*/g, '<em>$1</em>');
    contentInner = contentInner.replace(/`([^`]+)`/g, '<code class="code-badge">$1</code>');

    // Parse list items
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
      return `<p class="paragraph">${trimmed}</p>`;
    });

    sectionsHtml.push(`
      <div class="neo-card">
        ${currentSectionTitle ? `<div class="card-header"><h2>${currentSectionTitle}</h2></div>` : ''}
        <div class="card-body">
          ${formattedLines.join('\n')}
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
      // Main title header
      const titleText = trimmed.replace(/^#\s+/, '').replace(/[⚡🧠📊💬🏆🚀]/gu, '').trim();
      sectionsHtml.push(`
        <div class="hero-banner">
          <div class="hero-tag">⚡ SKETCHCAST MASTERCLASS REPORT</div>
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SketchCast Report - ${roomTitle} (${roomCode})</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@500;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --neo-yellow: #FFE600;
      --neo-pink: #FF2A6D;
      --neo-cyan: #00F0FF;
      --neo-mint: #00F59B;
      --neo-orange: #FF6B35;
      --neo-purple: #9B5DE5;
      --neo-cream: #FFFDF5;
      --neo-dark: #0D0F15;
      --neo-card: #151822;
      --neo-card-darker: #0E1017;
      --neo-border: #000000;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: #0D0F15;
      background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1.5px, transparent 1.5px);
      background-size: 24px 24px;
      color: #F8FAFC;
      font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
      padding: 32px 16px;
      line-height: 1.6;
    }

    .container {
      max-width: 860px;
      margin: 0 auto;
    }

    /* Top Metadata Bar */
    .top-meta-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 20px;
      align-items: center;
    }

    .meta-pill {
      font-family: 'Space Mono', monospace;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 6px 12px;
      border: 2px solid var(--neo-border);
      box-shadow: 2px 2px 0px #000000;
    }

    .meta-time {
      background-color: var(--neo-yellow);
      color: #000000;
    }

    .meta-room {
      background-color: var(--neo-cyan);
      color: #000000;
    }

    .meta-badge {
      background-color: var(--neo-pink);
      color: #FFFFFF;
    }

    /* Hero Banner */
    .hero-banner {
      background-color: #1A1E2B;
      border: 3px solid var(--neo-border);
      box-shadow: 5px 5px 0px #000000;
      padding: 24px;
      margin-bottom: 24px;
      position: relative;
    }

    .hero-tag {
      font-family: 'Space Mono', monospace;
      font-size: 11px;
      font-weight: 800;
      color: var(--neo-yellow);
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }

    .hero-title {
      font-family: 'Archivo Black', sans-serif;
      font-size: 26px;
      line-height: 1.2;
      color: #FFFFFF;
      text-transform: uppercase;
      letter-spacing: -0.5px;
    }

    /* Section Neo-Cards */
    .neo-card {
      background-color: var(--neo-card);
      border: 3px solid var(--neo-border);
      box-shadow: 5px 5px 0px #000000;
      margin-bottom: 24px;
      overflow: hidden;
    }

    .card-header {
      background-color: #1F2433;
      border-bottom: 2px solid var(--neo-border);
      padding: 12px 20px;
    }

    .card-header h2 {
      font-family: 'Archivo Black', sans-serif;
      font-size: 16px;
      color: var(--neo-mint);
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }

    .card-body {
      padding: 20px;
      font-size: 14px;
      color: #E2E8F0;
    }

    .section-subtitle {
      font-family: 'Space Mono', monospace;
      font-size: 13px;
      font-weight: 800;
      color: var(--neo-yellow);
      text-transform: uppercase;
      margin: 16px 0 10px 0;
      border-left: 3px solid var(--neo-yellow);
      padding-left: 8px;
    }

    .paragraph {
      margin-bottom: 12px;
      font-weight: 500;
      color: #CBD5E1;
    }

    .bullet-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 8px;
      font-size: 13px;
      color: #E2E8F0;
    }

    .bullet-arrow {
      color: var(--neo-yellow);
      font-weight: 800;
      font-size: 14px;
      line-height: 1;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .numbered-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 10px;
      font-size: 13px;
      background-color: #10131B;
      padding: 10px 14px;
      border: 1px solid #2B3042;
    }

    .item-num {
      font-family: 'Space Mono', monospace;
      font-weight: 800;
      color: var(--neo-cyan);
      flex-shrink: 0;
    }

    .divider {
      border: none;
      height: 2px;
      background-color: #262B3A;
      margin: 16px 0;
    }

    strong {
      color: #FFFFFF;
      font-weight: 800;
    }

    .code-badge {
      font-family: 'Space Mono', monospace;
      background-color: #000000;
      color: var(--neo-mint);
      padding: 2px 6px;
      border: 1px solid var(--neo-border);
      font-size: 12px;
    }

    @media print {
      body {
        background-color: #FFFFFF !important;
        background-image: none !important;
        color: #000000 !important;
        padding: 0 !important;
      }
      .container {
        max-width: 100% !important;
      }
      .neo-card, .hero-banner {
        background-color: #FFFFFF !important;
        color: #000000 !important;
        box-shadow: none !important;
        border: 2px solid #000000 !important;
        page-break-inside: avoid;
      }
      .card-header {
        background-color: #F1F5F9 !important;
      }
      .card-header h2, .hero-title, strong {
        color: #000000 !important;
      }
      .card-body, .bullet-item, .paragraph {
        color: #1E293B !important;
      }
      .numbered-item {
        background-color: #F8FAFC !important;
        border: 1px solid #CBD5E1 !important;
      }
      .meta-pill {
        box-shadow: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="top-meta-bar">
      <div class="meta-pill meta-room">ROOM: ${roomCode}</div>
      <div class="meta-pill meta-time">📅 ${timeStr}</div>
      <div class="meta-pill meta-badge">SKETCHCAST MASTERCLASS</div>
    </div>
    ${sectionsHtml.join('\n')}
  </div>
</body>
</html>`;
}

export const AISessionReportModal: React.FC<AISessionReportModalProps> = ({
  isOpen,
  onClose,
  roomTitle,
  roomCode,
  totalAttendees,
  quizzes,
  polls,
  questions,
  leaderboard,
  onOpenAISettings,
}) => {
  const [reportMarkdown, setReportMarkdown] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateReport = async () => {
    const hasKey = Boolean(getStoredMeshKey());
    if (!hasKey) {
      setErrorMessage('Mesh API Key missing. Please configure your key in AI Settings.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    const quizzesPayload = quizzes.map((q) => ({
      question: q.question,
      correctOption: q.correctOptionId,
      category: q.category,
    }));

    const pollsPayload = polls.map((p) => {
      const topOpt = [...p.options].sort((a, b) => b.votesCount - a.votesCount)[0];
      return {
        question: p.question,
        totalVotes: p.totalVotes,
        topOption: topOpt ? `${topOpt.text} (${topOpt.votesCount} votes)` : 'No votes',
      };
    });

    const topQuestionsPayload = [...questions]
      .sort((a, b) => b.upvotes_count - a.upvotes_count)
      .slice(0, 5)
      .map((q) => ({
        content: q.content,
        upvotes: q.upvotes_count,
        author: q.author_name,
      }));

    const top3Leaderboard = leaderboard.slice(0, 3).map((u) => ({
      name: u.name,
      score: u.score,
    }));

    try {
      const report = await generateSessionSummaryReport({
        roomTitle,
        roomCode,
        totalAttendees,
        quizzes: quizzesPayload,
        polls: pollsPayload,
        topQuestions: topQuestionsPayload,
        leaderboardTop3: top3Leaderboard,
      });

      setReportMarkdown(report);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to generate session summary report.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!reportMarkdown) return;
    navigator.clipboard.writeText(reportMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBlob = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadMarkdown = () => {
    if (!reportMarkdown) return;
    downloadBlob(reportMarkdown, `SketchCast-Report-${roomCode}-${Date.now()}.md`, 'text/markdown');
  };

  const handleDownloadTxt = () => {
    if (!reportMarkdown) return;
    const cleanTxt = reportMarkdown
      .replace(/^#+\s+/gm, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '');
    downloadBlob(cleanTxt, `SketchCast-Report-${roomCode}-${Date.now()}.txt`, 'text/plain');
  };

  const handleDownloadHtml = () => {
    if (!reportMarkdown) return;
    const timeStr = new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    const htmlContent = parseMarkdownToStyledHtml(reportMarkdown, roomTitle, roomCode, timeStr);
    downloadBlob(htmlContent, `SketchCast-Report-${roomCode}-${Date.now()}.html`, 'text/html');
  };

  const handleDownloadJson = () => {
    const exportData = {
      roomTitle,
      roomCode,
      generatedAt: new Date().toISOString(),
      totalAttendees,
      metrics: {
        quizzesCount: quizzes.length,
        pollsCount: polls.length,
        questionsCount: questions.length,
        leaderboardEntries: leaderboard.length,
        topScore: leaderboard[0]?.score || 0,
      },
      reportMarkdown,
      quizzes: quizzes.map((q) => ({
        category: q.category,
        question: q.question,
        correctOption: q.correctOptionId,
        explanation: q.explanation,
      })),
      polls: polls.map((p) => ({
        question: p.question,
        totalVotes: p.totalVotes,
        consensusNote: p.aiConsensusNote || null,
        options: p.options,
      })),
      topAudienceQuestions: questions.slice(0, 10).map((q) => ({
        author: q.author_name,
        content: q.content,
        upvotes: q.upvotes_count,
        status: q.status,
      })),
      topPodium: leaderboard.slice(0, 5),
    };
    downloadBlob(JSON.stringify(exportData, null, 2), `SketchCast-Session-Data-${roomCode}-${Date.now()}.json`, 'application/json');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-neo-cream text-black w-full max-w-2xl p-4 sm:p-6 border-4 border-black brutal-shadow-lg relative font-sans max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1 sm:p-1.5 bg-black text-white hover:bg-neo-pink transition-colors border-2 border-black cursor-pointer z-10"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-3" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start space-x-2.5 sm:space-x-3 mb-3.5 pr-8 sm:pr-10">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-neo-yellow text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy shrink-0 -rotate-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 flex-wrap">
              <h3 className="text-base sm:text-lg font-heavy uppercase tracking-tight text-black leading-tight">
                AI MASTERCLASS SESSION REPORT
              </h3>
              <span className="px-1.5 py-0.2 bg-black text-neo-yellow font-mono text-[9px] font-black uppercase">
                MESH SYNTHESIS
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-mono text-slate-700 mt-0.5">
              Generates an executive recap of all architecture quizzes, community polls, and top Q&A.
            </p>
          </div>
        </div>

        {/* Action / Trigger Banner */}
        {!reportMarkdown && !isGenerating && (
          <div className="p-4 bg-white border-2 border-black brutal-shadow-sm font-mono space-y-3 mb-3">
            <div className="text-xs text-slate-800 leading-relaxed">
              <strong>Session Data to Synthesize:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-0.5 text-[11px]">
                <li>{quizzes.length} Quizzes launched in Room {roomCode}</li>
                <li>{polls.length} Live Community Polls</li>
                <li>{questions.length} Audience Q&A Submissions</li>
                <li>{leaderboard.length} Leaderboard participants (Top score: {leaderboard[0]?.score || 0} pts)</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleGenerateReport}
              className="w-full py-2.5 bg-neo-pink hover:bg-[#FF4782] text-white text-xs font-black uppercase border-2 border-black brutal-shadow flex items-center justify-center space-x-2 cursor-pointer transition-all active:translate-x-px active:translate-y-px"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>GENERATE MASTERCLASS REPORT</span>
            </button>
          </div>
        )}

        {isGenerating && (
          <div className="p-8 bg-white border-2 border-black brutal-shadow-sm text-center font-mono space-y-3 mb-3">
            <RefreshCw className="w-8 h-8 text-neo-pink mx-auto animate-spin" />
            <h4 className="text-xs font-heavy uppercase">Synthesizing Executive Masterclass Report...</h4>
            <p className="text-[11px] text-slate-600">Analyzing quiz takeaways, voting consensus, and top Q&A threads via Mesh API</p>
          </div>
        )}

        {errorMessage && (
          <div className="p-2.5 mb-3 bg-neo-pink text-white font-mono text-xs font-bold border-2 border-black flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div>{errorMessage}</div>
              {onOpenAISettings && errorMessage.includes('AI Settings') && (
                <button
                  type="button"
                  onClick={onOpenAISettings}
                  className="mt-1.5 px-2 py-0.5 bg-white text-black text-[10px] font-black uppercase border border-black hover:bg-neo-yellow cursor-pointer"
                >
                  Open AI Settings
                </button>
              )}
            </div>
          </div>
        )}

        {/* Report Content View */}
        {reportMarkdown && (
          <div className="space-y-3 flex-1 flex flex-col min-h-0 font-mono">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] font-black uppercase text-emerald-800 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 stroke-3" />
                <span>REPORT GENERATED ({reportMarkdown.length} CHARS)</span>
              </span>

              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2 py-1 bg-neo-yellow hover:bg-[#FFF04D] text-black text-[11px] font-black uppercase border border-black brutal-shadow-sm flex items-center space-x-1 cursor-pointer transition-all active:translate-x-px active:translate-y-px"
                  title="Copy formatted markdown to clipboard"
                >
                  {copied ? <CheckCircle className="w-3.5 h-3.5 stroke-3" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'COPIED!' : 'COPY'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadMarkdown}
                  className="px-2 py-1 bg-neo-cyan hover:bg-[#33F3FF] text-black text-[11px] font-black uppercase border border-black brutal-shadow-sm flex items-center space-x-1 cursor-pointer transition-all active:translate-x-px active:translate-y-px"
                  title="Download as Markdown file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>.MD</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="px-2 py-1 bg-neo-mint hover:bg-[#26F7A9] text-black text-[11px] font-black uppercase border border-black brutal-shadow-sm flex items-center space-x-1 cursor-pointer transition-all active:translate-x-px active:translate-y-px"
                  title="Download as Plain Text file"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>.TXT</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  className="px-2 py-1 bg-neo-purple hover:bg-[#A855F7] text-white text-[11px] font-black uppercase border border-black brutal-shadow-sm flex items-center space-x-1 cursor-pointer transition-all active:translate-x-px active:translate-y-px"
                  title="Download as styled Neo-Brutalist HTML report"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>.HTML</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="px-2 py-1 bg-neo-orange hover:bg-[#FF8833] text-black text-[11px] font-black uppercase border border-black brutal-shadow-sm flex items-center space-x-1 cursor-pointer transition-all active:translate-x-px active:translate-y-px"
                  title="Download full session structured JSON payload"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>.JSON</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-white border-2 border-black brutal-shadow-sm flex-1 overflow-y-auto max-h-96 text-xs text-slate-900 whitespace-pre-wrap font-mono leading-relaxed select-text">
              {reportMarkdown}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleGenerateReport}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-black text-xs font-bold uppercase border border-black flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>RE-GENERATE</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
