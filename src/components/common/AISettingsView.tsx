import React, { useState } from 'react';
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

  // Sync state if roomCode changes
  const [prevRoomCode, setPrevRoomCode] = useState(roomCode);
  if (roomCode !== prevRoomCode) {
    setPrevRoomCode(roomCode);
    const key = getStoredMeshKey();
    const model = getStoredMeshModel();
    setApiKey(key);
    setSelectedModel(model);
    setQaSafeguard(isQASafeguardEnabled());
    if (model && model !== 'auto' && !MESH_MODEL_OPTIONS.some((m) => m.id === model)) {
      setCustomModelInput(model);
    }
  }

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
    <div className="max-w-4xl mx-auto w-full space-y-5 font-sans p-2.5 sm:p-4 md:p-6">
      {/* Top Header Card */}
      <div className="bg-paper-surface p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-hairline flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-ink text-paper dark:bg-lime/20 dark:text-lime border border-hairline flex items-center justify-center shrink-0 shadow-sm">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-ink tracking-tight">
                AI Intelligence & Mesh Router
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-lime text-ink text-[10px] font-mono font-bold tracking-wide border border-ink/10">
                Mesh API
              </span>
            </div>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Configure your Mesh API key, orchestrate LLM model routing, and manage automated content safety.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          <AnimatePresence>
            {saveStatus && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1.5 text-xs text-ink bg-lime/25 px-3 py-1 rounded-full border border-ink/15 font-mono font-semibold"
              >
                <Check className="w-3.5 h-3.5 text-ink" />
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
            className="btn-noma-orange px-4 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
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
          className={`p-4 rounded-2xl text-xs font-medium border flex items-start space-x-3 shadow-xs ${
            testResult.success
              ? 'bg-lime/15 border-ink/15 text-ink'
              : 'bg-orange-500/10 border-orange-500/25 text-orange-950'
          }`}
        >
          {testResult.success ? (
            <CheckCircle className="w-4 h-4 text-ink shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-mono break-all leading-relaxed">
            {testResult.message}
          </div>
        </motion.div>
      )}

      {/* Section 1: API Key & Connection */}
      <div className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-paper-surface border border-hairline shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Key className="w-4 h-4 text-ink" />
            <h3 className="text-sm font-bold text-ink">Mesh Router Service Key</h3>
          </div>
          {apiKey && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClearKey}
              className="text-xs text-red-600 hover:text-red-700 font-mono font-medium flex items-center gap-1 cursor-pointer transition-colors px-2.5 py-1 rounded-lg bg-red-50 border border-red-200"
            >
              <Trash2 className="w-3 h-3" /> Clear Key
            </motion.button>
          )}
        </div>

        <p className="text-xs text-muted leading-relaxed">
          Your key is saved locally in your browser session. Live quizzes, survey generators, and content moderation execute through this key.
        </p>

        <div className="flex items-center rounded-xl bg-paper border border-hairline focus-within:border-ink transition-colors">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            placeholder="rsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="flex-1 px-4 py-3 text-xs text-ink font-mono focus:outline-none bg-transparent placeholder:text-muted/60"
          />
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              playClickSound();
              setShowKey(!showKey);
            }}
            className="px-3.5 py-3 text-muted hover:text-ink transition-colors cursor-pointer"
            title={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </motion.button>
        </div>

        <div className="flex items-center justify-between text-xs text-muted pt-1">
          <a
            href="https://meshapi.ai"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-ink font-medium hover:text-orange underline underline-offset-2 transition-colors"
          >
            <span>Get your key from meshapi.ai</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          {apiKey ? (
            <span className="text-ink font-mono font-medium flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-lime/20 border border-ink/10">
              <CheckCircle className="w-3.5 h-3.5 text-ink" /> Key Configured
            </span>
          ) : (
            <span className="text-amber-700 font-mono font-medium px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200">
              Key Missing
            </span>
          )}
        </div>
      </div>

      {/* Section 2: Active Model Presets */}
      <div className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-paper-surface border border-hairline shadow-xs space-y-4">
        <div>
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-ink" />
            <h3 className="text-sm font-bold text-ink">Active LLM Model Presets</h3>
          </div>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Choose the model preset that best balances reasoning depth, generation latency, and token efficiency.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {MESH_MODEL_OPTIONS.map((m) => {
            const isSelected = selectedModel === m.id && !customModelInput.trim();
            return (
              <motion.button
                key={m.id}
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectModel(m.id, m.name)}
                className={`p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                  isSelected
                    ? 'bg-ink text-paper border-ink shadow-sm'
                    : 'bg-paper border-hairline hover:border-ink/30 text-ink'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-paper' : 'text-ink'}`}>{m.name}</span>
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isSelected
                          ? 'bg-lime text-ink'
                          : 'bg-paper-surface text-ink border border-hairline'
                      }`}
                    >
                      {m.tag}
                    </span>
                  </div>
                  {m.provider && (
                    <div className={`text-[10px] font-mono mb-1.5 ${isSelected ? 'text-paper/70' : 'text-muted'}`}>
                      {m.provider}
                    </div>
                  )}
                  <p className={`text-[11px] leading-relaxed ${isSelected ? 'text-paper/80' : 'text-muted'}`}>
                    {m.description}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Custom Model Override */}
        <div
          className={`p-4 rounded-2xl border transition-colors space-y-2.5 ${
            customModelInput.trim() ? 'border-ink bg-paper' : 'bg-paper/50 border-hairline'
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-ink">
              Custom Model Identifier (Mesh API Router):
            </label>
            {customModelInput.trim() ? (
              <span className="text-[9px] font-mono font-bold text-ink px-2.5 py-0.5 rounded-full bg-lime border border-ink/10">
                Custom Active
              </span>
            ) : (
              <span className="text-[11px] text-muted">Leave blank to use preset</span>
            )}
          </div>
          <input
            type="text"
            value={customModelInput}
            onChange={(e) => handleCustomModelChange(e.target.value)}
            placeholder="e.g. xiaomi/mimo-v2.5, deepseek/deepseek-chat, or any model on Mesh API"
            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-paper-surface border border-hairline text-ink font-mono focus:outline-none focus:border-ink placeholder:text-muted/60"
          />
        </div>
      </div>

      {/* Section 3: Safety & Content Moderation */}
      <div className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-paper-surface border border-hairline shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start space-x-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-paper text-ink border border-hairline flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-5 h-5 text-ink" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-ink flex items-center space-x-2 flex-wrap gap-y-1">
                <span>AI Q&A Safeguard</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    qaSafeguard
                      ? 'bg-lime text-ink border-ink/10'
                      : 'bg-paper text-muted border-hairline'
                  }`}
                >
                  {qaSafeguard ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Screens audience questions for harassment, profanity, and off-topic spam via Mesh AI before they appear on the live stage.
              </p>
            </div>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={handleToggleSafeguard}
            className={`px-4 py-2 text-xs rounded-xl font-mono font-bold uppercase tracking-wider border cursor-pointer transition-all shrink-0 ${
              qaSafeguard
                ? 'btn-noma-ink'
                : 'btn-noma-ghost'
            }`}
          >
            {qaSafeguard ? 'Enabled' : 'Disabled'}
          </motion.button>
        </div>
      </div>

      {/* Mobile Bottom Clearance Spacer */}
      <div className="h-10 sm:h-12 md:hidden w-full shrink-0 pointer-events-none" aria-hidden="true" />
    </div>
  );
};
