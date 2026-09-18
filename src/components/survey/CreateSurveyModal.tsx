import React, { useState } from 'react';
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
} from 'lucide-react';
import type { SurveyQuestion, SurveyQuestionType } from '../../types';
import { PRESET_SURVEY_TEMPLATES } from '../../hooks/useSurveys';
import { generateAISurvey } from '../../lib/meshApi';
import { playClickSound, playPopSound, playWhoosh } from '../../lib/soundFx';

interface CreateSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSurvey: (data: {
    title: string;
    description: string;
    questions: SurveyQuestion[];
    launchImmediately?: boolean;
  }) => void;
}

export const CreateSurveyModal: React.FC<CreateSurveyModalProps> = ({
  isOpen,
  onClose,
  onCreateSurvey,
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

  if (!isOpen) return null;

  // Step 1: Apply preset template and advance to Step 2
  const handleApplyTemplate = (index: number) => {
    playPopSound();
    const template = PRESET_SURVEY_TEMPLATES[index];
    if (!template) return;
    setTitle(template.title);
    setDescription(template.description);
    setQuestions(
      template.questions.map((q, i) => ({
        ...q,
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md font-sans">
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="bg-[#101014] text-[#FAFAFA] w-[95vw] sm:max-w-5xl rounded-2xl border border-white/[0.08] shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-[#141418] border-b border-white/[0.08] flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight font-display">
                    Audience Survey Studio
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[11px] font-medium border border-blue-500/20">
                    Step {step} of 2: {step === 1 ? 'Presets' : 'Questions'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
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
                  className="px-3 py-1.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium border border-white/[0.06] cursor-pointer flex items-center space-x-1.5 transition-colors"
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
                className="p-2 rounded-xl bg-zinc-800/40 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/[0.06] transition-colors cursor-pointer"
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
                  <h3 className="text-lg sm:text-xl font-semibold text-white tracking-tight font-display">
                    Create Audience Survey
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400">
                    Select a curated template, generate with AI, or start from a blank canvas.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: 1-Click Presets */}
                  <div className="p-5 rounded-2xl bg-[#141418] border border-white/[0.08] flex flex-col justify-between space-y-4 hover:border-blue-500/30 transition-all">
                    <div className="space-y-2">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                        <Zap className="w-4 h-4 fill-blue-400/30 text-blue-400" />
                      </div>
                      <h4 className="font-semibold text-sm text-white tracking-tight font-display">
                        Curated Templates
                      </h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Session-ready multi-question templates ready for immediate presentation.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {PRESET_SURVEY_TEMPLATES.map((tpl, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleApplyTemplate(i)}
                          className="w-full p-2.5 rounded-xl bg-[#1A1A20] hover:bg-blue-600/10 hover:border-blue-500/30 text-zinc-300 hover:text-white text-left border border-white/[0.06] text-xs font-medium cursor-pointer transition-colors block truncate"
                        >
                          {tpl.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card 2: AI Prompt Copilot */}
                  <div className="p-5 rounded-2xl bg-[#141418] border border-blue-500/30 flex flex-col justify-between space-y-4 hover:border-blue-500/60 transition-all relative">
                    <div className="space-y-2">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 fill-blue-400/30 text-blue-400" />
                      </div>
                      <h4 className="font-semibold text-sm text-white tracking-tight font-display">
                        AI Survey Generator
                      </h4>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        Enter any topic or tech stack to automatically generate relevant questions.
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <input
                        type="text"
                        value={aiTopicPrompt}
                        onChange={(e) => setAiTopicPrompt(e.target.value)}
                        placeholder="e.g. Distributed caching architectures..."
                        disabled={isGeneratingAI}
                        className="w-full px-3 py-2 rounded-xl bg-[#0D0D10] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-blue-500 select-text"
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerateWithAI()}
                      />

                      <div className="flex flex-wrap gap-1.5">
                        {['Kafka vs RabbitMQ', 'React 19 Deep Dive', 'Security Review'].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleGenerateWithAI(tag)}
                            className="px-2 py-0.5 rounded-full bg-zinc-800/60 hover:bg-blue-500/15 hover:text-blue-400 text-[10px] text-zinc-400 border border-white/[0.06] cursor-pointer transition-colors"
                          >
                            +{tag}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleGenerateWithAI()}
                        disabled={!aiTopicPrompt.trim() || isGeneratingAI}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20"
                      >
                        {isGeneratingAI ? (
                          <>
                            <Sparkles className="w-3.5 h-3.5 animate-spin" />
                            <span>Synthesizing questions...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 fill-white" />
                            <span>Generate with AI →</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Card 3: Start from Scratch */}
                  <div className="p-5 rounded-2xl bg-[#141418] border border-white/[0.08] flex flex-col justify-between space-y-4 hover:border-blue-500/30 transition-all">
                    <div className="space-y-2">
                      <div className="w-9 h-9 rounded-xl bg-zinc-800/60 text-zinc-300 border border-white/[0.06] flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </div>
                      <h4 className="font-semibold text-sm text-white tracking-tight font-display">
                        Blank Survey
                      </h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Start with a clean slate and custom-build your ratings, multiple-choice, and text prompts.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartBlank}
                      className="w-full py-2.5 rounded-xl bg-zinc-800/70 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-medium border border-white/[0.08] cursor-pointer flex items-center justify-center space-x-1 transition-colors"
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
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 border-b lg:border-b-0 lg:border-r border-white/[0.08]">
                  {/* Survey Title & Description Inputs */}
                  <div className="space-y-3 bg-[#141418] p-4 rounded-xl border border-white/[0.08]">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                        Survey Title
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Survey Title..."
                        className="w-full px-3 py-2 rounded-lg bg-[#0D0D10] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-blue-500 select-text"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                        Description / Context
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description for attendees..."
                        className="w-full px-3 py-2 rounded-lg bg-[#0D0D10] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-blue-500 select-text"
                      />
                    </div>
                  </div>

                  {/* Add Question Toolbar */}
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <span className="font-semibold text-xs text-white">
                      Questions ({questions.length})
                    </span>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('rating')}
                        className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-medium cursor-pointer flex items-center space-x-1 transition-colors"
                      >
                        <Star className="w-3 h-3 fill-blue-400/30" />
                        <span>+ Rating</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('choice')}
                        className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-medium cursor-pointer flex items-center space-x-1 transition-colors"
                      >
                        <CheckSquare className="w-3 h-3" />
                        <span>+ Choice</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('text')}
                        className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-medium cursor-pointer flex items-center space-x-1 transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" />
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
                        className={`p-4 rounded-xl bg-[#141418] border transition-all space-y-3 cursor-pointer ${
                          previewActiveQuestionIndex === idx
                            ? 'border-blue-500/60 ring-1 ring-blue-500/30'
                            : 'border-white/[0.08] hover:border-white/[0.15]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] uppercase font-medium">
                              {q.type}
                            </span>
                            {previewActiveQuestionIndex === idx && (
                              <span className="text-[11px] text-blue-400 font-medium">
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
                              className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer"
                              title="Move Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'down')}
                              disabled={idx === questions.length - 1}
                              className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer"
                              title="Move Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            {questions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveQuestion(q.id)}
                                className="p-1 rounded text-red-400 hover:text-red-300 cursor-pointer"
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
                          className="w-full px-3 py-2 rounded-lg bg-[#0D0D10] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-blue-500 select-text"
                        />

                        {/* Choice options builder */}
                        {q.type === 'choice' && q.options && (
                          <div className="pl-3 space-y-2 pt-1 border-l border-white/[0.08]">
                            {q.options.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center space-x-2">
                                <span className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-400 text-xs font-semibold flex items-center justify-center shrink-0">
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => handleUpdateOption(q.id, optIdx, e.target.value)}
                                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#0D0D10] border border-white/[0.08] text-white text-xs focus:border-blue-500 select-text"
                                />
                                {q.options && q.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOption(q.id, optIdx)}
                                    className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
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
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1 mt-1 font-medium cursor-pointer"
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
                <div className="w-full lg:w-88 bg-[#0B0B0E] p-5 flex flex-col items-center justify-center shrink-0 border-t lg:border-t-0 border-white/[0.08]">
                  <div className="flex items-center space-x-1.5 font-medium text-xs text-zinc-400 mb-3">
                    <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                    <span>Attendee Mobile Preview</span>
                  </div>

                  <div className="w-full max-w-xs bg-[#141418] rounded-2xl border border-white/[0.08] shadow-2xl p-4 flex flex-col justify-between min-h-[380px] text-left">
                    <div className="space-y-3">
                      {/* Simulated Phone Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] text-xs text-zinc-400">
                        <span className="font-semibold text-blue-400">SketchCast</span>
                        <span>
                          Q {previewActiveQuestionIndex + 1}/{questions.length}
                        </span>
                      </div>

                      {/* Survey Title */}
                      <div className="space-y-0.5">
                        <h4 className="font-semibold text-xs text-white tracking-tight line-clamp-2 font-display">
                          {title || 'Tech Survey'}
                        </h4>
                        <p className="text-[11px] text-zinc-400 line-clamp-1">
                          {description || 'Audience feedback'}
                        </p>
                      </div>

                      {/* Active Question Preview */}
                      <div className="p-3.5 rounded-xl bg-[#0D0D10] border border-white/[0.06] space-y-3">
                        <span className="font-medium text-xs text-white leading-snug block">
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
                                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                              </button>
                            ))}
                          </div>
                        )}

                        {currentPreviewQ?.type === 'choice' && currentPreviewQ.options && (
                          <div className="space-y-1.5">
                            {currentPreviewQ.options.map((opt, oIdx) => (
                              <div
                                key={oIdx}
                                className="p-2 rounded-lg bg-[#18181D] border border-white/[0.06] text-xs text-zinc-200 flex items-center space-x-2"
                              >
                                <span className="w-4 h-4 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-semibold flex items-center justify-center shrink-0">
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span className="truncate">{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {currentPreviewQ?.type === 'text' && (
                          <div className="p-2.5 rounded-lg bg-[#18181D] border border-white/[0.06] text-xs text-zinc-500 italic">
                            Attendee submits feedback here...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/[0.08] flex justify-between items-center text-xs">
                      <span className="text-blue-400 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Live Sync Active</span>
                      </span>
                      <span className="text-zinc-500">Realtime</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-[#141418] border-t border-white/[0.08] flex flex-col-reverse xs:flex-row items-center justify-between gap-3 shrink-0">
            <div>
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setStep(1);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium border border-white/[0.06] cursor-pointer transition-colors"
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
                className="px-4 py-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium border border-white/[0.06] cursor-pointer transition-colors"
              >
                Cancel
              </button>
              {step === 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium border border-white/[0.08] cursor-pointer transition-colors"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center justify-center space-x-1.5 cursor-pointer transition-all shadow-lg shadow-blue-500/20"
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
