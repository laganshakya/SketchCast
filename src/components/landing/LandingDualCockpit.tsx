import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Smartphone,
  Crown,
  Zap,
  BatteryCharging,
  ShieldCheck,
  Sliders,
  FileSpreadsheet,
  AlertTriangle,
  Bot,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { playClickSound } from '../../lib/soundFx';

export const LandingDualCockpit: React.FC = () => {
  const [activePersona, setActivePersona] = useState<'attendee' | 'host'>('attendee');

  const attendeePillars = [
    {
      icon: <Smartphone className="w-5 h-5 text-orange" />,
      title: 'Zero App Installs',
      desc: 'Point phone camera at screen QR or open link in mobile Safari/Chrome. Instant 1-tap participation.',
    },
    {
      icon: <Zap className="w-5 h-5 text-lime" />,
      title: 'Sub-40ms Response Haptics',
      desc: 'Speed-weighted point triggers, instant feedback sounds, and tactile button animations.',
    },
    {
      icon: <BatteryCharging className="w-5 h-5 text-sky" />,
      title: 'Low-Battery Obsidian Mode',
      desc: 'High-contrast OLED black theme that conserves attendee battery life through multi-hour sessions.',
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-orange" />,
      title: 'Zero Privacy Friction',
      desc: 'No mandatory logins, passwords, or intrusive permissions. Random cyberpunk alias generator ready in 1 click.',
    },
  ];

  const hostPillars = [
    {
      icon: <Sliders className="w-5 h-5 text-orange" />,
      title: 'Presenter Mission Control',
      desc: 'Live telemetry cockpit: launch questions, trigger remediation polls, extend timers (+15s), and advance slides seamlessly.',
    },
    {
      icon: <Bot className="w-5 h-5 text-lime" />,
      title: 'Mesh AI Triage & Clustering',
      desc: 'Synthesize hundreds of incoming questions into clean semantic themes, eliminating duplicates automatically.',
    },
    {
      icon: <AlertTriangle className="w-5 h-5 text-sky" />,
      title: 'Real-time Safeguard Moderation',
      desc: 'Automated 3-strike policy with smart profanity and spam filters, plus instant moderator mute and ban tools.',
    },
    {
      icon: <FileSpreadsheet className="w-5 h-5 text-orange" />,
      title: 'Executive AI Session Reports',
      desc: 'Generate comprehensive Markdown and PDF recap reports summarizing audience sentiment, quiz scores, and key takeaways.',
    },
  ];

  return (
    <section id="cockpit" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-4">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-lime/30 border border-lime text-ink font-mono text-xs font-bold">
          <Layers className="w-3.5 h-3.5 text-orange" />
          <span className="uppercase tracking-wider">BUILT FOR BOTH SIDES OF THE STAGE</span>
        </div>

        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-ink">
          Seamless for attendees. Powerful for speakers.
        </h2>

        <p className="text-sm sm:text-base font-sans text-muted leading-relaxed">
          Explore how SketchCast delivers unmatched delight for the crowd and complete command for the presenter.
        </p>

        {/* Persona Switcher Toggle */}
        <div className="inline-flex flex-wrap sm:flex-nowrap justify-center gap-1.5 p-1.5 bg-paper-card border border-hairline rounded-2xl sm:rounded-full mt-4 font-mono text-xs max-w-full">
          <button
            onClick={() => {
              playClickSound();
              setActivePersona('attendee');
            }}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-full font-bold uppercase transition-all cursor-pointer flex items-center space-x-1.5 sm:space-x-2 shrink-0 ${
              activePersona === 'attendee'
                ? 'bg-ink text-paper shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Smartphone className="w-4 h-4 text-orange shrink-0" />
            <span className="sm:hidden">ATTENDEE</span>
            <span className="hidden sm:inline">ATTENDEE EXPERIENCE</span>
          </button>

          <button
            onClick={() => {
              playClickSound();
              setActivePersona('host');
            }}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-full font-bold uppercase transition-all cursor-pointer flex items-center space-x-1.5 sm:space-x-2 shrink-0 ${
              activePersona === 'host'
                ? 'bg-ink text-paper shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Crown className="w-4 h-4 text-lime shrink-0" />
            <span className="sm:hidden">PRESENTER</span>
            <span className="hidden sm:inline">PRESENTER COCKPIT</span>
          </button>
        </div>
      </div>

      {/* Pillars Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activePersona}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {(activePersona === 'attendee' ? attendeePillars : hostPillars).map((pillar, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-paper-card border border-hairline hover:border-ink/30 transition-all flex flex-col justify-between shadow-subtle group"
            >
              <div>
                <div className="p-3 rounded-2xl bg-paper border border-hairline w-fit mb-5 shadow-xs group-hover:scale-110 transition-transform">
                  {pillar.icon}
                </div>
                <h4 className="font-serif text-lg font-bold text-ink mb-2">
                  {pillar.title}
                </h4>
                <p className="text-xs sm:text-sm text-muted font-sans leading-relaxed">
                  {pillar.desc}
                </p>
              </div>

              <div className="pt-4 mt-6 border-t border-hairline font-mono text-[10px] text-orange font-bold uppercase tracking-wider flex items-center gap-1">
                <span>{activePersona === 'attendee' ? 'MOBILE OPTIMIZED' : 'HOST CONTROL'}</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </section>
  );
};
