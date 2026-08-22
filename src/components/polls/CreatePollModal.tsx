import React, { useState } from 'react';
import { X, Plus, Trash2, Vote, Sparkles } from 'lucide-react';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll: (question: string, options: string[]) => void;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isOpen,
  onClose,
  onCreatePoll,
}) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '']);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions((prev) => [...prev, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, text: string) => {
    setOptions((prev) => {
      const next = [...prev];
      next[index] = text;
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter((o) => o.trim().length > 0);
    if (!question.trim() || validOptions.length < 2) return;

    onCreatePoll(question.trim(), validOptions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#FFFDF5] text-black w-full max-w-lg p-6 border-4 border-black brutal-shadow-lg relative font-sans">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 bg-black text-white hover:bg-[#FF2A6D] transition-colors border-2 border-black"
        >
          <X className="w-5 h-5 stroke-[3]" />
        </button>

        <div className="flex items-center space-x-2.5 mb-4">
          <div className="w-10 h-10 bg-[#00F0FF] text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy">
            <Vote className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-lg font-heavy uppercase font-display tracking-tight text-black">
              CREATE LIVE AUDIENCE POLL
            </h3>
            <p className="text-xs font-mono text-slate-700">Survey attendees on architecture decisions</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-mono">
          <div>
            <label className="text-xs font-black uppercase block mb-1.5">Poll Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Which API architecture do you deploy in 2026?"
              className="w-full px-3.5 py-2 text-xs bg-white border-2 border-black text-black font-bold focus:outline-none focus:bg-[#00F0FF]/15 placeholder-slate-500 font-sans"
              required
              autoFocus
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase">Options (2 to 6)</label>
              {options.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-xs font-black uppercase text-black bg-[#FFE600] px-2 py-0.5 border border-black hover:bg-[#FFF04D] flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>ADD OPTION</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-black text-white font-mono font-bold text-xs flex items-center justify-center border border-black flex-shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}...`}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border-2 border-black text-black font-bold focus:outline-none focus:bg-[#00F0FF]/15 font-sans"
                    required={idx < 2}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-1.5 bg-slate-200 hover:bg-[#FF2A6D] hover:text-white border border-black transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono font-bold uppercase border-2 border-black bg-slate-200 hover:bg-slate-300 text-black"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
              className="px-5 py-2 bg-[#00F0FF] hover:bg-[#33F3FF] text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center space-x-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>LAUNCH POLL</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
