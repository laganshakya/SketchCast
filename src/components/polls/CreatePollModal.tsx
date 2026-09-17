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
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md font-sans"
        >
          <motion.div
            initial={{ scale: 0.95, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 12, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-[#0E0E11] text-white w-full max-w-lg p-5 sm:p-6 border border-white/[0.08] rounded-2xl shadow-modal relative font-sans max-h-[90vh] overflow-y-auto"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="absolute top-4 right-4 p-2 bg-[#16161A] text-zinc-400 hover:text-white rounded-xl border border-white/[0.08] hover:border-zinc-700 transition-colors cursor-pointer z-10"
              title="Close modal"
            >
              <X className="w-4 h-4 stroke-2" />
            </motion.button>

            <div className="flex items-start space-x-3 mb-5 pr-10">
              <div className="w-10 h-10 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                <Vote className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-semibold text-white leading-tight">
                    Create Audience Poll
                  </h3>
                  <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-semibold rounded-full border border-blue-500/20">
                    Host
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Survey attendees on architecture decisions, feedback, or debates
                </p>
              </div>
            </div>

            {/* AI Assistant Toggle Button */}
            <div className="mb-3.5">
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  playClickSound();
                  setShowAIAssistant(!showAIAssistant);
                }}
                className="w-full py-2.5 bg-[#16161A] hover:bg-[#1E1E24] text-zinc-200 hover:text-white text-xs font-semibold rounded-xl border border-white/[0.08] hover:border-blue-500/40 flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <Bot className="w-4 h-4 text-blue-400" />
                <span>{showAIAssistant ? 'Hide AI Poll Assistant' : 'AI Poll Prompt Generator'}</span>
              </motion.button>
            </div>

            {/* AI Suggestions Drawer */}
            {showAIAssistant && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3.5 bg-[#121215] border border-white/[0.08] rounded-xl mb-3.5 space-y-3"
              >
                {/* Mode Selector */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { playPopSound(); setAiPollMode('topic'); }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border cursor-pointer transition-colors flex items-center gap-1.5 ${
                      aiPollMode === 'topic'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : 'bg-[#16161A] text-zinc-400 border-white/[0.08]'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Topic / Search</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { playPopSound(); setAiPollMode('url'); }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border cursor-pointer transition-colors flex items-center gap-1.5 ${
                      aiPollMode === 'url'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : 'bg-[#16161A] text-zinc-400 border-white/[0.08]'
                    }`}
                  >
                    <Link2 className="w-3 h-3" />
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
                          ? 'Paste URL or GitHub repo: e.g. facebook/react'
                          : 'Topic: e.g. Rate this Architecture, PostgreSQL vs Redis...'
                      }
                      className="w-full px-3 py-2 text-xs bg-[#16161A] border border-white/[0.08] rounded-xl text-white font-medium focus:outline-none focus:border-blue-500 pr-16 transition-colors"
                    />
                    {aiPollMode === 'url' && isGitHubRepoInput(aiTopic) && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-semibold rounded uppercase flex items-center gap-1">
                        <FolderGit2 className="w-2.5 h-2.5" />
                        <span>Repo</span>
                      </span>
                    )}
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleFetchAISuggestions}
                    disabled={isGeneratingAI}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl border border-blue-500/40 flex items-center space-x-1 cursor-pointer shrink-0 shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{isGeneratingAI ? 'Generating...' : aiPollMode === 'url' ? 'Scrape' : 'Suggest'}</span>
                  </motion.button>
                </div>

                {/* Status Indicator */}
                {isGeneratingAI && aiStatusMsg && (
                  <div className="p-2 bg-blue-500/10 border border-blue-500/25 rounded-lg text-xs font-medium text-blue-400 flex items-center gap-2 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>{aiStatusMsg}</span>
                  </div>
                )}

                {aiError && (
                  <div className="p-2.5 bg-rose-500/10 text-rose-300 text-xs font-medium border border-rose-500/25 rounded-lg flex items-start space-x-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                    <div className="flex-1">
                      <span>{aiError}</span>
                      {onOpenAISettings && aiError.includes('AI Settings') && (
                        <button
                          type="button"
                          onClick={onOpenAISettings}
                          className="ml-2 underline font-semibold text-white cursor-pointer"
                        >
                          AI Settings
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {aiSuggestions.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-xs font-medium text-zinc-400 block">
                      Suggestions (click to load):
                    </span>
                    {aiSuggestions.map((s, idx) => (
                      <motion.button
                        key={idx}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleApplySuggestion(s)}
                        className="w-full p-2.5 text-left bg-[#16161A] hover:bg-[#1E1E26] border border-white/[0.08] hover:border-blue-500/40 rounded-xl text-xs space-y-1.5 cursor-pointer block transition-colors"
                      >
                        <div className="font-semibold text-white">{s.question}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {s.options.map((opt, i) => (
                            <span key={i} className="px-2 py-0.5 bg-[#121216] text-[11px] rounded-md border border-white/[0.08] text-zinc-300">
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

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium block mb-1 text-zinc-300">Poll Question</label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. Which API architecture do you deploy in 2026?"
                  className="w-full px-3.5 py-2 text-xs bg-[#16161A] border border-white/[0.08] rounded-xl text-white font-medium focus:outline-none focus:border-blue-500 placeholder-zinc-500 transition-colors"
                  required
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-zinc-300">Options (2 to 6)</label>
                  {options.length < 6 && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleAddOption}
                      className="text-xs font-medium text-white bg-[#16161A] hover:bg-[#1E1E24] px-2.5 py-1 rounded-lg border border-white/[0.08] hover:border-blue-500/40 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-400" />
                      <span>Add Option</span>
                    </motion.button>
                  )}
                </div>

                <div className="space-y-2">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <span className="w-7 h-7 bg-[#16161A] text-blue-400 font-mono font-bold text-xs flex items-center justify-center rounded-lg border border-white/[0.08] shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}...`}
                        className="flex-1 px-3 py-2 text-xs bg-[#16161A] border border-white/[0.08] rounded-xl text-white font-medium focus:outline-none focus:border-blue-500 transition-colors"
                        required={idx < 2}
                      />
                      {options.length > 2 && (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleRemoveOption(idx)}
                          className="p-2 bg-[#16161A] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 rounded-lg border border-white/[0.08] transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col-reverse xs:flex-row justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    playClickSound();
                    onClose();
                  }}
                  className="w-full xs:w-auto px-4 py-2 text-xs font-semibold rounded-xl border border-white/[0.08] bg-[#16161A] hover:bg-[#1E1E24] text-zinc-300 hover:text-white cursor-pointer transition-colors text-center"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
                  className="w-full xs:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl border border-blue-500/40 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Launch Poll</span>
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
