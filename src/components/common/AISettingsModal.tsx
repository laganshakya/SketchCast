import React, { useState, useEffect } from 'react';
import {
  X,
  Bot,
  Key,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Zap,
  Shield,
  Eye,
  EyeOff,
  Cpu,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getStoredMeshKey,
  setStoredMeshKey,
  getStoredMeshModel,
  setStoredMeshModel,
  testMeshConnection,
  MESH_MODEL_OPTIONS,
  isQASafeguardEnabled,
  setQASafeguardEnabled,
} from '../../lib/meshApi';
import { dbUpdateRoomAIModel } from '../../lib/supabase';
import { playClickSound, playPopSound, playWhoosh } from '../../lib/soundFx';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode?: string;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose, roomCode }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState(getStoredMeshModel());
  const [customModelInput, setCustomModelInput] = useState('');
  const [qaSafeguard, setQaSafeguard] = useState(isQASafeguardEnabled());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const existingKey = getStoredMeshKey();
      setApiKey(existingKey);
      const existingModel = getStoredMeshModel();
      setSelectedModel(existingModel);
      setQaSafeguard(isQASafeguardEnabled());
      setTestResult(null);
      setSaveStatus(null);
      // If it's 'auto' or matches a preset, custom model input is cleared
      if (existingModel && existingModel !== 'auto' && !MESH_MODEL_OPTIONS.some((m) => m.id === existingModel)) {
        setCustomModelInput(existingModel);
      } else {
        setCustomModelInput('');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalKey = apiKey.trim();
    if (finalKey) {
      setStoredMeshKey(finalKey);
    }

    const finalModel = customModelInput.trim() || selectedModel || 'auto';
    setStoredMeshModel(finalModel);

    if (roomCode) {
      dbUpdateRoomAIModel(roomCode, finalModel);
    }

    setQASafeguardEnabled(qaSafeguard);

    setSaveStatus('Mesh AI configuration saved!');
    setTimeout(() => setSaveStatus(null), 2500);
  };

  const handleCloseModal = () => {
    playClickSound();
    const finalModel = customModelInput.trim() || selectedModel || 'auto';
    setStoredMeshModel(finalModel);
    if (roomCode) {
      dbUpdateRoomAIModel(roomCode, finalModel);
    }
    setQASafeguardEnabled(qaSafeguard);
    onClose();
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const finalModel = customModelInput.trim() || selectedModel || 'auto';
    const result = await testMeshConnection(apiKey.trim(), finalModel);
    setTestResult(result);
    setIsTesting(false);
  };

  const handleClearKey = () => {
    if (confirm('Clear saved Mesh API key?')) {
      setApiKey('');
      setStoredMeshKey('');
      setTestResult(null);
      setSaveStatus('API key cleared.');
      setTimeout(() => setSaveStatus(null), 2000);
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
            className="bg-neo-cream text-black w-full max-w-lg p-4 sm:p-6 border-4 border-black brutal-shadow-lg relative font-sans max-h-[92vh] overflow-y-auto"
          >
            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleCloseModal}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1 sm:p-1.5 bg-black text-white hover:bg-neo-pink transition-colors border-2 border-black cursor-pointer z-10"
              title="Close AI Settings"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-3" />
            </motion.button>

            {/* Modal Header */}
            <div className="flex items-start space-x-2.5 sm:space-x-3 mb-3.5 sm:mb-4 pr-8 sm:pr-10">
              <div className="w-9 h-9 sm:w-11 sm:h-11 bg-neo-yellow text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy shrink-0 -rotate-2">
                <Bot className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <h3 className="text-base sm:text-lg font-heavy uppercase tracking-tight text-black leading-tight">
                    HOST AI ENGINE SETTINGS
                  </h3>
                  <span className="px-1.5 py-0.2 bg-black text-neo-yellow font-mono text-[9px] font-black uppercase border border-black">
                    MESH API
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs font-mono text-slate-700 mt-0.5">
                  Powered by <strong>Mesh API (AI Fiesta)</strong> // 100% Host-gated with zero attendee credit burn
                </p>
              </div>
            </div>

            {/* Info Banner */}
            <div className="p-2.5 sm:p-3 bg-amber-100/80 border-2 border-black font-mono text-[11px] text-slate-800 mb-3 space-y-1">
              <div className="flex items-center space-x-1 font-black text-black uppercase">
                <Shield className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>ATTENDEE PROTECTION GUARANTEE</span>
              </div>
              <p className="text-slate-700 leading-snug">
                Your Mesh Router Key is stored locally in your browser. All AI quiz generation and proofs are broadcast to attendees as live events without attendees calling your API key.
              </p>
            </div>

            {/* Configuration Form */}
            <form onSubmit={handleSave} className="space-y-3.5 font-mono">
              {/* API Key Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black uppercase flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span>MESH ROUTER SERVICE KEY (`rsk_...`):</span>
                  </label>
                  {apiKey && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        playClickSound();
                        handleClearKey();
                      }}
                      className="text-[10px] text-slate-500 hover:text-neo-pink font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> CLEAR
                    </motion.button>
                  )}
                </div>

                <div className="flex items-center bg-white border-2 border-black focus-within:bg-neo-yellow/15">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="rsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="flex-1 px-3 py-2 text-xs text-black font-bold focus:outline-none bg-transparent"
                  />
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      playClickSound();
                      setShowKey(!showKey);
                    }}
                    className="px-2.5 py-2 text-slate-500 hover:text-black transition-colors cursor-pointer"
                    title={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </motion.button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-600 mt-1">
                  <span>Get your key from <a href="https://meshapi.ai" target="_blank" rel="noreferrer" className="font-bold underline text-black hover:text-neo-pink">meshapi.ai</a></span>
                  {apiKey ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                      <CheckCircle className="w-3 h-3" /> KEY CONFIGURED
                    </span>
                  ) : (
                    <span className="text-amber-700 font-bold">KEY MISSING</span>
                  )}
                </div>
              </div>

              {/* Model Selector Presets */}
              <div>
                <label className="text-xs font-black uppercase mb-1.5 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-neo-pink" />
                  <span>ACTIVE LLM MODEL PRESET:</span>
                </label>

                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                  {MESH_MODEL_OPTIONS.map((m) => {
                    const isSelected = selectedModel === m.id && !customModelInput.trim();
                    return (
                      <motion.button
                        key={m.id}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          playPopSound();
                          setSelectedModel(m.id);
                          setCustomModelInput('');
                          setStoredMeshModel(m.id);
                          if (roomCode) {
                            dbUpdateRoomAIModel(roomCode, m.id);
                          }
                          setSaveStatus(`Active: ${m.name}`);
                          setTimeout(() => setSaveStatus(null), 2000);
                        }}
                        className={`p-2.5 text-left border-2 border-black transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-neo-yellow text-black brutal-shadow-sm font-black'
                            : 'bg-white hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[11px] font-black uppercase">{m.name}</span>
                            <span className={`text-[9px] font-black px-1 border border-black shrink-0 ${
                              isSelected ? 'bg-black text-white' : 'bg-neo-mint text-black'
                            }`}>
                              {m.tag}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-700 font-medium leading-snug">
                            {m.description}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Custom Model Override */}
                <div className={`mt-2 p-2.5 bg-white border-2 border-black transition-colors ${
                  customModelInput.trim() ? 'bg-neo-yellow/10 border-neo-pink' : ''
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-black uppercase text-slate-700 flex items-center gap-1">
                      <span>Or enter custom model ID (any model on Mesh API):</span>
                    </label>
                    {customModelInput.trim() ? (
                      <span className="text-[9px] font-black uppercase text-neo-pink px-1 py-0.2 bg-neo-pink/10 border border-neo-pink">
                        ● CUSTOM OVERRIDE ACTIVE
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-500">
                        Leave blank to use preset
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={customModelInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomModelInput(val);
                      const modelToSave = val.trim() || selectedModel || 'auto';
                      setStoredMeshModel(modelToSave);
                      if (roomCode) {
                        dbUpdateRoomAIModel(roomCode, modelToSave);
                      }
                    }}
                    placeholder="e.g. openai/gpt-4o-mini or deepseek/deepseek-v4-flash"
                    className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-black text-black font-bold focus:outline-none focus:bg-neo-yellow/20 font-mono"
                  />
                  <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1">
                    <span>Quick model IDs:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const id = 'openai/gpt-4o-mini';
                          setCustomModelInput(id);
                          setSelectedModel(id);
                          setStoredMeshModel(id);
                          if (roomCode) dbUpdateRoomAIModel(roomCode, id);
                          setSaveStatus('Active: GPT-4o Mini');
                          setTimeout(() => setSaveStatus(null), 2000);
                        }}
                        className="underline hover:text-black font-bold cursor-pointer"
                      >
                        gpt-4o-mini
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => {
                          const id = 'deepseek/deepseek-v4-flash';
                          setCustomModelInput(id);
                          setSelectedModel(id);
                          setStoredMeshModel(id);
                          if (roomCode) dbUpdateRoomAIModel(roomCode, id);
                          setSaveStatus('Active: DeepSeek V4 Flash');
                          setTimeout(() => setSaveStatus(null), 2000);
                        }}
                        className="underline hover:text-black font-bold cursor-pointer"
                      >
                        deepseek-v4-flash
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => {
                          const id = 'deepseek/deepseek-chat';
                          setCustomModelInput(id);
                          setSelectedModel(id);
                          setStoredMeshModel(id);
                          if (roomCode) dbUpdateRoomAIModel(roomCode, id);
                          setSaveStatus('Active: DeepSeek V3 Chat');
                          setTimeout(() => setSaveStatus(null), 2000);
                        }}
                        className="underline hover:text-black font-bold cursor-pointer"
                      >
                        deepseek-chat
                      </button>
                    </div>
                  </div>
                </div>

                {/* Maximum Credit Saver Engine Callout */}
                <div className="mt-2.5 p-2.5 bg-emerald-50 border-2 border-black font-mono text-[11px] text-emerald-950 flex items-start gap-2">
                  <Zap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-black uppercase text-emerald-900 flex items-center gap-1.5 flex-wrap">
                      <span>MAX CREDIT SAVER ENGINE ACTIVE</span>
                      <span className="px-1 py-0.2 bg-emerald-600 text-white text-[8px] font-black">COST OPTIMIZED</span>
                    </div>
                    <p className="text-[10px] text-emerald-800 leading-snug">
                      <strong>Smart Auto-Router</strong> & <strong>GPT-4o Mini</strong> route live moderation, quizzes, duplicate checks, and surveys to ultra-low cost, high-efficiency endpoints with zero-cost memoization.
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Q&A Safeguard & Content Moderation Card */}
              <div className="p-3 bg-white border-2 border-black space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-2.5 min-w-0">
                    <div className="w-7 h-7 bg-neo-pink text-white border border-black flex items-center justify-center font-heavy shrink-0 mt-0.5">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-heavy text-xs uppercase tracking-tight text-black flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span>AI Q&A SAFEGUARD</span>
                        <span
                          className={`px-1.5 py-0.2 text-[8px] font-black uppercase border border-black ${
                            qaSafeguard ? 'bg-neo-mint text-black' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {qaSafeguard ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-600 font-sans mt-0.5 leading-snug">
                        Screens audience questions for harassment, offensive profanity, and spam via Mesh AI before they appear on the live stage.
                      </div>
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      playPopSound();
                      const next = !qaSafeguard;
                      setQaSafeguard(next);
                      setQASafeguardEnabled(next);
                    }}
                    className={`px-3 py-1 text-xs font-mono font-black uppercase border-2 border-black brutal-shadow-sm cursor-pointer transition-all shrink-0 ${
                      qaSafeguard
                        ? 'bg-neo-mint text-black'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {qaSafeguard ? 'ENABLED' : 'DISABLED'}
                  </motion.button>
                </div>
              </div>

              {/* Test & Save Status Notifications */}
              {testResult && (
                <div className={`p-2.5 text-xs font-bold border-2 border-black flex items-start space-x-2 ${
                  testResult.success ? 'bg-neo-mint text-black' : 'bg-neo-pink text-white'
                }`}>
                  {testResult.success ? (
                    <CheckCircle className="w-4 h-4 stroke-3 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 text-[11px] font-mono break-all leading-snug">
                    {testResult.message}
                  </div>
                </div>
              )}

              {saveStatus && (
                <div className="p-2 bg-neo-mint text-black border-2 border-black font-mono text-xs font-black flex items-center space-x-1.5">
                  <CheckCircle className="w-3.5 h-3.5 stroke-3 shrink-0" />
                  <span>{saveStatus}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col xs:flex-row items-center justify-between gap-2 pt-2 border-t-2 border-black/20">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleTest}
                  disabled={isTesting || !apiKey.trim()}
                  className="w-full xs:w-auto px-3 py-1.5 bg-neo-cyan hover:bg-[#33F3FF] disabled:bg-slate-200 disabled:text-slate-500 text-black text-xs font-black uppercase border-2 border-black brutal-shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isTesting ? 'TESTING...' : 'TEST CONNECTION'}</span>
                </motion.button>

                <div className="flex items-center space-x-2 w-full xs:w-auto justify-end">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleCloseModal}
                    className="w-full xs:w-auto px-3.5 py-1.5 text-xs font-mono font-bold uppercase border-2 border-black bg-slate-200 hover:bg-slate-300 text-black cursor-pointer text-center"
                  >
                    CANCEL
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      playWhoosh();
                      handleSave();
                      onClose();
                    }}
                    className="w-full xs:w-auto px-4 py-1.5 bg-neo-yellow hover:bg-[#FFF04D] text-black text-xs font-black uppercase border-2 border-black brutal-shadow flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>SAVE & CLOSE</span>
                  </motion.button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
