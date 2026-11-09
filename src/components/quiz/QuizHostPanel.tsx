import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Plus,
  Sparkles,
  Clock,
  X,
  Terminal,
  Trash2,
  CheckCircle,
  RotateCcw,
  Bot,
  Zap,
  Sliders,
  AlertCircle,
  Globe,
  Link2,
  FolderGit2,
  Flame,
  ExternalLink,
  Code,
  RefreshCw,
  FileSpreadsheet,
  Square,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { QuizQuestion } from '../../types';
import {
  generateAIQuizQuestions,
  generateAIQuizFromWebSearch,
  generateAIQuizFromUrl,
  generateAIQuizFromGitHub,
  generateAIQuizFromHNTrends,
  generateAdaptiveFollowUpQuestion,
  distributeQuestionOptions,
  fetchTrendingTechNews,
  formatCodeSnippet,
  getStoredMeshKey,
  isGitHubRepoInput,
  type TrendingTechStory,
  type QuizQuestionFormat,
} from '../../lib/meshApi';
import { playClickSound, playPopSound } from '../../lib/soundFx';
import { QuizImportExportModal } from './QuizImportExportModal';

interface QuizHostPanelProps {
  onStartQuiz: (question: QuizQuestion) => void;
  onStartAdaptiveCampaign?: (
    topic: string,
    count: number,
    startDifficulty: 'Junior' | 'Mid' | 'Senior' | 'Principal',
    initialQuestion?: QuizQuestion,
    format?: QuizQuestionFormat
  ) => Promise<void> | void;
  onClearActiveQuiz?: (options?: { isFinished?: boolean }) => void;
  activeQuestionId?: string;
  isRevealed?: boolean;
  roomCode?: string;
  onOpenAISettings?: () => void;
}

interface DraftQuestion {
  id: string;
  category: string;
  question: string;
  questionType?: 'multiple_choice' | 'short_answer';
  expectedAnswer?: string;
  acceptableAnswers?: string;
  optA: string;
  optB: string;
  optC: string;
  optD: string;
  correctOpt: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  timeLimitSeconds: number;
}

const createBlankDraftQuestion = (index: number): DraftQuestion => ({
  id: `draft-q-${Date.now()}-${index}`,
  category: 'System Design',
  question: '',
  questionType: 'multiple_choice',
  expectedAnswer: '',
  acceptableAnswers: '',
  optA: '',
  optB: '',
  optC: '',
  optD: '',
  correctOpt: 'A',
  explanation: '',
  timeLimitSeconds: 45,
});

export const QuizHostPanel: React.FC<QuizHostPanelProps> = ({
  onStartQuiz,
  onStartAdaptiveCampaign,
  onClearActiveQuiz,
  activeQuestionId,
  isRevealed = false,
  roomCode = 'SKT-789',
  onOpenAISettings,
}) => {
  const queueStorageKey = `sketchcast_host_quiz_queue_${(roomCode || 'SKT-789').toUpperCase().trim()}`;
  const completedStorageKey = `sketchcast_completed_quiz_ids_${(roomCode || 'SKT-789').toUpperCase().trim()}`;

  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [showImportExportModal, setShowImportExportModal] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'editor' | 'ai'>('ai');
  const [hostQuestions, setHostQuestions] = useState<QuizQuestion[]>(() => {
    try {
      const stored = localStorage.getItem(queueStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(completedStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Multi-question drafting state
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([
    createBlankDraftQuestion(1),
  ]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);

  // AI Quiz Generation form state (Unified Input)
  const [aiInput, setAiInput] = useState('');
  const [selectedStoryUrl, setSelectedStoryUrl] = useState<string | null>(null);
  const [aiCount, setAiCount] = useState<number>(3);
  const [aiDifficulty, setAiDifficulty] = useState<'Junior' | 'Mid' | 'Senior' | 'Principal'>('Senior');
  const [aiFormat, setAiFormat] = useState<QuizQuestionFormat>('mixed');
  const [isAdaptiveLiveMode, setIsAdaptiveLiveMode] = useState<boolean>(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiSuccessNote, setAiSuccessNote] = useState<string | null>(null);
  const [aiToolStatus, setAiToolStatus] = useState<string | null>(null);
  const [groundingSources, setGroundingSources] = useState<Array<{ title: string; url: string }>>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hacker News Stories State (Auto-loaded for Popular Topics)
  const [hnStories, setHnStories] = useState<TrendingTechStory[]>([]);
  const [isLoadingHnStories, setIsLoadingHnStories] = useState(false);

  const loadHackerNewsStories = useCallback(async () => {
    setIsLoadingHnStories(true);
    try {
      const stories = await fetchTrendingTechNews(6);
      setHnStories(stories);
    } catch {
      // ignore
    } finally {
      setIsLoadingHnStories(false);
    }
  }, []);

  // Auto-fetch Hacker News trending stories on mount or when AI modal is displayed
  useEffect(() => {
    if (showCustomModal && modalTab === 'ai' && hnStories.length === 0 && !isLoadingHnStories) {
      queueMicrotask(() => {
        loadHackerNewsStories();
      });
    }
  }, [showCustomModal, modalTab, hnStories.length, isLoadingHnStories, loadHackerNewsStories]);

  const defaultPopularTopics: Array<{ title: string; url?: string }> = [
    { title: 'Next.js 15 Server Actions' },
    { title: 'PostgreSQL 17 features' },
    { title: 'Distributed Cache Invalidation' },
    { title: 'Kafka vs RabbitMQ 2026' },
  ];

  const popularTopicsList: Array<{ title: string; url?: string }> = hnStories.length > 0
    ? hnStories.slice(0, 5).map((s) => ({ title: s.title, url: s.url }))
    : defaultPopularTopics;

  // Track completed questions when revealed
  const lastRecordedCompletedRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeQuestionId && isRevealed && lastRecordedCompletedRef.current !== activeQuestionId) {
      lastRecordedCompletedRef.current = activeQuestionId;
      try {
        const stored = localStorage.getItem(completedStorageKey);
        const list: string[] = stored ? JSON.parse(stored) : [];
        if (!list.includes(activeQuestionId)) {
          const next = [...list, activeQuestionId];
          localStorage.setItem(completedStorageKey, JSON.stringify(next));
          setTimeout(() => {
            setCompletedIds(next);
          }, 0);
        }
      } catch {
        // ignore
      }
    }
  }, [activeQuestionId, isRevealed, completedStorageKey]);

  // Reload queue and completed IDs ONLY when roomCode actually changes (without effect cascading renders)
  const [prevQueueKey, setPrevQueueKey] = useState(queueStorageKey);
  if (prevQueueKey !== queueStorageKey) {
    setPrevQueueKey(queueStorageKey);
    try {
      const stored = localStorage.getItem(queueStorageKey);
      setHostQuestions(stored ? JSON.parse(stored) : []);
      const storedCompleted = localStorage.getItem(completedStorageKey);
      setCompletedIds(storedCompleted ? JSON.parse(storedCompleted) : []);
    } catch {
      setHostQuestions([]);
      setCompletedIds([]);
    }
  }

  const persistQuestions = (questions: QuizQuestion[]) => {
    setHostQuestions(questions);
    try {
      localStorage.setItem(queueStorageKey, JSON.stringify(questions));
    } catch {
      // ignore
    }
  };

  const handleOpenModal = (defaultTab: 'editor' | 'ai' = 'ai') => {
    setDraftQuestions([createBlankDraftQuestion(1)]);
    setActiveQuestionIndex(0);
    setErrorMessage(null);
    setAiSuccessNote(null);
    setModalTab(defaultTab);
    setShowCustomModal(true);
  };

  // Add another question to current draft
  const handleAddQuestionToDraft = () => {
    const nextIdx = draftQuestions.length + 1;
    const newDraft = createBlankDraftQuestion(nextIdx);
    setDraftQuestions((prev) => [...prev, newDraft]);
    setActiveQuestionIndex(draftQuestions.length);
  };

  // Remove a question from draft
  const handleRemoveDraftQuestion = (indexToRemove: number) => {
    if (draftQuestions.length <= 1) return;
    const updated = draftQuestions.filter((_, idx) => idx !== indexToRemove);
    setDraftQuestions(updated);
    setActiveQuestionIndex((prev) => Math.min(prev, updated.length - 1));
  };

  // Update current active draft question field
  const updateCurrentDraft = <K extends keyof DraftQuestion>(field: K, value: DraftQuestion[K]) => {
    setDraftQuestions((prev) =>
      prev.map((dq, idx) => (idx === activeQuestionIndex ? { ...dq, [field]: value } : dq))
    );
  };

  const currentDraft = draftQuestions[activeQuestionIndex] || draftQuestions[0];

  // AI Generation Trigger
  const handleGenerateAI = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasKey = Boolean(getStoredMeshKey());
    if (!hasKey) {
      setErrorMessage('Mesh API Key missing. Please configure your key in AI Settings.');
      return;
    }

    setIsGeneratingAI(true);
    setErrorMessage(null);
    setAiSuccessNote(null);
    setGroundingSources([]);

    try {
      const cleanInput = aiInput.trim();
      if (!cleanInput) {
        throw new Error('Please enter an architecture topic, documentation URL, or GitHub repo.');
      }

      if (isAdaptiveLiveMode) {
        setAiToolStatus(`✨ Synthesizing Adaptive Challenge 1 of ${aiCount} (${aiDifficulty} tier, ${aiFormat} format)...`);

        const q1 = await generateAdaptiveFollowUpQuestion({
          topic: cleanInput,
          currentDifficulty: aiDifficulty,
          targetDifficulty: aiDifficulty,
          accuracyPct: 50,
          questionNumber: 1,
          totalQuestions: aiCount,
          adaptationType: 'maintained',
          format: aiFormat,
        });

        playPopSound();
        if (onStartAdaptiveCampaign) {
          await onStartAdaptiveCampaign(cleanInput, aiCount, aiDifficulty, q1, aiFormat);
        } else {
          onStartQuiz(q1);
        }

        setShowCustomModal(false);
        return;
      }

      let generated: any[] = [];
      let successMsg = '';
      let defaultCategory = cleanInput.slice(0, 30);

      // Route 1: GitHub Repo Input (e.g. facebook/react or https://github.com/...)
      if (isGitHubRepoInput(cleanInput)) {
        setAiToolStatus(`🐙 Fetching repo metadata & README for ${cleanInput}...`);
        const res = await generateAIQuizFromGitHub(cleanInput, aiCount, aiDifficulty, aiFormat);
        generated = res.questions;
        setGroundingSources([{ title: res.repoSummary.fullName, url: `https://github.com/${res.repoSummary.fullName}` }]);
        defaultCategory = res.repoSummary.repo;
        successMsg = `🐙 Scanned ${res.repoSummary.fullName} (${res.repoSummary.stars.toLocaleString()} ⭐) & generated ${generated.length} questions!`;
      }
      // Route 2: Web URL Documentation (e.g. https://bun.sh/docs)
      else if (/^https?:\/\//i.test(cleanInput)) {
        setAiToolStatus(`🔗 Scraping & parsing content from ${cleanInput}...`);
        const res = await generateAIQuizFromUrl(cleanInput, aiCount, aiDifficulty, aiFormat);
        generated = res.questions;
        setGroundingSources([{ title: res.pageInfo.title, url: res.pageInfo.url }]);
        defaultCategory = res.pageInfo.title.slice(0, 20);
        successMsg = `🔗 Scraped & constructed ${generated.length} questions from "${res.pageInfo.title}"!`;
      }
      // Route 3: Selected Hacker News Story with URL
      else if (selectedStoryUrl) {
        setAiToolStatus(`🔥 Analyzing breaking tech news: "${cleanInput}"...`);
        const res = await generateAIQuizFromHNTrends(cleanInput, selectedStoryUrl, aiCount, aiDifficulty, aiFormat);
        generated = res.questions;
        setGroundingSources([{ title: cleanInput, url: selectedStoryUrl }]);
        defaultCategory = 'Tech Trends';
        successMsg = `🔥 Generated ${generated.length} trivia questions on today's story: "${cleanInput}"!`;
      }
      // Route 4: Topic Query with Automatic Live Web Grounding & Seamless Fallback
      else {
        setAiToolStatus(`🌐 Searching live web for latest RFCs & docs on "${cleanInput}"...`);
        try {
          const res = await generateAIQuizFromWebSearch(cleanInput, aiCount, aiDifficulty, aiFormat);
          generated = res.questions;
          setGroundingSources(res.sources);
          successMsg = res.sources.length > 0
            ? `🌐 Grounded ${generated.length} questions using ${res.sources.length} live web sources!`
            : `✨ Generated ${generated.length} questions on "${cleanInput}"!`;
        } catch (err: any) {
          console.warn('[Quiz AI] Live web search error, falling back to pure prompt synthesis:', err);
          setAiToolStatus('Synthesizing questions via Mesh AI...');
          generated = await generateAIQuizQuestions(cleanInput, aiCount, aiDifficulty, aiFormat);
          successMsg = `✨ Generated ${generated.length} questions on "${cleanInput}"!`;
        }
      }

      if (!generated || generated.length === 0) {
        throw new Error('No questions returned by AI model.');
      }

      const balanced = distributeQuestionOptions(generated);
      const timestamp = Date.now();
      const newDrafts: DraftQuestion[] = balanced.map((g, idx) => {
        const isShort = g.questionType === 'short_answer' || Boolean(g.expectedAnswer);
        const cleanExpected = (g.expectedAnswer || g.optA || '').trim();
        return {
          id: `ai-draft-${timestamp}-${idx}`,
          category: g.category || defaultCategory,
          question: g.question,
          questionType: isShort ? 'short_answer' : 'multiple_choice',
          expectedAnswer: isShort ? cleanExpected : '',
          acceptableAnswers: Array.isArray(g.acceptableAnswers)
            ? g.acceptableAnswers.join(', ')
            : (g.acceptableAnswers || ''),
          optA: g.optA || (isShort ? cleanExpected : ''),
          optB: g.optB || (isShort ? 'Other' : ''),
          optC: g.optC || '',
          optD: g.optD || '',
          correctOpt: isShort ? 'A' : (g.correctOpt || 'A'),
          explanation: g.explanation,
          timeLimitSeconds: g.timeLimitSeconds || (isShort ? 35 : 45),
        };
      });

      setDraftQuestions(newDrafts);
      setActiveQuestionIndex(0);
      setModalTab('editor');
      setAiSuccessNote(successMsg);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to generate quiz questions via Mesh API.');
    } finally {
      setIsGeneratingAI(false);
      setAiToolStatus(null);
    }
  };

  const handleSaveQuiz = (e: React.SyntheticEvent, launchImmediately: boolean = false) => {
    e.preventDefault();
    setErrorMessage(null);

    // Filter valid questions: either complete multiple-choice or complete short-answer
    const validDrafts = draftQuestions.filter((dq) =>
      dq.questionType === 'short_answer'
        ? Boolean(dq.question.trim() && dq.expectedAnswer?.trim())
        : Boolean(dq.question.trim() && dq.optA.trim() && dq.optB.trim())
    );

    if (validDrafts.length === 0) {
      setErrorMessage('Please fill in at least 1 complete question with prompt and required answers.');
      return;
    }

    const timestamp = Date.now();
    const finalQuestions: QuizQuestion[] = validDrafts.map((dq, idx) => {
      const isShort = dq.questionType === 'short_answer';
      const cleanExpected = dq.expectedAnswer?.trim() || 'Correct';
      const acceptableArr = isShort && dq.acceptableAnswers
        ? dq.acceptableAnswers.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;

      return {
        id: `custom-q-${timestamp}-${idx + 1}`,
        category: dq.category.trim() || 'System Design',
        question: dq.question.trim(),
        questionType: dq.questionType || 'multiple_choice',
        expectedAnswer: isShort ? cleanExpected : undefined,
        acceptableAnswers: acceptableArr,
        options: isShort
          ? [
            { id: 'A', text: cleanExpected },
            { id: 'B', text: 'Other' },
          ]
          : [
            { id: 'A', text: dq.optA.trim() },
            { id: 'B', text: dq.optB.trim() },
            { id: 'C', text: dq.optC.trim() || 'Option C' },
            { id: 'D', text: dq.optD.trim() || 'Option D' },
          ],
        correctOptionId: isShort ? 'A' : dq.correctOpt,
        explanation: dq.explanation.trim() || (isShort ? `Ground truth expected answer: ${cleanExpected}` : 'Correct answer verified by host.'),
        timeLimitSeconds: dq.timeLimitSeconds || (isShort ? 35 : 45),
      };
    });

    const updatedQueue = [...finalQuestions, ...hostQuestions];
    persistQuestions(updatedQueue);

    if (launchImmediately && finalQuestions.length > 0) {
      onStartQuiz(finalQuestions[0]);
    }

    setShowCustomModal(false);
  };

  const handleDeleteQuestion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = hostQuestions.filter((q) => q.id !== id);
    persistQuestions(filtered);
    setCompletedIds((prev) => {
      const next = prev.filter((item) => item !== id);
      try {
        localStorage.setItem(completedStorageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    // If the deleted question was currently active, or if all questions are now deleted:
    if (activeQuestionId === id || filtered.length === 0) {
      onClearActiveQuiz?.({ isFinished: false });
    }
  };

  const validQuestionsCount = draftQuestions.filter((dq) =>
    dq.questionType === 'short_answer'
      ? Boolean(dq.question.trim() && dq.expectedAnswer?.trim())
      : Boolean(dq.question.trim() && dq.optA.trim() && dq.optB.trim())
  ).length;

  return (
    <div className="flex flex-col h-full bg-paper-elevated border border-hairline rounded-3xl p-4 sm:p-5 space-y-4 font-sans shadow-sm text-ink">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-hairline pb-3.5">
        <div className="flex items-center space-x-2 min-w-0">
          <h3 className="text-xs font-mono font-bold text-ink uppercase tracking-wider whitespace-nowrap">
            HOST QUIZ STUDIO
          </h3>
          {activeQuestionId ? (
            <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-lime/25 border border-lime text-[10px] font-mono font-bold text-ink shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse" />
              <span>LIVE</span>
            </span>
          ) : hostQuestions.length > 0 ? (
            <span className="text-[10px] font-mono text-muted px-2 py-0.5 rounded-full bg-paper-card border border-hairline shrink-0 font-bold">
              {hostQuestions.length}
            </span>
          ) : null}
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              playClickSound();
              setShowImportExportModal(true);
            }}
            className="w-8 h-8 rounded-xl bg-paper hover:bg-black/[0.04] text-muted hover:text-ink border border-hairline transition-colors flex items-center justify-center cursor-pointer shrink-0 shadow-2xs"
            title="Import or Export Quiz (Kahoot CSV, SketchCast CSV/JSON)"
          >
            <FileSpreadsheet className="w-4 h-4 text-orange" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              playClickSound();
              handleOpenModal('ai');
            }}
            className="h-8 px-3.5 btn-noma-orange text-[11px] font-mono font-bold uppercase rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
            title="Create questions (Mesh AI or Manual Editor)"
          >
            <Plus className="w-3.5 h-3.5 stroke-2" />
            <span>CREATE</span>
          </motion.button>
        </div>
      </div>

      {/* Host Quiz Question Queue */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 pb-24 sm:pb-28 md:pb-4">
        {hostQuestions.length === 0 ? (
          <div className="p-6 bg-paper-card rounded-2xl border border-dashed border-hairline text-center space-y-3.5">
            <div className="w-10 h-10 rounded-2xl bg-paper text-orange border border-hairline flex items-center justify-center mx-auto shadow-2xs">
              <Sparkles className="w-5 h-5 text-orange" />
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold uppercase text-ink tracking-wider">
                NO QUESTIONS QUEUED
              </h4>
              <p className="text-xs font-sans text-muted max-w-xs mx-auto leading-relaxed mt-1">
                Synthesize challenges using AI or craft custom questions for your session.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 pt-1">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  playClickSound();
                  handleOpenModal('ai');
                }}
                className="px-4 py-2 btn-noma-orange text-xs font-mono font-bold uppercase rounded-xl inline-flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>AI GENERATE</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  playClickSound();
                  handleOpenModal('editor');
                }}
                className="px-3.5 py-2 bg-paper hover:bg-black/[0.04] text-ink text-xs font-mono font-bold uppercase rounded-xl border border-hairline inline-flex items-center space-x-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-orange stroke-2" />
                <span>MANUAL DRAFT</span>
              </motion.button>
            </div>
          </div>
        ) : (
          hostQuestions.map((q, idx) => {
            const isCurrentlyActive = activeQuestionId === q.id;
            const isLive = isCurrentlyActive && !isRevealed;
            const isCompleted = completedIds.includes(q.id) || (isCurrentlyActive && isRevealed);

            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isLive
                    ? 'bg-ink text-paper border-2 border-ink shadow-sm'
                    : isCompleted
                    ? 'bg-paper-card border-hairline opacity-60'
                    : 'bg-paper hover:bg-black/[0.03] border-hairline text-ink'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 mb-1.5 font-mono">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                        isCompleted
                          ? 'bg-paper-card text-muted border-hairline'
                          : isLive
                          ? 'bg-lime text-ink border-lime'
                          : 'bg-paper-card text-orange border-hairline'
                      }`}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className={`text-[10px] font-bold uppercase truncate max-w-28 ${isLive ? 'text-paper/80' : 'text-muted'}`} title={q.category}>
                      {q.category}
                    </span>
                    {q.questionType === 'short_answer' && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1 shrink-0 ${
                        isLive ? 'bg-lime/20 text-lime border border-lime/40' : 'bg-orange/15 text-orange border border-orange/30'
                      }`}>
                        <Terminal className="w-2.5 h-2.5" /> JEV
                      </span>
                    )}
                    <span className={`text-[10px] font-medium flex items-center gap-1 shrink-0 ${isLive ? 'text-paper/70' : 'text-muted'}`}>
                      <Clock className="w-2.5 h-2.5" /> {q.timeLimitSeconds}S
                    </span>
                  </div>
                  <p
                    className={`text-xs font-semibold line-clamp-2 leading-snug font-sans ${
                      isLive ? 'text-paper' : isCompleted ? 'text-muted' : 'text-ink'
                    }`}
                  >
                    {q.question}
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0 font-mono">
                  {isLive ? (
                    <div className="flex items-center space-x-1.5">
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border border-lime bg-lime/20 text-lime flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse" />
                        <span>LIVE</span>
                      </span>
                      {onClearActiveQuiz && (
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            playClickSound();
                            onClearActiveQuiz({ isFinished: false });
                          }}
                          className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 flex items-center space-x-1 cursor-pointer transition-colors"
                          title="End this live round and return arena to standby"
                        >
                          <Square className="w-2.5 h-2.5 fill-red-300" />
                          <span>END</span>
                        </motion.button>
                      )}
                    </div>
                  ) : isCompleted ? (
                    <div className="flex items-center space-x-1.5">
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase border border-hairline bg-paper-card text-muted flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3 text-ink" />
                        <span>DONE</span>
                      </span>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          playClickSound();
                          onStartQuiz(q);
                        }}
                        className="p-1.5 rounded-xl text-muted hover:text-ink hover:bg-black/[0.05] border border-hairline transition-colors cursor-pointer"
                        title="Relaunch question"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        playClickSound();
                        onStartQuiz(q);
                      }}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold uppercase transition-all flex items-center space-x-1.5 btn-noma-orange cursor-pointer shadow-xs"
                    >
                      <Play className="w-2.5 h-2.5 fill-white" />
                      <span>LAUNCH</span>
                    </motion.button>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      playClickSound();
                      handleDeleteQuestion(q.id, e);
                    }}
                    className="p-1.5 rounded-xl text-muted hover:text-red-600 hover:bg-red-500/10 border border-transparent transition-colors cursor-pointer"
                    title="Delete question from queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </motion.div>
            );
          })
        )}
        {/* Mobile Bottom Clearance Spacer */}
        <div className="h-16 sm:h-20 md:hidden w-full shrink-0 pointer-events-none" aria-hidden="true" />
      </div>

      {/* Multi-Question Quiz Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-md animate-fadeIn font-sans">
          <div className="bg-paper text-ink w-full max-w-xl p-5 sm:p-8 rounded-3xl border border-hairline shadow-2xl relative font-sans max-h-[90dvh] overflow-y-auto">
            <button
              onClick={() => setShowCustomModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-paper-card text-muted hover:text-ink transition-colors border border-hairline cursor-pointer z-10"
            >
              <X className="w-4 h-4 stroke-2" />
            </button>

            {/* Modal Title */}
            <div className="flex items-start space-x-3.5 mb-6 pr-8">
              <div className="w-11 h-11 rounded-2xl bg-ink text-lime border border-hairline flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5 text-lime" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold uppercase tracking-tight text-ink leading-tight">
                  CREATE QUIZ PACK
                </h3>
                <p className="text-xs font-mono text-muted mt-0.5">
                  Synthesize questions with Mesh AI or construct custom challenge rounds
                </p>
              </div>
            </div>

            {/* Modal Mode Selector: AI Generator vs Manual Editor */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-paper-card border border-hairline rounded-2xl mb-5 font-mono text-xs font-bold">
              <button
                type="button"
                onClick={() => setModalTab('ai')}
                className={`py-2 rounded-xl uppercase transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  modalTab === 'ai'
                    ? 'bg-ink text-paper shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-lime" />
                <span>AI GENERATOR</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('editor')}
                className={`py-2 rounded-xl uppercase transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  modalTab === 'editor'
                    ? 'bg-ink text-paper shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-orange" />
                <span>MANUAL EDITOR ({draftQuestions.length} Q)</span>
              </button>
            </div>

            {/* AI Generator Tab */}
            {modalTab === 'ai' && (
              <form onSubmit={handleGenerateAI} className="space-y-4 font-mono p-5 bg-paper-elevated rounded-2xl border border-hairline mb-4">
                <div className="flex items-center justify-between border-b border-hairline pb-3">
                  <span className="text-xs font-bold uppercase text-orange flex items-center gap-1.5">
                    <Bot className="w-4 h-4" />
                    <span>AI TOOL SUITE</span>
                  </span>
                  {onOpenAISettings && (
                    <button
                      type="button"
                      onClick={onOpenAISettings}
                      className="text-[11px] text-muted hover:text-ink flex items-center gap-1 cursor-pointer transition-colors font-bold uppercase"
                    >
                      <span>Config API</span>
                    </button>
                  )}
                </div>

                {/* Unified Intelligent Input Box */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase block text-ink">
                      Topic, URL, or GitHub Repo:
                    </label>
                    {isLoadingHnStories && (
                      <span className="text-[10px] text-muted flex items-center gap-1 font-mono">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin text-orange" />
                        <span>Updating trends...</span>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={aiInput}
                      onChange={(e) => {
                        setAiInput(e.target.value);
                        setSelectedStoryUrl(null);
                      }}
                      placeholder="e.g. Next.js 15, https://bun.sh/docs, or facebook/react"
                      className="w-full px-3.5 py-2.5 text-xs bg-paper border border-hairline rounded-xl text-ink font-mono font-medium focus:outline-none focus:border-ink pr-24"
                      required
                    />
                    {isGitHubRepoInput(aiInput) ? (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg bg-paper-card border border-hairline text-ink text-[9px] font-bold uppercase flex items-center gap-1">
                        <FolderGit2 className="w-3 h-3 text-orange" />
                        <span>GitHub</span>
                      </span>
                    ) : aiInput.match(/https?:\/\/[^\s]+/) ? (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg bg-lime/25 border border-lime text-ink text-[9px] font-bold uppercase flex items-center gap-1">
                        <Link2 className="w-3 h-3 text-ink" />
                        <span>URL Doc</span>
                      </span>
                    ) : null}
                  </div>

                  {/* Auto-Loaded Popular / Hacker News Topics */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-muted">
                      <span className="font-bold uppercase tracking-wider text-muted">Popular topics:</span>
                      {selectedStoryUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setAiInput('');
                            setSelectedStoryUrl(null);
                          }}
                          className="text-[9px] text-muted hover:text-ink underline cursor-pointer"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {popularTopicsList.map((topicItem) => {
                        const isSelected = aiInput === topicItem.title;
                        return (
                          <button
                            key={topicItem.title}
                            type="button"
                            onClick={() => {
                              setAiInput(topicItem.title);
                              if (topicItem.url) {
                                setSelectedStoryUrl(topicItem.url);
                              } else {
                                setSelectedStoryUrl(null);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] transition-all cursor-pointer truncate max-w-[280px] sm:max-w-[340px] text-left border ${
                              isSelected
                                ? 'bg-ink text-paper font-bold shadow-xs'
                                : 'bg-paper-card border-hairline hover:border-ink text-ink/80 hover:text-ink'
                            }`}
                            title={topicItem.title}
                          >
                            {topicItem.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Format, Difficulty & Count */}
                <div className="space-y-3 pt-3 border-t border-hairline">
                  <div>
                    <label className="text-[11px] font-bold uppercase block mb-1.5 text-muted">Question Format</label>
                    <div className="grid grid-cols-3 gap-1.5 bg-paper-card p-1 rounded-2xl border border-hairline">
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setAiFormat('mixed');
                        }}
                        className={`py-1.5 px-2 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          aiFormat === 'mixed'
                            ? 'bg-ink text-paper shadow-xs'
                            : 'text-muted hover:text-ink'
                        }`}
                        title="Generate a balanced combination of multiple choice and short answer questions"
                      >
                        <span>🔀 Mixed</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setAiFormat('multiple_choice');
                        }}
                        className={`py-1.5 px-2 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          aiFormat === 'multiple_choice'
                            ? 'bg-ink text-paper shadow-xs'
                            : 'text-muted hover:text-ink'
                        }`}
                        title="Generate 4-option multiple-choice questions"
                      >
                        <span>🎯 Choice</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setAiFormat('short_answer');
                        }}
                        className={`py-1.5 px-2 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          aiFormat === 'short_answer'
                            ? 'bg-ink text-paper dark:bg-lime dark:text-ink shadow-xs'
                            : 'text-muted hover:text-ink'
                        }`}
                        title="Generate short answer questions auto-graded by TypeSafe Jev-1.13"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-lime dark:text-ink" />
                        <span>⚡ Short (Jev)</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase block mb-1.5 text-muted">Difficulty</label>
                      <select
                        value={aiDifficulty}
                        onChange={(e) => setAiDifficulty(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-paper border border-hairline rounded-xl text-ink font-mono font-medium focus:outline-none focus:border-ink transition-colors"
                      >
                        <option value="Junior">Junior Engineer</option>
                        <option value="Mid">Mid-Level</option>
                        <option value="Senior">Senior Architect</option>
                        <option value="Principal">Principal / Staff</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase block mb-1.5 text-muted">Question Count</label>
                      <select
                        value={aiCount}
                        onChange={(e) => setAiCount(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-paper border border-hairline rounded-xl text-ink font-mono font-medium focus:outline-none focus:border-ink transition-colors"
                      >
                        <option value={1}>1 Question</option>
                        <option value={2}>2 Questions</option>
                        <option value={3}>3 Questions</option>
                        <option value={4}>4 Questions</option>
                        <option value={5}>5 Questions</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Adaptive Live Mode Toggle */}
                <div className="pt-2 border-t border-hairline">
                  <div
                    onClick={() => {
                      playClickSound();
                      setIsAdaptiveLiveMode((prev) => !prev);
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isAdaptiveLiveMode
                        ? 'bg-lime/25 border-lime shadow-xs text-ink'
                        : 'bg-paper-card border-hairline hover:border-ink text-ink'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                          isAdaptiveLiveMode
                            ? 'bg-ink text-paper dark:bg-lime dark:text-ink border-hairline'
                            : 'bg-paper border-hairline text-muted'
                        }`}
                      >
                        <Flame className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-ink flex items-center gap-1.5">
                          <span>Adaptive Live Mode</span>
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded ${
                              isAdaptiveLiveMode
                                ? 'bg-ink text-paper dark:bg-lime dark:text-ink'
                                : 'bg-paper text-muted border border-hairline'
                            }`}
                          >
                            DYNAMIC
                          </span>
                        </div>
                        <div className="text-[11px] text-muted leading-tight">
                          Generates 1 question at a time. Difficulty auto-balances by audience accuracy.
                        </div>
                      </div>
                    </div>
                    <div
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                        isAdaptiveLiveMode ? 'bg-ink' : 'bg-muted/40'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-paper transition-transform ${
                          isAdaptiveLiveMode ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Status Indicator */}
                {isGeneratingAI && aiToolStatus && (
                  <div className="p-3 bg-lime/20 border border-lime rounded-2xl text-xs font-mono font-bold text-ink flex items-center gap-2 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>{aiToolStatus}</span>
                  </div>
                )}

                {/* Action Button */}
                <button
                  type="submit"
                  disabled={isGeneratingAI}
                  className={`w-full py-3 text-xs font-mono font-bold uppercase rounded-xl flex items-center justify-center space-x-2 cursor-pointer transition-all mt-2 shadow-sm ${
                    isAdaptiveLiveMode
                      ? 'btn-noma-lime'
                      : 'btn-noma-orange'
                  }`}
                >
                  {isAdaptiveLiveMode ? (
                    <Flame className="w-4 h-4 text-ink" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  <span>
                    {isGeneratingAI
                      ? isAdaptiveLiveMode
                        ? `Synthesizing Challenge 1 of ${aiCount}...`
                        : 'Generating Questions with AI...'
                      : isAdaptiveLiveMode
                      ? `✨ Launch Adaptive Journey (Challenge 1 of ${aiCount})`
                      : aiFormat === 'short_answer'
                      ? `⚡ Generate ${aiCount} Short-Answer Questions (Jev)`
                      : isGitHubRepoInput(aiInput)
                      ? `Scan Repo & Generate ${aiCount} Questions`
                      : aiInput.match(/https?:\/\/[^\s]+/) || selectedStoryUrl
                      ? `Scrape & Generate ${aiCount} Questions`
                      : `Search & Generate ${aiCount} Questions`}
                  </span>
                </button>
              </form>
            )}

            {/* Success & Error Banners */}
            {aiSuccessNote && (
              <div className="p-3 mb-3 bg-lime/20 text-ink text-xs font-medium border border-lime rounded-xl flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-ink" />
                <span>{aiSuccessNote}</span>
              </div>
            )}

            {/* Grounding Sources Cited */}
            {groundingSources.length > 0 && (
              <div className="p-3 mb-3 bg-paper border border-hairline rounded-xl text-xs">
                <div className="font-semibold text-ink flex items-center gap-1.5 mb-2">
                  <Globe className="w-3.5 h-3.5 text-orange" />
                  <span>Grounding Sources ({groundingSources.length}):</span>
                </div>
                <div className="space-y-1.5">
                  {groundingSources.map((source, sIdx) => (
                    <div key={source.url || `src-${sIdx}`} className="flex items-center gap-2 truncate">
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-paper-surface border border-hairline text-ink rounded-md shrink-0">
                        {String(sIdx + 1).padStart(2, '0')}
                      </span>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-ink/80 hover:text-ink hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <span className="truncate">{source.title}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0 text-muted" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 mb-3 bg-orange/15 text-orange text-xs font-medium border border-orange/30 rounded-xl flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-orange" />
                <div className="flex-1">
                  <div>{errorMessage}</div>
                  {errorMessage.includes('AI Settings') && onOpenAISettings && (
                    <button
                      type="button"
                      onClick={onOpenAISettings}
                      className="mt-2 px-2.5 py-1 bg-paper text-ink text-[11px] font-semibold rounded-lg border border-hairline hover:border-ink cursor-pointer transition-colors"
                    >
                      Open AI Settings
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Questions Step Navigation Strip */}
            <div className="mb-3">
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="text-xs font-semibold text-ink">
                  Questions ({draftQuestions.length})
                </span>
                <span className="text-[11px] text-muted">
                  Click tab to edit
                </span>
              </div>

              <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                {draftQuestions.map((dq, idx) => {
                  const isActive = activeQuestionIndex === idx;
                  const isFilled =
                    dq.questionType === 'short_answer'
                      ? Boolean(dq.question.trim().length > 0 && dq.expectedAnswer?.trim().length)
                      : Boolean(dq.question.trim().length > 0 && dq.optA.trim().length > 0 && dq.optB.trim().length > 0);

                  return (
                    <div key={dq.id} className="flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveQuestionIndex(idx);
                          setModalTab('editor');
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                          draftQuestions.length > 1 ? 'rounded-l-xl' : 'rounded-xl'
                        } ${
                          isActive && modalTab === 'editor'
                            ? 'bg-ink text-paper shadow-sm'
                            : 'bg-paper text-muted border border-hairline hover:text-ink hover:border-ink/30'
                        }`}
                      >
                        <span>Q{idx + 1}</span>
                        {dq.questionType === 'short_answer' && (
                          <span title="Short Answer (Jev 1.13)">
                            <Sparkles className="w-2.5 h-2.5 text-orange shrink-0" />
                          </span>
                        )}
                        {isFilled && (
                          <span className="w-1.5 h-1.5 rounded-full bg-lime shrink-0 ring-1 ring-ink" title="Question Complete" />
                        )}
                      </button>
                      {draftQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftQuestion(idx)}
                          className="p-1.5 hover:bg-orange/20 hover:text-orange rounded-r-xl border-y border-r border-hairline bg-paper text-muted transition-colors cursor-pointer"
                          title="Delete this question"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Question Editor Form */}
            <form onSubmit={(e) => handleSaveQuiz(e, true)} className="space-y-3.5">
              <div className="p-3.5 sm:p-4 bg-paper-surface border border-hairline rounded-2xl space-y-3 sm:space-y-3.5">
                <div className="flex items-center justify-between gap-1 border-b border-hairline pb-2">
                  <span className="text-xs font-semibold text-ink">
                    Question {activeQuestionIndex + 1} of {draftQuestions.length}
                  </span>
                  <span className="text-[11px] text-muted">
                    Select the correct answer below
                  </span>
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold block mb-1 text-muted">Category</label>
                    <input
                      type="text"
                      value={currentDraft.category}
                      onChange={(e) => updateCurrentDraft('category', e.target.value)}
                      placeholder="e.g. System Design"
                      className="w-full px-3 py-2 text-xs bg-paper border border-hairline rounded-xl text-ink font-medium focus:outline-none focus:border-ink transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold block mb-1 text-muted">Time Limit (Sec)</label>
                    <input
                      type="number"
                      min="20"
                      max="180"
                      value={currentDraft.timeLimitSeconds}
                      onChange={(e) => updateCurrentDraft('timeLimitSeconds', Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-paper border border-hairline rounded-xl text-ink font-medium focus:outline-none focus:border-ink transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold block text-muted">Question Prompt</label>
                    <button
                      type="button"
                      onClick={() => {
                        playPopSound();
                        updateCurrentDraft('question', formatCodeSnippet(currentDraft.question));
                      }}
                      className="text-[11px] font-semibold text-muted hover:text-ink flex items-center gap-1 border border-hairline px-2 py-0.5 rounded-lg bg-paper hover:bg-paper-surface cursor-pointer transition-colors"
                      title="Clean and format code indentation with markdown syntax"
                    >
                      <Code className="w-3 h-3 text-orange" />
                      <span>Format Code</span>
                    </button>
                  </div>
                  <textarea
                    value={currentDraft.question}
                    onChange={(e) => updateCurrentDraft('question', e.target.value)}
                    placeholder={`Type question prompt for Q${activeQuestionIndex + 1}...`}
                    rows={2}
                    className="w-full p-3 text-xs bg-paper border border-hairline rounded-xl text-ink font-medium focus:outline-none focus:border-ink resize-none transition-colors"
                    required
                  />
                </div>

                {/* Question Type Switcher */}
                <div className="flex items-center justify-between border-y border-hairline py-2">
                  <span className="text-[11px] font-semibold text-muted">Response Mode</span>
                  <div className="flex items-center gap-1 bg-paper p-0.5 rounded-lg border border-hairline">
                    <button
                      type="button"
                      onClick={() => updateCurrentDraft('questionType', 'multiple_choice')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        currentDraft.questionType !== 'short_answer'
                          ? 'bg-ink text-paper shadow-sm'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      Multiple Choice
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCurrentDraft('questionType', 'short_answer')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        currentDraft.questionType === 'short_answer'
                          ? 'bg-ink text-paper shadow-sm'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      <Sparkles className="w-2.5 h-2.5 text-lime" />
                      <span>Short Answer (Jev 1.13)</span>
                    </button>
                  </div>
                </div>

                {currentDraft.questionType === 'short_answer' ? (
                  <div className="space-y-3 bg-paper p-3.5 rounded-xl border-2 border-hairline">
                    <div className="flex items-center justify-between text-xs">
                      <label className="text-[11px] font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-orange" />
                        <span>Ground Truth Expected Answer:</span>
                      </label>
                      <span className="text-[10px] font-mono text-muted">Exact match or semantic equivalent</span>
                    </div>
                    <input
                      type="text"
                      value={currentDraft.expectedAnswer || ''}
                      onChange={(e) => updateCurrentDraft('expectedAnswer', e.target.value)}
                      placeholder="e.g. git cherry-pick, O(1), CAP theorem, or etcd"
                      className="w-full px-3 py-2 text-xs bg-paper-surface border border-hairline rounded-xl text-ink font-mono focus:outline-none focus:border-ink transition-colors"
                      required={currentDraft.questionType === 'short_answer'}
                    />

                    <div>
                      <label className="text-[10px] font-semibold text-muted block mb-1">
                        Acceptable Synonyms / Aliases (Comma-separated, optional):
                      </label>
                      <input
                        type="text"
                        value={currentDraft.acceptableAnswers || ''}
                        onChange={(e) => updateCurrentDraft('acceptableAnswers', e.target.value)}
                        placeholder="e.g. cherry pick, git-cherry-pick"
                        className="w-full px-3 py-1.5 text-xs bg-paper-surface border border-hairline rounded-xl text-ink font-mono focus:outline-none focus:border-ink transition-colors"
                      />
                    </div>

                    <div className="text-[10px] text-muted flex items-center gap-1.5 font-mono">
                      <Sparkles className="w-3 h-3 text-orange shrink-0" />
                      <span>Evaluated automatically in ~150ms by TypeSafe Jev 1.13 calibrated semantic scoring ($0.042/1M tokens).</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold block text-muted">4 Options (Select correct answer key):</label>
                    {[
                      { id: 'A' as const, field: 'optA' as const, val: currentDraft.optA },
                      { id: 'B' as const, field: 'optB' as const, val: currentDraft.optB },
                      { id: 'C' as const, field: 'optC' as const, val: currentDraft.optC },
                      { id: 'D' as const, field: 'optD' as const, val: currentDraft.optD },
                    ].map(({ id, field, val }) => (
                      <div key={id} className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => updateCurrentDraft('correctOpt', id)}
                          className={`w-8 h-8 font-mono font-bold text-xs rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                            currentDraft.correctOpt === id
                              ? 'bg-lime text-ink border border-ink shadow-sm ring-2 ring-lime/40'
                              : 'bg-paper text-muted border border-hairline hover:text-ink hover:border-ink'
                          }`}
                          title="Click to designate as correct answer"
                        >
                          {id}
                        </button>
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => updateCurrentDraft(field, e.target.value)}
                          placeholder={`Option ${id}...`}
                          className="flex-1 px-3 py-2 text-xs bg-paper border border-hairline rounded-xl text-ink font-medium focus:outline-none focus:border-ink transition-colors"
                          required={currentDraft.questionType !== 'short_answer' && (id === 'A' || id === 'B')}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-semibold block mb-1 text-muted">Explanation</label>
                  <textarea
                    value={currentDraft.explanation}
                    onChange={(e) => updateCurrentDraft('explanation', e.target.value)}
                    placeholder="Explain why this option is correct..."
                    rows={2}
                    className="w-full p-2.5 text-xs bg-paper border border-hairline rounded-xl text-ink font-medium focus:outline-none focus:border-ink resize-none transition-colors"
                  />
                </div>
              </div>

              {/* Add Next Question Button */}
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAddQuestionToDraft}
                  className="w-full xs:w-auto px-3.5 py-2 bg-paper hover:bg-paper-surface text-ink text-xs font-semibold rounded-xl border border-hairline hover:border-ink flex items-center justify-center space-x-1.5 cursor-pointer transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 text-ink stroke-2" />
                  <span>Add Another Question</span>
                </button>
                <span className="text-[11px] text-muted text-center xs:text-right shrink-0">
                  {validQuestionsCount} / {draftQuestions.length} complete
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-end gap-2.5 pt-3 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="w-full xs:w-auto px-4 py-2 text-xs font-semibold rounded-xl border border-hairline bg-paper hover:bg-paper-surface text-muted hover:text-ink order-3 xs:order-1 cursor-pointer transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSaveQuiz(e, false)}
                  className="w-full xs:w-auto px-4 py-2 bg-paper hover:bg-paper-surface text-ink text-xs font-semibold rounded-xl border border-hairline hover:border-ink flex items-center justify-center space-x-1.5 order-2 cursor-pointer transition-colors"
                  title="Save all questions to Host queue to launch later"
                >
                  <Plus className="w-3.5 h-3.5 text-ink stroke-2" />
                  <span>Queue ({Math.max(1, validQuestionsCount)} Q)</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSaveQuiz(e, true)}
                  className="w-full xs:w-auto px-4 py-2 btn-noma-orange flex items-center justify-center space-x-1.5 order-1 xs:order-3 cursor-pointer shadow-sm text-xs"
                  title="Publish all questions and immediately start Question 1 live"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Launch Now (Q1)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quiz Cartridge Import / Export Modal */}
      {showImportExportModal && (
        <QuizImportExportModal
          isOpen={showImportExportModal}
          onClose={() => setShowImportExportModal(false)}
          questions={hostQuestions}
          onImportQuestions={(imported) => {
            const updated = [...imported, ...hostQuestions];
            persistQuestions(updated);
          }}
          roomCode={roomCode}
        />
      )}
    </div>
  );
};
