import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  Star,
  Download,
  BarChart3,
  MessageSquare,
  Clock,
  User,
} from 'lucide-react';
import type { Survey, SurveyResponse, SurveyQuestion } from '../../types';
import { playClickSound, playPopSound } from '../../lib/soundFx';

interface SurveyResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  survey: Survey;
  responses: SurveyResponse[];
  isHost?: boolean;
  onGenerateAISummary?: (surveyId: string) => Promise<any>;
  onExport?: (surveyId: string, format: 'json' | 'csv') => void;
  isSummarizing?: boolean;
}

type RatingAnalytics = {
  type: 'rating';
  question: SurveyQuestion;
  average: string;
  totalRatings: number;
  distribution: Record<number, number>;
};

type ChoiceAnalytics = {
  type: 'choice';
  question: SurveyQuestion;
  optionCounts: Record<string, number>;
  totalAnswered: number;
};

type TextAnalytics = {
  type: 'text';
  question: SurveyQuestion;
  textAnswers: { author: string; text: string; time: number }[];
};

type QuestionAnalytics = RatingAnalytics | ChoiceAnalytics | TextAnalytics;

const OPTION_COLORS = [
  'bg-[#3B82F6]', // Electric Cobalt
  'bg-[#2563EB]', // Deep Cobalt
  'bg-[#60A5FA]', // Sky Cobalt
  'bg-[#475569]', // Slate Blue
  'bg-[#334155]', // Dark Slate
  'bg-[#1E293B]', // Obsidian Slate
];

const RATING_TIER_NAMES: Record<number, string> = {
  5: 'EXCEPTIONAL',
  4: 'VERY GOOD',
  3: 'GOOD',
  2: 'FAIR',
  1: 'POOR',
};

export const SurveyResultsModal: React.FC<SurveyResultsModalProps> = ({
  isOpen,
  onClose,
  survey,
  responses,
  isHost = false,
  onGenerateAISummary,
  onExport,
  isSummarizing,
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'responses'>('analytics');

  // Compute question analytics
  const analytics: QuestionAnalytics[] = useMemo(() => {
    return survey.questions.map((q): QuestionAnalytics => {
      if (q.type === 'rating') {
        let sum = 0;
        let count = 0;
        const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        responses.forEach((r) => {
          const val = r.answers[q.id];
          if (typeof val === 'number' && val >= 1 && val <= 5) {
            sum += val;
            count++;
            distribution[val] = (distribution[val] || 0) + 1;
          }
        });

        const avg = count > 0 ? (sum / count).toFixed(1) : '0.0';
        return {
          type: 'rating',
          question: q,
          average: avg,
          totalRatings: count,
          distribution,
        };
      } else if (q.type === 'choice') {
        const optionCounts: Record<string, number> = {};
        (q.options || []).forEach((opt) => {
          optionCounts[opt] = 0;
        });

        let totalAnswered = 0;
        responses.forEach((r) => {
          const val = r.answers[q.id];
          if (typeof val === 'string' && val) {
            optionCounts[val] = (optionCounts[val] || 0) + 1;
            totalAnswered++;
          }
        });

        return {
          type: 'choice',
          question: q,
          optionCounts,
          totalAnswered,
        };
      } else {
        // Text
        const textAnswers: { author: string; text: string; time: number }[] = [];
        responses.forEach((r) => {
          const val = r.answers[q.id];
          if (typeof val === 'string' && val.trim()) {
            textAnswers.push({
              author: r.attendee_name,
              text: val.trim(),
              time: r.submitted_at,
            });
          }
        });

        return {
          type: 'text',
          question: q,
          textAnswers,
        };
      }
    });
  }, [survey, responses]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md font-sans">
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          className="bg-[#101014] text-[#FAFAFA] w-full max-w-4xl rounded-2xl border border-white/[0.08] shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-[#141418] border-b border-white/[0.08] flex items-start justify-between shrink-0 gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[11px] font-medium border border-blue-500/20">
                  Survey Analytics
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                    survey.status === 'active'
                      ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                      : 'bg-zinc-800 text-zinc-400 border-white/[0.06]'
                  }`}
                >
                  {survey.status.toUpperCase()}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-200 text-[11px] font-medium border border-white/[0.06]">
                  {responses.length} {responses.length === 1 ? 'response' : 'responses'}
                </span>
              </div>

              <h2 className="text-base sm:text-xl font-semibold tracking-tight text-white leading-tight font-display">
                {survey.title}
              </h2>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {onExport && (
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => onExport(survey.id, 'json')}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium border border-white/[0.06] cursor-pointer flex items-center space-x-1.5 transition-colors"
                    title="Export JSON dataset"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onExport(survey.id, 'csv')}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium border border-white/[0.06] cursor-pointer flex items-center space-x-1.5 transition-colors"
                    title="Export CSV spreadsheet"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                </div>
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

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/[0.08] bg-[#0D0D10] px-4 pt-2 shrink-0 space-x-2">
            <button
              onClick={() => {
                playClickSound();
                setActiveTab('analytics');
              }}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-medium transition-colors cursor-pointer flex items-center space-x-2 border-t border-x ${
                activeTab === 'analytics'
                  ? 'bg-[#141418] text-blue-400 font-semibold border-white/[0.08] -mb-[1px]'
                  : 'bg-transparent text-zinc-400 hover:text-white border-transparent'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Question Breakdowns</span>
            </button>
            <button
              onClick={() => {
                playClickSound();
                setActiveTab('responses');
              }}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-medium transition-colors cursor-pointer flex items-center space-x-2 border-t border-x ${
                activeTab === 'responses'
                  ? 'bg-[#141418] text-blue-400 font-semibold border-white/[0.08] -mb-[1px]'
                  : 'bg-transparent text-zinc-400 hover:text-white border-transparent'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Submissions ({responses.length})</span>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
            {/* AI Sentiment & Takeaways Card */}
            <div className="p-5 rounded-2xl bg-[#141418] border border-blue-500/20 space-y-3.5 relative overflow-hidden">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-xs sm:text-sm text-white tracking-tight font-display">
                    AI Sentiment & Synthesis
                  </span>
                </div>

                {isHost && onGenerateAISummary && (
                  <button
                    type="button"
                    onClick={() => {
                      playPopSound();
                      onGenerateAISummary(survey.id);
                    }}
                    disabled={isSummarizing || responses.length === 0}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-md shadow-blue-500/20"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isSummarizing ? 'animate-spin' : ''}`} />
                    <span>
                      {isSummarizing
                        ? 'Synthesizing...'
                        : survey.aiSummary
                        ? 'Re-synthesize'
                        : 'Synthesize Takeaways'}
                    </span>
                  </button>
                )}
              </div>

              {survey.aiSummary ? (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-zinc-400">Sentiment:</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${
                          survey.aiSummary.sentiment === 'positive'
                            ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            : survey.aiSummary.sentiment === 'negative'
                            ? 'bg-red-500/15 text-red-400 border-red-500/30'
                            : 'bg-zinc-800 text-zinc-300 border-white/[0.06]'
                        }`}
                      >
                        {survey.aiSummary.sentiment}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-zinc-400">Health Score:</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#0D0D10] text-blue-400 border border-blue-500/20 font-semibold">
                        {survey.aiSummary.score} / 100
                      </span>
                    </div>

                    <span className="text-xs text-zinc-500">
                      Generated {new Date(survey.aiSummary.generatedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Key Takeaways & Direct Quotes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {survey.aiSummary.takeaways && survey.aiSummary.takeaways.length > 0 && (
                      <div className="p-4 rounded-xl bg-[#0D0D10] border border-white/[0.06] space-y-2 text-xs">
                        <span className="font-semibold text-blue-400 text-xs block">
                          Executive Patterns
                        </span>
                        <ul className="space-y-2 text-zinc-300">
                          {survey.aiSummary.takeaways.map((item, i) => (
                            <li key={i} className="flex items-start space-x-2 text-xs">
                              <span className="text-blue-400 shrink-0 font-bold">•</span>
                              <span className="leading-snug">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {survey.aiSummary.keyQuotes && survey.aiSummary.keyQuotes.length > 0 && (
                      <div className="p-4 rounded-xl bg-[#0D0D10] border border-white/[0.06] space-y-2 text-xs">
                        <span className="font-semibold text-blue-400 text-xs block">
                          Notable Attendee Quotes
                        </span>
                        <ul className="space-y-2 text-zinc-300">
                          {survey.aiSummary.keyQuotes.map((quote, i) => (
                            <li key={i} className="flex items-start space-x-2 text-xs italic">
                              <span className="text-blue-400 shrink-0 font-bold not-italic">“</span>
                              <span className="leading-snug text-zinc-200">{quote}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#0D0D10] border border-white/[0.06] text-center">
                  <p className="text-xs text-zinc-400">
                    {responses.length > 0
                      ? 'Click "Synthesize Takeaways" to generate an executive AI sentiment breakdown from responses.'
                      : 'Waiting for attendee responses to be submitted before synthesizing takeaways.'}
                  </p>
                </div>
              )}
            </div>

            {/* TAB 1: Question Analytics Breakdown */}
            {activeTab === 'analytics' && (
              <div className="space-y-4">
                {analytics.map((item, qIdx) => (
                  <div
                    key={item.question.id}
                    className="p-5 sm:p-6 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-3">
                        <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                          {qIdx + 1}
                        </span>
                        <div>
                          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-medium">
                            {item.type === 'rating'
                              ? '5-Star Rating'
                              : item.type === 'choice'
                              ? 'Choice Distribution'
                              : 'Open Feedback'}
                          </span>
                          <h3 className="text-sm sm:text-base font-semibold text-white mt-1 leading-snug font-display">
                            {item.question.title}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* 1. Rating Question Analytics */}
                    {item.type === 'rating' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        {/* Big Average Rating Pill */}
                        <div className="p-5 rounded-xl bg-[#0D0D10] border border-white/[0.06] flex flex-col items-center justify-center text-center">
                          <span className="text-[11px] text-zinc-400 font-medium">
                            Average Score
                          </span>
                          <div className="text-4xl sm:text-5xl font-bold text-blue-400 mt-1 leading-none font-mono">
                            {item.average}
                          </div>
                          <div className="flex items-center space-x-1 mt-2.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-4 h-4 ${
                                  s <= Math.round(Number(item.average))
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'fill-transparent text-zinc-700'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-zinc-500 mt-2">
                            Based on {item.totalRatings} {item.totalRatings === 1 ? 'rating' : 'ratings'}
                          </span>
                        </div>

                        {/* Frequency Bars (5 Stars down to 1 Star) */}
                        <div className="md:col-span-2 space-y-2.5 bg-[#0D0D10] p-4 rounded-xl border border-white/[0.06]">
                          {[5, 4, 3, 2, 1].map((rating) => {
                            const count = item.distribution[rating] || 0;
                            const pct =
                              item.totalRatings > 0
                                ? Math.round((count / item.totalRatings) * 100)
                                : 0;
                            const tierName = RATING_TIER_NAMES[rating] || `${rating} Stars`;

                            return (
                              <div key={rating} className="space-y-1">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-zinc-300">
                                    {rating}★ — {tierName}
                                  </span>
                                  <span className="text-zinc-400 font-medium">
                                    {count} ({pct}%)
                                  </span>
                                </div>
                                <div className="h-2.5 bg-zinc-800/80 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 2. Choice Question Analytics */}
                    {item.type === 'choice' && (
                      <div className="space-y-2 pt-2">
                        {item.question.options?.map((opt, optIdx) => {
                          const count = item.optionCounts[opt] || 0;
                          const pct =
                            item.totalAnswered > 0
                              ? Math.round((count / item.totalAnswered) * 100)
                              : 0;
                          const color = OPTION_COLORS[optIdx % OPTION_COLORS.length];
                          const optLetter = String.fromCharCode(65 + optIdx);

                          return (
                            <div
                              key={optIdx}
                              className="p-3.5 rounded-xl bg-[#0D0D10] border border-white/[0.06] space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs sm:text-sm">
                                <div className="flex items-center space-x-2.5">
                                  <span className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs font-semibold shrink-0">
                                    {optLetter}
                                  </span>
                                  <span className="text-zinc-200 truncate max-w-sm sm:max-w-md">
                                    {opt}
                                  </span>
                                </div>
                                <span className="font-semibold text-white shrink-0">
                                  {pct}% ({count})
                                </span>
                              </div>

                              <div className="h-2.5 bg-zinc-800/80 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${color} rounded-full transition-all duration-500`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 3. Text Feedback Analytics */}
                    {item.type === 'text' && (
                      <div className="space-y-2 pt-2">
                        {item.textAnswers.length === 0 ? (
                          <div className="p-4 rounded-xl bg-[#0D0D10] border border-white/[0.06] text-center text-xs text-zinc-400">
                            No open text feedback submitted for this question yet.
                          </div>
                        ) : (
                          item.textAnswers.map((txt, tIdx) => (
                            <div
                              key={tIdx}
                              className="p-4 rounded-xl bg-[#0D0D10] border border-white/[0.06] space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs text-zinc-400">
                                <span className="text-blue-400 flex items-center space-x-1.5 font-medium">
                                  <User className="w-3.5 h-3.5" />
                                  <span>{txt.author || 'Anonymous'}</span>
                                </span>
                                <span className="flex items-center space-x-1 text-zinc-500">
                                  <Clock className="w-3 h-3" />
                                  <span>{new Date(txt.time).toLocaleTimeString()}</span>
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed bg-[#141418] p-3 rounded-lg border border-white/[0.04]">
                                &ldquo;{txt.text}&rdquo;
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* TAB 2: Raw Individual Submissions */}
            {activeTab === 'responses' && (
              <div className="space-y-4">
                {responses.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#141418] border border-white/[0.08] text-center space-y-2">
                    <p className="text-xs text-zinc-400">
                      No individual responses have been recorded yet.
                    </p>
                  </div>
                ) : (
                  responses.map((resp, rIdx) => (
                    <div
                      key={resp.id || rIdx}
                      className="p-5 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-3.5"
                    >
                      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 flex-wrap gap-2">
                        <div className="flex items-center space-x-2.5">
                          <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-400 font-semibold text-xs flex items-center justify-center">
                            #{rIdx + 1}
                          </span>
                          <span className="font-semibold text-xs sm:text-sm text-white">
                            {resp.attendee_name || 'Anonymous Attendee'}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500">
                          {new Date(resp.submitted_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        {survey.questions.map((q) => {
                          const answer = resp.answers[q.id];
                          return (
                            <div
                              key={q.id}
                              className="p-3 rounded-xl bg-[#0D0D10] border border-white/[0.06] space-y-1"
                            >
                              <div className="text-[11px] text-zinc-400 font-medium">
                                {q.title}
                              </div>
                              <div className="font-medium text-white">
                                {answer === undefined || answer === null || answer === '' ? (
                                  <span className="text-zinc-600 italic">No answer provided</span>
                                ) : q.type === 'rating' ? (
                                  <span className="text-blue-400 font-semibold">
                                    {answer} / 5 Stars ({RATING_TIER_NAMES[Number(answer)] || ''})
                                  </span>
                                ) : (
                                  <span className="text-zinc-200">{String(answer)}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
