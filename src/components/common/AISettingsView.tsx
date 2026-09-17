import React, { useState, useEffect } from 'react';
import {
  Bot,
  Key,
  CheckCircle,
  AlertCircle,
  Zap,
  Shield,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  ExternalLink,
  Check,
  Cpu,
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
import { playClickSound, playPopSound } from '../../lib/soundFx';

interface AISettingsViewProps {
  roomCode?: string;
}

export const AISettingsView: React.FC<AISettingsViewProps> = ({ roomCode }) => {
  const [apiKey, setApiKey] = useState(() => getStoredMeshKey());
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => getStoredMeshModel());
  const [customModelInput, setCustomModelInput] = useState(() => {
    const existingModel = getStoredMeshModel();
    if (existingModel && existingModel !== 'auto' && !MESH_MODEL_OPTIONS.some((m) => m.id === existingModel)) {
      return existingModel;
    }
    return '';
  });
  const [qaSafeguard, setQaSafeguard] = useState(() => isQASafeguardEnabled());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Sync state if external changes happen
  useEffect(() => {
    const key = getStoredMeshKey();
    const model = getStoredMeshModel();
    setApiKey(key);
    setSelectedModel(model);
    setQaSafeguard(isQASafeguardEnabled());
    if (model && model !== 'auto' && !MESH_MODEL_OPTIONS.some((m) => m.id === model)) {
      setCustomModelInput(model);
    }
  }, [roomCode]);

  const triggerSaveNotification = (msg: string = 'Saved') => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    const clean = val.trim();
    setStoredMeshKey(clean);
    triggerSaveNotification('Key Saved');
  };

  const handleClearKey = () => {
    if (confirm('Clear saved Mesh API key?')) {
      playClickSound();
      setApiKey('');
      setStoredMeshKey('');
      setTestResult(null);
      triggerSaveNotification('Key Cleared');
    }
  };

  const handleSelectModel = (modelId: string, modelName: string) => {
    playPopSound();
    setSelectedModel(modelId);
    setCustomModelInput('');
    setStoredMeshModel(modelId);
    if (roomCode) {
      dbUpdateRoomAIModel(roomCode, modelId);
    }
    triggerSaveNotification(`Active: ${modelName}`);
  };

  const handleCustomModelChange = (val: string) => {
    setCustomModelInput(val);
    const modelToSave = val.trim() || selectedModel || 'auto';
    setStoredMeshModel(modelToSave);
    if (roomCode) {
      dbUpdateRoomAIModel(roomCode, modelToSave);
    }
    triggerSaveNotification(val.trim() ? 'Custom Model Active' : 'Model Saved');
  };

  const handleToggleSafeguard = () => {
    playPopSound();
    const next = !qaSafeguard;
    setQaSafeguard(next);
    setQASafeguardEnabled(next);
    triggerSaveNotification(next ? 'Safeguard Enabled' : 'Safeguard Disabled');
  };

  const handleTest = async () => {
    playClickSound();
    setIsTesting(true);
    setTestResult(null);
    const finalModel = customModelInput.trim() || selectedModel || 'auto';
    const result = await testMeshConnection(apiKey.trim(), finalModel);
    setTestResult(result);
    setIsTesting(false);
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-5 font-sans pb-24 sm:pb-28 md:pb-8">
      {/* Top Header Card */}
      <div className="bg-[#101014] p-5 sm:p-6 rounded-2xl border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                AI Settings
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-semibold tracking-wide border border-blue-500/20">
                Mesh API
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Configure your Mesh API key, select LLM model routing, and manage automated content safety.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-end sm:self-center">
          <AnimatePresence>
            {saveStatus && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 font-medium"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saveStatus}</span>
              </motion.span>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleTest}
            disabled={isTesting || !apiKey.trim()}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-white/[0.04] disabled:text-zinc-500 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Test Connection</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Test Connection Result Alert */}
      {testResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl text-xs font-medium border flex items-start space-x-3 ${
            testResult.success
              ? 'bg-blue-500/10 border-blue-500/30 text-white'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {testResult.success ? (
            <CheckCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-mono break-all leading-relaxed">
            {testResult.message}
          </div>
        </motion.div>
      )}

      {/* Section 1: API Key & Connection */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#101014] border border-white/[0.08] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Key className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Mesh Router Service Key</h3>
          </div>
          {apiKey && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClearKey}
              className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1 cursor-pointer transition-colors px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20"
            >
              <Trash2 className="w-3 h-3" /> Clear Key
            </motion.button>
          )}
        </div>

        <p className="text-xs text-zinc-400">
          Your key is stored locally in your browser. Live quizzes, survey questions, and moderation run through this key.
        </p>

        <div className="flex items-center rounded-xl bg-white/[0.03] border border-white/[0.08] focus-within:border-blue-500 transition-colors">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            placeholder="rsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="flex-1 px-4 py-3 text-xs text-white font-mono focus:outline-none bg-transparent"
          />
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              playClickSound();
              setShowKey(!showKey);
            }}
            className="px-3.5 py-3 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </motion.button>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500">
          <a
            href="https://meshapi.ai"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline"
          >
            <span>Get your key from meshapi.ai</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          {apiKey ? (
            <span className="text-blue-400 font-medium flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Key Configured
            </span>
          ) : (
            <span className="text-amber-400 font-medium">Key Missing</span>
          )}
        </div>
      </div>

      {/* Section 2: Active Model Presets */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#101014] border border-white/[0.08] shadow-sm space-y-4">
        <div>
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Active LLM Model</h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Choose the model preset that best balances reasoning depth, generation speed, and token cost.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MESH_MODEL_OPTIONS.map((m) => {
            const isSelected = selectedModel === m.id && !customModelInput.trim();
            return (
              <motion.button
                key={m.id}
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectModel(m.id, m.name)}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? 'bg-blue-500/10 border-blue-500/40 text-white shadow-sm'
                    : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04] text-zinc-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-semibold text-white">{m.name}</span>
                    <span
                      className={`text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        isSelected
                          ? 'bg-blue-500 text-white'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {m.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {m.description}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Custom Model Override */}
        <div
          className={`p-4 rounded-xl border transition-colors space-y-2 ${
            customModelInput.trim() ? 'border-blue-500/40 bg-blue-500/5' : 'bg-white/[0.02] border-white/[0.08]'
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-300">
              Or enter custom model ID (any model on Mesh API):
            </label>
            {customModelInput.trim() ? (
              <span className="text-[9px] font-semibold text-blue-400 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30">
                Custom Active
              </span>
            ) : (
              <span className="text-[11px] text-zinc-500">Leave blank to use preset</span>
            )}
          </div>
          <input
            type="text"
            value={customModelInput}
            onChange={(e) => handleCustomModelChange(e.target.value)}
            placeholder="e.g. openai/gpt-4o-mini or deepseek/deepseek-v4-flash"
            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-black/40 border border-white/[0.08] text-white font-mono focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Section 3: Safety & Content Moderation */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#101014] border border-white/[0.08] shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start space-x-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm text-white flex items-center space-x-2 flex-wrap gap-y-1">
                <span>AI Q&A Safeguard</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    qaSafeguard
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : 'bg-white/[0.04] text-zinc-400 border-white/[0.08]'
                  }`}
                >
                  {qaSafeguard ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Screens audience questions for harassment, profanity, and spam via Mesh AI before they appear on the live stage.
              </p>
            </div>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={handleToggleSafeguard}
            className={`px-4 py-2 text-xs rounded-xl font-medium border cursor-pointer transition-all shrink-0 ${
              qaSafeguard
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                : 'bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:text-white'
            }`}
          >
            {qaSafeguard ? 'Enabled' : 'Disabled'}
          </motion.button>
        </div>
      </div>
    </div>
  );
};
