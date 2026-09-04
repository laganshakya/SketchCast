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
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm font-sans"
        >
          <motion.div
            initial={{ scale: 0.9, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 15, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="bg-neo-cream text-black w-full max-w-lg p-4 sm:p-6 border-4 border-black brutal-shadow-lg relative font-sans max-h-[90vh] overflow-y-auto"
          >
            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                playClickSound();
                setModerationError(null);
                onClose();
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1 sm:p-1.5 bg-black text-white hover:bg-neo-pink transition-colors border-2 border-black cursor-pointer z-10"
              title="Close modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-3" />
            </motion.button>

            {/* Header */}
            <div className="flex items-start space-x-2.5 sm:space-x-3 mb-3.5 sm:mb-4 pr-8 sm:pr-10">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-neo-pink text-white border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 fill-white stroke-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base sm:text-lg font-heavy uppercase tracking-tight text-black leading-tight">
                    SUBMIT ARCHITECTURE QUESTION
                  </h3>
                </div>
                <div className="flex items-center space-x-2 mt-0.5 flex-wrap gap-y-1">
                  <p className="text-[11px] sm:text-xs font-mono text-slate-700">
                    Posting as <span className="font-extrabold text-black bg-neo-yellow px-1 border border-black">{userName}</span>
                  </p>
                  <span className="text-[9px] font-mono font-black uppercase px-1 py-0.2 bg-[#00F59B] text-black border border-black">
                    AI SAFEGUARDED
                  </span>
                  {effectiveStrikes > 0 && (
                    <span className={`text-[9px] font-mono font-black uppercase px-1.5 py-0.2 border border-black ${
                      effectiveStrikes >= 3
                        ? 'bg-red-500 text-white animate-pulse'
                        : effectiveStrikes === 2
                        ? 'bg-amber-400 text-black font-black'
                        : 'bg-neo-yellow text-black'
                    }`}>
                      STRIKES: {effectiveStrikes}/3
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
                className="p-3.5 bg-red-100 border-3 border-red-600 text-red-950 font-mono text-xs brutal-shadow-sm flex items-start space-x-2.5 mb-3"
              >
                <VolumeX className="w-5 h-5 text-red-600 shrink-0 mt-0.5 stroke-[2.5]" />
                <div>
                  <div className="font-heavy uppercase text-xs sm:text-sm text-red-700 tracking-tight flex items-center gap-1.5">
                    <span>YOU HAVE BEEN MUTED BY THE HOST</span>
                    <span className="px-1 py-0.2 bg-red-600 text-white text-[8px] font-black uppercase">
                      Q&A SILENCED
                    </span>
                  </div>
                  <div className="text-[11px] text-red-900 font-sans mt-1 leading-snug">
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
                className="p-3 bg-amber-400 text-black border-3 border-black font-mono text-xs brutal-shadow-sm flex items-start space-x-2.5 mb-3"
              >
                <AlertTriangle className="w-5 h-5 text-black shrink-0 mt-0.5 stroke-[2.5] animate-bounce" />
                <div className="min-w-0 flex-1">
                  <div className="font-heavy uppercase text-xs text-black tracking-tight flex items-center justify-between flex-wrap gap-1">
                    <span>⚠️ 2ND STRIKE WARNING (2/3)</span>
                    <span className="px-1.5 py-0.2 bg-black text-amber-300 text-[8px] font-black uppercase border border-black">
                      FINAL CHANCE
                    </span>
                  </div>
                  <div className="text-[11px] text-black font-sans font-bold mt-1 leading-snug">
                    You have incurred 2 safeguard strikes. One more inappropriate, offensive, or off-topic question will immediately notify the host to mute or ban you!
                  </div>
                </div>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5 font-mono">
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
                  className="w-full p-2.5 sm:p-3 bg-white border-2 border-black text-xs font-bold text-black placeholder-slate-500 focus:outline-none focus:bg-neo-yellow/15 resize-none font-display disabled:bg-slate-100 disabled:cursor-not-allowed"
                  autoFocus={!isMuted}
                />
                <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-bold text-slate-600 mt-1 flex-wrap gap-1">
                  <span>
                    {isCheckingDuplicate
                      ? '⚡ AI scanning for existing similar questions...'
                      : 'Mesh AI validates questions for constructive technical dialogue.'}
                  </span>
                  <span>{content.length}/280</span>
                </div>
              </div>

              {/* Semantic Duplicate Question Alert */}
              <AnimatePresence>
                {duplicateWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    className="p-3 bg-neo-yellow/20 border-2 border-black brutal-shadow-sm space-y-2 text-black"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-heavy text-[11px] uppercase tracking-tight flex items-center gap-1.5 text-black">
                        <Sparkles className="w-3.5 h-3.5 fill-black text-black" />
                        <span>SIMILAR QUESTION DETECTED!</span>
                      </span>
                      <span className="text-[9px] font-mono font-black uppercase px-1 bg-black text-neo-yellow">
                        AI SUGGESTION
                      </span>
                    </div>

                    {duplicateWarning.matchedQuestionContent && (
                      <p className="text-xs font-sans italic bg-black/10 p-2 border border-black/30 font-semibold text-slate-900">
                        "{duplicateWarning.matchedQuestionContent}"
                      </p>
                    )}

                    <p className="text-[11px] font-mono text-slate-700">
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
                          className="px-2.5 py-1 bg-neo-yellow hover:bg-yellow-300 text-black font-mono font-black text-xs uppercase border-2 border-black brutal-shadow-sm flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>UPVOTE INSTEAD</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDuplicateWarning(null)}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-black font-mono text-xs font-bold uppercase border-2 border-black cursor-pointer transition-all"
                      >
                        CONTINUE ASKING ANYWAY
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* AI Safeguard Alert Banner (Shown if flagged) */}
              <AnimatePresence>
                {moderationError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    className="p-3 bg-neo-pink text-white border-2 border-black font-mono text-xs brutal-shadow-sm flex items-start space-x-2.5"
                  >
                    <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-white" />
                    <div className="min-w-0 flex-1">
                      <div className="font-heavy text-[11px] uppercase tracking-wide flex items-center justify-between flex-wrap gap-1">
                        <span>AI SAFEGUARD VIOLATION DETECTED</span>
                        <div className="flex items-center space-x-1">
                          {moderationError.category && (
                            <span className="px-1 py-0.2 bg-black text-white text-[8px] font-black uppercase border border-black">
                              {moderationError.category}
                            </span>
                          )}
                          <span className={`px-1.5 py-0.2 text-black text-[8px] font-black uppercase border border-black ${
                            (moderationError.strikes || 1) >= 3 ? 'bg-red-500 text-white' : (moderationError.strikes || 1) === 2 ? 'bg-amber-400' : 'bg-neo-yellow'
                          }`}>
                            STRIKE {moderationError.strikes || 1}/3
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] mt-1 text-white font-sans font-medium leading-snug">
                        {moderationError.reason}
                      </div>
                      {moderationError.strikes && moderationError.strikes >= 3 ? (
                        <div className="text-[10px] text-yellow-300 font-heavy mt-1.5 font-mono uppercase bg-black/40 p-1 border border-yellow-300">
                          ⚠️ 3 Strikes Reached: Room Host and Admins have been notified!
                        </div>
                      ) : moderationError.strikes === 2 ? (
                        <div className="text-[10px] text-black font-heavy mt-1.5 font-mono uppercase bg-amber-400 p-1 border border-black">
                          ⚠️ 2nd Strike Warning: One more strike will alert the host to mute or ban you!
                        </div>
                      ) : (
                        <div className="text-[10px] text-white/90 mt-1.5 font-mono">
                          💡 Please revise your question to be constructive, polite, and technical before resubmitting.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>



              {/* Actions */}
              <div className="flex flex-col-reverse xs:flex-row items-center justify-end gap-2 pt-1">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    playClickSound();
                    setModerationError(null);
                    onClose();
                  }}
                  className="w-full xs:w-auto px-4 py-2 text-xs font-mono font-bold uppercase border-2 border-black bg-slate-200 hover:bg-slate-300 text-black cursor-pointer text-center"
                >
                  {isMuted ? 'CLOSE' : 'CANCEL'}
                </motion.button>
                {!isMuted && (
                  <motion.button
                    type="submit"
                    whileHover={{ scale: isChecking ? 1 : 1.03 }}
                    whileTap={{ scale: isChecking ? 1 : 0.96 }}
                    disabled={!content.trim() || isChecking}
                    className="w-full xs:w-auto px-5 py-2 bg-neo-pink hover:bg-[#FF4782] text-white text-xs font-mono font-black uppercase border-2 border-black brutal-shadow flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isChecking ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span>AI SAFEGUARDING...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 shrink-0" />
                        <span>SUBMIT QUESTION</span>
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
