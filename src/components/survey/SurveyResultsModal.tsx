import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { X, Sparkles, Star, Download } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm font-sans">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 15 }}
        className="bg-neo-cream text-black w-full max-w-3xl border-4 border-black brutal-shadow-lg relative flex flex-col max-h-[90vh] overflow-hidden font-mono"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-neo-yellow border-b-4 border-black flex items-start justify-between shrink-0 gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-black text-neo-yellow text-[9px] font-black uppercase">
                SURVEY ANALYTICS
              </span>
              <span className={`px-2 py-0.5 text-[9px] font-black uppercase border border-black ${
                survey.status === 'active' ? 'bg-[#00F59B] text-black' : 'bg-slate-200 text-slate-800'
              }`}>
                {survey.status.toUpperCase()}
              </span>
              <span className="text-[10px] font-bold text-slate-900">
                {responses.length} {responses.length === 1 ? 'Response' : 'Responses'}
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
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-black text-[10px] font-black uppercase border-2 border-black cursor-pointer flex items-center space-x-1"
                  title="Export JSON"
                >
                  <Download className="w-3 h-3" />
                  <span>JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => onExport(survey.id, 'csv')}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-black text-[10px] font-black uppercase border-2 border-black cursor-pointer flex items-center space-x-1"
                  title="Export CSV"
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
              title="Close"
            >
              <X className="w-4 h-4 stroke-3" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b-3 border-black bg-[#FAF8F2] px-4 pt-2 shrink-0 space-x-2">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-1.5 font-mono text-xs font-black uppercase border-t-2 border-l-2 border-r-2 border-black transition-colors cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-neo-cream text-black -mb-[3px] pb-2 border-b-3 border-b-neo-cream'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            Question Breakdowns
          </button>
          <button
            onClick={() => setActiveTab('responses')}
            className={`px-4 py-1.5 font-mono text-xs font-black uppercase border-t-2 border-l-2 border-r-2 border-black transition-colors cursor-pointer ${
              activeTab === 'responses'
                ? 'bg-neo-cream text-black -mb-[3px] pb-2 border-b-3 border-b-neo-cream'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            Raw Responses ({responses.length})
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* AI Sentiment & Takeaways Card */}
          <div className="p-4 bg-[#F2ECDD] border-3 border-black brutal-shadow-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-neo-pink text-white border border-black flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="font-heavy text-xs uppercase tracking-tight text-black">
                  AI EXECUTIVE SENTIMENT & TAKEAWAYS
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
                  className="px-3 py-1 bg-neo-pink hover:bg-[#FF4782] text-white text-[10px] font-black uppercase border-2 border-black brutal-shadow-sm flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-3 h-3 ${isSummarizing ? 'animate-spin' : ''}`} />
                  <span>{isSummarizing ? 'SYNTHESIZING...' : survey.aiSummary ? 'RE-SYNTHESIZE' : 'SYNTHESIZE TAKEAWAYS'}</span>
                </button>
              )}
            </div>

            {survey.aiSummary ? (
              <div className="space-y-3 font-sans pt-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center space-x-1.5 font-mono font-black text-xs">
                    <span>SENTIMENT:</span>
                    <span
                      className={`px-2 py-0.5 uppercase border border-black text-[10px] ${
                        survey.aiSummary.sentiment === 'positive'
                          ? 'bg-[#00F59B] text-black'
                          : survey.aiSummary.sentiment === 'negative'
                          ? 'bg-red-500 text-white'
                          : 'bg-neo-yellow text-black'
                      }`}
                    >
                      {survey.aiSummary.sentiment.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 font-mono font-black text-xs">
                    <span>SATISFACTION SCORE:</span>
                    <span className="px-2 py-0.5 bg-black text-neo-yellow border border-black text-[10px]">
                      {survey.aiSummary.score} / 100
                    </span>
                  </div>
                </div>

                {/* Takeaways List */}
                {survey.aiSummary.takeaways && survey.aiSummary.takeaways.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-mono font-black text-[10px] uppercase text-slate-800">
                      Key Takeaways:
                    </span>
                    <ul className="space-y-1 text-xs text-slate-900 font-medium list-disc list-inside">
                      {survey.aiSummary.takeaways.map((t, idx) => (
                        <li key={idx} className="leading-snug">
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Notable Quotes */}
                {survey.aiSummary.keyQuotes && survey.aiSummary.keyQuotes.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="font-mono font-black text-[10px] uppercase text-slate-800">
                      Notable Audience Quotes:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {survey.aiSummary.keyQuotes.map((quote, idx) => (
                        <div key={idx} className="p-2 bg-white border border-black text-[11px] italic text-slate-800">
                          &ldquo;{quote}&rdquo;
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-700 font-sans italic">
                {isHost
                  ? responses.length === 0
                    ? 'No responses submitted yet. AI summary will be available once attendees begin submitting.'
                    : 'Click "SYNTHESIZE TAKEAWAYS" to analyze attendee ratings and qualitative responses with Mesh AI.'
                  : 'AI executive takeaways and sentiment analysis have not been published by the host yet.'}
              </p>
            )}
          </div>

          {/* 1. Analytics View */}
          {activeTab === 'analytics' && (
            <div className="space-y-4">
              {analytics.map((item, idx) => {
                const q = item.question;

                return (
                  <div key={q.id} className="p-4 bg-white border-2 border-black brutal-shadow-sm space-y-3">
                    <div className="flex items-start space-x-2">
                      <span className="w-5 h-5 bg-black text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs sm:text-sm font-heavy uppercase tracking-tight text-black">
                            {q.title}
                          </span>
                          <span className="px-1.5 py-0.2 bg-slate-200 text-black text-[8px] font-black uppercase border border-black">
                            {q.type.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Star Rating Breakdown */}
                    {item.type === 'rating' && (
                      <div className="pl-7 space-y-2">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            <Star className="w-5 h-5 fill-neo-yellow text-black stroke-[1.8]" />
                            <span className="text-lg font-black text-black">{item.average}</span>
                            <span className="text-xs text-slate-500 font-bold">/ 5.0</span>
                          </div>
                          <span className="text-[11px] text-slate-600 font-sans">
                            ({item.totalRatings} ratings)
                          </span>
                        </div>

                        {/* Distribution Bars */}
                        <div className="space-y-1 max-w-sm pt-1">
                          {[5, 4, 3, 2, 1].map((star) => {
                            const count = item.distribution[star] || 0;
                            const pct = item.totalRatings > 0 ? (count / item.totalRatings) * 100 : 0;
                            return (
                              <div key={star} className="flex items-center text-[10px] space-x-2">
                                <span className="w-8 font-bold">{star} ★</span>
                                <div className="flex-1 bg-slate-200 h-3 border border-black overflow-hidden">
                                  <div
                                    className="bg-neo-yellow h-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="w-8 text-right font-mono font-bold text-slate-700">
                                  {count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Multiple Choice Breakdown */}
                    {item.type === 'choice' && (
                      <div className="pl-7 space-y-2">
                        <div className="space-y-1.5">
                          {Object.entries(item.optionCounts).map(([opt, count], optIdx) => {
                            const pct =
                              item.totalAnswered > 0 ? Math.round((count / item.totalAnswered) * 100) : 0;
                            return (
                              <div key={optIdx} className="space-y-0.5">
                                <div className="flex justify-between text-[11px] font-bold">
                                  <span className="text-slate-900">{opt}</span>
                                  <span className="text-black font-mono">
                                    {count} ({pct}%)
                                  </span>
                                </div>
                                <div className="bg-slate-200 h-3 border border-black overflow-hidden">
                                  <div
                                    className="bg-neo-mint h-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Text Answers Snippets */}
                    {item.type === 'text' && (
                      <div className="pl-7 space-y-2">
                        {item.textAnswers.length === 0 ? (
                          <p className="text-xs text-slate-500 italic font-sans">
                            No written responses yet.
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {item.textAnswers.map((ans, aIdx) => (
                              <div key={aIdx} className="p-2 bg-[#FAF8F5] border border-black font-sans text-xs">
                                <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 mb-1">
                                  <span className="font-bold text-black">{ans.author}</span>
                                  <span>{new Date(ans.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-slate-900 leading-snug">{ans.text}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. Raw Responses View */}
          {activeTab === 'responses' && (
            <div className="space-y-3">
              {responses.length === 0 ? (
                <div className="p-6 bg-white border-2 border-black text-center text-xs text-slate-600">
                  No responses collected yet.
                </div>
              ) : (
                responses.map((resp, idx) => (
                  <div key={resp.id} className="p-3.5 bg-white border-2 border-black brutal-shadow-sm space-y-2">
                    <div className="flex items-center justify-between border-b border-black/20 pb-1.5 text-xs">
                      <span className="font-heavy text-black">
                        #{idx + 1} — {resp.attendee_name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(resp.submitted_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {survey.questions.map((q) => {
                        const val = resp.answers[q.id];
                        return (
                          <div key={q.id} className="flex flex-col sm:flex-row sm:items-baseline gap-1 text-[11px]">
                            <span className="font-bold text-slate-700 min-w-40">
                              {q.title}:
                            </span>
                            <span className="font-sans font-medium text-black">
                              {q.type === 'rating' ? `${val} / 5 Stars ★` : String(val || '—')}
                            </span>
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
  );
};
