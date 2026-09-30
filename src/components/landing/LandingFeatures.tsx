import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap,
  Vote,
  HelpCircle,
  ClipboardList,
  Sparkles,
  CheckCircle2,
  ThumbsUp,
  Star,
} from 'lucide-react';
import { playClickSound } from '../../lib/soundFx';

export const LandingFeatures: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);

  const features = [
    {
      id: 'quiz',
      title: 'High-Velocity Quizzes',
      shortTitle: 'Quizzes',
      subtitle: 'Dynamic Speed Scoring & Podium Fanfares',
      badge: 'COMPETITIVE ARENA',
      icon: <Zap className="w-5 h-5 text-orange" />,
      color: 'orange',
      description:
        'Engage attendees with high-stakes technical quizzes. Integrated time-weighted speed bonuses reward fast thinkers, while automated remediation polls trigger instantly if the audience struggles on a tricky concept.',
      highlights: [
        'Speed bonuses & dynamic streak multipliers',
        'Automated AI remediation polls for low-scoring questions',
        'Podium celebrations with live celebratory sound effects',
        'Instant social brag cards for champions',
      ],
      previewContent: (
        <div className="p-4 sm:p-5 bg-paper rounded-2xl border border-hairline space-y-3 font-mono text-xs shadow-xs">
          <div className="flex items-center justify-between text-muted">
            <span className="flex items-center gap-1.5 font-bold text-orange">
              <Zap className="w-3.5 h-3.5" /> QUESTION 04/05
            </span>
            <span className="px-2 py-0.5 rounded-full bg-lime/30 text-ink border border-lime text-[10px] font-bold">
              SPEED MULTIPLIER x2.5
            </span>
          </div>
          <div className="font-serif text-sm font-bold text-ink">
            What is the maximum latency threshold for interactive keynotes?
          </div>
          <div className="space-y-1.5">
            <div className="p-2.5 rounded-xl bg-lime/20 border border-lime text-ink flex items-center justify-between font-semibold">
              <span>A. Sub-40ms with WebSocket mesh</span>
              <span className="font-bold text-ink">92% (Correct)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-paper-card border border-hairline text-muted flex items-center justify-between">
              <span>B. 2-5 seconds with HTTP polling</span>
              <span>8%</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 text-[11px] text-muted">
            <span>Streak: 🔥 3 In a Row</span>
            <span className="text-orange font-bold">+240 Points Awarded</span>
          </div>
        </div>
      ),
    },
    {
      id: 'polls',
      title: 'Instant Audience Consensus',
      shortTitle: 'Audience Consensus',
      subtitle: 'Real-time Sentiment & AI Synthesis',
      badge: 'LIVE CONSENSUS',
      icon: <Vote className="w-5 h-5 text-lime" />,
      color: 'lime',
      description:
        'Gather pulse feedback on technology stacks, architectural choices, and keynote topics in under 2 seconds. Watch vote bars animate smoothly in real time, accompanied by automated AI consensus summaries.',
      highlights: [
        'Real-time animated voting progress bars',
        'Instant AI consensus & sentiment summarization',
        'Single-choice & multi-select question formats',
        'One-click host reset and live takeaway exports',
      ],
      previewContent: (
        <div className="p-4 sm:p-5 bg-paper rounded-2xl border border-hairline space-y-3 font-mono text-xs shadow-xs">
          <div className="flex items-center justify-between text-muted">
            <span className="font-bold text-ink uppercase">Live Consensus Poll</span>
            <span className="text-[10px] text-muted">184 Votes Cast</span>
          </div>
          <div className="font-serif text-sm font-bold text-ink">
            Which framework do you use for high-throughput edge backends?
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[11px] mb-1 font-semibold">
                <span>Rust / Actix-Web</span>
                <span className="text-orange">48%</span>
              </div>
              <div className="h-2 rounded-full bg-paper-card overflow-hidden border border-hairline">
                <div className="h-full bg-orange w-[48%] rounded-full" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1 font-semibold">
                <span>Go / Fiber</span>
                <span className="text-lime">34%</span>
              </div>
              <div className="h-2 rounded-full bg-paper-card overflow-hidden border border-hairline">
                <div className="h-full bg-lime w-[34%] rounded-full" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1 font-semibold">
                <span>TypeScript / Bun</span>
                <span className="text-sky">18%</span>
              </div>
              <div className="h-2 rounded-full bg-paper-card overflow-hidden border border-hairline">
                <div className="h-full bg-sky w-[18%] rounded-full" />
              </div>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-paper-card border border-hairline text-[11px] text-muted font-sans flex items-start gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-orange shrink-0 mt-0.5" />
            <span>AI Consensus: Strong consensus towards typed systems with minimal runtime overhead.</span>
          </div>
        </div>
      ),
    },
    {
      id: 'qa',
      title: 'Crowdsourced Q&A & Spotlight',
      shortTitle: 'Q&A & Spotlight',
      subtitle: 'Thumb-Triage, Spotlight & Safeguards',
      badge: 'MODERATED DIALOGUE',
      icon: <HelpCircle className="w-5 h-5 text-sky" />,
      color: 'sky',
      description:
        'Transform noisy audience chats into a curated stream of top technical inquiries. Attendees upvote the most insightful questions, while presenters can push any question to the Stage Spotlight across all screens.',
      highlights: [
        'Thumb-based community upvote triage',
        'Presenter Stage Spotlight broadcasted to all attendee devices',
        'AI Theme Clustering to merge duplicate inquiries',
        'Automated Safeguard moderation with strike tracking',
      ],
      previewContent: (
        <div className="p-4 sm:p-5 bg-paper rounded-2xl border border-hairline space-y-3 font-mono text-xs shadow-xs">
          <div className="flex items-center justify-between text-muted">
            <span className="font-bold text-orange uppercase flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> STAGE SPOTLIGHT
            </span>
            <span className="text-[10px] bg-lime/25 text-ink px-2 py-0.5 rounded-full border border-lime font-bold">
              ACTIVE ON STAGE
            </span>
          </div>
          <div className="p-3 bg-paper-card rounded-xl border border-hairline space-y-2">
            <div className="font-sans text-xs sm:text-sm font-semibold text-ink leading-snug">
              &ldquo;How do you handle event order guarantees when peers reconnect after network handshakes?&rdquo;
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span>Submitted by: <strong>DevPilot_91</strong></span>
              <span className="flex items-center gap-1 font-bold text-ink">
                <ThumbsUp className="w-3 h-3 text-orange" /> 42 Upvotes
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted">
            <span>Mesh AI Filter: Verified Safe</span>
            <span className="text-emerald-600 font-bold">● Answer In Progress</span>
          </div>
        </div>
      ),
    },
    {
      id: 'surveys',
      title: 'Dynamic Multi-Question Feedback',
      shortTitle: 'Surveys & Feedback',
      subtitle: 'Deep Auditing & Executive Summaries',
      badge: 'SESSION INTELLIGENCE',
      icon: <ClipboardList className="w-5 h-5 text-orange" />,
      color: 'orange',
      description:
        'Launch multi-question surveys at the end of keynotes or workshops. Collect star ratings, linear scales, and structured feedback, then generate a comprehensive AI Executive Session Report with 1 click.',
      highlights: [
        'Interactive Star ratings and linear 1-10 scoring',
        'Structured multiple-choice and open feedback fields',
        'Realtime submission counting with attendee progress',
        'One-click export to CSV, JSON, and AI markdown report',
      ],
      previewContent: (
        <div className="p-4 sm:p-5 bg-paper rounded-2xl border border-hairline space-y-3 font-mono text-xs shadow-xs">
          <div className="flex items-center justify-between text-muted">
            <span className="font-bold text-ink uppercase">Masterclass Evaluation</span>
            <span className="text-[10px] text-muted">142 Responses</span>
          </div>
          <div className="space-y-2 font-sans">
            <div>
              <div className="text-xs font-semibold text-ink mb-1">Architecture Depth:</div>
              <div className="flex gap-1 text-orange">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-4 h-4 fill-orange" />
                ))}
                <span className="text-xs font-mono text-ink font-bold ml-1">4.9 / 5.0</span>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-ink mb-1">Likelihood to recommend to peers:</div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <span
                    key={n}
                    className={`flex-1 py-1 text-center rounded font-mono text-[9px] font-bold ${
                      n >= 9 ? 'bg-lime text-ink' : 'bg-paper-card text-muted border border-hairline'
                    }`}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-lime/20 border border-lime text-[11px] text-ink font-mono font-bold flex items-center justify-between">
            <span>Net Promoter Score:</span>
            <span className="text-xs">+84 NPS (Elite)</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="features" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-4">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-lime/30 border border-lime text-ink font-mono text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-orange" />
          <span className="uppercase tracking-wider">THE STUDIO NOMA TOOLKIT</span>
        </div>

        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-ink">
          Engineered for electrifying keynotes & live masterclasses.
        </h2>

        <p className="text-sm sm:text-base font-sans text-muted leading-relaxed">
          Everything required to turn a passive audience into an engaged, competitive arena. Every tool synchronized with sub-40ms latency.
        </p>
      </div>

      {/* Feature Tabs Selector */}
      <div className="w-full max-w-4xl mx-auto mb-10 px-2 sm:px-4">
        <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 sm:p-2 bg-paper-card border border-hairline rounded-2xl sm:rounded-full font-mono text-xs shadow-xs">
          {features.map((feat, idx) => {
            const isActive = activeTab === idx;
            return (
              <button
                key={feat.id}
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveTab(idx);
                }}
                className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-full font-bold uppercase transition-all whitespace-nowrap cursor-pointer flex items-center space-x-2 shrink-0 ${
                  isActive
                    ? 'bg-ink text-paper shadow-xs'
                    : 'text-muted hover:text-ink hover:bg-paper'
                }`}
              >
                {feat.icon}
                <span className="sm:hidden">{feat.shortTitle || feat.title}</span>
                <span className="hidden sm:inline">{feat.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab Detailed Showcase */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3 }}
          className="bg-paper-card text-ink rounded-3xl border border-hairline-strong p-6 sm:p-10 lg:p-12 shadow-card"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Description Column */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orange/15 text-orange border border-orange/30 font-mono text-xs font-bold uppercase">
                <span>{features[activeTab].badge}</span>
              </div>

              <div>
                <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-ink leading-tight">
                  {features[activeTab].title}
                </h3>
                <div className="font-mono text-xs text-orange font-bold uppercase tracking-wider mt-1">
                  {features[activeTab].subtitle}
                </div>
              </div>

              <p className="text-sm sm:text-base font-sans text-muted leading-relaxed">
                {features[activeTab].description}
              </p>

              {/* Highlights Bullet List */}
              <div className="space-y-2.5 pt-2">
                {features[activeTab].highlights.map((h, i) => (
                  <div key={i} className="flex items-start space-x-3 text-xs sm:text-sm font-medium text-ink">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-lime shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Live Interactive Preview Mockup */}
            <div className="lg:col-span-6 w-full">
              <div className="bg-paper-elevated rounded-3xl border border-hairline p-4 sm:p-6 shadow-subtle relative overflow-hidden">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-hairline font-mono text-[11px] text-muted">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-lime animate-pulse" />
                    <span className="font-bold text-ink uppercase">FEATURE PREVIEW</span>
                  </div>
                  <span>SKETCHCAST LIVE ENGINE</span>
                </div>

                {features[activeTab].previewContent}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
};
