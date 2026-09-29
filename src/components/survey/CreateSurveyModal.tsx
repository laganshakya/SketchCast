import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Star,
  CheckSquare,
  MessageSquare,
  Rocket,
  FileText,
  Zap,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Smartphone,
  CheckCircle2,
  FolderGit2,
  Link2,
} from 'lucide-react';
import type { SurveyQuestion, SurveyQuestionType } from '../../types';
import { PRESET_SURVEY_TEMPLATES } from '../../hooks/useSurveys';
import { generateAISurvey, isGitHubRepoInput } from '../../lib/meshApi';
import { playClickSound, playPopSound, playWhoosh } from '../../lib/soundFx';

export interface SessionSurveyContext {
  roomTitle?: string;
  quizzes?: string[];
  questions?: Array<{ content: string; upvotes?: number }>;
  polls?: string[];
}

interface CreateSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSurvey: (data: {
    title: string;
    description: string;
    questions: SurveyQuestion[];
    launchImmediately?: boolean;
  }) => void;
  sessionContext?: SessionSurveyContext;
}

export const CreateSurveyModal: React.FC<CreateSurveyModalProps> = ({
  isOpen,
  onClose,
  onCreateSurvey,
  sessionContext,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState('Tech Audience Feedback Survey');
  const [description, setDescription] = useState(
    'Your feedback helps shape future presentations, code examples, and workshops.'
  );
  const [questions, setQuestions] = useState<SurveyQuestion[]>(() => [
    {
      id: `q_default_1`,
      type: 'rating',
      title: 'Overall technical value & clarity of the session',
      maxRating: 5,
      required: true,
    },
    {
      id: `q_default_2`,
      type: 'choice',
      title: 'How was the session pacing and code depth?',
      options: ['Too elementary', 'Just right / balanced', 'A bit fast / dense', 'Need deeper code examples'],
      required: true,
    },
    {
      id: `q_default_3`,
      type: 'text',
      title: 'What was your primary takeaway or suggestion for the speaker?',
      required: false,
    },
  ]);

  const [aiTopicPrompt, setAiTopicPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [previewActiveQuestionIndex, setPreviewActiveQuestionIndex] = useState(0);

  // Sync / Reset on close
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setStep(1);
      setAiTopicPrompt('');
      setIsGeneratingAI(false);
    }
  }

  // Auto-extract and prioritize session topics (from Q&A, Quizzes, Polls, and Room Title)
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

    // 3. Polls
    if (sessionContext?.polls && sessionContext.polls.length > 0) {
      sessionContext.polls.forEach((poll) => {
        const clean = poll.trim().replace(/^[\s"']+|[\s"']+$/g, '');
        if (clean && !rawList.some((existing) => existing.toLowerCase() === clean.toLowerCase())) {
          rawList.push(clean);
        }
      });
    }

    // 4. Room Title & Standard Fallbacks
    if (sessionContext?.roomTitle) {
      const cleanTitle = sessionContext.roomTitle.trim();
      if (cleanTitle && !rawList.some((existing) => existing.toLowerCase() === cleanTitle.toLowerCase())) {
        rawList.push(cleanTitle);
      }
    }

    const fallbacks = [
      'Session Pacing & Code Depth',
      'Architecture Trade-offs',
      'Production Readiness',
      'Key Architectural Takeaways',
    ];

    fallbacks.forEach((fb) => {
      if (rawList.length < 5 && !rawList.some((existing) => existing.toLowerCase() === fb.toLowerCase())) {
        rawList.push(fb);
      }
    });

    return rawList.slice(0, 5);
  }, [sessionContext]);

  if (!isOpen) return null;

  // Step 1: Apply preset template and advance to Step 2
  const handleApplyTemplate = (index: number) => {
    playPopSound();
    const template = PRESET_SURVEY_TEMPLATES[index];
    if (!template) return;
    setTitle(template.title);
    setDescription(template.description);
    setQuestions(
      template.questions.map((q, i) => Object.assign({}, q, {
        id: `q_${Date.now()}_${i}`,
      }))
    );
    setStep(2);
  };

  // Step 1: Generate survey with Mesh AI and advance to Step 2
  const handleGenerateWithAI = async (customPrompt?: string) => {
    const promptToUse = customPrompt || aiTopicPrompt.trim();
    if (!promptToUse || isGeneratingAI) return;
    playPopSound();
    setIsGeneratingAI(true);
    try {
      const generated = await generateAISurvey(promptToUse);
      setTitle(generated.title);
      setDescription(generated.description);
      setQuestions(generated.questions);
      setAiTopicPrompt('');
      setStep(2);
    } catch (err) {
      console.warn('[CreateSurveyModal] AI generation error:', err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Start Blank Survey
  const handleStartBlank = () => {
    playPopSound();
    setTitle('Interactive Audience Survey');
    setDescription('Share your feedback, ratings, and live questions with the presenter.');
    setQuestions([
      {
        id: `q_${Date.now()}_1`,
        type: 'rating',
        title: 'How would you rate today’s presentation?',
        maxRating: 5,
        required: true,
      },
    ]);
    setStep(2);
  };

  // Add Question
  const handleAddQuestion = (type: SurveyQuestionType) => {
    playClickSound();
    const newQ: SurveyQuestion = {
      id: `q_${Date.now()}_${questions.length + 1}`,
      type,
      title:
        type === 'rating'
          ? 'How would you rate this aspect of the session?'
          : type === 'choice'
          ? 'Select your preferred option or architecture approach'
          : 'Please share your thoughts or suggestions',
      maxRating: 5,
      options: type === 'choice' ? ['Option A', 'Option B', 'Option C'] : undefined,
      required: true,
    };
    setQuestions([...questions, newQ]);
  };

  // Remove Question
  const handleRemoveQuestion = (id: string) => {
    playClickSound();
    if (questions.length <= 1) return;
    setQuestions(questions.filter((q) => q.id !== id));
  };

  // Move Question
  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === questions.length - 1)
    ) {
      return;
    }
    playClickSound();
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const nextQuestions = [...questions];
    const temp = nextQuestions[index];
    nextQuestions[index] = nextQuestions[targetIdx];
    nextQuestions[targetIdx] = temp;
    setQuestions(nextQuestions);
  };

  // Update Question Title
  const handleUpdateTitle = (id: string, newTitle: string) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, title: newTitle } : q)));
  };

  // Update Option
  const handleUpdateOption = (qId: string, optIdx: number, val: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId && q.options) {
          const nextOptions = [...q.options];
          nextOptions[optIdx] = val;
          return { ...q, options: nextOptions };
        }
        return q;
      })
    );
  };

  // Add Option to Choice question
  const handleAddOption = (qId: string) => {
    playClickSound();
    setQuestions(
      questions.map((q) => {
        if (q.id === qId && q.options) {
          return { ...q, options: [...q.options, `Option ${q.options.length + 1}`] };
        }
        return q;
      })
    );
  };

  // Remove Option
  const handleRemoveOption = (qId: string, optIdx: number) => {
    playClickSound();
    setQuestions(
      questions.map((q) => {
        if (q.id === qId && q.options && q.options.length > 2) {
          return { ...q, options: q.options.filter((_, i) => i !== optIdx) };
        }
        return q;
      })
    );
  };

  // Save / Launch
  const handleSubmit = (launchImmediately: boolean) => {
    const finalTitle = title.trim() || 'TECH AUDIENCE FEEDBACK SURVEY';
    onCreateSurvey({
      title: finalTitle,
      description:
        description.trim() ||
        'Your feedback helps shape future presentations, code examples, and workshops.',
      questions,
      launchImmediately,
    });
    playWhoosh();
    onClose();
  };

  const currentPreviewQ = questions[previewActiveQuestionIndex] || questions[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm font-sans">
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          className="bg-paper text-ink w-[95vw] sm:max-w-5xl rounded-3xl border border-hairline shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-paper-surface/80 border-b border-hairline flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-orange/10 text-orange border border-orange/20 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base sm:text-lg font-serif text-ink tracking-tight">
                    Audience Survey Studio
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-orange/10 text-orange text-[10px] font-mono font-medium border border-orange/20">
                    Step {step} of 2: {step === 1 ? 'Presets' : 'Questions'}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {step === 1
                    ? 'Choose a preset, prompt AI copilot, or build from scratch.'
                    : 'Compose questions and preview how they appear on attendee screens.'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setStep(1);
                  }}
                  className="px-3 py-1.5 rounded-full bg-paper hover:bg-paper-surface text-ink text-xs font-medium border border-hairline cursor-pointer flex items-center space-x-1.5 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Presets</span>
                </button>
              )}

              <button
                onClick={() => {
                  playClickSound();
                  onClose();
                }}
                className="p-2 rounded-full bg-paper text-muted hover:text-ink hover:bg-paper-surface border border-hairline transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto">
            {/* STEP 1: CHOOSE STARTING POINT */}
            {step === 1 ? (
              <div className="p-4 sm:p-8 space-y-6 max-w-4xl mx-auto">
                <div className="text-center space-y-1">
                  <h3 className="text-xl sm:text-2xl font-serif text-ink tracking-tight">
                    Create Audience Survey
                  </h3>
                  <p className="text-xs sm:text-sm text-muted">
                    Select a curated template, generate with AI, or start from a blank canvas.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Card 1: 1-Click Presets */}
                  <div className="p-6 rounded-3xl bg-paper-surface border border-hairline flex flex-col justify-between space-y-4 hover:border-ink/20 transition-all shadow-sm">
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-ink/5 text-ink border border-ink/10 flex items-center justify-center">
                        <Zap className="w-5 h-5 fill-ink/10 text-ink" />
                      </div>
                      <h4 className="font-serif text-base text-ink tracking-tight">
                        Curated Templates
                      </h4>
                      <p className="text-xs text-muted leading-relaxed">
                        Session-ready multi-question templates ready for immediate presentation.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {PRESET_SURVEY_TEMPLATES.map((tpl, i) => (
                        <button
                          key={tpl.title}
                          type="button"
                          onClick={() => handleApplyTemplate(i)}
                          className="w-full p-2.5 rounded-xl bg-paper hover:bg-ink/5 hover:border-ink/20 text-ink text-left border border-hairline text-xs font-medium cursor-pointer transition-colors block truncate"
                        >
                          {tpl.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card 2: AI Prompt Copilot */}
                  <div className="p-6 rounded-3xl bg-paper-surface border-2 border-orange/40 flex flex-col justify-between space-y-4 hover:border-orange transition-all shadow-md relative">
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-orange/10 text-orange border border-orange/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 fill-orange/20 text-orange" />
                      </div>
                      <h4 className="font-serif text-base text-ink tracking-tight">
                        AI Survey Generator
                      </h4>
                      <p className="text-xs text-muted leading-relaxed">
                        Enter any topic or tech stack to automatically generate relevant questions.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="relative">
                        <input
                          type="text"
                          value={aiTopicPrompt}
                          onChange={(e) => setAiTopicPrompt(e.target.value)}
                          placeholder="e.g. Distributed caching, or repo URL"
                          disabled={isGeneratingAI}
                          className="w-full px-3.5 py-2.5 pr-20 rounded-xl bg-paper border border-hairline text-ink text-xs focus:outline-none focus:border-ink select-text placeholder:text-muted/60"
                          onKeyDown={(e) => e.key === 'Enter' && handleGenerateWithAI()}
                        />
                        {isGitHubRepoInput(aiTopicPrompt) ? (
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-orange/10 border border-orange/20 text-orange text-[9px] font-mono font-semibold rounded uppercase flex items-center gap-1">
                            <FolderGit2 className="w-2.5 h-2.5" />
                            <span>GitHub</span>
                          </span>
                        ) : aiTopicPrompt.match(/https?:\/\/[^\s]+/i) ? (
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-lime/20 border border-lime/40 text-ink text-[9px] font-mono font-semibold rounded uppercase flex items-center gap-1">
                            <Link2 className="w-2.5 h-2.5" />
                            <span>URL Doc</span>
                          </span>
                        ) : null}
                      </div>

                      {/* Session Topics */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-muted">
                          <span className="font-mono uppercase tracking-wider">Session topics:</span>
                          {aiTopicPrompt && (
                            <button
                              type="button"
                              onClick={() => setAiTopicPrompt('')}
                              className="text-[9px] text-muted hover:text-ink underline cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {sessionTopics.map((tag) => {
                            const isSelected = aiTopicPrompt === tag;
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                  playClickSound();
                                  setAiTopicPrompt(tag);
                                }}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-all cursor-pointer truncate max-w-[200px] text-left border ${
                                  isSelected
                                    ? 'bg-ink text-paper border-ink font-medium shadow-sm'
                                    : 'bg-paper border-hairline hover:border-ink/30 text-muted hover:text-ink'
                                }`}
                                title={tag}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleGenerateWithAI()}
                        disabled={!aiTopicPrompt.trim() || isGeneratingAI}
                        className="w-full btn-noma-orange py-2.5 text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-all"
                      >
                        {isGeneratingAI ? (
                          <>
                            <Sparkles className="w-3.5 h-3.5 animate-spin" />
                            <span>Synthesizing questions...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 fill-white" />
                            <span>
                              {isGitHubRepoInput(aiTopicPrompt)
                                ? 'Scan Repo & Generate →'
                                : aiTopicPrompt.match(/https?:\/\/[^\s]+/i)
                                ? 'Scrape & Generate →'
                                : 'Generate with AI →'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Card 3: Start from Scratch */}
                  <div className="p-6 rounded-3xl bg-paper-surface border border-hairline flex flex-col justify-between space-y-4 hover:border-ink/20 transition-all shadow-sm">
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-ink/5 text-ink border border-ink/10 flex items-center justify-center">
                        <Plus className="w-5 h-5" />
                      </div>
                      <h4 className="font-serif text-base text-ink tracking-tight">
                        Blank Survey
                      </h4>
                      <p className="text-xs text-muted leading-relaxed">
                        Start with a clean slate and custom-build your ratings, multiple-choice, and text prompts.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartBlank}
                      className="w-full py-2.5 rounded-full bg-paper hover:bg-ink hover:text-paper text-ink text-xs font-medium border border-hairline cursor-pointer flex items-center justify-center space-x-1 transition-all"
                    >
                      <span>Start from Scratch →</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* STEP 2: QUESTIONS & LIVE ATTENDEE PREVIEW */
              <div className="flex flex-col lg:flex-row h-full overflow-hidden">
                {/* Left Area: Question Builder Form */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 border-b lg:border-b-0 lg:border-r border-hairline">
                  {/* Survey Title & Description Inputs */}
                  <div className="space-y-3 bg-paper-surface p-5 rounded-2xl border border-hairline">
                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-1.5">
                        Survey Title
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Survey Title..."
                        className="w-full px-3.5 py-2 rounded-xl bg-paper border border-hairline text-ink text-xs focus:outline-none focus:border-ink select-text"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-1.5">
                        Description / Context
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description for attendees..."
                        className="w-full px-3.5 py-2 rounded-xl bg-paper border border-hairline text-ink text-xs focus:outline-none focus:border-ink select-text"
                      />
                    </div>
                  </div>

                  {/* Add Question Toolbar */}
                  <div className="flex items-center justify-between border-b border-hairline pb-3">
                    <span className="font-serif text-sm text-ink">
                      Questions ({questions.length})
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('rating')}
                        className="px-3 py-1 rounded-full bg-paper hover:bg-paper-surface text-ink border border-hairline text-xs font-medium cursor-pointer flex items-center space-x-1 transition-colors"
                      >
                        <Star className="w-3 h-3 fill-orange/30 text-orange" />
                        <span>+ Rating</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('choice')}
                        className="px-3 py-1 rounded-full bg-paper hover:bg-paper-surface text-ink border border-hairline text-xs font-medium cursor-pointer flex items-center space-x-1 transition-colors"
                      >
                        <CheckSquare className="w-3 h-3 text-orange" />
                        <span>+ Choice</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('text')}
                        className="px-3 py-1 rounded-full bg-paper hover:bg-paper-surface text-ink border border-hairline text-xs font-medium cursor-pointer flex items-center space-x-1 transition-colors"
                      >
                        <MessageSquare className="w-3 h-3 text-orange" />
                        <span>+ Text</span>
                      </button>
                    </div>
                  </div>

                  {/* Question Cards List */}
                  <div className="space-y-3">
                    {questions.map((q, idx) => (
                      <div
                        key={q.id}
                        onClick={() => setPreviewActiveQuestionIndex(idx)}
                        className={`p-4 rounded-2xl border transition-all space-y-3 cursor-pointer ${
                          previewActiveQuestionIndex === idx
                            ? 'bg-paper border-ink ring-2 ring-ink/10 shadow-sm'
                            : 'bg-paper-surface border-hairline hover:border-ink/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="w-5 h-5 rounded-full bg-ink text-paper text-[10px] font-mono font-semibold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-paper border border-hairline text-muted text-[10px] font-mono uppercase">
                              {q.type}
                            </span>
                            {previewActiveQuestionIndex === idx && (
                              <span className="text-[10px] text-orange font-mono uppercase tracking-wider font-semibold">
                                • Previewing
                              </span>
                            )}
                          </div>

                          <div
                            className="flex items-center space-x-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 rounded text-muted hover:text-ink disabled:opacity-20 cursor-pointer"
                              title="Move Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'down')}
                              disabled={idx === questions.length - 1}
                              className="p-1 rounded text-muted hover:text-ink disabled:opacity-20 cursor-pointer"
                              title="Move Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            {questions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveQuestion(q.id)}
                                className="p-1 rounded text-red-500 hover:text-red-700 cursor-pointer"
                                title="Delete question"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <input
                          type="text"
                          value={q.title}
                          onChange={(e) => handleUpdateTitle(q.id, e.target.value)}
                          placeholder="Enter question prompt..."
                          className="w-full px-3 py-2 rounded-xl bg-paper border border-hairline text-ink text-xs focus:outline-none focus:border-ink select-text"
                        />

                        {/* Choice options builder */}
                        {q.type === 'choice' && q.options && (
                          <div className="pl-3 space-y-2 pt-1 border-l-2 border-hairline">
                            {q.options.map((opt, optIdx) => ({
                              opt,
                              optIdx,
                              slotKey: `${q.id}_builder_opt_${optIdx}`,
                              letter: String.fromCharCode(65 + optIdx),
                            })).map(({ opt, optIdx, slotKey, letter }) => (
                              <div key={slotKey} className="flex items-center space-x-2">
                                <span className="w-5 h-5 rounded-md bg-paper border border-hairline text-ink text-xs font-mono font-semibold flex items-center justify-center shrink-0">
                                  {letter}
                                </span>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => handleUpdateOption(q.id, optIdx, e.target.value)}
                                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-paper border border-hairline text-ink text-xs focus:border-ink select-text"
                                />
                                {q.options && q.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOption(q.id, optIdx)}
                                    className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {q.options.length < 6 && (
                              <button
                                type="button"
                                onClick={() => handleAddOption(q.id)}
                                className="text-xs text-orange hover:underline flex items-center space-x-1 mt-1 font-medium cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Option</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Area: Live Attendee Phone Preview */}
                <div className="w-full lg:w-88 bg-paper-surface/60 p-6 flex flex-col items-center justify-center shrink-0 border-t lg:border-t-0 border-hairline">
                  <div className="flex items-center space-x-1.5 font-mono text-[11px] text-muted mb-4 uppercase tracking-wider">
                    <Smartphone className="w-3.5 h-3.5 text-orange" />
                    <span>Attendee Mobile Preview</span>
                  </div>

                  <div className="w-full max-w-xs bg-paper rounded-3xl border border-ink/15 shadow-xl p-5 flex flex-col justify-between min-h-[380px] text-left">
                    <div className="space-y-4">
                      {/* Simulated Phone Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-hairline text-xs text-muted">
                        <span className="font-serif font-semibold text-ink">SketchCast</span>
                        <span className="font-mono text-[10px]">
                          Q {previewActiveQuestionIndex + 1}/{questions.length}
                        </span>
                      </div>

                      {/* Survey Title */}
                      <div className="space-y-0.5">
                        <h4 className="font-serif text-sm text-ink tracking-tight line-clamp-2">
                          {title || 'Tech Survey'}
                        </h4>
                        <p className="text-[11px] text-muted line-clamp-1">
                          {description || 'Audience feedback'}
                        </p>
                      </div>

                      {/* Active Question Preview */}
                      <div className="p-4 rounded-2xl bg-paper-surface border border-hairline space-y-3">
                        <span className="font-medium text-xs text-ink leading-snug block">
                          {currentPreviewQ?.title || 'Question prompt'}
                        </span>

                        {currentPreviewQ?.type === 'rating' && (
                          <div className="flex justify-center space-x-2 py-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                className="p-1 hover:scale-110 transition-transform cursor-pointer"
                              >
                                <Star className="w-5 h-5 fill-orange text-orange" />
                              </button>
                            ))}
                          </div>
                        )}

                        {currentPreviewQ?.type === 'choice' && currentPreviewQ.options && (
                          <div className="space-y-2">
                            {currentPreviewQ.options.map((opt, oIdx) => ({
                              opt,
                              slotKey: `${currentPreviewQ.id}_prev_opt_${oIdx}`,
                              letter: String.fromCharCode(65 + oIdx),
                            })).map(({ opt, slotKey, letter }) => (
                              <div
                                key={slotKey}
                                className="p-2.5 rounded-xl bg-paper border border-hairline text-xs text-ink flex items-center space-x-2"
                              >
                                <span className="w-4 h-4 rounded-full bg-ink/5 text-ink text-[10px] font-mono font-semibold flex items-center justify-center shrink-0">
                                  {letter}
                                </span>
                                <span className="truncate">{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {currentPreviewQ?.type === 'text' && (
                          <div className="p-3 rounded-xl bg-paper border border-hairline text-xs text-muted italic">
                            Attendee submits feedback here...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-hairline flex justify-between items-center text-xs">
                      <span className="text-orange flex items-center space-x-1 font-mono text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Live Sync Active</span>
                      </span>
                      <span className="text-muted font-mono text-[10px]">Realtime</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-paper-surface border-t border-hairline flex flex-col-reverse xs:flex-row items-center justify-between gap-3 shrink-0">
            <div>
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setStep(1);
                  }}
                  className="px-4 py-2 rounded-full bg-paper hover:bg-paper-surface text-ink text-xs font-medium border border-hairline cursor-pointer transition-colors"
                >
                  ← Back to Presets
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2 w-full xs:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onClose();
                }}
                className="px-4 py-2 rounded-full bg-paper hover:bg-paper-surface text-muted hover:text-ink text-xs font-medium border border-hairline cursor-pointer transition-colors"
              >
                Cancel
              </button>
              {step === 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    className="px-4 py-2 rounded-full bg-paper hover:bg-ink hover:text-paper text-ink text-xs font-medium border border-hairline cursor-pointer transition-colors"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    className="btn-noma-orange px-5 py-2 text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer transition-all"
                  >
                    <Rocket className="w-4 h-4" />
                    <span>Launch Now</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
