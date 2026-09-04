import React, { useState } from 'react';
import { X, Plus, Trash2, Vote, Sparkles, Bot, Zap, AlertCircle, Link2, RefreshCw, FolderGit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateAIPollSuggestions, generateAIPollsFromUrl, getStoredMeshKey, isGitHubRepoInput, type SuggestedAIPoll } from '../../lib/meshApi';
import { playClickSound, playPopSound, playWhoosh } from '../../lib/soundFx';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll: (question: string, options: string[]) => void;
  onOpenAISettings?: () => void;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isOpen,
  onClose,
  onCreatePoll,
  onOpenAISettings,
}) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '']);
  const [aiTopic, setAiTopic] = useState('');
  const [aiPollMode, setAiPollMode] = useState<'topic' | 'url'>('topic');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiStatusMsg, setAiStatusMsg] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<SuggestedAIPoll[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  const handleAddOption = () => {
    playPopSound();
    if (options.length < 6) {
      setOptions((prev) => [...prev, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    playClickSound();
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

  const handleFetchAISuggestions = async () => {
    playClickSound();
    const cleanInput = aiTopic.trim();
    if (!cleanInput) {
      setAiError(aiPollMode === 'url' ? 'Please enter a webpage URL or GitHub repo (e.g. facebook/react).' : 'Please enter a topic for AI poll suggestions.');
      return;
    }

    const hasKey = Boolean(getStoredMeshKey());
    if (!hasKey) {
      setAiError('Mesh API Key missing. Please open AI Settings in the header.');
      return;
    }

    setIsGeneratingAI(true);
    setAiError(null);
    setAiSuggestions([]);

    try {
      if (aiPollMode === 'url' || cleanInput.startsWith('http://') || cleanInput.startsWith('https://') || isGitHubRepoInput(cleanInput)) {
        if (isGitHubRepoInput(cleanInput)) {
          setAiStatusMsg(`🐙 Scanning GitHub repo & building polls...`);
        } else {
          setAiStatusMsg(`🔗 Scraping content & building polls...`);
        }
        const res = await generateAIPollsFromUrl(cleanInput);
        setAiSuggestions(res.polls);
      } else {
        setAiStatusMsg(`✨ Generating interactive poll suggestions...`);
        const suggestions = await generateAIPollSuggestions(cleanInput);
        setAiSuggestions(suggestions);
      }
    } catch (err: any) {
      setAiError(err?.message || 'Failed to generate poll suggestions via Mesh API.');
    } finally {
      setIsGeneratingAI(false);
      setAiStatusMsg(null);
    }
  };

  const handleApplySuggestion = (s: SuggestedAIPoll) => {
    playPopSound();
    setQuestion(s.question);
    setOptions(s.options && s.options.length >= 2 ? s.options : ['Yes', 'No']);
    setShowAIAssistant(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter((o) => o.trim().length > 0);
    if (!question.trim() || validOptions.length < 2) return;

    playWhoosh();
    onCreatePoll(question.trim(), validOptions);
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

            <div className="flex items-start space-x-2.5 sm:space-x-3 mb-3.5 sm:mb-4 pr-8 sm:pr-10">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-neo-cyan text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy shrink-0">
                <Vote className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base sm:text-lg font-heavy uppercase tracking-tight text-black leading-tight">
                    CREATE LIVE AUDIENCE POLL
                  </h3>
                  <span className="px-1.5 py-0.2 bg-black text-neo-yellow font-mono text-[9px] font-black uppercase border border-black">
                    HOST ONLY
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs font-mono text-slate-700 mt-0.5">
                  Survey attendees on architecture decisions, feedback, or debates
                </p>
              </div>
            </div>

            {/* AI Assistant Toggle Button */}
            <div className="mb-3.5">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  playClickSound();
                  setShowAIAssistant(!showAIAssistant);
                }}
                className="w-full py-2 bg-neo-pink hover:bg-[#FF4782] text-white font-mono text-xs font-black uppercase border-2 border-black brutal-shadow-sm flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                <Bot className="w-4 h-4" />
                <span>{showAIAssistant ? 'HIDE AI POLL ASSISTANT' : '✨ AI POLL PROMPT GENERATOR (MESH API)'}</span>
              </motion.button>
            </div>

            {/* AI Suggestions Drawer */}
            {showAIAssistant && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3 bg-white border-2 border-black mb-3 font-mono space-y-2.5"
              >
                {/* Mode Selector */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => { playPopSound(); setAiPollMode('topic'); }}
                    className={`px-2 py-0.5 text-[10px] font-black uppercase border border-black cursor-pointer transition-all flex items-center gap-1 ${
                      aiPollMode === 'topic' ? 'bg-neo-yellow text-black brutal-shadow-xs' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Topic / Search</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { playPopSound(); setAiPollMode('url'); }}
                    className={`px-2 py-0.5 text-[10px] font-black uppercase border border-black cursor-pointer transition-all flex items-center gap-1 ${
                      aiPollMode === 'url' ? 'bg-neo-mint text-black brutal-shadow-xs' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Link2 className="w-2.5 h-2.5" />
                    <span>Scrape URL / GitHub</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleFetchAISuggestions();
                        }
                      }}
                      placeholder={
                        aiPollMode === 'url'
                          ? 'Paste URL or GitHub repo: e.g. https://bun.sh/docs or facebook/react'
                          : 'Topic: e.g. Rate this Web App, PostgreSQL vs Redis, Next.js 15...'
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border-2 border-black text-black font-bold focus:outline-none focus:bg-neo-yellow/20 pr-16"
                    />
                    {aiPollMode === 'url' && isGitHubRepoInput(aiTopic) && (
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 px-1 py-0.2 bg-purple-200 border border-black text-[8px] font-black uppercase flex items-center gap-0.5">
                        <FolderGit2 className="w-2.5 h-2.5 text-purple-700" />
                        <span>Repo</span>
                      </span>
                    )}
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={handleFetchAISuggestions}
                    disabled={isGeneratingAI}
                    className="px-3 py-1.5 bg-neo-yellow hover:bg-[#FFF04D] text-black text-xs font-black uppercase border-2 border-black brutal-shadow-sm flex items-center space-x-1 cursor-pointer shrink-0"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{isGeneratingAI ? 'GENERATING...' : aiPollMode === 'url' ? 'SCRAPE & POLL' : 'SUGGEST'}</span>
                  </motion.button>
                </div>

                {/* Status Indicator */}
                {isGeneratingAI && aiStatusMsg && (
                  <div className="p-1.5 bg-neo-yellow/20 border border-black text-[10px] font-bold text-black flex items-center gap-1.5 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                    <span>{aiStatusMsg}</span>
                  </div>
                )}

                {aiError && (
                  <div className="p-2 bg-neo-pink text-white text-[11px] font-bold border border-black flex items-start space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span>{aiError}</span>
                      {onOpenAISettings && aiError.includes('AI Settings') && (
                        <button
                          type="button"
                          onClick={onOpenAISettings}
                          className="ml-2 underline font-black text-black bg-white px-1 cursor-pointer"
                        >
                          AI Settings
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {aiSuggestions.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-black uppercase text-slate-700 block">
                      CLICK A SUGGESTION TO LOAD INTO FORM:
                    </span>
                    {aiSuggestions.map((s, idx) => (
                      <motion.button
                        key={idx}
                        type="button"
                        whileHover={{ scale: 1.01, x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleApplySuggestion(s)}
                        className="w-full p-2 text-left bg-slate-50 hover:bg-neo-yellow/20 border border-black text-xs space-y-1 cursor-pointer block"
                      >
                        <div className="font-bold text-black">{s.question}</div>
                        <div className="flex flex-wrap gap-1">
                          {s.options.map((opt, i) => (
                            <span key={i} className="px-1.5 py-0.2 bg-white text-[10px] border border-black text-slate-700">
                              {opt}
                            </span>
                          ))}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

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
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleAddOption}
                      className="text-[11px] sm:text-xs font-black uppercase text-black bg-neo-yellow px-2 py-0.5 border border-black hover:bg-[#FFF04D] flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-3" />
                      <span>ADD OPTION</span>
                    </motion.button>
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
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRemoveOption(idx)}
                          className="p-1.5 bg-slate-200 hover:bg-neo-pink hover:text-white border border-black transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col-reverse xs:flex-row justify-end gap-2 pt-2">
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
                  disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
                  className="w-full xs:w-auto px-5 py-2 bg-neo-cyan hover:bg-[#33F3FF] text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>LAUNCH POLL</span>
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
