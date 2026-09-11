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
  'bg-neo-cyan',
  'bg-neo-mint',
  'bg-neo-purple',
  'bg-neo-yellow',
  'bg-neo-orange',
  'bg-neo-pink',
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm font-sans">
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 15 }}
          className="bg-[#12151F] text-white w-full max-w-4xl border-4 border-black brutal-shadow-lg relative flex flex-col max-h-[90vh] overflow-hidden font-mono"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-neo-yellow border-b-4 border-black flex items-start justify-between shrink-0 gap-3 text-black">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-black text-neo-yellow text-[9px] font-black uppercase border border-black">
                  SURVEY_ANALYTICS_CONSOLE
                </span>
                <span
                  className={`px-2 py-0.5 text-[9px] font-black uppercase border-2 border-black ${
                    survey.status === 'active' ? 'bg-neo-mint text-black' : 'bg-slate-300 text-slate-800'
                  }`}
                >
                  {survey.status.toUpperCase()}
                </span>
                <span className="px-2 py-0.5 bg-black text-white text-[9px] font-black uppercase">
                  {responses.length} {responses.length === 1 ? 'RESPONSE' : 'RESPONSES'}
                </span>
              </div>

              <h2 className="text-base sm:text-xl font-heavy uppercase tracking-tight text-black mt-1 leading-tight">
                {survey.title}
              </h2>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {onExport && (
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => onExport(survey.id, 'json')}
                    className="px-2.5 py-1 bg-white hover:bg-neo-cyan text-black text-[10px] font-heavy uppercase border-2 border-black brutal-shadow-xs cursor-pointer flex items-center space-x-1"
                    title="Export JSON response dataset"
                  >
                    <Download className="w-3 h-3" />
                    <span>JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onExport(survey.id, 'csv')}
                    className="px-2.5 py-1 bg-white hover:bg-neo-mint text-black text-[10px] font-heavy uppercase border-2 border-black brutal-shadow-xs cursor-pointer flex items-center space-x-1"
                    title="Export CSV spreadsheet"
                  >
                    <Download className="w-3 h-3" />
                    <span>CSV</span>
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  playClickSound();
                  onClose();
                }}
                className="p-1.5 bg-black text-white hover:bg-neo-pink transition-colors border-2 border-black cursor-pointer"
                title="Close modal"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b-3 border-black bg-[#0E1017] px-4 pt-2 shrink-0 space-x-2">
            <button
              onClick={() => {
                playClickSound();
                setActiveTab('analytics');
              }}
              className={`px-4 py-2 font-mono text-xs uppercase border-t-3 border-l-3 border-r-3 border-black transition-colors cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'analytics'
                  ? 'bg-[#151822] text-neo-yellow font-heavy -mb-[3px] pb-2.5'
                  : 'bg-[#1E2333] text-slate-400 hover:text-white font-bold'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>QUESTION BREAKDOWNS</span>
            </button>
            <button
              onClick={() => {
                playClickSound();
                setActiveTab('responses');
              }}
              className={`px-4 py-2 font-mono text-xs uppercase border-t-3 border-l-3 border-r-3 border-black transition-colors cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'responses'
                  ? 'bg-[#151822] text-neo-yellow font-heavy -mb-[3px] pb-2.5'
                  : 'bg-[#1E2333] text-slate-400 hover:text-white font-bold'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>RAW RESPONSES ({responses.length})</span>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
            {/* AI Sentiment & Takeaways Card */}
            <div className="p-4 sm:p-5 bg-[#171A28] border-3 border-black brutal-shadow-pink space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 bg-neo-pink text-white border border-black flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="font-heavy text-xs uppercase tracking-tight text-white">
                    AI EXECUTIVE SENTIMENT & TAKEAWAYS (MESH API)
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
                    className="px-3 py-1 bg-neo-pink hover:bg-[#FF4782] text-white text-[10px] font-heavy uppercase border-2 border-black brutal-shadow-xs flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className={`w-3 h-3 ${isSummarizing ? 'animate-spin' : ''}`} />
                    <span>
                      {isSummarizing
                        ? 'SYNTHESIZING...'
                        : survey.aiSummary
                        ? 'RE-SYNTHESIZE WITH AI'
                        : 'SYNTHESIZE TAKEAWAYS'}
                    </span>
                  </button>
                )}
              </div>

              {survey.aiSummary ? (
                <div className="space-y-3 font-sans pt-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center space-x-1.5 font-mono font-black text-xs">
                      <span className="text-slate-400 uppercase">OVERALL SENTIMENT:</span>
                      <span
                        className={`px-2.5 py-0.5 uppercase border-2 border-black text-[10px] font-heavy ${
                          survey.aiSummary.sentiment === 'positive'
                            ? 'bg-neo-mint text-black'
                            : survey.aiSummary.sentiment === 'negative'
                            ? 'bg-neo-pink text-white'
                            : 'bg-neo-yellow text-black'
                        }`}
                      >
                        {survey.aiSummary.sentiment.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 font-mono font-black text-xs">
                      <span className="text-slate-400 uppercase">HEALTH SCORE:</span>
                      <span className="px-2 py-0.5 bg-black text-neo-mint border border-black font-heavy">
                        {survey.aiSummary.score} / 100
                      </span>
                    </div>

                    <span className="text-xs font-mono text-slate-400">
                      Generated {new Date(survey.aiSummary.generatedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Key Takeaways & Direct Quotes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {survey.aiSummary.takeaways && survey.aiSummary.takeaways.length > 0 && (
                      <div className="p-3.5 bg-[#0E1017] border-2 border-black space-y-2 font-mono text-xs">
                        <span className="font-heavy text-neo-mint uppercase text-[11px] block">
                          ⭐ EXECUTIVE TAKEAWAYS & PATTERNS:
                        </span>
                        <ul className="space-y-1.5 text-slate-200">
                          {survey.aiSummary.takeaways.map((item, i) => (
                            <li key={i} className="flex items-start space-x-1.5 text-xs">
                              <span className="text-neo-mint shrink-0 font-bold">▶</span>
                              <span className="leading-snug">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {survey.aiSummary.keyQuotes && survey.aiSummary.keyQuotes.length > 0 && (
                      <div className="p-3.5 bg-[#0E1017] border-2 border-black space-y-2 font-mono text-xs">
                        <span className="font-heavy text-neo-yellow uppercase text-[11px] block">
                          💬 NOTABLE ATTENDEE QUOTES:
                        </span>
                        <ul className="space-y-1.5 text-slate-200">
                          {survey.aiSummary.keyQuotes.map((quote, i) => (
                            <li key={i} className="flex items-start space-x-1.5 text-xs italic">
                              <span className="text-neo-yellow shrink-0 font-bold not-italic">“</span>
                              <span className="leading-snug text-green-300">{quote}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#0E1017] border border-black text-center space-y-2">
                  <p className="text-xs text-slate-300 font-mono">
                    {responses.length > 0
                      ? 'Click "SYNTHESIZE TAKEAWAYS" above to generate an executive AI sentiment summary from all audience responses.'
                      : 'Waiting for attendee responses to be submitted before synthesizing AI takeaways.'}
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
                    className="p-4 sm:p-5 bg-[#171A28] border-3 border-black brutal-shadow space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2.5">
                        <span className="w-6 h-6 bg-neo-yellow text-black border-2 border-black text-xs font-heavy flex items-center justify-center shrink-0 mt-0.5">
                          {qIdx + 1}
                        </span>
                        <div>
                          <span className="px-1.5 py-0.2 bg-black text-neo-cyan text-[9px] font-heavy uppercase border border-black">
                            {item.type === 'rating'
                              ? '5-STAR RATING'
                              : item.type === 'choice'
                              ? 'CHOICE DISTRIBUTION'
                              : 'OPEN FEEDBACK'}
                          </span>
                          <h3 className="text-sm sm:text-base font-heavy uppercase text-white mt-0.5 leading-snug">
                            {item.question.title}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* 1. Rating Question Analytics */}
                    {item.type === 'rating' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        {/* Big Average Rating Pill */}
                        <div className="p-4 bg-[#0E1017] border-2 border-black flex flex-col items-center justify-center text-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            AVERAGE SCORE
                          </span>
                          <div className="text-4xl sm:text-5xl font-heavy text-neo-yellow mt-1 leading-none">
                            {item.average}
                          </div>
                          <div className="flex items-center space-x-1 mt-2 text-neo-yellow">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-4 h-4 ${
                                  s <= Math.round(Number(item.average))
                                    ? 'fill-neo-yellow text-neo-yellow'
                                    : 'fill-slate-800 text-slate-700'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono mt-2">
                            Based on {item.totalRatings} {item.totalRatings === 1 ? 'rating' : 'ratings'}
                          </span>
                        </div>

                        {/* Frequency Bars (5 Stars down to 1 Star) */}
                        <div className="md:col-span-2 space-y-2 font-mono text-xs bg-[#0E1017] p-3.5 border-2 border-black">
                          {[5, 4, 3, 2, 1].map((rating) => {
                            const count = item.distribution[rating] || 0;
                            const pct =
                              item.totalRatings > 0
                                ? Math.round((count / item.totalRatings) * 100)
                                : 0;
                            const tierName = RATING_TIER_NAMES[rating] || `${rating} Stars`;

                            return (
                              <div key={rating} className="space-y-0.5">
                                <div className="flex justify-between items-center text-[11px] font-bold">
                                  <span className="text-slate-300">
                                    {rating}★ — {tierName}
                                  </span>
                                  <span className="text-white">
                                    {count} ({pct}%)
                                  </span>
                                </div>
                                <div className="h-4 bg-[#1B2030] border border-black relative overflow-hidden">
                                  <div
                                    className="h-full bg-neo-yellow transition-all duration-500"
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
                              className="p-3 bg-[#0E1017] border-2 border-black space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-xs font-bold">
                                <div className="flex items-center space-x-2">
                                  <span className="w-5 h-5 bg-black text-neo-yellow border border-black flex items-center justify-center font-heavy text-[10px] shrink-0">
                                    {optLetter}
                                  </span>
                                  <span className="text-white truncate max-w-sm sm:max-w-md">
                                    {opt}
                                  </span>
                                </div>
                                <span className="font-heavy text-white shrink-0">
                                  {pct}% ({count})
                                </span>
                              </div>

                              <div className="h-4 bg-[#1B2030] border border-black relative overflow-hidden">
                                <div
                                  className={`h-full ${color} transition-all duration-500`}
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
                          <div className="p-4 bg-[#0E1017] border border-black text-center text-xs text-slate-400">
                            No open text feedback submitted for this question yet.
                          </div>
                        ) : (
                          item.textAnswers.map((txt, tIdx) => (
                            <div
                              key={tIdx}
                              className="p-3 bg-[#0E1017] border-2 border-black space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                <span className="text-neo-cyan uppercase flex items-center space-x-1">
                                  <User className="w-3 h-3" />
                                  <span>{txt.author || 'Anonymous'}</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  <span>{new Date(txt.time).toLocaleTimeString()}</span>
                                </span>
                              </div>
                              <p className="text-xs text-green-300 font-mono leading-relaxed bg-[#141724] p-2.5 border border-black">
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
                  <div className="p-8 bg-[#171A28] border-3 border-black text-center space-y-2">
                    <p className="text-xs text-slate-300">
                      No individual responses have been recorded yet.
                    </p>
                  </div>
                ) : (
                  responses.map((resp, rIdx) => (
                    <div
                      key={resp.id || rIdx}
                      className="p-4 sm:p-5 bg-[#171A28] border-3 border-black brutal-shadow space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-black pb-2 flex-wrap gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 bg-neo-mint text-black border border-black font-heavy text-xs flex items-center justify-center">
                            #{rIdx + 1}
                          </span>
                          <span className="font-heavy text-xs text-white uppercase">
                            {resp.attendee_name || 'Anonymous Attendee'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(resp.submitted_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="space-y-2 font-mono text-xs">
                        {survey.questions.map((q) => {
                          const answer = resp.answers[q.id];
                          return (
                            <div
                              key={q.id}
                              className="p-2.5 bg-[#0E1017] border border-black space-y-1"
                            >
                              <div className="text-[10px] font-bold text-slate-400 uppercase">
                                {q.title}:
                              </div>
                              <div className="font-heavy text-white">
                                {answer === undefined || answer === null || answer === '' ? (
                                  <span className="text-slate-600 italic">No answer provided</span>
                                ) : q.type === 'rating' ? (
                                  <span className="text-neo-yellow">
                                    {answer} / 5 Stars ({RATING_TIER_NAMES[Number(answer)] || ''})
                                  </span>
                                ) : (
                                  <span className="text-neo-mint">{String(answer)}</span>
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
