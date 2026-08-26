import React, { useState } from 'react';
import { X, Send, Sparkles, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playClickSound, playPopSound, playWhoosh } from '../../lib/soundFx';

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => void;
  userName: string;
}

const EXAMPLE_PROMPTS = [
  'How do we handle multi-region distributed cache invalidation without thundering herds?',
  'Can you compare the consensus flow for Raft vs Paxos when leader network partitions happen?',
  'Show the architectural trade-offs between LSM-Trees and B-Trees for write-heavy telemetry.',
  'How do zero-trust service meshes implement mTLS rotation without dropping streaming TCP pipes?',
];

export const QuestionModal: React.FC<QuestionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  userName,
}) => {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    playWhoosh();
    onSubmit(content);
    setContent('');
    onClose();
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
                <h3 className="text-base sm:text-lg font-heavy uppercase tracking-tight text-black leading-tight">
                  SUBMIT ARCHITECTURE QUESTION
                </h3>
                <p className="text-[11px] sm:text-xs font-mono text-slate-700 mt-0.5">
                  Posting as <span className="font-extrabold text-black bg-neo-yellow px-1 border border-black">{userName}</span>
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5 font-mono">
              <div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Ask an architecture question or challenge the speaker with a system design problem..."
                  rows={3}
                  maxLength={280}
                  className="w-full p-2.5 sm:p-3 bg-white border-2 border-black text-xs font-bold text-black placeholder-slate-500 focus:outline-none focus:bg-neo-yellow/15 resize-none font-display"
                  autoFocus
                />
                <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-bold text-slate-600 mt-1 flex-wrap gap-1">
                  <span>Audience upvotes will rank your question!</span>
                  <span>{content.length}/280</span>
                </div>
              </div>

              {/* Quick Idea Starters */}
              <div className="bg-[#F4EFE0] p-2.5 sm:p-3 border-2 border-black">
                <div className="flex items-center space-x-1 text-[10px] sm:text-[11px] font-black uppercase text-black mb-1">
                  <HelpCircle className="w-3.5 h-3.5 text-neo-pink shrink-0" />
                  <span>Prompt Ideas (Tap to fill):</span>
                </div>
                <div className="space-y-1">
                  {EXAMPLE_PROMPTS.map((prompt, i) => (
                    <motion.button
                      key={i}
                      type="button"
                      whileHover={{ scale: 1.01, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        playPopSound();
                        setContent(prompt);
                      }}
                      className="w-full text-left text-[10px] sm:text-[11px] font-medium text-slate-800 hover:text-black hover:bg-neo-yellow p-1 border border-transparent hover:border-black transition-colors truncate block cursor-pointer"
                    >
                      &ldquo;{prompt}&rdquo;
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse xs:flex-row items-center justify-end gap-2 pt-1">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    playClickSound();
                    onClose();
                  }}
                  className="w-full xs:w-auto px-4 py-2 text-xs font-mono font-bold uppercase border-2 border-black bg-slate-200 hover:bg-slate-300 text-black cursor-pointer text-center"
                >
                  CANCEL
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  disabled={!content.trim()}
                  className="w-full xs:w-auto px-5 py-2 bg-neo-pink hover:bg-[#FF4782] text-white text-xs font-mono font-black uppercase border-2 border-black brutal-shadow flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>SUBMIT QUESTION</span>
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
