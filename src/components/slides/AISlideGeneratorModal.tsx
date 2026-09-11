import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  X,
  Bot,
  HelpCircle,
  BarChart3,
  RefreshCw,
  Globe,
  Link2,
} from 'lucide-react';
import type { SlideDeck } from '../../types';
import { generateAISlideDeck } from '../../lib/slides/aiSlideGenerator';
import { playSuccessFanfare, playPopSound } from '../../lib/soundFx';

interface AISlideGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeckGenerated: (deck: SlideDeck) => void;
  roomCode?: string;
  authorName?: string;
}

export const AISlideGeneratorModal: React.FC<AISlideGeneratorModalProps> = ({
  isOpen,
  onClose,
  onDeckGenerated,
  roomCode: _roomCode = 'SKT-789',
  authorName = 'Alex Chen (Host)',
}) => {
  const [topic, setTopic] = useState('');
  const [slideCount, setSlideCount] = useState<number>(5);
  const [seniority, setSeniority] = useState<'beginner' | 'intermediate' | 'senior' | 'staff'>('senior');
  const [includeQuiz, setIncludeQuiz] = useState(true);
  const [includePoll, setIncludePoll] = useState(true);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [sourceUrl, setSourceUrl] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    playPopSound();
    setIsGenerating(true);
    setStatusMessage('🧠 Initiating research on presentation topic...');

    try {
      const deck = await generateAISlideDeck({
        topic: topic.trim(),
        slideCount,
        seniority,
        includeQuiz,
        includePoll,
        webSearchEnabled,
        sourceUrl: sourceUrl.trim() || undefined,
        authorName,
        onStatusUpdate: (msg) => setStatusMessage(msg),
      });

      playSuccessFanfare();
      onDeckGenerated(deck);
      onClose();
    } catch {
      setStatusMessage('Generation completed with fallback presentation template.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm font-sans">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="bg-[#151822] text-white w-full max-w-lg p-5 sm:p-6 border-4 border-black brutal-shadow-lg relative font-sans"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isGenerating}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 bg-black text-white hover:bg-neo-pink hover:text-black border-2 border-black cursor-pointer transition-colors"
        >
          <X className="w-4 h-4 stroke-[3]" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4 font-mono">
          <div className="w-10 h-10 bg-neo-yellow text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy">
            <Bot className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-heavy uppercase tracking-tight text-white">
              AI Presentation Deck Studio
            </h3>
            <p className="text-xs text-slate-400">
              Powered by serverless Mesh AI Edge Function
            </p>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="space-y-3.5 font-mono text-xs">
          <div>
            <label className="font-black uppercase block mb-1 text-neo-yellow">
              Presentation Concept or Topic:
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
              placeholder="e.g. Distributed Consensus in Cloud Native Databases"
              className="w-full px-3 py-2 border border-slate-700 bg-[#11131E] font-bold text-white focus:outline-none focus:border-neo-yellow"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-black uppercase block mb-1 text-slate-300">Slide Count:</label>
              <select
                value={slideCount}
                onChange={(e) => setSlideCount(Number(e.target.value))}
                disabled={isGenerating}
                className="w-full px-2.5 py-1.5 border border-slate-700 bg-[#11131E] font-bold text-white focus:outline-none"
              >
                <option value={4}>4 Slides (Lightning Talk)</option>
                <option value={5}>5 Slides (Standard)</option>
                <option value={6}>6 Slides (Comprehensive)</option>
                <option value={8}>8 Slides (Deep Dive)</option>
              </select>
            </div>

            <div>
              <label className="font-black uppercase block mb-1 text-slate-300">Seniority Level:</label>
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value as any)}
                disabled={isGenerating}
                className="w-full px-2.5 py-1.5 border border-slate-700 bg-[#11131E] font-bold text-white focus:outline-none uppercase"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="senior">Senior</option>
                <option value="staff">Staff / Principal</option>
              </select>
            </div>
          </div>

          {/* Interactive Slides Toggles */}
          <div className="p-3 bg-[#1A1E2B] border-2 border-black space-y-2">
            <span className="font-black uppercase text-[11px] block text-neo-cyan">
              Interleaved Audience Slides:
            </span>
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeQuiz}
                  onChange={(e) => setIncludeQuiz(e.target.checked)}
                  disabled={isGenerating}
                  className="accent-neo-pink w-4 h-4 cursor-pointer"
                />
                <span className="font-bold text-slate-200 flex items-center space-x-1">
                  <HelpCircle className="w-3.5 h-3.5 text-neo-pink" />
                  <span>Include Arena Quiz Slide</span>
                </span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePoll}
                  onChange={(e) => setIncludePoll(e.target.checked)}
                  disabled={isGenerating}
                  className="accent-neo-cyan w-4 h-4 cursor-pointer"
                />
                <span className="font-bold text-slate-200 flex items-center space-x-1">
                  <BarChart3 className="w-3.5 h-3.5 text-neo-cyan" />
                  <span>Include Live Poll Slide</span>
                </span>
              </label>
            </div>
          </div>

          {/* Web Search & Scraping Research Grounding */}
          <div className="p-3 bg-[#1A1E2B] border-2 border-black space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={webSearchEnabled}
                  onChange={(e) => setWebSearchEnabled(e.target.checked)}
                  disabled={isGenerating}
                  className="accent-neo-mint w-4 h-4 cursor-pointer"
                />
                <span className="font-bold text-slate-200 flex items-center space-x-1">
                  <Globe className="w-3.5 h-3.5 text-neo-mint" />
                  <span>Ground with Live Web Search</span>
                </span>
              </label>
              <span className="px-1.5 py-0.2 bg-neo-mint text-black font-black text-[9px] uppercase border border-black">
                LATEST 2025/2026
              </span>
            </div>

            <div>
              <label className="font-bold text-[11px] uppercase block mb-1 text-slate-300 flex items-center space-x-1">
                <Link2 className="w-3 h-3 text-slate-400" />
                <span>Reference Doc / Article URL to Scrape (Optional):</span>
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                disabled={isGenerating}
                placeholder="https://docs.aws.amazon.com/... or github README"
                className="w-full px-2.5 py-1.5 border border-slate-700 bg-[#11131E] font-mono text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Status message while generating */}
          {isGenerating && statusMessage && (
            <div className="p-2.5 bg-neo-yellow/20 border-2 border-neo-yellow text-neo-yellow font-bold flex items-center space-x-2 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 text-neo-yellow" />
              <span className="text-[11px]">{statusMessage}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={isGenerating || !topic.trim()}
            className="w-full py-2.5 sm:py-3 bg-neo-yellow hover:bg-neo-mint disabled:bg-[#222736] text-black disabled:text-slate-500 border-3 border-black font-heavy text-xs uppercase brutal-shadow-md cursor-pointer disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>GENERATING SLIDE DECK...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>GENERATE SLIDE DECK WITH AI</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
