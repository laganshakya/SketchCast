import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  BarChart3,
  Rocket,
  XCircle,
  Trash2,
  Sparkles,
  ClipboardList,
  CheckCircle2,
  Clock,
  HelpCircle,
  Radio,
} from 'lucide-react';
import type { Survey, SurveyResponse, SurveyQuestion } from '../../types';
import { CreateSurveyModal, type SessionSurveyContext } from './CreateSurveyModal';
import { SurveyResponseForm } from './SurveyResponseForm';
import { SurveyResultsModal } from './SurveyResultsModal';
import { playClickSound, playPopSound } from '../../lib/soundFx';

interface SurveyTabProps {
  surveys: Survey[];
  activeSurvey: Survey | null;
  responsesBySurvey: Record<string, SurveyResponse[]>;
  userSubmittedIds: Set<string>;
  isHost: boolean;
  isSummarizing: string | null;
  sessionContext?: SessionSurveyContext;
  onCreateSurvey: (data: {
    title: string;
    description: string;
    questions: SurveyQuestion[];
    launchImmediately?: boolean;
  }) => void;
  onLaunchSurvey: (surveyId: string) => void;
  onCloseSurvey: (surveyId: string) => void;
  onDeleteSurvey: (surveyId: string) => void;
  onSubmitResponse: (surveyId: string, answers: Record<string, any>) => void;
  onGenerateAISummary: (surveyId: string) => Promise<any>;
  onExportResponses: (surveyId: string, format: 'json' | 'csv') => void;
}

export const SurveyTab: React.FC<SurveyTabProps> = ({
  surveys,
  activeSurvey,
  sessionContext,
  responsesBySurvey,
  userSubmittedIds,
  isHost,
  isSummarizing,
  onCreateSurvey,
  onLaunchSurvey,
  onCloseSurvey,
  onDeleteSurvey,
  onSubmitResponse,
  onGenerateAISummary,
  onExportResponses,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingResultsSurvey, setViewingResultsSurvey] = useState<Survey | null>(null);

  const pastSurveys = surveys.filter((s) => s.id !== activeSurvey?.id);

  // Compute stats across all surveys in the room
  const totalResponses = Object.values(responsesBySurvey).reduce(
    (sum, list) => sum + list.length,
    0
  );
  const aiSummariesCount = surveys.filter((s) => s.aiSummary).length;

  return (
    <div className="max-w-5xl mx-auto w-full space-y-5 sm:space-y-6 font-sans text-ink mb-4">
      {/* Top Banner & Control Deck */}
      <div className="bg-paper border border-hairline rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden card-noma">
        <div className="flex items-start sm:items-center space-x-4 z-10">
          <div className="w-12 h-12 bg-orange/10 text-orange border border-orange/20 rounded-2xl flex items-center justify-center shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="px-2.5 py-0.5 bg-orange/10 text-orange font-semibold text-[10px] rounded-full border border-orange/20">
                Audience Polling
              </span>
              <span className="px-2.5 py-0.5 bg-lime/20 text-ink font-semibold text-[10px] rounded-full border border-lime flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-orange" />
                <span>AI Synthesis</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-ink mt-1.5">
              Audience Feedback & Surveys
            </h1>
            <p className="text-xs text-muted mt-0.5 max-w-xl">
              Real-time multi-question polling, technical ratings, and deep sentiment analysis powered by Mesh AI.
            </p>
          </div>
        </div>

        {/* Host Actions & Room Stats */}
        <div className="flex items-center flex-wrap gap-3 z-10">
          {/* Quick Stats Chips */}
          <div className="hidden lg:flex items-center space-x-3.5 bg-paper-surface border border-hairline rounded-2xl px-4 py-2">
            <div className="text-right">
              <div className="text-[10px] font-mono font-semibold text-muted uppercase tracking-wider">Responses</div>
              <div className="text-sm font-mono font-bold text-ink leading-none">{totalResponses}</div>
            </div>
            <div className="w-px h-6 bg-hairline" />
            <div className="text-right">
              <div className="text-[10px] font-mono font-semibold text-muted uppercase tracking-wider">AI Insights</div>
              <div className="text-sm font-mono font-bold text-orange leading-none">{aiSummariesCount}</div>
            </div>
          </div>

          {isHost && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                playPopSound();
                setIsCreateModalOpen(true);
              }}
              className="w-full sm:w-auto px-5 py-2.5 btn-noma-orange font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 cursor-pointer transition-all shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Survey</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* 1. Active Survey Section */}
      {activeSurvey ? (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2 bg-paper p-4 border border-hairline rounded-3xl card-noma">
            <div className="flex items-center space-x-2.5">
              <div className="px-3 py-1 bg-orange/10 text-orange font-semibold text-xs rounded-full border border-orange/20 flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse text-orange" />
                <span>Broadcasting Live to Audience</span>
              </div>
              <span className="hidden sm:inline text-xs text-muted font-mono">
                ID: {activeSurvey.id.slice(-8)}
              </span>
            </div>

            {isHost && (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    playPopSound();
                    setViewingResultsSurvey(activeSurvey);
                  }}
                  className="px-3.5 py-1.5 bg-paper hover:bg-paper-surface text-ink text-xs font-semibold rounded-xl border border-hairline hover:border-ink cursor-pointer flex items-center space-x-1.5 transition-colors"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-orange" />
                  <span>View Live Results ({activeSurvey.responses_count})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onCloseSurvey(activeSurvey.id);
                  }}
                  className="px-3.5 py-1.5 bg-paper hover:bg-orange/15 text-muted hover:text-orange text-xs font-semibold rounded-xl border border-hairline hover:border-orange/30 cursor-pointer flex items-center space-x-1.5 transition-colors"
                  title="Close this survey to new submissions"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Close Survey</span>
                </button>
              </div>
            )}
          </div>

          {/* Attendee Response Form OR Host Overview */}
          <SurveyResponseForm
            survey={activeSurvey}
            isSubmitted={userSubmittedIds.has(activeSurvey.id)}
            onSubmit={(answers) => onSubmitResponse(activeSurvey.id, answers)}
            onViewResults={() => setViewingResultsSurvey(activeSurvey)}
          />
        </div>
      ) : (
        /* Empty State */
        <div className="bg-paper border border-hairline rounded-3xl p-8 sm:p-12 text-center space-y-4 card-noma relative overflow-hidden">
          <div className="w-14 h-14 bg-orange/15 dark:bg-orange/20 text-orange border border-orange/40 dark:border-orange/30 rounded-2xl mx-auto flex items-center justify-center shadow-xs">
            <ClipboardList className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <span className="px-2.5 py-0.5 bg-paper-surface text-ink border border-hairline-strong text-xs font-mono font-bold rounded-full uppercase tracking-wider">
              Standing By
            </span>
            <h3 className="text-lg sm:text-xl font-serif font-bold text-ink mt-2">
              No Active Audience Survey
            </h3>
            <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
              {isHost
                ? 'Launch a live survey from the button below or choose a pre-configured template to collect actionable audience sentiment.'
                : 'The presenter has not initiated an audience survey yet. Stand by — questions will appear here dynamically during the session.'}
            </p>
          </div>

          {isHost && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                playPopSound();
                setIsCreateModalOpen(true);
              }}
              className="px-5 py-2.5 btn-noma-orange font-semibold text-xs rounded-xl inline-flex items-center space-x-2 cursor-pointer shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create or Launch a Survey</span>
            </motion.button>
          )}
        </div>
      )}

      {/* 2. All / Past Surveys List (Archive & Drafts) */}
      {pastSurveys.length > 0 && (
        <div className="space-y-3.5 pt-4">
          <div className="flex items-center justify-between border-b border-hairline pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-orange" />
              <span className="font-bold text-xs sm:text-sm text-ink font-display">
                Survey Repository & Archives ({pastSurveys.length})
              </span>
            </div>
            <span className="text-[11px] text-muted font-mono">
              Click to view results or re-launch
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastSurveys.map((s) => {
              const responses = responsesBySurvey[s.id] || [];

              return (
                <motion.div
                  key={s.id}
                  whileHover={{ y: -2 }}
                  className="bg-paper border border-hairline rounded-3xl flex flex-col justify-between relative overflow-hidden transition-all hover:border-ink/40 group card-noma"
                >
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full border ${
                            s.status === 'closed'
                              ? 'bg-paper-surface text-muted border-hairline'
                              : 'bg-lime text-ink border-ink/20'
                          }`}
                        >
                          {s.status}
                        </span>
                        {s.aiSummary && (
                          <span className="px-2 py-0.5 bg-orange/10 text-orange text-[10px] font-mono font-bold uppercase rounded-full border border-orange/20 flex items-center space-x-1">
                            <Sparkles className="w-3 h-3" />
                            <span>AI Synthesized</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 text-[11px] text-muted font-mono">
                        <span className="flex items-center space-x-1 text-ink font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-orange" />
                          <span>{responses.length} {responses.length === 1 ? 'Response' : 'Responses'}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <HelpCircle className="w-3 h-3 text-muted" />
                          <span>{s.questions.length} Qs</span>
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-ink group-hover:text-orange transition-colors leading-snug font-serif">
                        {s.title}
                      </h3>
                      {s.description && (
                        <p className="text-xs text-muted mt-1 line-clamp-2 leading-relaxed">
                          {s.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Action Dock */}
                  <div className="p-3 sm:px-5 bg-paper-surface border-t border-hairline flex items-center justify-between gap-2 flex-wrap rounded-b-3xl">
                    <div className="flex items-center space-x-1 text-[11px] text-muted font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* View Results Button */}
                      <button
                        type="button"
                        onClick={() => {
                          playPopSound();
                          setViewingResultsSurvey(s);
                        }}
                        className="px-3 py-1.5 bg-paper hover:bg-paper-surface text-ink text-xs font-semibold rounded-xl border border-hairline hover:border-ink cursor-pointer flex items-center space-x-1 transition-colors"
                      >
                        <BarChart3 className="w-3 h-3 text-orange" />
                        <span>Results</span>
                      </button>

                      {/* Host Launch or Delete */}
                      {isHost && (
                        <>
                          {s.status !== 'active' && (
                            <button
                              type="button"
                              onClick={() => {
                                playPopSound();
                                onLaunchSurvey(s.id);
                              }}
                              className="px-3 py-1.5 btn-noma-orange text-xs font-semibold rounded-xl cursor-pointer flex items-center space-x-1 shadow-sm"
                              title="Launch this survey to the room"
                            >
                              <Rocket className="w-3 h-3" />
                              <span>Launch</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              playClickSound();
                              if (confirm(`Delete survey "${s.title}"?`)) {
                                onDeleteSurvey(s.id);
                              }
                            }}
                            className="p-1.5 bg-paper hover:bg-orange/15 text-muted hover:text-orange rounded-xl border border-hairline hover:border-orange/30 cursor-pointer transition-colors"
                            title="Delete survey cartridge"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateSurveyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateSurvey={onCreateSurvey}
        sessionContext={sessionContext}
      />

      {viewingResultsSurvey && (
        <SurveyResultsModal
          isOpen={Boolean(viewingResultsSurvey)}
          onClose={() => setViewingResultsSurvey(null)}
          survey={viewingResultsSurvey}
          responses={responsesBySurvey[viewingResultsSurvey.id] || []}
          isHost={isHost}
          onGenerateAISummary={onGenerateAISummary}
          onExport={onExportResponses}
          isSummarizing={isSummarizing === viewingResultsSurvey.id}
        />
      )}

      {/* Mobile Bottom Clearance Spacer */}
      <div className="h-10 sm:h-12 md:hidden w-full shrink-0 pointer-events-none" aria-hidden="true" />
    </div>
  );
};
