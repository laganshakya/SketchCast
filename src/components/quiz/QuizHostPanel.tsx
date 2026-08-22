import React, { useState, useEffect } from 'react';
import { Play, Plus, Sparkles, Clock, X, Terminal, Trash2, CheckCircle, RotateCcw } from 'lucide-react';
import type { QuizQuestion } from '../../types';

interface QuizHostPanelProps {
  onStartQuiz: (question: QuizQuestion) => void;
  activeQuestionId?: string;
  isRevealed?: boolean;
  roomCode?: string;
}

interface DraftQuestion {
  id: string;
  category: string;
  question: string;
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
  optA: '',
  optB: '',
  optC: '',
  optD: '',
  correctOpt: 'A',
  explanation: '',
  timeLimitSeconds: 25,
});

export const QuizHostPanel: React.FC<QuizHostPanelProps> = ({
  onStartQuiz,
  activeQuestionId,
  isRevealed = false,
  roomCode = 'SKT-789',
}) => {
  const queueStorageKey = `sketchcast_host_quiz_queue_${(roomCode || 'SKT-789').toUpperCase().trim()}`;
  const completedStorageKey = `sketchcast_completed_quiz_ids_${(roomCode || 'SKT-789').toUpperCase().trim()}`;

  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [hostQuestions, setHostQuestions] = useState<QuizQuestion[]>(() => {
    try {
      const stored = localStorage.getItem(queueStorageKey) || localStorage.getItem('sketchcast_host_quiz_queue');
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

  // Track completed questions when revealed
  useEffect(() => {
    if (activeQuestionId && isRevealed) {
      setCompletedIds((prev) => {
        if (!prev.includes(activeQuestionId)) {
          const next = [...prev, activeQuestionId];
          try {
            localStorage.setItem(completedStorageKey, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        }
        return prev;
      });
    }
  }, [activeQuestionId, isRevealed, completedStorageKey]);

  // Reload queue and completed IDs when roomCode changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(queueStorageKey) || localStorage.getItem('sketchcast_host_quiz_queue');
      if (stored) {
        setHostQuestions(JSON.parse(stored));
      } else {
        setHostQuestions([]);
      }
      const storedCompleted = localStorage.getItem(completedStorageKey);
      setCompletedIds(storedCompleted ? JSON.parse(storedCompleted) : []);
    } catch {
      setHostQuestions([]);
      setCompletedIds([]);
    }
  }, [queueStorageKey, completedStorageKey]);

  // Multi-question drafting state
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([
    createBlankDraftQuestion(1),
  ]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const persistQuestions = (questions: QuizQuestion[]) => {
    setHostQuestions(questions);
    try {
      localStorage.setItem(queueStorageKey, JSON.stringify(questions));
      localStorage.setItem('sketchcast_host_quiz_queue', JSON.stringify(questions));
    } catch {
      // ignore
    }
  };

  const handleOpenModal = () => {
    setDraftQuestions([createBlankDraftQuestion(1)]);
    setActiveQuestionIndex(0);
    setErrorMessage(null);
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

  const handleSaveQuiz = (e: React.SyntheticEvent, launchImmediately: boolean = false) => {
    e.preventDefault();
    setErrorMessage(null);

    // Filter valid questions with text and at least 2 options
    const validDrafts = draftQuestions.filter(
      (dq) => dq.question.trim() && dq.optA.trim() && dq.optB.trim()
    );

    if (validDrafts.length === 0) {
      setErrorMessage('Please fill in at least 1 complete question with prompt and Options A & B.');
      return;
    }

    const timestamp = Date.now();
    const finalQuestions: QuizQuestion[] = validDrafts.map((dq, idx) => ({
      id: `custom-q-${timestamp}-${idx + 1}`,
      category: dq.category.trim() || 'System Design',
      question: dq.question.trim(),
      options: [
        { id: 'A', text: dq.optA.trim() },
        { id: 'B', text: dq.optB.trim() },
        { id: 'C', text: dq.optC.trim() || 'Option C' },
        { id: 'D', text: dq.optD.trim() || 'Option D' },
      ],
      correctOptionId: dq.correctOpt,
      explanation: dq.explanation.trim() || 'Correct answer verified by host.',
      timeLimitSeconds: dq.timeLimitSeconds || 25,
    }));

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
  };

  const validQuestionsCount = draftQuestions.filter(
    (dq) => dq.question.trim() && dq.optA.trim() && dq.optB.trim()
  ).length;

  return (
    <div className="flex flex-col h-full bg-[#12141D] border-2 border-black brutal-shadow-lg p-4 space-y-3.5 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-black pb-2.5">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-neo-yellow" />
          <h3 className="text-sm font-heavy text-white uppercase tracking-tight">
            HOST QUIZ CONTROLS
          </h3>
        </div>
        <button
          onClick={handleOpenModal}
          className="px-2.5 py-1 bg-neo-yellow hover:bg-[#FFF04D] active:translate-x-px active:translate-y-px active:shadow-none text-black text-xs font-mono font-extrabold uppercase border-2 border-black brutal-shadow-sm transition-all flex items-center space-x-1"
        >
          <Plus className="w-3.5 h-3.5 stroke-3" />
          <span>NEW QUIZ</span>
        </button>
      </div>

      {/* Host Quiz Question Queue */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 pb-24 sm:pb-28 md:pb-4">
        {hostQuestions.length === 0 ? (
          <div className="p-6 bg-[#161924] border-2 border-black brutal-shadow-sm text-center space-y-3">
            <Sparkles className="w-6 h-6 text-neo-yellow mx-auto" />
            <h4 className="text-xs font-heavy uppercase text-white">
              NO QUESTIONS QUEUED
            </h4>
            <p className="text-[11px] font-mono text-slate-400">
              Create single or multi-question quiz sets to stage or launch live.
            </p>
            <button
              onClick={handleOpenModal}
              className="mt-2 px-3 py-1.5 bg-neo-yellow hover:bg-[#FFF04D] active:translate-x-px active:translate-y-px active:shadow-none text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow-sm inline-flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5 stroke-3" />
              <span>CREATE QUIZ</span>
            </button>
          </div>
        ) : (
          hostQuestions.map((q, idx) => {
            const isCurrentlyActive = activeQuestionId === q.id;
            const isLive = isCurrentlyActive && !isRevealed;
            const isCompleted = completedIds.includes(q.id) || (isCurrentlyActive && isRevealed);

            return (
              <div
                key={q.id}
                className={`p-3 border-2 border-black transition-all flex items-center justify-between gap-2.5 ${
                  isLive
                    ? 'bg-[#1C2030] border-neo-yellow brutal-shadow-yellow'
                    : isCompleted
                    ? 'bg-[#11131C] border-slate-700 opacity-90'
                    : 'bg-neo-card hover:bg-[#1A1E2B] brutal-shadow-sm'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5 mb-1 font-mono">
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 border border-black shrink-0 ${
                        isCompleted ? 'bg-slate-700 text-slate-200' : 'bg-neo-yellow text-black'
                      }`}
                    >
                      Q{idx + 1}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-27.5" title={q.category}>
                      {q.category}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold flex items-center gap-0.5 shrink-0">
                      <Clock className="w-2.5 h-2.5" /> {q.timeLimitSeconds}S
                    </span>
                  </div>
                  <p
                    className={`text-xs font-bold line-clamp-2 leading-snug font-display ${
                      isCompleted ? 'text-slate-400' : 'text-slate-100'
                    }`}
                  >
                    {q.question}
                  </p>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 font-mono">
                  {isLive ? (
                    <button
                      onClick={() => onStartQuiz(q)}
                      className="px-3 py-1.5 rounded-none text-xs font-mono font-black uppercase border-2 border-black transition-all flex items-center space-x-1 bg-neo-mint text-black brutal-shadow-sm animate-pulse cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-black" />
                      <span>LIVE</span>
                    </button>
                  ) : isCompleted ? (
                    <div className="flex items-center space-x-1">
                      <span className="px-2 py-1 text-[10px] font-black uppercase border border-neo-mint/40 bg-neo-mint/10 text-neo-mint flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3 text-neo-mint" />
                        <span>DONE</span>
                      </span>
                      <button
                        onClick={() => onStartQuiz(q)}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
                        title="Relaunch question"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onStartQuiz(q)}
                      className="px-3 py-1.5 rounded-none text-xs font-mono font-black uppercase border-2 border-black transition-all flex items-center space-x-1 bg-neo-yellow hover:bg-[#FFF04D] active:translate-x-px active:translate-y-px active:shadow-none text-black brutal-shadow-sm"
                    >
                      <Play className="w-3 h-3 fill-black" />
                      <span>LAUNCH</span>
                    </button>
                  )}

                  <button
                    onClick={(e) => handleDeleteQuestion(q.id, e)}
                    className="p-1.5 text-slate-500 hover:text-neo-pink hover:bg-black/30 transition-colors"
                    title="Delete question from queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Neo-Brutalist Multi-Question Quiz Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-neo-cream text-black w-full max-w-xl p-4 sm:p-6 border-4 border-black brutal-shadow-lg relative font-sans max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCustomModal(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1 sm:p-1.5 bg-black text-white hover:bg-neo-pink transition-colors border-2 border-black cursor-pointer z-10"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-3" />
            </button>

            {/* Modal Title */}
            <div className="flex items-start space-x-2.5 sm:space-x-3 mb-3.5 pr-8 sm:pr-10">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-neo-yellow text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy -rotate-2 shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 fill-black stroke-black" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-heavy uppercase tracking-tight text-black leading-tight">
                  CREATE QUIZ SET
                </h3>
                <p className="text-[11px] sm:text-xs font-mono text-slate-700 mt-0.5">
                  Add multiple questions in this quiz pack to publish or launch sequentially
                </p>
              </div>
            </div>

            {/* Questions Step Navigation Strip */}
            <div className="mb-3 font-mono">
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 mb-1.5">
                <span className="text-[10px] sm:text-[11px] font-black uppercase text-slate-800">
                  QUIZ QUESTIONS ({draftQuestions.length}):
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-600 font-bold">
                  CLICK TAB TO EDIT QUESTION
                </span>
              </div>

              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                {draftQuestions.map((dq, idx) => {
                  const isActive = activeQuestionIndex === idx;
                  const isFilled = dq.question.trim().length > 0 && dq.optA.trim().length > 0 && dq.optB.trim().length > 0;

                  return (
                    <div key={dq.id} className="flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveQuestionIndex(idx)}
                        className={`px-2.5 sm:px-3 py-1 text-xs font-mono font-black uppercase border-2 border-black transition-all flex items-center space-x-1.5 cursor-pointer ${
                          isActive
                            ? 'bg-neo-yellow text-black brutal-shadow-sm -translate-y-0.5'
                            : 'bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>Q{idx + 1}</span>
                        {isFilled && (
                          <span className="w-2 h-2 rounded-full bg-neo-mint border border-black shrink-0" title="Question Complete" />
                        )}
                      </button>
                      {draftQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftQuestion(idx)}
                          className="p-1 hover:bg-neo-pink hover:text-white border-y-2 border-r-2 border-black bg-slate-200 text-slate-600 transition-colors cursor-pointer"
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

            {errorMessage && (
              <div className="p-2 mb-3 bg-neo-pink text-white font-mono text-xs font-bold border-2 border-black">
                {errorMessage}
              </div>
            )}

            {/* Active Question Editor Form */}
            <form onSubmit={(e) => handleSaveQuiz(e, true)} className="space-y-3 font-mono">
              <div className="p-2.5 sm:p-3 bg-white border-2 border-black space-y-2.5 sm:space-y-3">
                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 border-b border-black/20 pb-1.5">
                  <span className="text-[11px] sm:text-xs font-black uppercase text-neo-pink flex items-center gap-1">
                    <span>EDITING QUESTION {activeQuestionIndex + 1} OF {draftQuestions.length}</span>
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold">
                    Select correct answer key below
                  </span>
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] sm:text-[11px] font-black uppercase block mb-1">Category</label>
                    <input
                      type="text"
                      value={currentDraft.category}
                      onChange={(e) => updateCurrentDraft('category', e.target.value)}
                      placeholder="e.g. System Design"
                      className="w-full px-2.5 sm:px-3 py-1.5 text-xs bg-slate-50 border-2 border-black text-black font-bold focus:outline-none focus:bg-neo-yellow/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] sm:text-[11px] font-black uppercase block mb-1">Time Limit (Sec)</label>
                    <input
                      type="number"
                      min="10"
                      max="90"
                      value={currentDraft.timeLimitSeconds}
                      onChange={(e) => updateCurrentDraft('timeLimitSeconds', Number(e.target.value))}
                      className="w-full px-2.5 sm:px-3 py-1.5 text-xs bg-slate-50 border-2 border-black text-black font-bold focus:outline-none focus:bg-neo-yellow/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] sm:text-[11px] font-black uppercase block mb-1">Question Prompt</label>
                  <textarea
                    value={currentDraft.question}
                    onChange={(e) => updateCurrentDraft('question', e.target.value)}
                    placeholder={`Type question prompt for Q${activeQuestionIndex + 1}...`}
                    rows={2}
                    className="w-full p-2 sm:p-2.5 text-xs bg-slate-50 border-2 border-black text-black font-bold focus:outline-none focus:bg-neo-yellow/20 resize-none font-display"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-[11px] font-black uppercase block">4 Options (Select correct answer key):</label>
                  {[
                    { id: 'A' as const, field: 'optA' as const, val: currentDraft.optA },
                    { id: 'B' as const, field: 'optB' as const, val: currentDraft.optB },
                    { id: 'C' as const, field: 'optC' as const, val: currentDraft.optC },
                    { id: 'D' as const, field: 'optD' as const, val: currentDraft.optD },
                  ].map(({ id, field, val }) => (
                    <div key={id} className="flex items-center space-x-1.5 sm:space-x-2">
                      <button
                        type="button"
                        onClick={() => updateCurrentDraft('correctOpt', id)}
                        className={`w-7 h-7 font-mono font-bold text-xs flex items-center justify-center border-2 border-black transition-all shrink-0 cursor-pointer ${
                          currentDraft.correctOpt === id
                            ? 'bg-neo-mint text-black brutal-shadow-sm font-black'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
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
                        className="flex-1 px-2.5 sm:px-3 py-1.5 text-xs bg-slate-50 border-2 border-black text-black font-bold focus:outline-none focus:bg-neo-yellow/20"
                        required={id === 'A' || id === 'B'}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-[10px] sm:text-[11px] font-black uppercase block mb-1">Architecture Explanation</label>
                  <textarea
                    value={currentDraft.explanation}
                    onChange={(e) => updateCurrentDraft('explanation', e.target.value)}
                    placeholder="Explain why this option is correct..."
                    rows={2}
                    className="w-full p-2 text-xs bg-slate-50 border-2 border-black text-black font-bold focus:outline-none focus:bg-neo-yellow/20 resize-none"
                  />
                </div>
              </div>

              {/* Add Next Question Button */}
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAddQuestionToDraft}
                  className="w-full xs:w-auto px-3 py-1.5 bg-neo-mint hover:bg-[#26F7A9] active:translate-x-px active:translate-y-px active:shadow-none text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 stroke-3" />
                  <span>+ ADD ANOTHER QUESTION</span>
                </button>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 text-center xs:text-right shrink-0">
                  {validQuestionsCount} / {draftQuestions.length} complete
                </span>
              </div>

              {/* Action Buttons: Cancel, Publish to Queue, Publish & Launch Now */}
              <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-end gap-2 pt-2.5 border-t-2 border-black/20">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="w-full xs:w-auto px-3.5 py-2 text-xs font-mono font-bold uppercase border-2 border-black bg-slate-200 hover:bg-slate-300 text-black order-3 xs:order-1 cursor-pointer text-center"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSaveQuiz(e, false)}
                  className="w-full xs:w-auto px-4 py-2 bg-neo-cyan hover:bg-[#33F3FF] text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow-sm active:translate-x-px active:translate-y-px active:shadow-none flex items-center justify-center space-x-1.5 order-2 cursor-pointer"
                  title="Save all questions to Host queue to launch later"
                >
                  <Plus className="w-3.5 h-3.5 stroke-3" />
                  <span>PUBLISH ({Math.max(1, validQuestionsCount)} Q)</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSaveQuiz(e, true)}
                  className="w-full xs:w-auto px-4 py-2 bg-neo-yellow hover:bg-[#FFF04D] text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow active:translate-x-px active:translate-y-px active:shadow-none flex items-center justify-center space-x-1.5 order-1 xs:order-3 cursor-pointer"
                  title="Publish all questions and immediately start Question 1 live"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>LAUNCH NOW (Q1)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
