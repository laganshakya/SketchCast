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

  // Compute stats across all surveys in the room
  const totalResponses = Object.values(responsesBySurvey).reduce(
    (sum, list) => sum + list.length,
    0
  );
  const aiSummariesCount = surveys.filter((s) => s.aiSummary).length;

  const getAccentColorClass = (idx: number) => {
    const accents = ['bg-neo-yellow', 'bg-neo-cyan', 'bg-neo-mint', 'bg-neo-pink', 'bg-neo-purple'];
    return accents[idx % accents.length];
  };

  return (
    <div className="space-y-6 font-mono text-white pb-12">
      {/* Top Banner & Control Deck */}
      <div className="bg-[#151822] border-4 border-black brutal-shadow-lg p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        {/* Neon corner badge */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-neo-yellow/10 pointer-events-none -mr-8 -mt-8 rotate-45 border-b-2 border-black" />

        <div className="flex items-start sm:items-center space-x-3.5 z-10">
          <div className="w-12 h-12 bg-neo-yellow text-black border-3 border-black flex items-center justify-center brutal-shadow-sm shrink-0">
            <ClipboardList className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="px-2 py-0.5 bg-neo-cyan text-black font-black text-[10px] uppercase border border-black brutal-shadow-xs">
                TELEMETRY // V2.0
              </span>
              <span className="px-2 py-0.5 bg-neo-mint text-black font-black text-[10px] uppercase border border-black flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>AI EXECUTIVE SYNTHESIS</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-heavy uppercase tracking-tight text-white mt-1">
              AUDIENCE FEEDBACK & SURVEYS
            </h1>
            <p className="text-xs text-slate-300 font-sans mt-0.5 max-w-xl">
              Real-time multi-question polling, technical ratings, and deep sentiment analysis powered by Mesh AI.
            </p>
          </div>
        </div>

        {/* Host Actions & Room Stats */}
        <div className="flex items-center flex-wrap gap-2.5 z-10">
          {/* Quick Stats Chips */}
          <div className="hidden lg:flex items-center space-x-2 bg-[#0E1017] border-2 border-black px-3 py-2 brutal-shadow-xs">
            <div className="text-right">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">RESPONSES</div>
              <div className="text-sm font-heavy text-neo-mint leading-none">{totalResponses}</div>
            </div>
            <div className="w-px h-6 bg-slate-700 mx-1" />
            <div className="text-right">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">AI INSIGHTS</div>
              <div className="text-sm font-heavy text-neo-yellow leading-none">{aiSummariesCount}</div>
            </div>
          </div>

          {isHost && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                playPopSound();
                setIsCreateModalOpen(true);
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-neo-yellow hover:bg-neo-mint text-black font-heavy text-xs uppercase border-3 border-black brutal-shadow flex items-center justify-center space-x-2 cursor-pointer transition-all shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>CREATE NEW SURVEY</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* 1. Active Survey Section */}
      {activeSurvey ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 bg-[#12141D] p-3 border-3 border-black brutal-shadow-sm">
            <div className="flex items-center space-x-2">
              <div className="px-2.5 py-1 bg-neo-pink text-black font-heavy text-xs uppercase border-2 border-black flex items-center space-x-1.5 animate-pulse">
                <Radio className="w-3.5 h-3.5" />
                <span>BROADCASTING LIVE TO AUDIENCE</span>
              </div>
              <span className="hidden sm:inline font-bold text-xs text-slate-300">
                [ ID: {activeSurvey.id.slice(-8)} ]
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
                  className="px-3 py-1.5 bg-neo-cyan hover:bg-neo-yellow text-black text-xs font-heavy uppercase border-2 border-black brutal-shadow-xs cursor-pointer flex items-center space-x-1.5 transition-colors"
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
                  className="px-3 py-1.5 bg-[#FF2A6D] hover:bg-red-600 text-white text-xs font-heavy uppercase border-2 border-black brutal-shadow-xs cursor-pointer flex items-center space-x-1.5 transition-colors"
                  title="Close this survey to new submissions"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>CLOSE SURVEY</span>
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
        <div className="bg-[#151822] border-4 border-black p-8 sm:p-12 text-center font-mono space-y-4 brutal-shadow-lg relative overflow-hidden">
          <div className="w-16 h-16 bg-[#1F2433] text-neo-yellow border-3 border-black mx-auto flex items-center justify-center brutal-shadow-sm">
            <ClipboardList className="w-8 h-8 stroke-[2]" />
          </div>

          <div className="space-y-1">
            <span className="px-2 py-0.5 bg-black text-neo-cyan border border-black text-[10px] font-black uppercase tracking-wider">
              TELEMETRY STANDBY
            </span>
            <h3 className="text-lg sm:text-xl font-heavy uppercase tracking-tight text-white mt-2">
              NO ACTIVE AUDIENCE SURVEY
            </h3>
            <p className="text-xs text-slate-300 font-sans max-w-md mx-auto leading-relaxed">
              {isHost
                ? 'Launch a live survey from the button below or choose a pre-configured template to collect actionable audience sentiment.'
                : 'The presenter has not initiated an audience survey yet. Stand by — questions will appear here dynamically during the session.'}
            </p>
          </div>

          {isHost && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                playPopSound();
                setIsCreateModalOpen(true);
              }}
              className="px-5 py-2.5 bg-neo-yellow hover:bg-neo-mint text-black font-heavy text-xs uppercase border-3 border-black brutal-shadow inline-flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>CREATE OR LAUNCH A SURVEY</span>
            </motion.button>
          )}
        </div>
      )}

      {/* 2. All / Past Surveys List (Archive & Drafts) */}
      {pastSurveys.length > 0 && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between border-b-2 border-black pb-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-neo-pink border border-black" />
              <span className="font-heavy text-xs sm:text-sm uppercase tracking-tight text-white">
                SURVEY REPOSITORY & ARCHIVES ({pastSurveys.length})
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              CLICK TO VIEW RESULTS OR RE-LAUNCH
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastSurveys.map((s, idx) => {
              const accentColor = getAccentColorClass(idx);
              const responses = responsesBySurvey[s.id] || [];

              return (
                <motion.div
                  key={s.id}
                  whileHover={{ y: -2 }}
                  className="bg-[#151822] border-3 border-black brutal-shadow flex flex-col justify-between relative overflow-hidden transition-all group"
                >
                  {/* Left accent color strip */}
                  <div className={`absolute top-0 bottom-0 left-0 w-2.5 ${accentColor}`} />

                  <div className="p-4 sm:p-5 pl-5 sm:pl-6 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`px-2 py-0.5 text-[9px] font-black uppercase border-2 border-black ${
                            s.status === 'closed'
                              ? 'bg-slate-700 text-slate-200'
                              : 'bg-neo-yellow text-black'
                          }`}
                        >
                          {s.status.toUpperCase()}
                        </span>
                        {s.aiSummary && (
                          <span className="px-1.5 py-0.5 bg-neo-mint text-black text-[9px] font-black uppercase border border-black flex items-center space-x-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>AI SYNTHESIZED</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400">
                        <span className="flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-neo-mint" />
                          <span>{responses.length} {responses.length === 1 ? 'Response' : 'Responses'}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <HelpCircle className="w-3 h-3 text-neo-cyan" />
                          <span>{s.questions.length} Qs</span>
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-heavy text-sm sm:text-base uppercase tracking-tight text-white group-hover:text-neo-yellow transition-colors leading-snug">
                        {s.title}
                      </h3>
                      {s.description && (
                        <p className="text-xs text-slate-300 font-sans mt-1 line-clamp-2 leading-relaxed">
                          {s.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Action Dock */}
                  <div className="p-3 pl-5 sm:pl-6 bg-[#0E1017] border-t-2 border-black flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-mono">
                      <Clock className="w-3 h-3 text-slate-500" />
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
                        className="px-3 py-1 bg-white hover:bg-neo-yellow text-black text-xs font-heavy uppercase border-2 border-black brutal-shadow-xs cursor-pointer flex items-center space-x-1 transition-colors"
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
                              className="px-3 py-1 bg-neo-mint hover:bg-neo-cyan text-black text-xs font-heavy uppercase border-2 border-black brutal-shadow-xs cursor-pointer flex items-center space-x-1 transition-colors"
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
                            className="p-1 bg-[#1A1D28] hover:bg-red-500 text-slate-300 hover:text-white border-2 border-black cursor-pointer transition-colors"
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
