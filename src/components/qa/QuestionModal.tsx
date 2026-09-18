import React, { useState, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, ShieldAlert, VolumeX, AlertTriangle, ThumbsUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playClickSound, playPopSound, playWhoosh } from '../../lib/soundFx';
import { moderateQuestionWithMeshAI, detectDuplicateQuestionWithAI } from '../../lib/meshApi';
import type { Question } from '../../types';

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => void;
  userName: string;
  roomCode?: string;
  sessionId?: string;
  isMuted?: boolean;
  currentStrikes?: number;
  existingQuestions?: Question[];
  onUpvoteExisting?: (questionId: string) => void;
  onSafeguardViolation?: (data: {
    strikeCount: number;
    reason: string;
    category?: string;
    sampleText: string;
  }) => void;
  onRecordStrike?: (count: number) => void;
}



export const QuestionModal: React.FC<QuestionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  userName,
  roomCode = 'SKT-789',
  sessionId = 'self',
  isMuted = false,
  currentStrikes,
  existingQuestions = [],
  onUpvoteExisting,
  onSafeguardViolation,
  onRecordStrike,
}) => {
  const [content, setContent] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [moderationError, setModerationError] = useState<{
    reason: string;
    category?: string;
    strikes?: number;
  } | null>(null);

  const [duplicateWarning, setDuplicateWarning] = useState<{
    matchedQuestionId: string;
    matchedQuestionContent?: string;
    reason: string;
  } | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  const strikeKey = `sketchcast_strikes_${roomCode.toUpperCase().trim()}_${sessionId}`;

  const getStoredStrikes = useCallback((): number => {
    try {
      const stored = localStorage.getItem(strikeKey);
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }, [strikeKey]);

  const [localStrikes, setLocalStrikes] = useState<number>(getStoredStrikes);

  const effectiveStrikes = currentStrikes !== undefined ? currentStrikes : localStrikes;

  useEffect(() => {
    if (!isOpen || !existingQuestions || existingQuestions.length === 0) return;
    const trimmed = content.trim();
    if (trimmed.length < 12) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingDuplicate(true);
      try {
        const res = await detectDuplicateQuestionWithAI(trimmed, existingQuestions);
        if (res.isDuplicate && res.matchedQuestionId) {
          setDuplicateWarning({
            matchedQuestionId: res.matchedQuestionId,
            matchedQuestionContent: res.matchedQuestionContent,
            reason: res.reason || 'A very similar question is already active in the live feed.',
          });
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        // ignore
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [content, isOpen, existingQuestions]);

  const handleContentChange = (val: string) => {
    setContent(val);
    if (moderationError) {
      setModerationError(null);
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMuted) return;
    const cleanContent = content.trim();
    if (!cleanContent || isChecking) return;

    setIsChecking(true);
    setModerationError(null);

    try {
      const result = await moderateQuestionWithMeshAI(cleanContent);
      if (!result.isSafe) {
        playPopSound();
        const nextStrikes = effectiveStrikes + 1;
        setLocalStrikes(nextStrikes);
        try {
          localStorage.setItem(strikeKey, String(nextStrikes));
        } catch {
          // ignore
        }

        onRecordStrike?.(nextStrikes);

        const reason = result.reason || 'Flagged by AI safety guidelines.';
        setModerationError({
          reason,
          category: result.category,
          strikes: nextStrikes,
        });

        // If hits 3+ strikes, alert the host & admins
        if (nextStrikes >= 3 && onSafeguardViolation) {
          onSafeguardViolation({
            strikeCount: nextStrikes,
            reason,
            category: result.category,
            sampleText: cleanContent.slice(0, 140),
          });
        }

        setIsChecking(false);
        return;
      }

      playWhoosh();
      onSubmit(cleanContent);
      setContent('');
      setModerationError(null);
      setIsChecking(false);
      onClose();
    } catch (err) {
      console.warn('[QuestionModal] Moderation check failed, passing question through:', err);
      playWhoosh();
      onSubmit(cleanContent);
      setContent('');
      setModerationError(null);
      setIsChecking(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md font-sans"
        >
          <motion.div
            initial={{ scale: 0.95, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 12, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-[#0E0E11] text-white w-[95vw] sm:max-w-lg p-4 sm:p-6 border border-white/[0.08] rounded-2xl shadow-modal relative font-sans max-h-[90dvh] overflow-y-auto"
          >
            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                playClickSound();
                setModerationError(null);
                onClose();
              }}
              className="absolute top-4 right-4 p-2 bg-[#16161A] text-zinc-400 hover:text-white rounded-xl border border-white/[0.08] hover:border-zinc-700 transition-colors cursor-pointer z-10"
              title="Close modal"
            >
              <X className="w-4 h-4 stroke-2" />
            </motion.button>

            {/* Header */}
            <div className="flex items-start space-x-3 mb-5 pr-10">
              <div className="w-10 h-10 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-semibold text-white leading-tight">
                    Submit Architecture Question
                  </h3>
                </div>
                <div className="flex items-center space-x-2 mt-1.5 flex-wrap gap-y-1">
                  <p className="text-xs text-zinc-400">
                    Posting as <span className="font-semibold text-white bg-[#181822] px-2 py-0.5 rounded-md border border-white/[0.08]">{userName}</span>
                  </p>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                    AI Safeguarded
                  </span>
                  {effectiveStrikes > 0 && (
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                      effectiveStrikes >= 3
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                        : effectiveStrikes === 2
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      Strikes: {effectiveStrikes}/3
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* MUTED WARNING BANNER */}
            {isMuted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-200 text-xs flex items-start space-x-2.5 mb-3.5"
              >
                <VolumeX className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs text-rose-400 flex items-center gap-2">
                    <span>You have been muted by the host</span>
                    <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-semibold rounded-full border border-rose-500/30">
                      Silenced
                    </span>
                  </div>
                  <div className="text-xs text-zinc-300 mt-1 leading-snug">
                    Your ability to submit Q&A questions has been restricted due to repeated policy violations. You can still participate in live polls and interactive quizzes.
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2nd STRIKE URGENT WARNING BANNER */}
            {!isMuted && effectiveStrikes === 2 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-200 text-xs flex items-start space-x-2.5 mb-3.5"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs text-amber-300 flex items-center justify-between flex-wrap gap-1">
                    <span>⚠️ 2nd Strike Warning (2/3)</span>
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-semibold rounded-full border border-amber-500/30">
                      Final Chance
                    </span>
                  </div>
                  <div className="text-xs text-zinc-300 mt-1 leading-snug">
                    You have incurred 2 safeguard strikes. One more inappropriate, offensive, or off-topic question will immediately notify the host to mute or ban you!
                  </div>
                </div>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <textarea
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder={
                    isMuted
                      ? 'You are currently muted from submitting questions by the host.'
                      : 'Ask an architecture question or challenge the speaker with a system design problem...'
                  }
                  rows={3}
                  maxLength={280}
                  disabled={isChecking || isMuted}
                  className="w-full p-3 bg-[#16161A] border border-white/[0.08] rounded-xl text-xs font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none transition-colors disabled:bg-[#121215] disabled:text-zinc-600 disabled:cursor-not-allowed"
                  autoFocus={!isMuted}
                />
                <div className="flex justify-between items-center text-[11px] font-medium text-zinc-500 mt-1.5 flex-wrap gap-1">
                  <span>
                    {isCheckingDuplicate
                      ? 'AI scanning for existing similar questions...'
                      : 'Mesh AI validates questions for technical dialogue.'}
                  </span>
                  <span className="font-mono">{content.length}/280</span>
                </div>
              </div>

              {/* Semantic Duplicate Question Alert */}
              <AnimatePresence>
                {duplicateWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    className="p-3.5 bg-[#14141E] border border-blue-500/30 rounded-xl space-y-2.5 text-zinc-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs flex items-center gap-1.5 text-blue-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Similar Question Detected</span>
                      </span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                        AI Suggestion
                      </span>
                    </div>

                    {duplicateWarning.matchedQuestionContent && (
                      <p className="text-xs italic bg-[#101016] p-2.5 rounded-lg border border-white/[0.08] text-zinc-300">
                        "{duplicateWarning.matchedQuestionContent}"
                      </p>
                    )}

                    <p className="text-xs text-zinc-400">
                      {duplicateWarning.reason}
                    </p>

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {onUpvoteExisting && (
                        <button
                          type="button"
                          onClick={() => {
                            playPopSound();
                            onUpvoteExisting(duplicateWarning.matchedQuestionId);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl border border-blue-500/40 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>Upvote Instead</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDuplicateWarning(null)}
                        className="px-3 py-1.5 bg-[#16161A] hover:bg-[#1E1E24] text-zinc-300 hover:text-white text-xs font-semibold rounded-xl border border-white/[0.08] cursor-pointer transition-colors"
                      >
                        Continue Asking Anyway
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* AI Safeguard Alert Banner */}
              <AnimatePresence>
                {moderationError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-200 text-xs flex items-start space-x-2.5"
                  >
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs flex items-center justify-between flex-wrap gap-1">
                        <span className="text-rose-400">AI Safeguard Violation</span>
                        <div className="flex items-center space-x-1.5">
                          {moderationError.category && (
                            <span className="px-2 py-0.5 bg-black/40 text-zinc-300 text-[10px] font-semibold rounded-md border border-white/[0.08]">
                              {moderationError.category}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                            (moderationError.strikes || 1) >= 3 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}>
                            Strike {moderationError.strikes || 1}/3
                          </span>
                        </div>
                      </div>
                      <div className="text-xs mt-1.5 text-zinc-300 leading-snug">
                        {moderationError.reason}
                      </div>
                      {moderationError.strikes && moderationError.strikes >= 3 ? (
                        <div className="text-xs text-amber-300 font-semibold mt-2 bg-black/40 p-2 rounded-lg border border-amber-500/30">
                          ⚠️ 3 Strikes Reached: Room Host and Admins have been notified.
                        </div>
                      ) : moderationError.strikes === 2 ? (
                        <div className="text-xs text-amber-300 font-semibold mt-2 bg-black/40 p-2 rounded-lg border border-amber-500/30">
                          ⚠️ 2nd Strike Warning: One more strike will alert the host to mute or ban you.
                        </div>
                      ) : (
                        <div className="text-[11px] text-zinc-400 mt-1.5">
                          Please revise your question to be constructive and technical.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex flex-col-reverse xs:flex-row items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    playClickSound();
                    setModerationError(null);
                    onClose();
                  }}
                  className="w-full xs:w-auto px-4 py-2 text-xs font-semibold rounded-xl border border-white/[0.08] bg-[#16161A] hover:bg-[#1E1E24] text-zinc-300 hover:text-white cursor-pointer transition-colors text-center"
                >
                  {isMuted ? 'Close' : 'Cancel'}
                </motion.button>
                {!isMuted && (
                  <motion.button
                    type="submit"
                    whileHover={{ scale: isChecking ? 1 : 1.01 }}
                    whileTap={{ scale: isChecking ? 1 : 0.98 }}
                    disabled={!content.trim() || isChecking}
                    className="w-full xs:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl border border-blue-500/40 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    {isChecking ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span>Safeguarding...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 shrink-0" />
                        <span>Submit Question</span>
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
