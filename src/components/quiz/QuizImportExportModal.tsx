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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="bg-[#11131B] border-4 border-black brutal-shadow w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden font-mono"
        >
          {/* Header */}
          <div className="bg-neo-yellow border-b-2 border-black p-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-black text-neo-yellow flex items-center justify-center border-2 border-black brutal-shadow-sm shrink-0">
                <FileSpreadsheet className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-heavy uppercase tracking-tight text-black flex items-center gap-2">
                  QUIZ CARTRIDGE EXPORT & IMPORT
                </h2>
                <p className="text-[11px] text-slate-800 font-sans font-medium">
                  Interoperable with Kahoot spreadsheets, SketchCast CSV & JSON formats.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="w-8 h-8 bg-black hover:bg-neo-pink text-white hover:text-black border-2 border-black flex items-center justify-center cursor-pointer transition-colors shrink-0"
              title="Close modal"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          {/* Navigation Cassette Tabs */}
          <div className="flex border-b-2 border-black bg-[#161925] shrink-0">
            <button
              onClick={() => {
                playClickSound();
                setActiveTab('export');
              }}
              className={`flex-1 py-2.5 px-4 text-xs font-heavy uppercase tracking-wide flex items-center justify-center gap-2 border-r-2 border-black transition-colors cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-neo-card text-neo-yellow border-b-2 border-b-neo-yellow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT CARTRIDGE ({questions.length})</span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setActiveTab('import');
              }}
              className={`flex-1 py-2.5 px-4 text-xs font-heavy uppercase tracking-wide flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'import'
                  ? 'bg-neo-card text-neo-cyan border-b-2 border-b-neo-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>IMPORT QUESTIONS</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs text-slate-200">
            {activeTab === 'export' ? (
              <div className="space-y-4">
                <div className="bg-[#1A1E2B] p-3.5 border-2 border-black brutal-shadow-sm space-y-1">
                  <div className="font-heavy text-white text-xs uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-neo-yellow" />
                    <span>EXPORT CURRENT HOST QUEUE ({questions.length} QUESTIONS)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Download questions in your preferred standard format to back up, share with colleagues, or launch in Kahoot!
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Option 1: Kahoot CSV */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    onClick={handleExportKahoot}
                    className="p-4 bg-[#141722] hover:bg-[#1E2333] border-2 border-black brutal-shadow-sm flex flex-col justify-between gap-3 cursor-pointer group transition-all"
                  >
                    <div className="space-y-2">
                      <div className="w-9 h-9 bg-neo-pink text-white border-2 border-black flex items-center justify-center brutal-shadow-sm">
                        <FileSpreadsheet className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div className="font-heavy text-white text-xs uppercase tracking-tight group-hover:text-neo-pink transition-colors">
                        KAHOOT SPREADSHEET
                      </div>
                      <p className="text-[10.5px] text-slate-400 font-sans leading-relaxed">
                        Official 7-column CSV template formatted specifically for direct Kahoot creator import.
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-neo-pink font-bold">
                      <span>DOWNLOAD .CSV</span>
                      <Download className="w-3.5 h-3.5" />
                    </div>
                  </motion.div>

                  {/* Option 2: SketchCast Native CSV */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    onClick={handleExportCSV}
                    className="p-4 bg-[#141722] hover:bg-[#1E2333] border-2 border-black brutal-shadow-sm flex flex-col justify-between gap-3 cursor-pointer group transition-all"
                  >
                    <div className="space-y-2">
                      <div className="w-9 h-9 bg-neo-yellow text-black border-2 border-black flex items-center justify-center brutal-shadow-sm">
                        <FileText className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div className="font-heavy text-white text-xs uppercase tracking-tight group-hover:text-neo-yellow transition-colors">
                        SKETCHCAST CSV
                      </div>
                      <p className="text-[10.5px] text-slate-400 font-sans leading-relaxed">
                        Complete technical breakdown with categories, explanations, timers, and AI deep dives.
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-neo-yellow font-bold">
                      <span>DOWNLOAD .CSV</span>
                      <Download className="w-3.5 h-3.5" />
                    </div>
                  </motion.div>

                  {/* Option 3: SketchCast Native JSON */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    onClick={handleExportJSON}
                    className="p-4 bg-[#141722] hover:bg-[#1E2333] border-2 border-black brutal-shadow-sm flex flex-col justify-between gap-3 cursor-pointer group transition-all"
                  >
                    <div className="space-y-2">
                      <div className="w-9 h-9 bg-neo-mint text-black border-2 border-black flex items-center justify-center brutal-shadow-sm">
                        <FileCode className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div className="font-heavy text-white text-xs uppercase tracking-tight group-hover:text-neo-mint transition-colors">
                        RAW JSON BACKUP
                      </div>
                      <p className="text-[10.5px] text-slate-400 font-sans leading-relaxed">
                        Full fidelity programmatic JSON data model matching SketchCast database records.
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-neo-mint font-bold">
                      <span>DOWNLOAD .JSON</span>
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
                  className={`p-6 sm:p-8 border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    dragOver
                      ? 'border-neo-yellow bg-neo-yellow/10'
                      : 'border-slate-700 hover:border-neo-cyan bg-[#141722] hover:bg-[#181B28]'
                  }`}
                >
                  <div className="w-12 h-12 bg-neo-cyan text-black border-2 border-black flex items-center justify-center brutal-shadow-sm mb-3">
                    <Upload className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div className="font-heavy text-white text-xs sm:text-sm uppercase tracking-tight mb-1">
                    CLICK TO BROWSE OR DRAG & DROP FILE
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans max-w-sm">
                    Upload any <strong>Kahoot spreadsheet (.csv)</strong>, <strong>SketchCast CSV</strong>, or <strong>JSON</strong> file. Format is auto-detected.
                  </p>
                </div>

                {/* Parsed Result Preview */}
                {importResult && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-[#1A1E2B] p-3 border-2 border-black brutal-shadow-sm">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-neo-mint shrink-0" />
                        <div>
                          <span className="font-heavy text-white text-xs">
                            PARSED {importResult.questions.length} QUESTIONS
                          </span>
                          {importedFileName && (
                            <span className="text-[10px] text-slate-400 font-sans block">
                              File: {importedFileName}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="px-2 py-0.5 bg-black text-neo-yellow border border-black text-[10px] font-black uppercase">
                        FORMAT: {importResult.formatDetected.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    {importResult.errors.length > 0 && (
                      <div className="p-3 bg-red-950/40 border border-red-500/50 text-red-300 text-[11px] space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-red-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Validation Warnings:</span>
                        </div>
                        {importResult.errors.map((err, i) => (
                          <div key={i} className="pl-5 text-[10.5px]">▸ {err}</div>
                        ))}
                      </div>
                    )}

                    {/* Preview Table */}
                    <div className="border-2 border-black max-h-56 overflow-y-auto bg-black/40">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-[#1D2130] text-slate-400 border-b border-black sticky top-0 font-heavy uppercase text-[10px]">
                          <tr>
                            <th className="p-2 w-10">#</th>
                            <th className="p-2">QUESTION</th>
                            <th className="p-2 w-28">OPTIONS</th>
                            <th className="p-2 w-16 text-center">CORRECT</th>
                            <th className="p-2 w-16 text-right">TIME</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {importResult.questions.map((q, idx) => (
                            <tr key={q.id || idx} className="hover:bg-slate-800/40">
                              <td className="p-2 font-mono text-slate-500">{idx + 1}</td>
                              <td className="p-2 font-sans font-medium text-slate-200">{q.question}</td>
                              <td className="p-2 text-slate-400 text-[10px] font-mono">
                                {q.options.map((o) => o.id).join(', ')} ({q.options.length})
                              </td>
                              <td className="p-2 text-center font-heavy text-neo-yellow">{q.correctOptionId}</td>
                              <td className="p-2 text-right font-mono text-slate-400">{q.timeLimitSeconds}s</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button
                      onClick={handleConfirmImport}
                      className="w-full py-3 bg-neo-mint hover:bg-emerald-400 text-black border-2 border-black brutal-shadow-sm font-heavy text-xs uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-x-px active:translate-y-px"
                    >
                      <span>ADD {importResult.questions.length} QUESTIONS TO QUEUE</span>
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
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
