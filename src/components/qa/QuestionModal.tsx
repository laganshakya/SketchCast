import React, { useState } from 'react';
import { X, Send, Sparkles, HelpCircle } from 'lucide-react';

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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmit(content);
    setContent('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#FFFDF5] text-black w-full max-w-lg p-6 border-4 border-black brutal-shadow-lg relative font-sans">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 bg-black text-white hover:bg-[#FF2A6D] transition-colors border-2 border-black"
        >
          <X className="w-5 h-5 stroke-[3]" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-2.5 mb-4">
          <div className="w-10 h-10 bg-[#FF2A6D] text-white border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy">
            <Sparkles className="w-5 h-5 fill-white stroke-white" />
          </div>
          <div>
            <h3 className="text-lg font-heavy uppercase font-display tracking-tight text-black">
              SUBMIT ARCHITECTURE QUESTION
            </h3>
            <p className="text-xs font-mono text-slate-700">
              Posting as <span className="font-extrabold text-black bg-[#FFE600] px-1 border border-black">{userName}</span>
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 font-mono">
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ask an architecture question or challenge the speaker with a system design problem..."
              rows={3}
              maxLength={280}
              className="w-full p-3 bg-white border-2 border-black text-xs font-bold text-black placeholder-slate-500 focus:outline-none focus:bg-[#FFE600]/15 resize-none font-display"
              autoFocus
            />
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 mt-1">
              <span>Audience upvotes will rank your question to the top stage!</span>
              <span>{content.length}/280</span>
            </div>
          </div>

          {/* Quick Idea Starters */}
          <div className="bg-[#F4EFE0] p-3 border-2 border-black">
            <div className="flex items-center space-x-1 text-[11px] font-black uppercase text-black mb-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-[#FF2A6D]" />
              <span>Prompt Ideas (Tap to fill):</span>
            </div>
            <div className="space-y-1">
              {EXAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setContent(prompt)}
                  className="w-full text-left text-[11px] font-medium text-slate-800 hover:text-black hover:bg-[#FFE600] p-1 border border-transparent hover:border-black transition-colors truncate block"
                >
                  &ldquo;{prompt}&rdquo;
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono font-bold uppercase border-2 border-black bg-slate-200 hover:bg-slate-300 text-black"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={!content.trim()}
              className="px-5 py-2 bg-[#FF2A6D] hover:bg-[#FF4782] text-white text-xs font-mono font-black uppercase border-2 border-black brutal-shadow active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center space-x-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>SUBMIT QUESTION</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
