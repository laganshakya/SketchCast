import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Zap,
  QrCode,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  MessageSquareQuote,
  Flame,
  Award,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { LandingNavbar } from './LandingNavbar';
import { LandingGatewayCard } from './LandingGatewayCard';
import { LandingFAQ } from './LandingFAQ';
import { LandingFooter } from './LandingFooter';
import { playClickSound, playPopSound } from '../../lib/soundFx';

interface ModernLandingPageProps {
  onAuthenticated: (name: string, role: 'host' | 'attendee', roomCode?: string) => void;
  roomCode: string;
  isAuthenticated?: boolean;
  onReturnToArena?: () => void;
  onVerifyCertLookup?: (certId: string) => void;
}

export const ModernLandingPage: React.FC<ModernLandingPageProps> = ({
  onAuthenticated,
  roomCode,
  isAuthenticated = false,
  onReturnToArena,
  onVerifyCertLookup,
}) => {
  const [gatewayMode, setGatewayMode] = useState<'guest' | 'signin' | 'signup'>('guest');
  const [showQRPreview, setShowQRPreview] = useState(false);

  const scrollToGateway = (mode: 'guest' | 'signin' | 'signup' = 'guest') => {
    setGatewayMode(mode);
    const el = document.getElementById('gateway');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const currentJoinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?room=${roomCode.trim().toUpperCase() || 'SKT-789'}`
    : `https://sketchcast.live/?room=${roomCode.trim().toUpperCase() || 'SKT-789'}`;

  return (
    <div className="h-dvh max-h-dvh overflow-y-auto overflow-x-hidden w-full flex flex-col bg-paper text-ink font-sans selection:bg-lime selection:text-ink relative scroll-smooth">
      {/* Sticky Header Navbar */}
      <LandingNavbar
        onJoinClick={(mode) => scrollToGateway(mode || 'guest')}
        onOpenQR={() => setShowQRPreview(true)}
        roomCode={roomCode}
        isAuthenticated={isAuthenticated}
        onReturnToArena={onReturnToArena}
      />

      {/* Hero Section with Embedded 1-Tap Gateway */}
      <section id="gateway" className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-12 sm:pb-20">
        {/* Ambient Glow Accents */}
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-lime/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-24 right-10 w-80 h-80 bg-orange/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Kinetic Editorial Headline & Value Prop */}
          <div className="lg:col-span-6 space-y-6 text-left lg:pt-4">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center space-x-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-lime/25 border border-lime text-ink font-mono text-[10px] sm:text-xs font-bold shadow-2xs max-w-full"
            >
              <span className="w-2 h-2 rounded-full bg-orange animate-pulse shrink-0" />
              <span className="uppercase tracking-wider">REAL-TIME AUDIENCE OPERATING SYSTEM</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-4"
            >
              <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-ink leading-[1.08] break-words">
                Turn passive crowds into an{' '}
                <em className="italic font-serif text-orange underline decoration-orange/30 decoration-wavy decoration-2">
                  electrified
                </em>{' '}
                arena.
              </h1>

              <p className="text-sm sm:text-base font-sans text-muted leading-relaxed max-w-xl">
                High-velocity interactive engagement for tech meetups, masterclasses, and keynotes. Sub-40ms mesh synchronization across competitive live quizzes, instant consensus polling, and crowdsourced technical Q&A.
              </p>
            </motion.div>

            {/* Quick Action CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-wrap items-center gap-3 pt-2 font-mono text-xs font-bold uppercase"
            >
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setShowQRPreview(true);
                }}
                className="px-4 py-3 rounded-2xl bg-paper-card hover:bg-paper-elevated text-ink border border-hairline hover:border-ink flex items-center space-x-2 cursor-pointer transition-all shadow-subtle active:scale-95"
              >
                <QrCode className="w-4 h-4 text-orange shrink-0" />
                <span>ROOM QR CODE</span>
              </button>

              <a
                href="#capabilities"
                onClick={() => playClickSound()}
                className="px-4 py-3 rounded-2xl text-muted hover:text-ink flex items-center space-x-1.5 transition-colors text-xs font-mono"
              >
                <span>EXPLORE CAPABILITIES</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </motion.div>

            {/* Live Trust & Telemetry Indicators */}
            <div className="pt-4 border-t border-hairline flex flex-wrap items-center gap-4 text-xs font-mono text-muted">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-lime" />
                <span>Zero Installs (Browser Native)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-lime" />
                <span>Sub-40ms WebSockets Mesh</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-lime" />
                <span>Automated AI Session Recaps</span>
              </div>
            </div>
          </div>

          {/* Right Column: Embedded 1-Tap Entry & Host Gateway */}
          <div className="lg:col-span-6 w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.15 }}
            >
              <LandingGatewayCard
                onAuthenticated={onAuthenticated}
                initialRoomCode={roomCode}
                onOpenQR={() => setShowQRPreview(true)}
                onVerifyCertLookup={onVerifyCertLookup}
                activeMode={gatewayMode}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Core Capabilities Triad (Compact 3-Card Grid) */}
      <section id="capabilities" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 border-t border-hairline">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 space-y-3">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-orange/10 border border-orange/20 text-orange font-mono text-xs font-bold">
            <Zap className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider">CORE CAPABILITIES</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-ink">
            Engineered for high-density live rooms.
          </h2>

          <p className="text-sm sm:text-base font-sans text-muted leading-relaxed">
            Three low-friction interaction primitives designed to keep audiences leaning forward from first slide to final recap.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Sub-40ms Live Quizzing */}
          <div className="p-6 sm:p-7 rounded-3xl bg-paper-card border border-hairline hover:border-ink/20 transition-all shadow-subtle flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-orange/15 border border-orange/30 text-orange flex items-center justify-center">
                <Flame className="w-6 h-6" />
              </div>

              <div>
                <div className="text-[10px] font-mono font-bold uppercase text-orange tracking-widest">
                  COMPETITIVE ENGINE
                </div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-ink mt-1">
                  Sub-40ms Live Quizzes
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-muted leading-relaxed font-sans">
                Time-weighted score multipliers, instant answer reveals, and dynamic podium surges that spark friendly rivalry across the room.
              </p>
            </div>

            <div className="pt-3 border-t border-hairline flex items-center gap-2 text-[11px] font-mono text-muted">
              <Award className="w-3.5 h-3.5 text-orange shrink-0" />
              <span>Instant celebratory podiums</span>
            </div>
          </div>

          {/* Card 2: Instant Consensus & Polls */}
          <div className="p-6 sm:p-7 rounded-3xl bg-paper-card border border-hairline hover:border-ink/20 transition-all shadow-subtle flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-lime/20 border border-lime text-ink flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>

              <div>
                <div className="text-[10px] font-mono font-bold uppercase text-ink tracking-widest">
                  AUDIENCE SENTIMENT
                </div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-ink mt-1">
                  Instant Consensus Polls
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-muted leading-relaxed font-sans">
                Collect real-time votes on architectural choices and debate points with animated vote distributions and AI sentiment synthesis.
              </p>
            </div>

            <div className="pt-3 border-t border-hairline flex items-center gap-2 text-[11px] font-mono text-muted">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-lime shrink-0" />
              <span>Zero-lag distribution curves</span>
            </div>
          </div>

          {/* Card 3: Moderated Q&A & AI Recaps */}
          <div className="p-6 sm:p-7 rounded-3xl bg-paper-card border border-hairline hover:border-ink/20 transition-all shadow-subtle flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-paper border border-hairline-strong text-ink flex items-center justify-center">
                <MessageSquareQuote className="w-6 h-6" />
              </div>

              <div>
                <div className="text-[10px] font-mono font-bold uppercase text-muted tracking-widest">
                  SPEAKER SAFEGUARDS
                </div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-ink mt-1">
                  Moderated Q&A & AI Recaps
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-muted leading-relaxed font-sans">
                Crowdsourced question upvoting with automated 3-strike troll safeguards, host triage pins, and 1-click Markdown session summary exports.
              </p>
            </div>

            <div className="pt-3 border-t border-hairline flex items-center gap-2 text-[11px] font-mono text-muted">
              <Zap className="w-3.5 h-3.5 text-orange shrink-0" />
              <span>Exportable executive summaries</span>
            </div>
          </div>
        </div>
      </section>

      {/* Practical FAQ */}
      <LandingFAQ />

      {/* Minimalist Footer */}
      <LandingFooter />

      {/* QR Code Quick Modal */}
      {showQRPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-paper text-ink w-full max-w-sm p-6 sm:p-7 rounded-3xl border border-hairline shadow-2xl relative text-center max-h-[90dvh] overflow-y-auto"
          >
            <button
              onClick={() => {
                playPopSound();
                setShowQRPreview(false);
              }}
              className="absolute top-5 right-5 p-1.5 rounded-xl bg-paper-card text-muted hover:text-ink transition-colors cursor-pointer border border-hairline"
              aria-label="Close QR Modal"
            >
              ✕
            </button>

            <div className="flex flex-col items-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-ink text-lime border border-black/20 dark:border-lime/30 flex items-center justify-center mb-2.5">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-serif font-bold uppercase tracking-tight text-ink">
                MOBILE ACCESS QR
              </h3>
              <p className="text-xs font-mono text-muted mt-0.5">
                Scan with mobile camera to auto-join arena
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-hairline inline-block mx-auto mb-4 shadow-xs">
              <QRCodeSVG
                value={currentJoinUrl}
                size={180}
                bgColor="#FFFFFF"
                fgColor="#101313"
                level="Q"
                includeMargin={false}
              />
            </div>

            <div className="bg-paper-card text-ink p-3.5 rounded-2xl border border-hairline font-mono">
              <div className="text-[10px] font-bold text-muted uppercase mb-0.5">
                ACTIVE ROOM PASSCODE
              </div>
              <div className="text-xl font-bold tracking-wider text-orange">
                {roomCode.toUpperCase() || 'SKT-789'}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
