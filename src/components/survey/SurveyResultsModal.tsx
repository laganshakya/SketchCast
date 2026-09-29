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
  'bg-orange', // Studio Noma vibrant orange
  'bg-lime',   // Studio Noma lime
  'bg-sky-400', // Studio Noma sky
  'bg-ink',    // Deep Ink
  'bg-muted',  // Editorial muted
  'bg-ink/70', // Dark ink tint
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm font-sans">
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          className="bg-paper text-ink w-[95vw] sm:max-w-4xl rounded-3xl border border-hairline shadow-2xl relative flex flex-col max-h-[90dvh] overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-paper-surface/80 border-b border-hairline flex items-start justify-between shrink-0 gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-orange/10 text-orange text-[10px] font-mono font-medium border border-orange/20">
                  Survey Analytics
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                    survey.status === 'active'
                      ? 'bg-lime/20 text-ink border-lime/40'
                      : 'bg-paper text-muted border-hairline'
                  }`}
                >
                  {survey.status.toUpperCase()}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-paper text-ink text-[10px] font-mono font-medium border border-hairline">
                  {responses.length} {responses.length === 1 ? 'response' : 'responses'}
                </span>
              </div>

              <h2 className="text-base sm:text-xl font-serif font-medium tracking-tight text-ink leading-tight">
                {survey.title}
              </h2>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {onExport && (
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => onExport(survey.id, 'json')}
                    className="px-3 py-1.5 rounded-full bg-paper hover:bg-paper-surface text-ink text-xs font-mono font-medium border border-hairline cursor-pointer flex items-center space-x-1.5 transition-colors"
                    title="Export JSON dataset"
                  >
                    <Download className="w-3.5 h-3.5 text-muted" />
                    <span>JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onExport(survey.id, 'csv')}
                    className="px-3 py-1.5 rounded-full bg-paper hover:bg-paper-surface text-ink text-xs font-mono font-medium border border-hairline cursor-pointer flex items-center space-x-1.5 transition-colors"
                    title="Export CSV spreadsheet"
                  >
                    <Download className="w-3.5 h-3.5 text-muted" />
                    <span>CSV</span>
                  </button>
                </div>
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

          {/* Navigation Tabs */}
          <div className="flex border-b border-hairline bg-paper-surface/50 px-4 pt-2 shrink-0 space-x-2">
            <button
              onClick={() => {
                playClickSound();
                setActiveTab('analytics');
              }}
              className={`px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer flex items-center space-x-2 border-b-2 ${
                activeTab === 'analytics'
                  ? 'border-ink text-ink font-semibold'
                  : 'border-transparent text-muted hover:text-ink'
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
              className={`px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer flex items-center space-x-2 border-b-2 ${
                activeTab === 'responses'
                  ? 'border-ink text-ink font-semibold'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Submissions ({responses.length})</span>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
            {/* AI Sentiment & Takeaways Card */}
            <div className="p-6 rounded-3xl bg-paper-surface border-2 border-orange/30 space-y-4 relative overflow-hidden shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-orange/10 text-orange border border-orange/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="font-serif font-medium text-sm sm:text-base text-ink tracking-tight">
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
                    className="btn-noma-orange px-4 py-1.5 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-all"
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
                <div className="space-y-4 pt-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-muted">Sentiment:</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-medium capitalize border ${
                          survey.aiSummary.sentiment === 'positive'
                            ? 'bg-lime/20 text-ink border-lime/40'
                            : survey.aiSummary.sentiment === 'negative'
                            ? 'bg-red-500/15 text-red-700 border-red-500/30'
                            : 'bg-paper text-ink border-hairline'
                        }`}
                      >
                        {survey.aiSummary.sentiment}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-muted">Health Score:</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-paper text-ink border border-hairline font-mono font-semibold">
                        {survey.aiSummary.score} / 100
                      </span>
                    </div>

                    <span className="text-xs text-muted font-mono">
                      Generated {new Date(survey.aiSummary.generatedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Key Takeaways & Direct Quotes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {survey.aiSummary.takeaways && survey.aiSummary.takeaways.length > 0 && (
                      <div className="p-4 rounded-2xl bg-paper border border-hairline space-y-2 text-xs">
                        <span className="font-serif font-semibold text-ink text-xs block">
                          Executive Patterns
                        </span>
                        <ul className="space-y-2 text-muted">
                          {survey.aiSummary.takeaways.map((item) => (
                            <li key={item} className="flex items-start space-x-2 text-xs">
                              <span className="text-orange shrink-0 font-bold">•</span>
                              <span className="leading-snug text-ink">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {survey.aiSummary.keyQuotes && survey.aiSummary.keyQuotes.length > 0 && (
                      <div className="p-4 rounded-2xl bg-paper border border-hairline space-y-2 text-xs">
                        <span className="font-serif font-semibold text-ink text-xs block">
                          Notable Attendee Quotes
                        </span>
                        <ul className="space-y-2 text-muted">
                          {survey.aiSummary.keyQuotes.map((quote) => (
                            <li key={quote} className="flex items-start space-x-2 text-xs italic">
                              <span className="text-orange shrink-0 font-bold not-italic">“</span>
                              <span className="leading-snug text-ink">{quote}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-paper border border-hairline text-center">
                  <p className="text-xs text-muted">
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
                    className="p-6 rounded-3xl bg-paper-surface border border-hairline space-y-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-3">
                        <span className="w-6 h-6 rounded-full bg-ink text-paper text-xs font-mono font-semibold flex items-center justify-center shrink-0 mt-0.5">
                          {qIdx + 1}
                        </span>
                        <div>
                          <span className="px-2 py-0.5 rounded-full bg-paper border border-hairline text-muted text-[10px] font-mono uppercase">
                            {item.type === 'rating'
                              ? '5-Star Rating'
                              : item.type === 'choice'
                              ? 'Choice Distribution'
                              : 'Open Feedback'}
                          </span>
                          <h3 className="text-base font-serif font-medium text-ink mt-1.5 leading-snug">
                            {item.question.title}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* 1. Rating Question Analytics */}
                    {item.type === 'rating' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        {/* Big Average Rating Pill */}
                        <div className="p-6 rounded-2xl bg-paper border border-hairline flex flex-col items-center justify-center text-center">
                          <span className="text-[11px] font-mono text-muted uppercase tracking-wider">
                            Average Score
                          </span>
                          <div className="text-5xl font-serif font-bold text-ink mt-2 leading-none">
                            {item.average}
                          </div>
                          <div className="flex items-center space-x-1 mt-3">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-4 h-4 ${
                                  s <= Math.round(Number(item.average))
                                    ? 'fill-orange text-orange'
                                    : 'fill-transparent text-ink/20'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted font-mono mt-2">
                            Based on {item.totalRatings} {item.totalRatings === 1 ? 'rating' : 'ratings'}
                          </span>
                        </div>

                        {/* Frequency Bars (5 Stars down to 1 Star) */}
                        <div className="md:col-span-2 space-y-2.5 bg-paper p-5 rounded-2xl border border-hairline">
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
                                  <span className="text-ink font-medium">
                                    {rating}★ — {tierName}
                                  </span>
                                  <span className="text-muted font-mono font-medium">
                                    {count} ({pct}%)
                                  </span>
                                </div>
                                <div className="h-2 bg-ink/5 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-orange rounded-full transition-all duration-500"
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
                              key={`${item.question.id}-${optLetter}-${opt}`}
                              className="p-4 rounded-2xl bg-paper border border-hairline space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs sm:text-sm">
                                <div className="flex items-center space-x-2.5">
                                  <span className="w-5 h-5 rounded-md bg-paper-surface border border-hairline text-ink flex items-center justify-center text-xs font-mono font-semibold shrink-0">
                                    {optLetter}
                                  </span>
                                  <span className="text-ink font-medium truncate max-w-sm sm:max-w-md">
                                    {opt}
                                  </span>
                                </div>
                                <span className="font-mono font-semibold text-ink shrink-0">
                                  {pct}% ({count})
                                </span>
                              </div>

                              <div className="h-2 bg-ink/5 rounded-full overflow-hidden">
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
                      <div className="space-y-2.5 pt-2">
                        {item.textAnswers.length === 0 ? (
                          <div className="p-5 rounded-2xl bg-paper border border-hairline text-center text-xs text-muted">
                            No open text feedback submitted for this question yet.
                          </div>
                        ) : (
                          item.textAnswers.map((txt) => (
                            <div
                              key={`${item.question.id}-${txt.author || 'anon'}-${txt.time}`}
                              className="p-4 rounded-2xl bg-paper border border-hairline space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs text-muted">
                                <span className="text-ink flex items-center space-x-1.5 font-medium">
                                  <User className="w-3.5 h-3.5 text-orange" />
                                  <span>{txt.author || 'Anonymous'}</span>
                                </span>
                                <span className="flex items-center space-x-1 text-muted font-mono text-[11px]">
                                  <Clock className="w-3 h-3" />
                                  <span>{new Date(txt.time).toLocaleTimeString()}</span>
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-ink leading-relaxed bg-paper-surface p-3.5 rounded-xl border border-hairline">
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
                  <div className="p-8 rounded-3xl bg-paper-surface border border-hairline text-center space-y-2">
                    <p className="text-xs text-muted">
                      No individual responses have been recorded yet.
                    </p>
                  </div>
                ) : (
                  responses.map((resp, rIdx) => (
                    <div
                      key={resp.id || rIdx}
                      className="p-6 rounded-3xl bg-paper-surface border border-hairline space-y-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b border-hairline pb-3.5 flex-wrap gap-2">
                        <div className="flex items-center space-x-2.5">
                          <span className="w-6 h-6 rounded-full bg-ink text-paper font-mono font-semibold text-xs flex items-center justify-center">
                            #{rIdx + 1}
                          </span>
                          <span className="font-serif font-medium text-sm sm:text-base text-ink">
                            {resp.attendee_name || 'Anonymous Attendee'}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-muted">
                          {new Date(resp.submitted_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        {survey.questions.map((q) => {
                          const answer = resp.answers[q.id];
                          return (
                            <div
                              key={q.id}
                              className="p-3.5 rounded-2xl bg-paper border border-hairline space-y-1"
                            >
                              <div className="text-[11px] font-mono text-muted uppercase">
                                {q.title}
                              </div>
                              <div className="font-medium text-ink">
                                {answer === undefined || answer === null || answer === '' ? (
                                  <span className="text-muted/60 italic">No answer provided</span>
                                ) : q.type === 'rating' ? (
                                  <span className="text-orange font-semibold">
                                    {answer} / 5 Stars ({RATING_TIER_NAMES[Number(answer)] || ''})
                                  </span>
                                ) : (
                                  <span className="text-ink">{String(answer)}</span>
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
