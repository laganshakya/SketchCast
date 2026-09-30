import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Zap,
  Crown,
  QrCode,
  ArrowRight,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { LandingNavbar } from './LandingNavbar';
import { LandingTicker } from './LandingTicker';
import { LandingPlayground } from './LandingPlayground';
import { LandingGatewayCard } from './LandingGatewayCard';
import { LandingTelemetry } from './LandingTelemetry';
import { LandingFeatures } from './LandingFeatures';
import { LandingDualCockpit } from './LandingDualCockpit';
import { LandingArchitecture } from './LandingArchitecture';
import { LandingFAQ } from './LandingFAQ';
import { LandingCTA } from './LandingCTA';
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
    <div className="min-h-screen w-full flex flex-col bg-paper text-ink font-sans selection:bg-lime selection:text-ink overflow-x-hidden relative">
      {/* Top Marquee Ticker */}
      <LandingTicker />

      {/* Sticky Header Navbar */}
      <LandingNavbar
        onJoinClick={(mode) => scrollToGateway(mode || 'guest')}
        onOpenQR={() => setShowQRPreview(true)}
        roomCode={roomCode}
        isAuthenticated={isAuthenticated}
        onReturnToArena={onReturnToArena}
      />

      {/* Hero Section */}
      <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-12 sm:pb-20">
        {/* Background Ambient Accents */}
        <div className="absolute top-10 left-1/3 w-80 h-80 bg-lime/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-orange/15 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Kinetic Editorial Copy */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center space-x-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-lime/30 border border-lime text-ink font-mono text-[10px] sm:text-xs font-bold shadow-2xs max-w-full"
            >
              <span className="w-2 h-2 rounded-full bg-orange animate-pulse shrink-0" />
              <span className="uppercase tracking-normal sm:tracking-wider break-words text-left">LIVE INTERACTIVE AUDIENCE OPERATING SYSTEM</span>
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
                High-velocity interactive engagement for tech meetups, masterclasses, and conferences. Real-time competitive quizzes, instant audience consensus, and crowdsourced technical Q&A with sub-40ms synchronization.
              </p>
            </motion.div>

            {/* Quick Action CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 font-mono text-xs font-bold uppercase"
            >
              <button
                type="button"
                onClick={() => {
                  playPopSound();
                  scrollToGateway('guest');
                }}
                className="w-full sm:w-auto px-5 sm:px-6 py-3.5 rounded-2xl btn-noma-orange flex items-center justify-center space-x-2 cursor-pointer shadow-sm active:scale-95 transition-transform"
              >
                <Zap className="w-4 h-4 shrink-0" />
                <span>ENTER ARENA [1-TAP GUEST]</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setShowQRPreview(true);
                }}
                className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-paper-card hover:bg-paper-elevated text-ink border border-hairline hover:border-ink flex items-center justify-center space-x-2 cursor-pointer transition-all shadow-subtle active:scale-95"
              >
                <QrCode className="w-4 h-4 text-orange shrink-0" />
                <span>ROOM QR CODE</span>
              </button>
            </motion.div>

            {/* Live Trust & Telemetry Indicators */}
            <div className="pt-3 border-t border-hairline flex flex-wrap items-center gap-4 text-xs font-mono text-muted">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-lime" />
                <span>Zero Installs Required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-lime" />
                <span>Sub-40ms WebSockets</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-lime" />
                <span>Instant Session Reports</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Simulated Mini-Arena Playground */}
          <div id="demo" className="lg:col-span-6 w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <LandingPlayground />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Gateway Entry Portal Section */}
      <section id="gateway" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Gateway Explanation & Features */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-lime/30 border border-lime text-ink font-mono text-xs font-bold">
              <Shield className="w-3.5 h-3.5 text-orange" />
              <span className="uppercase tracking-wider">ONE-TAP ACCESS HUB</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-ink leading-tight">
              Ready to jump into the action?
            </h2>

            <p className="text-sm sm:text-base font-sans text-muted leading-relaxed">
              Join an existing session with a room key or sign in as a host to orchestrate your own interactive masterclass. Frictionless, secure, and ready in seconds.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-paper-card border border-hairline flex items-start space-x-3 shadow-xs">
                <div className="p-2 rounded-xl bg-lime/25 text-ink border border-lime shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-mono text-xs font-bold uppercase text-ink">1-Click Guest</div>
                  <div className="text-xs text-muted mt-0.5">Instant alias & anonymous mesh token</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-paper-card border border-hairline flex items-start space-x-3 shadow-xs">
                <div className="p-2 rounded-xl bg-orange/15 text-orange border border-orange/30 shrink-0">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-mono text-xs font-bold uppercase text-ink">Presenter Tools</div>
                  <div className="text-xs text-muted mt-0.5">Live telemetry, AI polls & reports</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Gateway Form Card */}
          <div className="lg:col-span-6 w-full">
            <LandingGatewayCard
              onAuthenticated={onAuthenticated}
              initialRoomCode={roomCode}
              onOpenQR={() => setShowQRPreview(true)}
              onVerifyCertLookup={onVerifyCertLookup}
              activeMode={gatewayMode}
            />
          </div>
        </div>
      </section>

      {/* Telemetry Metrics Bar */}
      <LandingTelemetry />

      {/* Feature Deep Dive Studio */}
      <LandingFeatures />

      {/* Dual Persona: Attendee vs Presenter */}
      <LandingDualCockpit />

      {/* Architecture & Sub-40ms Mesh Visualizer */}
      <LandingArchitecture />

      {/* FAQ Accordion */}
      <LandingFAQ />

      {/* Bottom Conversion Banner */}
      <LandingCTA
        onJoinClick={(mode) => scrollToGateway(mode || 'guest')}
        roomCode={roomCode}
      />

      {/* Editorial Footer */}
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
              onClick={() => setShowQRPreview(false)}
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
