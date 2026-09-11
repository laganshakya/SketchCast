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
  { value: 1, label: 'POOR', color: 'bg-red-400' },
  { value: 2, label: 'FAIR', color: 'bg-orange-400' },
  { value: 3, label: 'GOOD', color: 'bg-neo-yellow' },
  { value: 4, label: 'VERY GOOD', color: 'bg-neo-cyan' },
  { value: 5, label: 'EXCEPTIONAL', color: 'bg-neo-mint' },
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

  // 1. Submitted State (Retro Cyber Receipt)
  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#151822] text-white border-4 border-black brutal-shadow-lg p-6 sm:p-10 text-center font-mono space-y-5 relative overflow-hidden"
      >
        <div className="w-16 h-16 bg-neo-mint text-black border-3 border-black mx-auto flex items-center justify-center brutal-shadow-sm">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>

        <div>
          <span className="px-2.5 py-0.5 bg-black text-neo-mint border border-neo-mint font-black text-[10px] uppercase tracking-wider">
            TRANSMISSION VERIFIED // RECORDED
          </span>
          <h3 className="text-xl sm:text-2xl font-heavy uppercase tracking-tight text-white mt-2">
            FEEDBACK TRANSMITTED SUCCESSFULLY!
          </h3>
          <p className="text-xs text-slate-300 font-sans mt-2 max-w-md mx-auto leading-relaxed">
            Your responses to <span className="font-bold text-neo-yellow">&ldquo;{survey.title}&rdquo;</span> have been synchronized to the host&apos;s telemetry cockpit.
          </p>
        </div>

        {/* Transmission Summary Punchcard */}
        <div className="max-w-md mx-auto bg-[#0E1017] border-2 border-black p-3.5 brutal-shadow-sm text-left text-xs space-y-1.5">
          <div className="flex justify-between items-center text-slate-400">
            <span>RECEIPT ID:</span>
            <span className="font-bold text-white uppercase">#SRV-{survey.id.slice(-6)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>SURVEY STATUS:</span>
            <span className="font-bold text-neo-mint uppercase">CONFIRMED ANONYMOUS</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>TOTAL QUESTIONS:</span>
            <span className="font-bold text-white">{survey.questions.length} ANSWERS RECORDED</span>
          </div>
        </div>

        {onViewResults && (
          <div className="pt-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onViewResults}
              className="px-6 py-3 bg-neo-yellow hover:bg-neo-mint text-black font-heavy text-xs uppercase border-3 border-black brutal-shadow cursor-pointer transition-all inline-flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>VIEW LIVE ANONYMOUS RESULTS ({survey.responses_count})</span>
            </motion.button>
          </div>
        )}
      </motion.div>
    );
  }

  // 2. Answering Flow
  return (
    <div className="bg-[#151822] text-white border-4 border-black brutal-shadow-lg p-4 sm:p-7 font-mono space-y-6">
      {/* Survey Title & Header */}
      <div className="border-b-3 border-black pb-4">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="px-2 py-0.5 bg-neo-yellow text-black border border-black text-[10px] font-black uppercase">
            LIVE AUDIENCE PROMPT
          </span>
          <span className="px-2 py-0.5 bg-[#0E1017] text-neo-cyan border border-black text-[10px] font-bold uppercase">
            {survey.questions.length} QUESTIONS
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-heavy uppercase tracking-tight text-white leading-tight">
          {survey.title}
        </h2>

        {survey.description && (
          <p className="text-xs text-slate-300 font-sans mt-1.5 leading-relaxed">
            {survey.description}
          </p>
        )}
      </div>

      {/* Validation Banner */}
      {validationError && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-neo-pink text-white border-3 border-black text-xs font-heavy flex items-center space-x-2 brutal-shadow"
        >
          <AlertCircle className="w-4 h-4 shrink-0 stroke-[3]" />
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
              className="p-4 sm:p-5 bg-[#1B1F2C] border-3 border-black brutal-shadow space-y-3.5 relative"
            >
              {/* Question Header Bar */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start space-x-2.5">
                  <span className="w-6 h-6 sm:w-7 sm:h-7 bg-neo-yellow text-black border-2 border-black font-heavy text-xs sm:text-sm flex items-center justify-center shrink-0 mt-0.5 brutal-shadow-xs">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 mb-1">
                      <span className="px-1.5 py-0.2 bg-black text-slate-300 text-[9px] font-bold uppercase border border-black">
                        {q.type === 'rating' ? '⭐ 5-STAR RATING' : q.type === 'choice' ? '☑ MULTIPLE CHOICE' : '💬 OPEN TEXT'}
                      </span>
                      {q.required && (
                        <span className="px-1.5 py-0.2 bg-neo-pink text-white text-[9px] font-black uppercase border border-black">
                          REQUIRED *
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-heavy uppercase tracking-tight text-white leading-snug">
                      {q.title}
                    </h3>
                  </div>
                </div>
              </div>

              {/* 1. Star Rating Type */}
              {q.type === 'rating' && (
                <div className="pt-2 space-y-3">
                  {/* Tactile 5-Tier Rating Blocks */}
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
                    {RATING_TIERS.map((tier) => {
                      const isSelected = ratingVal === tier.value;
                      const isHovered = currentHover === tier.value;

                      return (
                        <motion.button
                          key={tier.value}
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onMouseEnter={() =>
                            setHoveredRating((prev) => ({ ...prev, [q.id]: tier.value }))
                          }
                          onMouseLeave={() =>
                            setHoveredRating((prev) => ({ ...prev, [q.id]: 0 }))
                          }
                          onClick={() => handleRatingSelect(q.id, tier.value)}
                          className={`p-2 sm:p-3 border-2 border-black flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-neo-yellow text-black border-3 border-black brutal-shadow-sm font-black ring-2 ring-black scale-105'
                              : isHovered
                              ? 'bg-[#293044] text-white'
                              : 'bg-[#12141D] text-slate-300 hover:bg-[#202535]'
                          }`}
                        >
                          <Star
                            className={`w-5 h-5 sm:w-7 sm:h-7 stroke-[2] ${
                              isSelected || tier.value <= displayRating
                                ? 'fill-neo-yellow text-black'
                                : 'fill-slate-700 text-slate-600'
                            }`}
                          />
                          <span className="text-xs sm:text-sm font-heavy mt-1">
                            {tier.value}★
                          </span>
                          <span className="text-[8px] sm:text-[9px] font-bold uppercase truncate max-w-full hidden xs:inline mt-0.5">
                            {tier.label}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>

                  {displayRating > 0 && selectedTier && (
                    <div className="p-2 bg-[#0E1017] border border-black flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 font-bold uppercase">SELECTED RATING:</span>
                      <span className="font-heavy text-neo-mint">
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
                        className={`p-3 text-left border-3 border-black font-mono text-xs transition-all cursor-pointer flex items-center space-x-2.5 ${
                          isSelected
                            ? 'bg-neo-mint text-black brutal-shadow-sm font-heavy ring-2 ring-black'
                            : 'bg-[#12141D] hover:bg-[#202536] text-slate-200'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 border-2 border-black flex items-center justify-center text-xs font-black shrink-0 ${
                            isSelected ? 'bg-black text-neo-mint' : 'bg-[#1E2333] text-white'
                          }`}
                        >
                          {isSelected ? '✓' : optionLetter}
                        </span>
                        <span className="leading-snug font-bold truncate">{opt}</span>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* 3. Open Text Feedback Type */}
              {q.type === 'text' && (
                <div className="pt-1 space-y-1">
                  <div className="bg-[#0E1017] border-2 border-black">
                    <div className="bg-[#1A1E2B] px-3 py-1.5 border-b border-black flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-black" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 border border-black" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 border border-black" />
                        <span className="text-[10px] font-bold text-slate-400 ml-1.5">
                          terminal://feedback_stream.txt
                        </span>
                      </div>
                      <span className="text-[9px] text-neo-mint font-bold uppercase">
                        ANONYMOUS & ENCRYPTED
                      </span>
                    </div>

                    <textarea
                      value={answers[q.id] || ''}
                      onChange={(e) => handleTextChange(q.id, e.target.value)}
                      placeholder="Type your feedback, technical suggestions, or questions for the presenter..."
                      rows={3}
                      maxLength={500}
                      className="w-full p-3 bg-transparent text-green-300 placeholder:text-slate-500 text-xs font-mono font-medium focus:outline-none resize-none select-text"
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono px-1">
                    <span>Direct transmission to speaker</span>
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
            whileTap={{ scale: 0.97 }}
            className="w-full sm:w-auto px-8 py-3.5 bg-neo-mint hover:bg-neo-yellow text-black text-xs sm:text-sm font-mono font-heavy uppercase border-3 border-black brutal-shadow-lg flex items-center justify-center space-x-2 cursor-pointer transition-all hover:translate-x-[-2px] hover:translate-y-[-2px]"
          >
            <Send className="w-4 h-4 stroke-[2.5]" />
            <span>SUBMIT AUDIENCE FEEDBACK</span>
          </motion.button>
        </div>
      </form>
    </div>
  );
};
