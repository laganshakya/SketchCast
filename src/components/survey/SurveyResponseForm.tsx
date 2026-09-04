import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Star, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Survey } from '../../types';
import { playClickSound, playPopSound, playFanfare } from '../../lib/soundFx';

interface SurveyResponseFormProps {
  survey: Survey;
  isSubmitted: boolean;
  onSubmit: (answers: Record<string, any>) => void;
  onViewResults?: () => void;
}

const RATING_LABELS = ['Poor', 'Fair', 'Good', 'Very Good', 'Exceptional'];

export const SurveyResponseForm: React.FC<SurveyResponseFormProps> = ({
  survey,
  isSubmitted,
  onSubmit,
  onViewResults,
}) => {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [hoveredRating, setHoveredRating] = useState<Record<string, number>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleRatingSelect = (questionId: string, rating: number) => {
    playPopSound();
    setAnswers((prev) => ({ ...prev, [questionId]: rating }));
    setValidationError(null);
  };

  const handleChoiceSelect = (questionId: string, option: string) => {
    playClickSound();
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
    setValidationError(null);
  };

  const handleTextChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check required questions
    for (const q of survey.questions) {
      if (q.required) {
        const val = answers[q.id];
        if (val === undefined || val === null || (typeof val === 'string' && !val.trim())) {
          playPopSound();
          setValidationError(`Please answer question: "${q.title}" before submitting.`);
          return;
        }
      }
    }

    playFanfare();
    onSubmit(answers);
  };

  // 1. Submitted State
  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-neo-cream border-4 border-black brutal-shadow p-6 sm:p-8 text-center font-mono space-y-4"
      >
        <div className="w-16 h-16 bg-[#00F59B] text-black border-3 border-black mx-auto flex items-center justify-center brutal-shadow-sm">
          <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
        </div>
        <div>
          <span className="px-2 py-0.5 bg-black text-[#00F59B] font-black text-[10px] uppercase tracking-wider">
            RESPONSE RECORDED
          </span>
          <h3 className="text-xl font-heavy uppercase tracking-tight text-black mt-2">
            THANK YOU FOR YOUR FEEDBACK!
          </h3>
          <p className="text-xs text-slate-700 font-sans mt-2 max-w-md mx-auto leading-relaxed">
            Your responses to <span className="font-bold text-black">&ldquo;{survey.title}&rdquo;</span> have been delivered in real-time to the host & speaker.
          </p>
        </div>

        {onViewResults && (
          <div className="pt-2">
            <button
              onClick={onViewResults}
              className="px-5 py-2.5 bg-neo-yellow hover:bg-[#FFF04D] text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow cursor-pointer transition-all hover:-translate-y-0.5"
            >
              VIEW LIVE ANONYMOUS RESULTS ({survey.responses_count})
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  // 2. Answering Flow
  return (
    <div className="bg-neo-cream border-4 border-black brutal-shadow p-4 sm:p-6 font-mono space-y-5">
      {/* Header */}
      <div className="border-b-3 border-black pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 bg-neo-yellow text-black border border-black text-[10px] font-black uppercase">
            LIVE AUDIENCE SURVEY
          </span>
          <span className="text-[10px] font-bold text-slate-600">
            {survey.questions.length} Questions
          </span>
        </div>
        <h2 className="text-lg sm:text-xl font-heavy uppercase tracking-tight text-black mt-1.5 leading-tight">
          {survey.title}
        </h2>
        {survey.description && (
          <p className="text-xs text-slate-700 font-sans mt-1 leading-snug">
            {survey.description}
          </p>
        )}
      </div>

      {/* Validation Banner */}
      {validationError && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-2.5 bg-neo-pink text-white border-2 border-black text-xs font-bold flex items-center space-x-2 brutal-shadow-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0 stroke-[2.5]" />
          <span>{validationError}</span>
        </motion.div>
      )}

      {/* Form Questions */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {survey.questions.map((q, idx) => {
          const ratingVal = answers[q.id] || 0;
          const currentHover = hoveredRating[q.id] || 0;
          const displayRating = currentHover || ratingVal;

          return (
            <div key={q.id} className="p-4 bg-white border-2 border-black brutal-shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-black text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="text-xs sm:text-sm font-heavy uppercase tracking-tight text-black leading-snug">
                      {q.title}
                    </span>
                    {q.required && (
                      <span className="text-red-600 ml-1 text-xs font-bold" title="Required">
                        *
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 1. Star Rating Type */}
              {q.type === 'rating' && (
                <div className="pl-7 space-y-1.5">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <motion.button
                        key={star}
                        type="button"
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onMouseEnter={() =>
                          setHoveredRating((prev) => ({ ...prev, [q.id]: star }))
                        }
                        onMouseLeave={() =>
                          setHoveredRating((prev) => ({ ...prev, [q.id]: 0 }))
                        }
                        onClick={() => handleRatingSelect(q.id, star)}
                        className="p-1 cursor-pointer transition-colors"
                        title={`${star} Star${star > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={`w-7 h-7 sm:w-8 sm:h-8 stroke-black stroke-[1.8] ${
                            star <= displayRating
                              ? 'fill-neo-yellow text-neo-yellow'
                              : 'fill-slate-100 text-slate-300'
                          }`}
                        />
                      </motion.button>
                    ))}
                  </div>
                  {displayRating > 0 && (
                    <p className="text-[11px] font-mono font-bold text-slate-700">
                      Rating: <span className="text-black font-black">{displayRating} / 5</span> —{' '}
                      {RATING_LABELS[displayRating - 1]}
                    </p>
                  )}
                </div>
              )}

              {/* 2. Multiple Choice Type */}
              {q.type === 'choice' && q.options && (
                <div className="pl-7 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = answers[q.id] === opt;
                    return (
                      <motion.button
                        key={optIdx}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleChoiceSelect(q.id, opt)}
                        className={`p-2.5 text-left border-2 border-black font-mono text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                          isSelected
                            ? 'bg-neo-yellow text-black brutal-shadow-sm font-black'
                            : 'bg-[#FAF8F5] hover:bg-slate-100 text-slate-900'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full border-2 border-black flex items-center justify-center text-[9px] font-black shrink-0 ${
                            isSelected ? 'bg-black text-neo-yellow' : 'bg-white text-black'
                          }`}
                        >
                          {isSelected ? '✓' : String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="leading-snug">{opt}</span>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* 3. Open Text Feedback */}
              {q.type === 'text' && (
                <div className="pl-7">
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => handleTextChange(q.id, e.target.value)}
                    placeholder="Write your feedback, questions, or architectural suggestions..."
                    rows={3}
                    maxLength={500}
                    className="w-full p-2.5 bg-[#FAF8F5] border-2 border-black text-black placeholder:text-slate-500 text-xs font-bold focus:outline-none focus:bg-white resize-none font-sans select-text"
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                    <span>Constructive & anonymous</span>
                    <span>{(answers[q.id] || '').length}/500</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Submit Button */}
        <div className="pt-2 flex justify-end">
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            className="w-full sm:w-auto px-6 py-3 bg-neo-yellow hover:bg-[#FFF04D] text-black text-xs sm:text-sm font-mono font-black uppercase border-3 border-black brutal-shadow flex items-center justify-center space-x-2 cursor-pointer transition-all"
          >
            <Send className="w-4 h-4" />
            <span>SUBMIT FEEDBACK</span>
          </motion.button>
        </div>
      </form>
    </div>
  );
};
