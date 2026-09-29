import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, Vote, Sparkles, Bot, Zap, AlertCircle, Link2, RefreshCw, FolderGit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateAIPollSuggestions, generateAIPollsFromUrl, getStoredMeshKey, isGitHubRepoInput, type SuggestedAIPoll } from '../../lib/meshApi';
import { playClickSound, playPopSound, playWhoosh } from '../../lib/soundFx';

export interface SessionPollContext {
  roomTitle?: string;
  quizzes?: string[];
  questions?: Array<{ content: string; upvotes?: number }>;
  surveys?: string[];
}

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll: (question: string, options: string[]) => void;
  onOpenAISettings?: () => void;
  sessionContext?: SessionPollContext;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isOpen,
  onClose,
  onCreatePoll,
  onOpenAISettings,
  sessionContext,
}) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '']);
  const [aiTopic, setAiTopic] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiStatusMsg, setAiStatusMsg] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<SuggestedAIPoll[]>([]);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  // Sync / Reset on close
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setAiError(null);
      setAiStatusMsg(null);
      setIsGeneratingAI(false);
      setAiSuggestions([]);
    }
  }

  // Auto-extract and prioritize session topics (from Q&A, Quizzes, Surveys, and Room Title)
  const sessionTopics = useMemo(() => {
    const rawList: string[] = [];

    // 1. Top Q&A Questions (prioritized by upvotes)
    if (sessionContext?.questions && sessionContext.questions.length > 0) {
      const sortedQ = [...sessionContext.questions].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
      sortedQ.forEach((q) => {
        const clean = q.content.trim().replace(/^[\s"']+|[\s"']+$/g, '');
        if (clean && !rawList.some((existing) => existing.toLowerCase() === clean.toLowerCase())) {
          rawList.push(clean);
        }
      });
    }

    // 2. Active & Queued Quizzes
    if (sessionContext?.quizzes && sessionContext.quizzes.length > 0) {
      sessionContext.quizzes.forEach((quiz) => {
        const clean = quiz.trim().replace(/^[\s"']+|[\s"']+$/g, '');
        if (clean && !rawList.some((existing) => existing.toLowerCase() === clean.toLowerCase())) {
          rawList.push(clean);
        }
      });
    }

    // 3. Surveys
    if (sessionContext?.surveys && sessionContext.surveys.length > 0) {
      sessionContext.surveys.forEach((survey) => {
        const clean = survey.trim().replace(/^[\s"']+|[\s"']+$/g, '');
        if (clean && !rawList.some((existing) => existing.toLowerCase() === clean.toLowerCase())) {
          rawList.push(clean);
        }
      });
    }

    // 4. Room Title & Standard Fallbacks if list has fewer than 4 items
    if (sessionContext?.roomTitle) {
      const cleanTitle = sessionContext.roomTitle.trim();
      if (cleanTitle && !rawList.some((existing) => existing.toLowerCase() === cleanTitle.toLowerCase())) {
        rawList.push(cleanTitle);
      }
    }

    const fallbacks = [
      'Architecture Trade-offs',
      'Production Readiness',
      'Tech Stack Consensus',
      'Scalability vs Simplicity',
    ];

    fallbacks.forEach((fb) => {
      if (rawList.length < 5 && !rawList.some((existing) => existing.toLowerCase() === fb.toLowerCase())) {
        rawList.push(fb);
      }
    });

    return rawList.slice(0, 5);
  }, [sessionContext]);

  const handleAddOption = () => {
    playPopSound();
    if (options.length < 6) {
      setOptions((prev) => [...prev, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    playClickSound();
    if (options.length > 2) {
      setOptions((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, text: string) => {
    setOptions((prev) => {
      const next = [...prev];
      next[index] = text;
      return next;
    });
  };

  const handleFetchAISuggestions = async (overrideTopic?: string) => {
    playClickSound();
    const cleanInput = (overrideTopic !== undefined ? overrideTopic : aiTopic).trim();
    if (!cleanInput) {
      setAiError('Please enter a topic, URL, or GitHub repo for AI poll suggestions.');
      return;
    }

    const hasKey = Boolean(getStoredMeshKey());
    if (!hasKey) {
      setAiError('Mesh API Key missing. Please open AI Settings in the header.');
      return;
    }

    setIsGeneratingAI(true);
    setAiError(null);
    setAiSuggestions([]);

    try {
      if (isGitHubRepoInput(cleanInput)) {
        setAiStatusMsg(`🐙 Scanning GitHub repo & building polls...`);
        const res = await generateAIPollsFromUrl(cleanInput);
        setAiSuggestions(res.polls);
      } else if (cleanInput.match(/^https?:\/\//i)) {
        setAiStatusMsg(`🔗 Scraping content & building polls...`);
        const res = await generateAIPollsFromUrl(cleanInput);
        setAiSuggestions(res.polls);
      } else {
        setAiStatusMsg(`✨ Generating interactive poll suggestions...`);
        const suggestions = await generateAIPollSuggestions(cleanInput);
        setAiSuggestions(suggestions);
      }
    } catch (err: any) {
      setAiError(err?.message || 'Failed to generate poll suggestions via Mesh API.');
    } finally {
      setIsGeneratingAI(false);
      setAiStatusMsg(null);
    }
  };

  const handleApplySuggestion = (s: SuggestedAIPoll) => {
    playPopSound();
    setQuestion(s.question);
    setOptions(s.options && s.options.length >= 2 ? s.options : ['Yes', 'No']);
    setShowAIAssistant(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter((o) => o.trim().length > 0);
    if (!question.trim() || validOptions.length < 2) return;

    playWhoosh();
    onCreatePoll(question.trim(), validOptions);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md font-sans"
        >
          <motion.div
            initial={{ scale: 0.95, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 12, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-paper text-ink w-[95vw] sm:max-w-lg p-5 sm:p-6 border border-hairline rounded-3xl shadow-2xl relative font-sans max-h-[90dvh] overflow-y-auto"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="absolute top-4 right-4 p-2 bg-paper text-muted hover:text-ink rounded-xl border border-hairline hover:border-ink transition-colors cursor-pointer z-10"
              title="Close modal"
            >
              <X className="w-4 h-4 stroke-2" />
            </motion.button>

            <div className="flex items-start space-x-3 mb-5 pr-10">
              <div className="w-10 h-10 bg-orange/10 text-orange border border-orange/20 rounded-2xl flex items-center justify-center shrink-0">
                <Vote className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-ink leading-tight font-display">
                    Create Audience Poll
                  </h3>
                  <span className="px-2 py-0.5 bg-lime text-ink text-[10px] font-mono font-bold rounded-full border border-ink/20">
                    Host
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">
                  Survey attendees on architecture decisions, feedback, or debates
                </p>
              </div>
            </div>

            {/* AI Assistant Toggle Button */}
            <div className="mb-3.5">
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  playClickSound();
                  setShowAIAssistant(!showAIAssistant);
                }}
                className="w-full py-2.5 bg-paper hover:bg-paper-surface text-ink text-xs font-semibold rounded-xl border border-hairline hover:border-ink flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <Bot className="w-4 h-4 text-orange" />
                <span>{showAIAssistant ? 'Hide AI Poll Assistant' : 'AI Poll Prompt Generator'}</span>
              </motion.button>
            </div>

            {/* AI Suggestions Drawer */}
            {showAIAssistant && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3.5 bg-paper-surface border border-hairline rounded-2xl mb-3.5 space-y-3"
              >
                {/* Unified Input and Action Button */}
                <div className="space-y-2.5">
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleFetchAISuggestions();
                          }
                        }}
                        placeholder="e.g. Rate this Architecture, https://bun.sh/docs, or facebook/react"
                        className="w-full px-3 py-2 text-xs bg-paper border border-hairline rounded-xl text-ink font-medium focus:outline-none focus:border-ink pr-20 transition-colors"
                      />
                      {isGitHubRepoInput(aiTopic) ? (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-paper-surface border border-hairline text-ink text-[9px] font-mono font-bold rounded uppercase flex items-center gap-1">
                          <FolderGit2 className="w-2.5 h-2.5" />
                          <span>GitHub</span>
                        </span>
                      ) : aiTopic.match(/https?:\/\/[^\s]+/i) ? (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-lime text-ink text-[9px] font-mono font-bold rounded uppercase flex items-center gap-1">
                          <Link2 className="w-2.5 h-2.5" />
                          <span>URL Doc</span>
                        </span>
                      ) : null}
                    </div>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleFetchAISuggestions()}
                      disabled={isGeneratingAI}
                      className="px-3.5 py-2 btn-noma-orange text-xs font-semibold rounded-xl flex items-center space-x-1 cursor-pointer shrink-0 shadow-sm transition-all"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>
                        {isGeneratingAI
                          ? 'Generating...'
                          : isGitHubRepoInput(aiTopic)
                          ? 'Scan Repo'
                          : aiTopic.match(/https?:\/\/[^\s]+/i)
                          ? 'Scrape & Suggest'
                          : 'Suggest'}
                      </span>
                    </motion.button>
                  </div>

                  {/* Session Topics */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-muted">
                      <span className="font-bold uppercase tracking-wider text-muted font-mono">Session topics:</span>
                      {aiTopic && (
                        <button
                          type="button"
                          onClick={() => setAiTopic('')}
                          className="text-[9px] text-muted hover:text-ink underline cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {sessionTopics.map((topicItem) => {
                        const isSelected = aiTopic === topicItem;
                        return (
                          <button
                            key={topicItem}
                            type="button"
                            onClick={() => {
                              playClickSound();
                              setAiTopic(topicItem);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] transition-all cursor-pointer truncate max-w-[280px] sm:max-w-[340px] text-left border ${
                              isSelected
                                ? 'bg-ink text-paper border-ink font-bold shadow-sm'
                                : 'bg-paper border-hairline hover:border-ink/40 text-muted hover:text-ink'
                            }`}
                            title={topicItem}
                          >
                            {topicItem}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Status Indicator */}
                {isGeneratingAI && aiStatusMsg && (
                  <div className="p-2 bg-lime/20 border border-lime rounded-xl text-xs font-medium text-ink flex items-center gap-2 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 text-ink" />
                    <span>{aiStatusMsg}</span>
                  </div>
                )}

                {aiError && (
                  <div className="p-2.5 bg-orange/15 text-orange text-xs font-medium border border-orange/30 rounded-xl flex items-start space-x-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-orange" />
                    <div className="flex-1">
                      <span>{aiError}</span>
                      {onOpenAISettings && aiError.includes('AI Settings') && (
                        <button
                          type="button"
                          onClick={onOpenAISettings}
                          className="ml-2 underline font-semibold text-ink cursor-pointer"
                        >
                          AI Settings
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {aiSuggestions.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-xs font-semibold text-muted block">
                      Suggestions (click to load):
                    </span>
                    {aiSuggestions.map((s) => (
                      <motion.button
                        key={s.question}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleApplySuggestion(s)}
                        className="w-full p-2.5 text-left bg-paper hover:bg-paper-surface border border-hairline hover:border-ink rounded-xl text-xs space-y-1.5 cursor-pointer block transition-colors"
                      >
                        <div className="font-bold text-ink">{s.question}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {s.options.map((opt) => (
                            <span key={`${s.question}-${opt}`} className="px-2 py-0.5 bg-paper-surface text-[11px] rounded-md border border-hairline text-muted">
                              {opt}
                            </span>
                          ))}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold block mb-1 text-muted">Poll Question</label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. Which API architecture do you deploy in 2026?"
                  className="w-full px-3.5 py-2 text-xs bg-paper border border-hairline rounded-xl text-ink font-medium focus:outline-none focus:border-ink placeholder:text-muted/60 transition-colors"
                  required
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-muted">Options (2 to 6)</label>
                  {options.length < 6 && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleAddOption}
                      className="text-xs font-semibold text-ink bg-paper hover:bg-paper-surface px-2.5 py-1 rounded-xl border border-hairline hover:border-ink flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-orange" />
                      <span>Add Option</span>
                    </motion.button>
                  )}
                </div>

                <div className="space-y-2">
                  {options.map((opt, idx) => ({
                    opt,
                    idx,
                    slotKey: `poll_opt_slot_${idx}`,
                    numberLabel: String(idx + 1).padStart(2, '0'),
                  })).map(({ opt, idx, slotKey, numberLabel }) => (
                    <div key={slotKey} className="flex items-center space-x-2">
                      <span className="w-7 h-7 bg-paper-surface text-ink font-mono font-bold text-xs flex items-center justify-center rounded-xl border border-hairline shrink-0">
                        {numberLabel}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}...`}
                        className="flex-1 px-3 py-2 text-xs bg-paper border border-hairline rounded-xl text-ink font-medium focus:outline-none focus:border-ink transition-colors"
                        required={idx < 2}
                      />
                      {options.length > 2 && (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleRemoveOption(idx)}
                          className="p-2 bg-paper hover:bg-orange/15 text-muted hover:text-orange rounded-xl border border-hairline transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col-reverse xs:flex-row justify-end gap-2.5 pt-3 border-t border-hairline">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    playClickSound();
                    onClose();
                  }}
                  className="w-full xs:w-auto px-4 py-2 text-xs font-semibold rounded-xl border border-hairline bg-paper hover:bg-paper-surface text-muted hover:text-ink cursor-pointer transition-colors text-center"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
                  className="w-full xs:w-auto px-5 py-2 btn-noma-orange text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Launch Poll</span>
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
