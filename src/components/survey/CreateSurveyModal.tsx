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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md font-sans">
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.94, opacity: 0 }}
          className="bg-[#12151F] text-white w-full max-w-5xl border-4 border-black brutal-shadow-lg flex flex-col max-h-[92vh] overflow-hidden font-mono"
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-neo-yellow border-b-4 border-black flex items-center justify-between shrink-0 text-black">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 bg-black text-neo-yellow border-2 border-black flex items-center justify-center brutal-shadow-xs font-heavy shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm sm:text-base font-heavy uppercase tracking-tight text-black leading-tight">
                    AUDIENCE SURVEY STUDIO
                  </h2>
                  <span className="px-2 py-0.5 bg-black text-neo-mint text-[10px] font-black uppercase">
                    STEP {step} OF 2: {step === 1 ? 'START METHOD' : 'QUESTIONS & PREVIEW'}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-900 font-bold">
                  {step === 1
                    ? 'Choose how to start: 1-click templates, AI copilot, or clean blank scratch.'
                    : 'Configure survey questions and inspect live attendee phone preview.'}
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
                  className="px-2.5 py-1 bg-black text-white hover:bg-neo-cyan hover:text-black text-xs font-heavy uppercase border-2 border-black cursor-pointer flex items-center space-x-1 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>TEMPLATES</span>
                </button>
              )}

              <button
                onClick={() => {
                  playClickSound();
                  onClose();
                }}
                className="p-1.5 bg-black text-white hover:bg-neo-pink hover:text-black transition-colors border-2 border-black cursor-pointer"
                title="Close modal"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto">
            {/* STEP 1: CHOOSE STARTING POINT */}
            {step === 1 ? (
              <div className="p-4 sm:p-8 space-y-6 max-w-4xl mx-auto font-mono">
                <div className="text-center space-y-1">
                  <h3 className="text-lg sm:text-2xl font-heavy uppercase tracking-tight text-white">
                    HOW WOULD YOU LIKE TO CREATE YOUR SURVEY?
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pick a curated preset, prompt Mesh AI, or start with a clean blank canvas.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: 1-Click Presets */}
                  <div className="p-4 bg-[#181C28] border-3 border-black brutal-shadow-sm flex flex-col justify-between space-y-4 hover:border-neo-yellow transition-all">
                    <div className="space-y-2">
                      <div className="w-8 h-8 bg-neo-yellow text-black border-2 border-black flex items-center justify-center font-heavy">
                        <Zap className="w-4 h-4 fill-black" />
                      </div>
                      <h4 className="font-heavy text-sm uppercase text-white tracking-tight">
                        ⚡ 1-CLICK PRESETS
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Industry-tested multi-question survey templates ready for instant launch.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {PRESET_SURVEY_TEMPLATES.map((tpl, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleApplyTemplate(i)}
                          className="w-full p-2 bg-[#202535] hover:bg-neo-yellow hover:text-black text-left border border-slate-700 text-xs font-bold uppercase cursor-pointer transition-colors block truncate"
                        >
                          {tpl.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card 2: AI Prompt Copilot */}
                  <div className="p-4 bg-[#1A1828] border-3 border-black brutal-shadow-pink flex flex-col justify-between space-y-4 hover:border-neo-pink transition-all">
                    <div className="space-y-2">
                      <div className="w-8 h-8 bg-neo-pink text-white border-2 border-black flex items-center justify-center font-heavy">
                        <Sparkles className="w-4 h-4 fill-white" />
                      </div>
                      <h4 className="font-heavy text-sm uppercase text-white tracking-tight">
                        ✨ MESH AI COPILOT
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Describe your topic or technical session to automatically draft tailored questions.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="text"
                        value={aiTopicPrompt}
                        onChange={(e) => setAiTopicPrompt(e.target.value)}
                        placeholder="e.g. Distributed caching..."
                        disabled={isGeneratingAI}
                        className="w-full p-2 bg-[#0E1017] border border-black text-white text-xs font-bold focus:outline-none focus:border-neo-pink select-text"
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerateWithAI()}
                      />

                      <div className="flex flex-wrap gap-1">
                        {['Kafka vs RabbitMQ', 'React 19 Deep Dive', 'Security Review'].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleGenerateWithAI(tag)}
                            className="px-1.5 py-0.5 bg-[#0E1017] hover:bg-neo-pink hover:text-white text-[9px] text-slate-400 font-bold border border-slate-700 cursor-pointer"
                          >
                            +{tag}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleGenerateWithAI()}
                        disabled={!aiTopicPrompt.trim() || isGeneratingAI}
                        className="w-full py-2 bg-neo-pink hover:bg-[#FF4782] text-white text-xs font-heavy uppercase border-2 border-black brutal-shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isGeneratingAI ? (
                          <>
                            <Sparkles className="w-3.5 h-3.5 animate-spin" />
                            <span>DRAFTING QUESTIONS...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 fill-white" />
                            <span>GENERATE WITH AI →</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Card 3: Start from Scratch */}
                  <div className="p-4 bg-[#181C28] border-3 border-black brutal-shadow-sm flex flex-col justify-between space-y-4 hover:border-neo-cyan transition-all">
                    <div className="space-y-2">
                      <div className="w-8 h-8 bg-neo-cyan text-black border-2 border-black flex items-center justify-center font-heavy">
                        <Plus className="w-4 h-4 stroke-[3]" />
                      </div>
                      <h4 className="font-heavy text-sm uppercase text-white tracking-tight">
                        ✍️ BLANK SCRATCH
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Start with a clean blank slate and create your custom ratings, choice, and text questions.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartBlank}
                      className="w-full py-2 bg-neo-cyan hover:bg-[#33F3FF] text-black text-xs font-heavy uppercase border-2 border-black brutal-shadow-xs cursor-pointer flex items-center justify-center space-x-1 transition-colors"
                    >
                      <span>START FROM SCRATCH →</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* STEP 2: QUESTIONS & LIVE ATTENDEE PREVIEW */
              <div className="flex flex-col lg:flex-row h-full overflow-hidden font-mono">
                {/* Left Area: Question Builder Form */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 border-b-4 lg:border-b-0 lg:border-r-4 border-black">
                  {/* Survey Title & Description Inputs */}
                  <div className="space-y-2.5 bg-[#181C28] p-3.5 border-2 border-black">
                    <div>
                      <label className="block text-[11px] font-heavy uppercase text-neo-yellow mb-1">
                        SURVEY TITLE
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Survey Title..."
                        className="w-full p-2 bg-[#0E1017] border border-black text-white text-xs font-bold focus:outline-none focus:border-neo-yellow select-text"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-heavy uppercase text-slate-400 mb-1">
                        DESCRIPTION / CONTEXT
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description for attendees..."
                        className="w-full p-2 bg-[#0E1017] border border-black text-white text-xs font-bold focus:outline-none focus:border-neo-yellow select-text"
                      />
                    </div>
                  </div>

                  {/* Add Question Toolbar */}
                  <div className="flex items-center justify-between border-b-2 border-slate-700 pb-2">
                    <span className="font-heavy text-xs uppercase text-neo-cyan">
                      QUESTIONS ({questions.length})
                    </span>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('rating')}
                        className="px-2 py-1 bg-neo-mint hover:bg-neo-cyan text-black text-[10px] font-heavy uppercase border border-black cursor-pointer flex items-center space-x-1"
                      >
                        <Star className="w-3 h-3 fill-black" />
                        <span>+ RATING</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('choice')}
                        className="px-2 py-1 bg-neo-yellow hover:bg-white text-black text-[10px] font-heavy uppercase border border-black cursor-pointer flex items-center space-x-1"
                      >
                        <CheckSquare className="w-3 h-3" />
                        <span>+ CHOICE</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('text')}
                        className="px-2 py-1 bg-neo-cyan hover:bg-neo-pink hover:text-white text-black text-[10px] font-heavy uppercase border border-black cursor-pointer flex items-center space-x-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>+ TEXT</span>
                      </button>
                    </div>
                  </div>

                  {/* Question Cards List */}
                  <div className="space-y-3">
                    {questions.map((q, idx) => (
                      <div
                        key={q.id}
                        onClick={() => setPreviewActiveQuestionIndex(idx)}
                        className={`p-3 bg-[#181C28] border-2 cursor-pointer transition-all space-y-2 ${
                          previewActiveQuestionIndex === idx
                            ? 'border-neo-yellow brutal-shadow-xs'
                            : 'border-black hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="w-5 h-5 bg-black text-neo-yellow border border-black text-[10px] font-heavy flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="px-1.5 py-0.2 bg-black text-neo-mint text-[9px] font-heavy uppercase border border-slate-700">
                              {q.type}
                            </span>
                            {previewActiveQuestionIndex === idx && (
                              <span className="text-[9px] text-neo-yellow font-bold uppercase">
                                • In Phone Preview
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
                              className="p-1 hover:text-neo-yellow disabled:opacity-20 cursor-pointer"
                              title="Move Up"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'down')}
                              disabled={idx === questions.length - 1}
                              className="p-1 hover:text-neo-yellow disabled:opacity-20 cursor-pointer"
                              title="Move Down"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            {questions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveQuestion(q.id)}
                                className="p-1 text-red-400 hover:text-red-200 cursor-pointer"
                                title="Delete question"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <input
                          type="text"
                          value={q.title}
                          onChange={(e) => handleUpdateTitle(q.id, e.target.value)}
                          placeholder="Enter question prompt..."
                          className="w-full p-1.5 bg-[#0E1017] border border-black text-white text-xs font-bold focus:outline-none focus:border-neo-yellow select-text"
                        />

                        {/* Choice options builder */}
                        {q.type === 'choice' && q.options && (
                          <div className="pl-2 space-y-1 pt-1 border-l-2 border-slate-700">
                            {q.options.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center space-x-1.5">
                                <span className="w-4 h-4 bg-black text-neo-yellow border border-black text-[9px] font-heavy flex items-center justify-center shrink-0">
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => handleUpdateOption(q.id, optIdx, e.target.value)}
                                  className="flex-1 p-1 bg-[#0E1017] border border-black text-white text-xs font-medium focus:border-neo-mint select-text"
                                />
                                {q.options && q.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOption(q.id, optIdx)}
                                    className="text-red-400 hover:text-red-200 p-0.5 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {q.options.length < 6 && (
                              <button
                                type="button"
                                onClick={() => handleAddOption(q.id)}
                                className="text-[10px] font-heavy uppercase text-neo-mint hover:underline flex items-center space-x-1 mt-1 cursor-pointer"
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
                <div className="w-full lg:w-88 bg-[#0A0C14] p-4 flex flex-col items-center justify-center shrink-0">
                  <div className="flex items-center space-x-1.5 font-heavy text-xs text-slate-400 uppercase mb-2">
                    <Smartphone className="w-3.5 h-3.5 text-neo-mint" />
                    <span>LIVE ATTENDEE MOBILE PREVIEW</span>
                  </div>

                  <div className="w-full max-w-xs bg-[#151822] border-4 border-black brutal-shadow-lg p-3.5 flex flex-col justify-between min-h-[380px] text-left">
                    <div className="space-y-3">
                      {/* Simulated Phone Header */}
                      <div className="flex items-center justify-between pb-2 border-b-2 border-slate-700 text-[10px] text-slate-400">
                        <span className="font-bold text-neo-yellow uppercase">SKETCHCAST LIVE</span>
                        <span className="font-mono">
                          Q {previewActiveQuestionIndex + 1}/{questions.length}
                        </span>
                      </div>

                      {/* Survey Title */}
                      <div className="space-y-0.5">
                        <h4 className="font-heavy text-xs uppercase text-white tracking-tight line-clamp-2">
                          {title || 'Tech Survey'}
                        </h4>
                        <p className="text-[10px] text-slate-400 line-clamp-1">
                          {description || 'Audience feedback'}
                        </p>
                      </div>

                      {/* Active Question Preview */}
                      <div className="p-3 bg-[#1B2030] border-2 border-black brutal-shadow-xs space-y-2.5">
                        <span className="font-bold text-xs text-white leading-snug block">
                          {currentPreviewQ?.title || 'Question prompt'}
                        </span>

                        {currentPreviewQ?.type === 'rating' && (
                          <div className="flex justify-center space-x-1.5 py-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                className="p-1 hover:scale-110 transition-transform cursor-pointer"
                              >
                                <Star className="w-5 h-5 fill-neo-yellow text-black" />
                              </button>
                            ))}
                          </div>
                        )}

                        {currentPreviewQ?.type === 'choice' && currentPreviewQ.options && (
                          <div className="space-y-1.5">
                            {currentPreviewQ.options.map((opt, oIdx) => (
                              <div
                                key={oIdx}
                                className="p-1.5 bg-[#0E1017] border border-slate-700 text-xs text-slate-200 flex items-center space-x-2 font-medium"
                              >
                                <span className="w-4 h-4 bg-black text-neo-yellow border border-black text-[9px] font-heavy flex items-center justify-center shrink-0">
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span className="truncate">{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {currentPreviewQ?.type === 'text' && (
                          <div className="p-2 bg-[#0E1017] border border-slate-700 text-[10px] text-slate-400 italic">
                            Attendee types encrypted feedback here...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-[10px]">
                      <span className="text-neo-mint font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Interactive live card</span>
                      </span>
                      <span className="text-slate-500">Real-time sync</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-3 sm:p-4 bg-[#0E1017] border-t-4 border-black flex flex-col-reverse xs:flex-row items-center justify-between gap-2.5 shrink-0">
            <div>
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setStep(1);
                  }}
                  className="px-3 py-1.5 bg-[#181C28] hover:bg-slate-700 text-slate-300 text-xs font-heavy uppercase border border-slate-700 cursor-pointer"
                >
                  ← BACK TO TEMPLATES
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
                className="px-4 py-2 bg-[#1B2030] hover:bg-slate-700 text-slate-200 text-xs font-heavy uppercase border-2 border-black cursor-pointer transition-colors"
              >
                CANCEL
              </button>
              {step === 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    className="px-4 py-2 bg-neo-cyan hover:bg-[#33F3FF] text-black text-xs font-heavy uppercase border-2 border-black brutal-shadow-xs cursor-pointer transition-colors"
                  >
                    SAVE DRAFT
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    className="px-5 py-2 bg-neo-yellow hover:bg-neo-mint text-black text-xs font-heavy uppercase border-3 border-black brutal-shadow flex items-center justify-center space-x-1.5 cursor-pointer transition-all"
                  >
                    <Rocket className="w-4 h-4 text-black stroke-[3]" />
                    <span>LAUNCH NOW</span>
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
