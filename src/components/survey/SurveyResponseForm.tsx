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
        className="bg-paper text-ink border border-hairline rounded-3xl shadow-xl p-6 sm:p-10 text-center font-sans space-y-5 relative overflow-hidden card-noma"
      >
        <div className="w-14 h-14 rounded-2xl bg-orange/10 text-orange border border-orange/20 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <span className="px-3 py-1 rounded-full bg-lime text-ink border border-ink/20 font-mono font-bold text-xs">
            Feedback Recorded
          </span>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-ink mt-3">
            Feedback Submitted Successfully
          </h3>
          <p className="text-xs sm:text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">
            Your responses to <span className="font-bold text-ink">&ldquo;{survey.title}&rdquo;</span> have been synchronized with the presenter in real-time.
          </p>
        </div>

        {/* Transmission Summary Receipt */}
        <div className="max-w-md mx-auto bg-paper-surface border border-hairline rounded-2xl p-4 text-left text-xs space-y-2">
          <div className="flex justify-between items-center text-muted font-mono">
            <span>Reference ID</span>
            <span className="font-bold text-ink">#SRV-{survey.id.slice(-6)}</span>
          </div>
          <div className="flex justify-between items-center text-muted font-mono">
            <span>Submission</span>
            <span className="font-bold text-orange">Anonymous & Verified</span>
          </div>
          <div className="flex justify-between items-center text-muted font-mono">
            <span>Answers Recorded</span>
            <span className="font-bold text-ink">{survey.questions.length} questions completed</span>
          </div>
        </div>

        {onViewResults && (
          <div className="pt-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onViewResults}
              className="px-6 py-3 rounded-xl btn-noma-orange font-bold text-xs sm:text-sm cursor-pointer transition-all inline-flex items-center space-x-2 shadow-sm"
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
    <div className="bg-paper text-ink border border-hairline rounded-3xl shadow-xl p-5 sm:p-8 font-sans space-y-6 card-noma">
      {/* Survey Title & Header */}
      <div className="border-b border-hairline pb-5">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-orange/10 text-orange border border-orange/20 text-xs font-semibold">
            Live Audience Prompt
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-paper-surface text-ink border border-hairline text-xs font-mono font-bold">
            {survey.questions.length} Questions
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-ink leading-tight">
          {survey.title}
        </h2>

        {survey.description && (
          <p className="text-xs sm:text-sm text-muted mt-2 leading-relaxed">
            {survey.description}
          </p>
        )}
      </div>

      {/* Validation Banner */}
      {validationError && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl bg-orange/15 text-orange border border-orange/30 text-xs flex items-center space-x-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-orange" />
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
              className="p-5 sm:p-6 rounded-2xl bg-paper-surface border border-hairline space-y-4"
            >
              {/* Question Header Bar */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start space-x-3">
                  <span className="w-7 h-7 rounded-xl bg-ink text-paper text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1 mb-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-paper border border-hairline text-muted text-[11px] font-mono">
                        {q.type === 'rating' ? '5-Star Rating' : q.type === 'choice' ? 'Multiple Choice' : 'Open Response'}
                      </span>
                      {q.required && (
                        <span className="px-2 py-0.5 rounded-full bg-orange/15 text-orange text-[11px] font-mono font-bold border border-orange/30">
                          Required
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-ink leading-snug font-display">
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
                          className={`p-2.5 sm:p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-ink text-lime border-ink font-bold shadow-md scale-102'
                              : isHovered
                              ? 'bg-paper text-ink border-ink/40'
                              : 'bg-paper text-muted border-hairline hover:bg-paper-surface'
                          }`}
                        >
                          <Star
                            className={`w-5 h-5 sm:w-6 sm:h-6 ${
                              isSelected || tier.value <= displayRating
                                ? 'fill-orange text-orange'
                                : 'fill-transparent text-muted/30'
                            }`}
                          />
                          <span className="text-xs sm:text-sm font-bold font-mono mt-1">
                            {tier.value}★
                          </span>
                          <span className="text-[10px] uppercase font-mono truncate max-w-full hidden xs:inline mt-0.5 opacity-80">
                            {tier.label}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>

                  {displayRating > 0 && selectedTier && (
                    <div className="p-2.5 rounded-xl bg-paper border border-hairline flex items-center justify-between text-xs font-mono">
                      <span className="text-muted">Selected:</span>
                      <span className="font-bold text-ink">
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
                        key={`${q.id}-${optionLetter}-${opt}`}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleChoiceSelect(q.id, opt)}
                        className={`p-3.5 rounded-2xl text-left border text-xs sm:text-sm transition-all cursor-pointer flex items-center space-x-3 ${
                          isSelected
                            ? 'bg-lime/25 text-ink border-lime font-bold shadow-sm ring-1 ring-lime/40'
                            : 'bg-paper hover:bg-paper-surface text-ink border-hairline'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                            isSelected ? 'bg-ink text-lime border-ink' : 'bg-paper-surface text-muted border-hairline'
                          }`}
                        >
                          {isSelected ? '✓' : optionLetter}
                        </span>
                        <span className="leading-snug truncate font-medium">{opt}</span>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* 3. Open Text Feedback Type */}
              {q.type === 'text' && (
                <div className="pt-1 space-y-1.5">
                  <div className="bg-paper border border-hairline rounded-2xl overflow-hidden">
                    <div className="bg-paper-surface px-3.5 py-2 border-b border-hairline flex items-center justify-between text-xs text-muted font-mono">
                      <span>Written Response</span>
                      <span className="text-[11px] text-orange font-bold">
                        Anonymous
                      </span>
                    </div>

                    <textarea
                      value={answers[q.id] || ''}
                      onChange={(e) => handleTextChange(q.id, e.target.value)}
                      placeholder="Type your feedback, thoughts, or questions for the presenter..."
                      rows={3}
                      maxLength={500}
                      className="w-full p-3.5 bg-transparent text-ink placeholder:text-muted/60 text-xs sm:text-sm focus:outline-none resize-none select-text"
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-muted font-mono px-1">
                    <span>Direct submission to speaker</span>
                    <span>{(answers[q.id] || '').length}/500</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Submit Button */}
        <div className="pt-3 pb-2 sm:pb-0 flex justify-end">
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full sm:w-auto px-8 py-3.5 min-h-[48px] btn-noma-orange rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 cursor-pointer transition-all shadow-sm"
          >
            <Send className="w-4 h-4" />
            <span>Submit Feedback</span>
          </motion.button>
        </div>
      </form>
    </div>
  );
};
