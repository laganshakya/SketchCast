import React, { useState } from 'react';
import { Play, Plus, Sparkles, Clock, X, Terminal } from 'lucide-react';
import { QUIZ_PACKS } from '../../lib/quizBank';
import type { QuizQuestion } from '../../types';

interface QuizHostPanelProps {
  onStartQuiz: (question: QuizQuestion) => void;
  activeQuestionId?: string;
}

export const QuizHostPanel: React.FC<QuizHostPanelProps> = ({
  onStartQuiz,
  activeQuestionId,
}) => {
  const [selectedPackId, setSelectedPackId] = useState<string>('system-design');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);

  // Custom Form State
  const [customCategory, setCustomCategory] = useState('System Design');
  const [customQuestionText, setCustomQuestionText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctOpt, setCorrectOpt] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [customExplanation, setCustomExplanation] = useState('');
  const [customDuration, setCustomDuration] = useState(25);

  const currentPack = QUIZ_PACKS.find((p) => p.id === selectedPackId) || QUIZ_PACKS[0];

  const handleCreateCustomQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestionText.trim() || !optA.trim() || !optB.trim()) return;

    const newQuestion: QuizQuestion = {
      id: 'custom-q-' + Date.now(),
      category: customCategory.trim() || 'System Design',
      question: customQuestionText.trim(),
      options: [
        { id: 'A', text: optA.trim() },
        { id: 'B', text: optB.trim() },
        { id: 'C', text: optC.trim() || 'Option C' },
        { id: 'D', text: optD.trim() || 'Option D' },
      ],
      correctOptionId: correctOpt,
      explanation: customExplanation.trim() || 'Correct answer verified by host.',
      timeLimitSeconds: customDuration,
    };

    onStartQuiz(newQuestion);
    setShowCustomModal(false);

    // Reset fields
    setCustomQuestionText('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setCustomExplanation('');
  };

  return (
    <div className="flex flex-col h-full bg-[#12141D] border-2 border-black brutal-shadow-lg p-4 space-y-3.5 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-black pb-2.5">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-[#FFE600]" />
          <h3 className="text-sm font-heavy text-white uppercase font-display tracking-tight">
            HOST CONSOLE
          </h3>
        </div>
        <button
          onClick={() => setShowCustomModal(true)}
          className="px-2.5 py-1 bg-[#FFE600] hover:bg-[#FFF04D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-black text-xs font-mono font-extrabold uppercase border-2 border-black brutal-shadow-sm transition-all flex items-center space-x-1"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>NEW QUIZ</span>
        </button>
      </div>

      {/* Retro Cartridge Selector Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {QUIZ_PACKS.map((pack) => (
          <button
            key={pack.id}
            onClick={() => setSelectedPackId(pack.id)}
            className={`p-2.5 border-2 border-black text-left transition-all font-mono ${
              selectedPackId === pack.id
                ? 'bg-[#FFE600] text-black brutal-shadow-sm translate-x-[-1px] translate-y-[-1px]'
                : 'bg-[#181B26] text-slate-400 hover:text-white hover:bg-[#202534]'
            }`}
          >
            <div className="text-sm mb-0.5">{pack.icon}</div>
            <div className="text-[11px] font-extrabold truncate uppercase">{pack.name}</div>
            <div className="text-[9px] text-slate-500 font-bold">{pack.questions.length} CARDS</div>
          </button>
        ))}
      </div>

      {/* Question List in Selected Pack */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {currentPack.questions.map((q, idx) => {
          const isLive = activeQuestionId === q.id;
          return (
            <div
              key={q.id}
              className={`p-3 border-2 border-black transition-all flex items-center justify-between gap-2.5 ${
                isLive
                  ? 'bg-[#1C2030] border-[#FFE600] brutal-shadow-yellow'
                  : 'bg-[#151822] hover:bg-[#1A1E2B] brutal-shadow-sm'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1.5 mb-1 font-mono">
                  <span className="text-[9px] font-extrabold bg-[#FFE600] text-black px-1.5 py-0.2 border border-black">
                    Q{idx + 1}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{q.category}</span>
                  <span className="text-[9px] text-slate-500 font-bold flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> {q.timeLimitSeconds}S
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-100 line-clamp-2 leading-snug font-display">
                  {q.question}
                </p>
              </div>

              <button
                onClick={() => onStartQuiz(q)}
                className={`px-3 py-1.5 rounded-none text-xs font-mono font-black uppercase border-2 border-black transition-all flex items-center space-x-1 flex-shrink-0 ${
                  isLive
                    ? 'bg-[#00F59B] text-black brutal-shadow-sm'
                    : 'bg-[#FFE600] hover:bg-[#FFF04D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-black brutal-shadow-sm'
                }`}
              >
                <Play className="w-3 h-3 fill-black" />
                <span>{isLive ? 'LIVE' : 'LAUNCH'}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Neo-Brutalist Custom Quiz Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#FFFDF5] text-black w-full max-w-lg p-6 border-4 border-black brutal-shadow-lg relative font-sans">
            <button
              onClick={() => setShowCustomModal(false)}
              className="absolute top-4 right-4 p-1 bg-black text-white hover:bg-[#FF2A6D] transition-colors border-2 border-black"
            >
              <X className="w-5 h-5 stroke-[3]" />
            </button>

            <div className="flex items-center space-x-2.5 mb-4">
              <div className="w-10 h-10 bg-[#FFE600] text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy">
                <Sparkles className="w-5 h-5 fill-black stroke-black" />
              </div>
              <div>
                <h3 className="text-lg font-heavy uppercase font-display tracking-tight text-black">
                  CREATE CUSTOM ARCHITECTURE QUESTION
                </h3>
                <p className="text-xs font-mono text-slate-700">Publish immediate live quiz to all participants</p>
              </div>
            </div>

            <form onSubmit={handleCreateCustomQuiz} className="space-y-3 font-mono">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-black uppercase block mb-1">Category</label>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g. Distributed Systems"
                    className="w-full px-3 py-1.5 text-xs bg-white border-2 border-black text-black font-bold focus:outline-none focus:bg-[#FFE600]/20"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase block mb-1">Time Limit (Sec)</label>
                  <input
                    type="number"
                    min="10"
                    max="90"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-white border-2 border-black text-black font-bold focus:outline-none focus:bg-[#FFE600]/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase block mb-1">Question Prompt</label>
                <textarea
                  value={customQuestionText}
                  onChange={(e) => setCustomQuestionText(e.target.value)}
                  placeholder="Type your technical question here..."
                  rows={2}
                  className="w-full p-2.5 text-xs bg-white border-2 border-black text-black font-bold focus:outline-none focus:bg-[#FFE600]/20 resize-none font-display"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase block">4 Options (Select correct answer key):</label>
                {[
                  { id: 'A' as const, val: optA, set: setOptA },
                  { id: 'B' as const, val: optB, set: setOptB },
                  { id: 'C' as const, val: optC, set: setOptC },
                  { id: 'D' as const, val: optD, set: setOptD },
                ].map(({ id, val, set }) => (
                  <div key={id} className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setCorrectOpt(id)}
                      className={`w-7 h-7 font-mono font-heavy text-xs flex items-center justify-center border-2 border-black transition-all ${
                        correctOpt === id
                          ? 'bg-[#00F59B] text-black brutal-shadow-sm'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                      title="Click to designate as correct answer"
                    >
                      {id}
                    </button>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      placeholder={`Option ${id}...`}
                      className="flex-1 px-3 py-1 text-xs bg-white border-2 border-black text-black font-bold focus:outline-none focus:bg-[#FFE600]/20"
                      required={id === 'A' || id === 'B'}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[11px] font-black uppercase block mb-1">Architecture Explanation</label>
                <textarea
                  value={customExplanation}
                  onChange={(e) => setCustomExplanation(e.target.value)}
                  placeholder="Explain why this architecture option is right..."
                  rows={2}
                  className="w-full p-2 text-xs bg-white border-2 border-black text-black font-bold focus:outline-none focus:bg-[#FFE600]/20 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 text-xs font-mono font-bold uppercase border-2 border-black bg-slate-200 hover:bg-slate-300 text-black"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={!customQuestionText.trim() || !optA.trim() || !optB.trim()}
                  className="px-5 py-2 bg-[#FFE600] hover:bg-[#FFF04D] text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                >
                  PUBLISH & LAUNCH
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
