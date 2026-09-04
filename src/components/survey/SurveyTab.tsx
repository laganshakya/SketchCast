import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, BarChart3, Rocket, XCircle, Trash2, FileText } from 'lucide-react';
import type { Survey, SurveyResponse, SurveyQuestion } from '../../types';
import { CreateSurveyModal } from './CreateSurveyModal';
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

  return (
    <div className="space-y-6 font-mono">
      {/* Top Banner & Host Controls */}
      <div className="bg-neo-yellow border-4 border-black brutal-shadow p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 bg-black text-white border-2 border-black flex items-center justify-center brutal-shadow-sm shrink-0">
            <FileText className="w-6 h-6 text-neo-yellow" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-heavy uppercase tracking-tight text-black">
                AUDIENCE FEEDBACK & SURVEYS
              </h1>
              <span className="px-1.5 py-0.2 bg-black text-[#00F59B] text-[9px] font-black uppercase">
                AI SYNTHESIZED
              </span>
            </div>
            <p className="text-xs text-slate-900 font-sans mt-0.5">
              Structured multi-question feedback, rating scales, and AI executive sentiment summaries.
            </p>
          </div>
        </div>

        {isHost && (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              playPopSound();
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 bg-black hover:bg-slate-900 text-white text-xs font-mono font-black uppercase border-2 border-black brutal-shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-neo-yellow stroke-3" />
            <span>CREATE SURVEY</span>
          </motion.button>
        )}
      </div>

      {/* 1. Active Survey Section */}
      {activeSurvey ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-heavy text-xs uppercase tracking-tight text-black flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>CURRENTLY ACTIVE SURVEY</span>
            </span>
            {isHost && (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    playPopSound();
                    setViewingResultsSurvey(activeSurvey);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-neo-yellow text-black text-[11px] font-black uppercase border-2 border-black brutal-shadow-sm cursor-pointer flex items-center space-x-1"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>VIEW LIVE RESULTS ({activeSurvey.responses_count})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onCloseSurvey(activeSurvey.id);
                  }}
                  className="px-2.5 py-1 bg-slate-200 hover:bg-red-200 text-slate-800 text-[11px] font-black uppercase border-2 border-black cursor-pointer flex items-center space-x-1"
                  title="Close this survey to new submissions"
                >
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                  <span>CLOSE</span>
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
        <div className="p-6 bg-white border-3 border-black text-center font-mono space-y-2 brutal-shadow-sm">
          <p className="text-xs font-bold text-slate-800 uppercase">
            No survey is currently active in this room.
          </p>
          {isHost ? (
            <p className="text-xs text-slate-600 font-sans">
              Click &ldquo;CREATE SURVEY&rdquo; above or launch a draft survey below to collect live audience feedback.
            </p>
          ) : (
            <p className="text-xs text-slate-600 font-sans">
              The speaker has not launched a feedback survey yet. Check back during or at the end of the session!
            </p>
          )}
        </div>
      )}

      {/* 2. All / Past Surveys List (Host or Attendee Archive) */}
      {pastSurveys.length > 0 && (
        <div className="space-y-3 pt-2">
          <span className="font-heavy text-xs uppercase tracking-tight text-black">
            ALL / PAST SURVEYS ({pastSurveys.length})
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pastSurveys.map((s) => (
              <div
                key={s.id}
                className="p-4 bg-white border-3 border-black brutal-shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-1.5 py-0.2 text-[8px] font-black uppercase border border-black ${
                        s.status === 'closed' ? 'bg-slate-200 text-slate-800' : 'bg-[#FAF8F5] text-slate-600'
                      }`}
                    >
                      {s.status.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">
                      {s.responses_count} {s.responses_count === 1 ? 'Response' : 'Responses'}
                    </span>
                  </div>
                  <h3 className="font-heavy text-sm uppercase tracking-tight text-black mt-1 line-clamp-1">
                    {s.title}
                  </h3>
                  <p className="text-xs text-slate-600 font-sans mt-0.5 line-clamp-2">
                    {s.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-black/20 gap-2 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-bold">
                    {s.questions.length} Questions
                  </span>

                  <div className="flex items-center space-x-1.5">
                    {/* View Results Button */}
                    <button
                      type="button"
                      onClick={() => {
                        playPopSound();
                        setViewingResultsSurvey(s);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-neo-yellow text-black text-[10px] font-black uppercase border border-black cursor-pointer flex items-center space-x-1"
                    >
                      <BarChart3 className="w-3 h-3" />
                      <span>RESULTS</span>
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
                            className="px-2.5 py-1 bg-neo-mint hover:bg-[#33F3FF] text-black text-[10px] font-black uppercase border border-black cursor-pointer flex items-center space-x-1"
                            title="Launch this survey to the room"
                          >
                            <Rocket className="w-3 h-3" />
                            <span>LAUNCH</span>
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
                          className="p-1 hover:bg-red-100 text-red-700 border border-transparent hover:border-black cursor-pointer"
                          title="Delete survey"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateSurveyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateSurvey={onCreateSurvey}
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
    </div>
  );
};
