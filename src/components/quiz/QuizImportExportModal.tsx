import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  FileCode,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { QuizQuestion } from '../../types';
import {
  exportToSketchCastJSON,
  exportToSketchCastCSV,
  exportToKahootCSV,
  importFromCSVOrJSON,
  triggerFileDownload,
  type ParsedQuizImportResult,
} from '../../lib/quizImportExport';
import { playClickSound, playPopSound, playSuccessFanfare } from '../../lib/soundFx';

interface QuizImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: QuizQuestion[];
  onImportQuestions: (imported: QuizQuestion[]) => void;
  roomCode?: string;
}

export const QuizImportExportModal: React.FC<QuizImportExportModalProps> = ({
  isOpen,
  onClose,
  questions,
  onImportQuestions,
  roomCode = 'ARENA',
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [dragOver, setDragOver] = useState(false);
  const [importResult, setImportResult] = useState<ParsedQuizImportResult | null>(null);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    playPopSound();
    const content = exportToSketchCastJSON(questions);
    triggerFileDownload(content, `sketchcast_quiz_${roomCode.toLowerCase()}_${Date.now()}.json`, 'application/json');
  };

  const handleExportCSV = () => {
    playPopSound();
    const content = exportToSketchCastCSV(questions);
    triggerFileDownload(content, `sketchcast_quiz_${roomCode.toLowerCase()}_${Date.now()}.csv`, 'text/csv');
  };

  const handleExportKahoot = () => {
    playPopSound();
    const content = exportToKahootCSV(questions);
    triggerFileDownload(content, `kahoot_import_template_${roomCode.toLowerCase()}_${Date.now()}.csv`, 'text/csv');
  };

  const processFile = (file: File) => {
    setImportedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const res = importFromCSVOrJSON(text);
        setImportResult(res);
        if (res.questions.length > 0) {
          playSuccessFanfare();
        }
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleConfirmImport = () => {
    if (importResult && importResult.questions.length > 0) {
      playClickSound();
      onImportQuestions(importResult.questions);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="bg-[#0E0E11] border border-white/[0.08] rounded-2xl w-[95vw] sm:max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden font-sans shadow-modal"
        >
          {/* Header */}
          <div className="bg-[#121215] border-b border-white/[0.08] p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-blue-500/10 text-blue-400 flex items-center justify-center rounded-xl border border-blue-500/20 shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  Quiz Import & Export
                </h2>
                <p className="text-xs text-zinc-400">
                  Kahoot spreadsheets, SketchCast CSV & JSON formats.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="w-8 h-8 bg-[#16161A] hover:bg-[#1E1E24] text-zinc-400 hover:text-white border border-white/[0.08] rounded-xl flex items-center justify-center cursor-pointer transition-colors shrink-0"
              title="Close modal"
            >
              <X className="w-4 h-4 stroke-2" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/[0.08] bg-[#121216] shrink-0 p-1.5 gap-1.5">
            <button
              onClick={() => {
                playClickSound();
                setActiveTab('export');
              }}
              className={`flex-1 py-2 px-4 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Cartridge ({questions.length})</span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setActiveTab('import');
              }}
              className={`flex-1 py-2 px-4 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'import'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Questions</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs text-zinc-200">
            {activeTab === 'export' ? (
              <div className="space-y-4">
                <div className="bg-[#121215] p-3.5 rounded-xl border border-white/[0.08] space-y-1">
                  <div className="font-semibold text-white text-xs flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>Current Queue: {questions.length} Questions</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Download questions in your preferred standard format to back up, share with colleagues, or launch in Kahoot!
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Option 1: Kahoot CSV */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    onClick={handleExportKahoot}
                    className="p-4 bg-[#121215] hover:bg-[#16161C] border border-white/[0.08] hover:border-blue-500/40 rounded-2xl flex flex-col justify-between gap-3 cursor-pointer group transition-all"
                  >
                    <div className="space-y-2">
                      <div className="w-8 h-8 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl flex items-center justify-center">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="font-semibold text-white text-xs tracking-tight group-hover:text-blue-400 transition-colors">
                        Kahoot CSV
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Official 7-column CSV template formatted specifically for direct Kahoot creator import.
                      </p>
                    </div>
                    <div className="pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-xs text-blue-400 font-semibold">
                      <span>Download .CSV</span>
                      <Download className="w-3.5 h-3.5" />
                    </div>
                  </motion.div>

                  {/* Option 2: SketchCast Native CSV */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    onClick={handleExportCSV}
                    className="p-4 bg-[#121215] hover:bg-[#16161C] border border-white/[0.08] hover:border-blue-500/40 rounded-2xl flex flex-col justify-between gap-3 cursor-pointer group transition-all"
                  >
                    <div className="space-y-2">
                      <div className="w-8 h-8 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="font-semibold text-white text-xs tracking-tight group-hover:text-blue-400 transition-colors">
                        SketchCast CSV
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Complete technical breakdown with categories, explanations, timers, and AI deep dives.
                      </p>
                    </div>
                    <div className="pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-xs text-blue-400 font-semibold">
                      <span>Download .CSV</span>
                      <Download className="w-3.5 h-3.5" />
                    </div>
                  </motion.div>

                  {/* Option 3: SketchCast Native JSON */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    onClick={handleExportJSON}
                    className="p-4 bg-[#121215] hover:bg-[#16161C] border border-white/[0.08] hover:border-blue-500/40 rounded-2xl flex flex-col justify-between gap-3 cursor-pointer group transition-all"
                  >
                    <div className="space-y-2">
                      <div className="w-8 h-8 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl flex items-center justify-center">
                        <FileCode className="w-4 h-4" />
                      </div>
                      <div className="font-semibold text-white text-xs tracking-tight group-hover:text-blue-400 transition-colors">
                        Raw JSON Backup
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Full fidelity programmatic JSON data model matching SketchCast database records.
                      </p>
                    </div>
                    <div className="pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-xs text-blue-400 font-semibold">
                      <span>Download .JSON</span>
                      <Download className="w-3.5 h-3.5" />
                    </div>
                  </motion.div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Drag and Drop Zone */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.json,text/csv,application/json"
                  className="hidden"
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 sm:p-8 border border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    dragOver
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-white/[0.15] hover:border-blue-500/50 bg-[#121216] hover:bg-[#15151A]'
                  }`}
                >
                  <div className="w-10 h-10 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="font-semibold text-white text-xs sm:text-sm tracking-normal mb-1">
                    Browse or drag & drop file
                  </div>
                  <p className="text-[11px] text-zinc-400 max-w-sm">
                    Upload any <strong className="text-white">Kahoot spreadsheet (.csv)</strong>, <strong className="text-white">SketchCast CSV</strong>, or <strong className="text-white">JSON</strong> file.
                  </p>
                </div>

                {/* Parsed Result Preview */}
                {importResult && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-[#121216] p-3.5 rounded-xl border border-white/[0.08]">
                      <div className="flex items-center space-x-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-semibold text-white text-xs">
                            Parsed {importResult.questions.length} Questions
                          </span>
                          {importedFileName && (
                            <span className="text-[11px] text-zinc-400 block">
                              File: {importedFileName}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-semibold uppercase">
                        {importResult.formatDetected.replace('_', ' ')}
                      </span>
                    </div>

                    {importResult.errors.length > 0 && (
                      <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-300 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-rose-400">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Validation Warnings:</span>
                        </div>
                        {importResult.errors.map((err, i) => (
                          <div key={i} className="pl-5 text-[11px]">▸ {err}</div>
                        ))}
                      </div>
                    )}

                    {/* Preview Table */}
                    <div className="border border-white/[0.08] rounded-xl max-h-56 overflow-y-auto bg-[#0E0E11]">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-[#141418] text-zinc-400 border-b border-white/[0.08] sticky top-0 font-semibold uppercase text-[10px]">
                          <tr>
                            <th className="p-2.5 w-10">#</th>
                            <th className="p-2.5">Question</th>
                            <th className="p-2.5 w-28">Options</th>
                            <th className="p-2.5 w-16 text-center">Correct</th>
                            <th className="p-2.5 w-16 text-right">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05]">
                          {importResult.questions.map((q, idx) => (
                            <tr key={q.id || idx} className="hover:bg-white/[0.02]">
                              <td className="p-2.5 font-mono text-zinc-500">{String(idx + 1).padStart(2, '0')}</td>
                              <td className="p-2.5 font-medium text-zinc-200">{q.question}</td>
                              <td className="p-2.5 text-zinc-400 text-[10px] font-mono">
                                {q.options.map((o) => o.id).join(', ')} ({q.options.length})
                              </td>
                              <td className="p-2.5 text-center font-bold text-blue-400">{q.correctOptionId}</td>
                              <td className="p-2.5 text-right font-mono text-zinc-400">{q.timeLimitSeconds}s</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button
                      onClick={handleConfirmImport}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl border border-blue-500/40 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                    >
                      <span>Add {importResult.questions.length} Questions to Queue</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
