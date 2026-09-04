import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Plus, Trash2, Sparkles, Star, CheckSquare, MessageSquare, Rocket, FileText } from 'lucide-react';
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<SurveyQuestion[]>(() => [
    {
      id: `q_default_1`,
      type: 'rating',
      title: 'Overall session technical value & clarity',
      maxRating: 5,
      required: true,
    },
    {
      id: `q_default_2`,
      type: 'choice',
      title: 'How was the session pace and difficulty?',
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

  if (!isOpen) return null;

  // Load a preset template
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
  };

  // Generate survey with Mesh AI
  const handleGenerateWithAI = async () => {
    if (!aiTopicPrompt.trim() || isGeneratingAI) return;
    playPopSound();
    setIsGeneratingAI(true);
    try {
      const generated = await generateAISurvey(aiTopicPrompt.trim());
      setTitle(generated.title);
      setDescription(generated.description);
      setQuestions(generated.questions);
      setAiTopicPrompt('');
    } catch (err) {
      console.warn('[CreateSurveyModal] AI generation error:', err);
    } finally {
      setIsGeneratingAI(false);
    }
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
      description: description.trim() || 'Your feedback helps shape future presentations and workshops.',
      questions,
      launchImmediately,
    });
    playWhoosh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm font-sans">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 15 }}
        className="bg-neo-cream text-black w-full max-w-2xl border-4 border-black brutal-shadow-lg relative flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-neo-yellow border-b-4 border-black flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 bg-black text-white border-2 border-black flex items-center justify-center brutal-shadow-sm font-heavy shrink-0">
              <FileText className="w-5 h-5 text-neo-yellow" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-heavy uppercase tracking-tight text-black leading-tight">
                CREATE AUDIENCE SURVEY
              </h2>
              <p className="text-[11px] font-mono text-slate-800">
                Multi-question feedback, ratings, and AI sentiment analysis.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-1.5 bg-black text-white hover:bg-neo-pink transition-colors border-2 border-black cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4 stroke-3" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 font-mono">
          {/* Quick Preset Templates */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 mb-1.5">
              ⚡ 1-Click Preset Templates:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PRESET_SURVEY_TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyTemplate(i)}
                  className="p-2 bg-white hover:bg-[#FFF04D] border-2 border-black text-left cursor-pointer transition-all hover:-translate-y-0.5 brutal-shadow-sm flex flex-col justify-between"
                >
                  <span className="font-heavy text-[11px] uppercase tracking-tight text-black line-clamp-1">
                    {tpl.title}
                  </span>
                  <span className="text-[9px] text-slate-600 font-sans mt-0.5 line-clamp-1">
                    {tpl.questions.length} Questions (Rating, Choice, Text)
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Generator Box */}
          <div className="bg-[#EAE4D2] p-3 border-2 border-black">
            <div className="flex items-center space-x-1.5 mb-1.5">
              <Sparkles className="w-4 h-4 text-neo-pink fill-neo-pink" />
              <span className="text-xs font-heavy uppercase tracking-tight text-black">
                DRAFT SURVEY QUESTIONS WITH MESH AI:
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiTopicPrompt}
                onChange={(e) => setAiTopicPrompt(e.target.value)}
                placeholder="e.g. 4-question feedback on Kafka stream processing vs RabbitMQ..."
                disabled={isGeneratingAI}
                className="flex-1 p-2 bg-white border-2 border-black text-black placeholder:text-slate-500 text-xs font-bold focus:outline-none focus:bg-neo-yellow/15 select-text"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateWithAI()}
              />
              <button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={!aiTopicPrompt.trim() || isGeneratingAI}
                className="px-3 py-2 bg-neo-pink hover:bg-[#FF4782] text-white text-xs font-heavy uppercase border-2 border-black brutal-shadow-sm flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingAI ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>DRAFTING...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>GENERATE</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Survey Metadata */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-black uppercase text-black mb-1">Survey Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. SYSTEM DESIGN WORKSHOP FEEDBACK"
                className="w-full p-2.5 bg-white border-2 border-black text-black placeholder:text-slate-500 text-xs font-bold focus:outline-none focus:bg-neo-yellow/15 select-text"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-black mb-1">Description / Context</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Help us evaluate today's session quality, code depth, and pacing..."
                rows={2}
                className="w-full p-2.5 bg-white border-2 border-black text-black placeholder:text-slate-500 text-xs font-bold focus:outline-none focus:bg-neo-yellow/15 resize-none select-text"
              />
            </div>
          </div>

          {/* Questions Builder */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b-2 border-black pb-1.5 flex-wrap gap-2">
              <span className="font-heavy text-xs uppercase tracking-tight text-black">
                SURVEY QUESTIONS ({questions.length})
              </span>
              <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                <span className="text-[10px] font-bold text-slate-700">Add:</span>
                <button
                  type="button"
                  onClick={() => handleAddQuestion('rating')}
                  className="px-2 py-1 bg-neo-mint hover:bg-[#33F3FF] text-black text-[10px] font-black uppercase border border-black cursor-pointer flex items-center space-x-0.5"
                >
                  <Star className="w-3 h-3 fill-black" />
                  <span>Rating</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion('choice')}
                  className="px-2 py-1 bg-neo-yellow hover:bg-[#FFF04D] text-black text-[10px] font-black uppercase border border-black cursor-pointer flex items-center space-x-0.5"
                >
                  <CheckSquare className="w-3 h-3" />
                  <span>Choice</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion('text')}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-black text-[10px] font-black uppercase border border-black cursor-pointer flex items-center space-x-0.5"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Text</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={q.id} className="p-3 bg-white border-2 border-black brutal-shadow-sm space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-5 h-5 bg-black text-white text-[10px] font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="px-1.5 py-0.2 bg-slate-200 text-black text-[9px] font-black uppercase border border-black">
                        {q.type.toUpperCase()}
                      </span>
                    </div>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="p-1 hover:bg-red-100 text-red-700 border border-transparent hover:border-black cursor-pointer"
                        title="Remove question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={q.title}
                    onChange={(e) => handleUpdateTitle(q.id, e.target.value)}
                    placeholder="Question prompt..."
                    className="w-full p-2 bg-[#F8F6F0] border-2 border-black text-black placeholder:text-slate-500 text-xs font-bold focus:outline-none focus:bg-white select-text"
                  />

                  {/* Multiple Choice Options Builder */}
                  {q.type === 'choice' && q.options && (
                    <div className="pl-3 space-y-1.5 pt-1 border-l-2 border-black/20">
                      <span className="text-[10px] font-bold text-slate-700 uppercase">Answer Options:</span>
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-black text-slate-500 w-4">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleUpdateOption(q.id, optIdx, e.target.value)}
                            className="flex-1 p-1 bg-[#F8F6F0] border border-black text-black placeholder:text-slate-500 text-xs font-medium focus:bg-white select-text"
                          />
                          {q.options && q.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(q.id, optIdx)}
                              className="text-red-600 hover:text-red-800 p-0.5 cursor-pointer"
                              title="Delete option"
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
                          className="text-[10px] font-black uppercase text-black hover:underline flex items-center space-x-1 mt-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Option</span>
                        </button>
                      )}
                    </div>
                  )}

                  {q.type === 'rating' && (
                    <div className="flex items-center space-x-1 text-[11px] text-slate-600 pl-2">
                      <Star className="w-3.5 h-3.5 fill-neo-yellow text-black" />
                      <span>Attendee selects from 1 to 5 Stars</span>
                    </div>
                  )}

                  {q.type === 'text' && (
                    <div className="flex items-center space-x-1 text-[11px] text-slate-600 pl-2">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-700" />
                      <span>Attendee writes free-form open feedback</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 bg-slate-100 border-t-4 border-black flex flex-col-reverse xs:flex-row items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-full xs:w-auto px-4 py-2 bg-white hover:bg-slate-200 text-black text-xs font-mono font-bold uppercase border-2 border-black cursor-pointer"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            className="w-full xs:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 text-black text-xs font-mono font-black uppercase border-2 border-black cursor-pointer"
          >
            SAVE AS DRAFT
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            className="w-full xs:w-auto px-5 py-2 bg-neo-yellow hover:bg-[#FFF04D] text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Rocket className="w-3.5 h-3.5 text-black stroke-[2.5]" />
            <span>LAUNCH TO ROOM</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
