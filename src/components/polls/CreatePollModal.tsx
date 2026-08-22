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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-neo-cream text-black w-full max-w-lg p-4 sm:p-6 border-4 border-black brutal-shadow-lg relative font-sans max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1 sm:p-1.5 bg-black text-white hover:bg-neo-pink transition-colors border-2 border-black cursor-pointer z-10"
          title="Close modal"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-3" />
        </button>

        <div className="flex items-start space-x-2.5 sm:space-x-3 mb-3.5 sm:mb-4 pr-8 sm:pr-10">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-neo-cyan text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy shrink-0">
            <Vote className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-heavy uppercase tracking-tight text-black leading-tight">
              CREATE LIVE AUDIENCE POLL
            </h3>
            <p className="text-[11px] sm:text-xs font-mono text-slate-700 mt-0.5">Survey attendees on architecture decisions</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4 font-mono">
          <div>
            <label className="text-xs font-black uppercase block mb-1">Poll Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Which API architecture do you deploy in 2026?"
              className="w-full px-3 py-1.5 sm:py-2 text-xs bg-white border-2 border-black text-black font-bold focus:outline-none focus:bg-neo-cyan/15 placeholder-slate-500 font-sans"
              required
              autoFocus
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <label className="text-xs font-black uppercase">Options (2 to 6)</label>
              {options.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-[11px] sm:text-xs font-black uppercase text-black bg-neo-yellow px-2 py-0.5 border border-black hover:bg-[#FFF04D] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-3" />
                  <span>ADD OPTION</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center space-x-1.5 sm:space-x-2">
                  <span className="w-6 h-6 bg-black text-white font-mono font-bold text-xs flex items-center justify-center border border-black shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}...`}
                    className="flex-1 px-2.5 sm:px-3 py-1.5 text-xs bg-white border-2 border-black text-black font-bold focus:outline-none focus:bg-neo-cyan/15 font-sans"
                    required={idx < 2}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-1.5 bg-slate-200 hover:bg-neo-pink hover:text-white border border-black transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse xs:flex-row justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full xs:w-auto px-4 py-2 text-xs font-mono font-bold uppercase border-2 border-black bg-slate-200 hover:bg-slate-300 text-black cursor-pointer text-center"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
              className="w-full xs:w-auto px-5 py-2 bg-neo-cyan hover:bg-[#33F3FF] text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow active:translate-x-px active:translate-y-px active:shadow-none flex items-center justify-center space-x-1.5 cursor-pointer"
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
