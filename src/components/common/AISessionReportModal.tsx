import React, { useState } from 'react';
import { X, FileText, Copy, Download, CheckCircle, AlertCircle, RefreshCw, Sparkles, Globe, FileCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateSessionSummaryReport, getStoredMeshKey } from '../../lib/meshApi';
import type { QuizQuestion, LivePoll, Question, LeaderboardEntry } from '../../types';
import { playClickSound, playPopSound, playWhoosh } from '../../lib/soundFx';

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
  isHost?: boolean;
  initialReportMarkdown?: string;
  onReportGenerated?: (markdown: string) => void;
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
      <div class="blueprint-card">
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
          <div class="hero-tag">SKETCHCAST MASTERCLASS REPORT</div>
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
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #0A0A0C;
      --card-dark: #121216;
      --border-dark: #27272A;
      --accent-cobalt: #3B82F6;
      --text-main: #FAFAFA;
      --text-muted: #A1A1AA;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-dark);
      color: var(--text-main);
      font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
      padding: 40px 20px;
      line-height: 1.6;
    }

    .container {
      max-width: 880px;
      margin: 0 auto;
    }

    /* Top Metadata Bar */
    .top-meta-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 24px;
      align-items: center;
    }

    .meta-pill {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 6px 14px;
      border: 1px solid var(--border-dark);
      background-color: var(--card-dark);
      color: var(--text-muted);
    }

    .meta-room {
      border-color: rgba(59, 130, 246, 0.4);
      color: var(--accent-cobalt);
    }

    /* Hero Banner */
    .hero-banner {
      background-color: var(--card-dark);
      border: 1px solid var(--border-dark);
      padding: 28px;
      margin-bottom: 24px;
    }

    .hero-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      color: var(--accent-cobalt);
      margin-bottom: 8px;
      letter-spacing: 1px;
    }

    .hero-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 28px;
      line-height: 1.2;
      color: #FFFFFF;
      text-transform: uppercase;
      letter-spacing: -0.5px;
      font-weight: 700;
    }

    /* Section Cards */
    .blueprint-card {
      background-color: var(--card-dark);
      border: 1px solid var(--border-dark);
      margin-bottom: 24px;
      overflow: hidden;
    }

    .card-header {
      background-color: #16161A;
      border-bottom: 1px solid var(--border-dark);
      padding: 14px 24px;
    }

    .card-header h2 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 16px;
      color: #FFFFFF;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 700;
    }

    .card-body {
      padding: 24px;
      font-size: 14px;
      color: #D4D4D8;
    }

    .section-subtitle {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 700;
      color: var(--accent-cobalt);
      text-transform: uppercase;
      margin: 20px 0 12px 0;
      letter-spacing: 0.5px;
    }

    .paragraph {
      margin-bottom: 14px;
      font-weight: 400;
      color: #A1A1AA;
    }

    .bullet-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 8px;
      font-size: 13px;
      color: #D4D4D8;
    }

    .bullet-arrow {
      color: var(--accent-cobalt);
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .numbered-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 10px;
      font-size: 13px;
      background-color: #0E0E12;
      padding: 12px 16px;
      border: 1px solid var(--border-dark);
    }

    .item-num {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      color: var(--accent-cobalt);
      flex-shrink: 0;
    }

    .divider {
      border: none;
      height: 1px;
      background-color: var(--border-dark);
      margin: 20px 0;
    }

    strong {
      color: #FFFFFF;
      font-weight: 700;
    }

    .code-badge {
      font-family: 'JetBrains Mono', monospace;
      background-color: #1A1F2C;
      color: var(--accent-cobalt);
      padding: 2px 6px;
      border: 1px solid rgba(59, 130, 246, 0.3);
      font-size: 12px;
    }

    @media print {
      body {
        background-color: #FFFFFF !important;
        color: #000000 !important;
        padding: 0 !important;
      }
      .container {
        max-width: 100% !important;
      }
      .blueprint-card, .hero-banner {
        background-color: #FFFFFF !important;
        color: #000000 !important;
        box-shadow: none !important;
        border: 1px solid #CCCCCC !important;
        page-break-inside: avoid;
      }
      .card-header {
        background-color: #F4F4F5 !important;
      }
      .card-header h2, .hero-title, strong {
        color: #000000 !important;
      }
      .card-body, .bullet-item, .paragraph {
        color: #27272A !important;
      }
      .numbered-item {
        background-color: #FAFAFA !important;
        border: 1px solid #E4E4E7 !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="top-meta-bar">
      <div class="meta-pill meta-room">ROOM: ${roomCode}</div>
      <div class="meta-pill">DATE: ${timeStr}</div>
      <div class="meta-pill">SKETCHCAST LIVE</div>
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
  isHost = false,
  initialReportMarkdown = '',
  onReportGenerated,
  onOpenAISettings,
}) => {
  const [generatedMarkdown, setGeneratedMarkdown] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeMarkdown = generatedMarkdown || initialReportMarkdown;

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
      score: u.correct_quizzes,
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

      setGeneratedMarkdown(report);
      onReportGenerated?.(report);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to generate session summary report.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!activeMarkdown) return;
    navigator.clipboard.writeText(activeMarkdown);
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
    if (!activeMarkdown) return;
    downloadBlob(activeMarkdown, `SketchCast-Report-${roomCode}-${Date.now()}.md`, 'text/markdown');
  };

  const handleDownloadTxt = () => {
    if (!activeMarkdown) return;
    const cleanTxt = activeMarkdown
      .replace(/^#+\s+/gm, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '');
    downloadBlob(cleanTxt, `SketchCast-Report-${roomCode}-${Date.now()}.txt`, 'text/plain');
  };

  const handleDownloadHtml = () => {
    if (!activeMarkdown) return;
    const timeStr = new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    const htmlContent = parseMarkdownToStyledHtml(activeMarkdown, roomTitle, roomCode, timeStr);
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
        topScore: leaderboard[0]?.correct_quizzes || 0,
      },
      reportMarkdown: activeMarkdown,
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm font-sans"
        >
          <motion.div
            initial={{ scale: 0.9, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 15, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="bg-[#101014] text-[#FAFAFA] w-[95vw] sm:max-w-2xl p-4 sm:p-7 rounded-2xl border border-white/[0.08] relative font-sans max-h-[90dvh] overflow-y-auto flex flex-col shadow-modal"
          >
            {/* Close button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 rounded-xl bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors border border-white/[0.06] cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </motion.button>

            {/* Modal Header */}
            <div className="flex items-start space-x-3 mb-4 pr-8 sm:pr-10">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                    AI Masterclass Session Report
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-semibold tracking-wide border border-blue-500/20">
                    Mesh Synthesis
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Generates an executive recap of all architecture quizzes, community polls, and top Q&A.
                </p>
              </div>
            </div>

            {/* Action / Trigger Banner */}
            {!activeMarkdown && !isGenerating && (
              isHost ? (
                <div className="p-4 sm:p-5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3 mb-4">
                  <div className="text-xs text-[#FAFAFA] leading-relaxed">
                    <strong className="text-white text-xs font-semibold block mb-1">Session Data to Synthesize:</strong>
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-xs text-zinc-400">
                      <li>{quizzes.length} Quizzes launched in Room {roomCode}</li>
                      <li>{polls.length} Live Community Polls</li>
                      <li>{questions.length} Audience Q&A Submissions</li>
                      <li>{leaderboard.length} Leaderboard participants (Top correct: {leaderboard[0]?.correct_quizzes || 0})</li>
                    </ul>
                  </div>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      playWhoosh();
                      handleGenerateReport();
                    }}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer transition-all shadow-md shadow-blue-500/20"
                  >
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>Generate Masterclass Report</span>
                  </motion.button>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] text-center space-y-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 mx-auto flex items-center justify-center text-blue-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-white">No Report Published Yet</h4>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    The host has not generated or published the AI Session Report for Room {roomCode} yet. Once published, you can view and download it here!
                  </p>
                </div>
              )
            )}

            {isGenerating && (
              <div className="p-8 rounded-xl bg-white/[0.02] border border-white/[0.08] text-center space-y-3 mb-4">
                <RefreshCw className="w-7 h-7 text-blue-400 mx-auto animate-spin" />
                <h4 className="text-sm font-semibold text-white">Synthesizing Executive Masterclass Report...</h4>
                <p className="text-xs text-zinc-400">Analyzing quiz takeaways, voting consensus, and top Q&A threads via Mesh API</p>
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 mb-4 rounded-xl bg-red-500/10 text-red-300 text-xs border border-red-500/20 flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <div className="flex-1">
                  <div>{errorMessage}</div>
                  {onOpenAISettings && isHost && errorMessage.includes('AI Settings') && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAISettings();
                      }}
                      className="mt-2 px-3 py-1 rounded-lg bg-white/[0.06] text-white text-[11px] font-medium border border-white/[0.1] hover:border-blue-500 cursor-pointer"
                    >
                      Open AI Settings
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Report Content View */}
            {activeMarkdown && (
              <div className="space-y-3 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Report Ready ({activeMarkdown.length} chars)</span>
                  </span>

                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        playPopSound();
                        handleCopy();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center space-x-1.5 cursor-pointer transition-all shadow-sm"
                      title="Copy formatted markdown to clipboard"
                    >
                      {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        playClickSound();
                        handleDownloadMarkdown();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium border border-white/[0.06] flex items-center space-x-1 cursor-pointer transition-all"
                      title="Download as Markdown file"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>.MD</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        playClickSound();
                        handleDownloadTxt();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium border border-white/[0.06] flex items-center space-x-1 cursor-pointer transition-all"
                      title="Download as Plain Text file"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span>.TXT</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        playClickSound();
                        handleDownloadHtml();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium border border-white/[0.06] flex items-center space-x-1 cursor-pointer transition-all"
                      title="Download styled HTML report"
                    >
                      <Globe className="w-3.5 h-3.5 text-blue-400" />
                      <span>.HTML</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        playClickSound();
                        handleDownloadJson();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium border border-white/[0.06] flex items-center space-x-1 cursor-pointer transition-all"
                      title="Download full session structured JSON payload"
                    >
                      <FileCode className="w-3.5 h-3.5 text-blue-400" />
                      <span>.JSON</span>
                    </motion.button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0B0B0E] border border-white/[0.08] flex-1 overflow-y-auto max-h-96 text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed select-text">
                  {activeMarkdown}
                </div>

                {isHost && (
                  <div className="pt-2 flex justify-end">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        playWhoosh();
                        handleGenerateReport();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium border border-white/[0.08] flex items-center space-x-1.5 cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Re-generate</span>
                    </motion.button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
