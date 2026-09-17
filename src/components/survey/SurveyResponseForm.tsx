import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Star, Send, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import type { Survey } from '../../types';
import { playClickSound, playPopSound, playFanfare } from '../../lib/soundFx';

interface SurveyResponseFormProps {
  survey: Survey;
  isSubmitted: boolean;
  onSubmit: (answers: Record<string, any>) => void;
  onViewResults?: () => void;
}

const RATING_TIERS = [
  { value: 1, label: 'POOR', color: 'bg-[#18181B]' },
  { value: 2, label: 'FAIR', color: 'bg-[#27272A]' },
  { value: 3, label: 'GOOD', color: 'bg-[#3F3F46]' },
  { value: 4, label: 'VERY GOOD', color: 'bg-[#1E3A8A]' },
  { value: 5, label: 'EXCEPTIONAL', color: 'bg-[#1D4ED8]' },
];

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

    // Validate required questions
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

  // 1. Submitted State (Minimal Clean Receipt)
  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#121215] text-white border border-white/[0.08] rounded-2xl shadow-2xl p-6 sm:p-10 text-center font-sans space-y-5 relative overflow-hidden"
      >
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium text-xs">
            Feedback Recorded
          </span>
          <h3 className="text-xl sm:text-2xl font-semibold text-white mt-3 font-display">
            Feedback Submitted Successfully
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-md mx-auto leading-relaxed">
            Your responses to <span className="font-medium text-white">&ldquo;{survey.title}&rdquo;</span> have been synchronized with the presenter in real-time.
          </p>
        </div>

        {/* Transmission Summary Receipt */}
        <div className="max-w-md mx-auto bg-[#0D0D10] border border-white/[0.06] rounded-xl p-4 text-left text-xs space-y-2">
          <div className="flex justify-between items-center text-zinc-400">
            <span>Reference ID</span>
            <span className="font-mono text-zinc-200">#SRV-{survey.id.slice(-6)}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-400">
            <span>Submission</span>
            <span className="font-medium text-blue-400">Anonymous & Verified</span>
          </div>
          <div className="flex justify-between items-center text-zinc-400">
            <span>Answers Recorded</span>
            <span className="font-medium text-white">{survey.questions.length} questions completed</span>
          </div>
        </div>

        {onViewResults && (
          <div className="pt-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onViewResults}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs sm:text-sm cursor-pointer transition-all inline-flex items-center space-x-2 shadow-lg shadow-blue-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>View Survey Results ({survey.responses_count})</span>
            </motion.button>
          </div>
        )}
      </motion.div>
    );
  }

  // 2. Answering Flow
  return (
    <div className="bg-[#101014] text-white border border-white/[0.08] rounded-2xl shadow-2xl p-5 sm:p-8 font-sans space-y-6">
      {/* Survey Title & Header */}
      <div className="border-b border-white/[0.08] pb-5">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium">
            Live Audience Prompt
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-xs font-medium">
            {survey.questions.length} Questions
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight font-display">
          {survey.title}
        </h2>

        {survey.description && (
          <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
            {survey.description}
          </p>
        )}
      </div>

      {/* Validation Banner */}
      {validationError && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl bg-red-500/10 text-red-300 border border-red-500/20 text-xs flex items-center space-x-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </motion.div>
      )}

      {/* Form Questions */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {survey.questions.map((q, idx) => {
          const ratingVal = answers[q.id] || 0;
          const currentHover = hoveredRating[q.id] || 0;
          const displayRating = currentHover || ratingVal;
          const selectedTier = RATING_TIERS.find((t) => t.value === displayRating);

          return (
            <div
              key={q.id}
              className="p-5 sm:p-6 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-4"
            >
              {/* Question Header Bar */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start space-x-3">
                  <span className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1 mb-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[11px] font-medium">
                        {q.type === 'rating' ? '5-Star Rating' : q.type === 'choice' ? 'Multiple Choice' : 'Open Response'}
                      </span>
                      {q.required && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[11px] font-medium border border-red-500/20">
                          Required
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold text-white leading-snug font-display">
                      {q.title}
                    </h3>
                  </div>
                </div>
              </div>

              {/* 1. Star Rating Type */}
              {q.type === 'rating' && (
                <div className="pt-2 space-y-3">
                  {/* Tactile 5-Tier Rating Blocks */}
                  <div className="grid grid-cols-5 gap-2 sm:gap-3">
                    {RATING_TIERS.map((tier) => {
                      const isSelected = ratingVal === tier.value;
                      const isHovered = currentHover === tier.value;

                      return (
                        <motion.button
                          key={tier.value}
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onMouseEnter={() =>
                            setHoveredRating((prev) => ({ ...prev, [q.id]: tier.value }))
                          }
                          onMouseLeave={() =>
                            setHoveredRating((prev) => ({ ...prev, [q.id]: 0 }))
                          }
                          onClick={() => handleRatingSelect(q.id, tier.value)}
                          className={`p-2.5 sm:p-3.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-500 font-semibold shadow-lg shadow-blue-500/25 scale-102'
                              : isHovered
                              ? 'bg-blue-600/15 text-white border-blue-500/40'
                              : 'bg-[#0D0D10] text-zinc-400 border-white/[0.08] hover:bg-zinc-800/50'
                          }`}
                        >
                          <Star
                            className={`w-5 h-5 sm:w-6 sm:h-6 ${
                              isSelected || tier.value <= displayRating
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-transparent text-zinc-700'
                            }`}
                          />
                          <span className="text-xs sm:text-sm font-semibold mt-1">
                            {tier.value}★
                          </span>
                          <span className="text-[10px] text-zinc-400 uppercase truncate max-w-full hidden xs:inline mt-0.5">
                            {tier.label}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>

                  {displayRating > 0 && selectedTier && (
                    <div className="p-2.5 rounded-xl bg-[#0D0D10] border border-white/[0.06] flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Selected:</span>
                      <span className="font-semibold text-blue-400">
                        {displayRating} / 5 — {selectedTier.label}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 2. Multiple Choice Type */}
              {q.type === 'choice' && q.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = answers[q.id] === opt;
                    const optionLetter = String.fromCharCode(65 + optIdx);

                    return (
                      <motion.button
                        key={optIdx}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleChoiceSelect(q.id, opt)}
                        className={`p-3.5 rounded-xl text-left border text-xs sm:text-sm transition-all cursor-pointer flex items-center space-x-3 ${
                          isSelected
                            ? 'bg-blue-600/15 text-white border-blue-500/60 font-medium shadow-sm'
                            : 'bg-[#0D0D10] hover:bg-zinc-800/40 text-zinc-200 border-white/[0.08]'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center text-xs font-semibold shrink-0 ${
                            isSelected ? 'bg-blue-600 text-white border-blue-500' : 'bg-zinc-800/80 text-zinc-400 border-white/[0.08]'
                          }`}
                        >
                          {isSelected ? '✓' : optionLetter}
                        </span>
                        <span className="leading-snug truncate">{opt}</span>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* 3. Open Text Feedback Type */}
              {q.type === 'text' && (
                <div className="pt-1 space-y-1.5">
                  <div className="bg-[#0D0D10] border border-white/[0.08] rounded-xl overflow-hidden">
                    <div className="bg-[#141418] px-3.5 py-2 border-b border-white/[0.08] flex items-center justify-between text-xs text-zinc-400">
                      <span>Written Response</span>
                      <span className="text-[11px] text-blue-400">
                        Anonymous
                      </span>
                    </div>

                    <textarea
                      value={answers[q.id] || ''}
                      onChange={(e) => handleTextChange(q.id, e.target.value)}
                      placeholder="Type your feedback, thoughts, or questions for the presenter..."
                      rows={3}
                      maxLength={500}
                      className="w-full p-3.5 bg-transparent text-white placeholder:text-zinc-500 text-xs sm:text-sm focus:outline-none resize-none select-text"
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-zinc-500 px-1">
                    <span>Direct submission to speaker</span>
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
            whileTap={{ scale: 0.98 }}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-medium flex items-center justify-center space-x-2 cursor-pointer transition-all shadow-lg shadow-blue-500/20"
          >
            <Send className="w-4 h-4" />
            <span>Submit Feedback</span>
          </motion.button>
        </div>
      </form>
    </div>
  );
};
