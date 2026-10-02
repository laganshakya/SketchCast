import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Menu,
  X,
  Zap,
  Crown,
  QrCode,
  Radio,
} from 'lucide-react';
import { SketchCastLogo } from '../common/SketchCastLogo';
import { playClickSound, playPopSound } from '../../lib/soundFx';

interface LandingNavbarProps {
  onJoinClick: (mode?: 'guest' | 'signin' | 'signup') => void;
  onOpenQR: () => void;
  roomCode: string;
  activeAttendeesCount?: number;
  isAuthenticated?: boolean;
  onReturnToArena?: () => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({
  onJoinClick,
  onOpenQR,
  roomCode,
  activeAttendeesCount = 42,
  isAuthenticated = false,
  onReturnToArena,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) playPopSound();
  };

  const navLinks = [
    { label: 'Enter Arena', href: '#gateway' },
    { label: 'Capabilities', href: '#capabilities' },
    { label: 'FAQ', href: '#faq' },
  ];

  const handleNavClick = (href: string) => {
    playClickSound();
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-paper/85 dark:bg-paper/80 backdrop-blur-xl border-b border-hairline transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Live Signal */}
        <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center space-x-2 shrink-0 group cursor-pointer"
            title="SketchCast Studio"
          >
            <SketchCastLogo size="sm" showWordmark={true} collapsedOnMobile={false} />
          </a>

          <div className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-paper-card border border-hairline font-mono text-[10px] text-muted shrink-0">
            <span className="w-2 h-2 rounded-full bg-orange animate-pulse shrink-0" />
            <span className="font-bold text-ink uppercase tracking-wider">ARENA ENGINE</span>
            <span className="text-muted/50">•</span>
            <span className="text-orange font-bold font-mono">{roomCode}</span>
          </div>
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-1 font-mono text-xs font-semibold text-muted">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNavClick(link.href)}
              className="px-3 py-1.5 rounded-full hover:text-ink hover:bg-paper-card transition-all cursor-pointer"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          {/* Sound FX Toggle (hidden on ultra-compact mobile, available in mobile drawer) */}
          <button
            onClick={toggleSound}
            className="hidden xs:flex p-2 sm:p-2.5 rounded-full bg-paper-card hover:bg-paper-elevated text-ink border border-hairline transition-all cursor-pointer shadow-subtle"
            title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            aria-label="Toggle Sound Effects"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted" />
            )}
          </button>

          {/* QR Code Quick View */}
          <button
            onClick={() => {
              playClickSound();
              onOpenQR();
            }}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-2 rounded-full bg-paper-card hover:bg-paper-elevated text-ink border border-hairline font-mono text-xs font-bold transition-all cursor-pointer shadow-subtle"
            title="Scan room QR code"
          >
            <QrCode className="w-3.5 h-3.5 text-orange shrink-0" />
            <span className="hidden md:inline">SCAN QR</span>
          </button>

          {/* Primary Action Button */}
          {isAuthenticated && onReturnToArena ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                playPopSound();
                onReturnToArena();
              }}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-full bg-lime text-ink font-mono text-[11px] sm:text-xs font-bold uppercase border border-lime flex items-center space-x-1 sm:space-x-1.5 shadow-sm cursor-pointer shrink-0"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-ink" />
              <span className="hidden sm:inline">RETURN TO </span><span>ARENA</span>
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                playPopSound();
                onJoinClick('guest');
              }}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-full btn-noma-orange font-mono text-[11px] sm:text-xs font-bold uppercase flex items-center space-x-1 sm:space-x-1.5 shadow-sm cursor-pointer shrink-0"
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">ENTER </span><span>ARENA</span>
            </motion.button>
          )}

          {/* Mobile Navigation Toggle */}
          <button
            onClick={() => {
              playPopSound();
              setMobileMenuOpen(!mobileMenuOpen);
            }}
            className="lg:hidden p-2 rounded-xl bg-paper-card hover:bg-paper-elevated text-ink border border-hairline transition-colors cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-paper-card border-b border-hairline overflow-hidden px-4 py-4 space-y-3 font-mono text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-hairline text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange animate-pulse" />
                <span>ACTIVE ROOM: <strong>{roomCode}</strong></span>
              </span>
              <span className="text-[11px]">{activeAttendeesCount} connected</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link.href)}
                  className="p-2.5 rounded-xl bg-paper hover:bg-paper-elevated text-left text-ink font-semibold border border-hairline cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Mobile Utility Controls: Sound FX & Room QR */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={toggleSound}
                className="flex-1 py-2 px-3 rounded-xl bg-paper hover:bg-paper-elevated text-ink font-semibold border border-hairline flex items-center justify-center space-x-1.5 cursor-pointer text-xs"
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-orange" /> : <VolumeX className="w-3.5 h-3.5 text-muted" />}
                <span>Sound: {soundEnabled ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setMobileMenuOpen(false);
                  onOpenQR();
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-paper hover:bg-paper-elevated text-ink font-semibold border border-hairline flex items-center justify-center space-x-1.5 cursor-pointer text-xs"
              >
                <QrCode className="w-3.5 h-3.5 text-orange" />
                <span>Room QR</span>
              </button>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  playPopSound();
                  setMobileMenuOpen(false);
                  onJoinClick('guest');
                }}
                className="w-full py-3 rounded-xl btn-noma-orange font-bold uppercase flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
              >
                <Zap className="w-4 h-4" />
                <span>JOIN AS GUEST (1-TAP)</span>
              </button>

              <button
                onClick={() => {
                  playPopSound();
                  setMobileMenuOpen(false);
                  onJoinClick('signin');
                }}
                className="w-full py-2.5 rounded-xl bg-paper hover:bg-paper-elevated text-ink font-bold uppercase border border-hairline flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 text-orange" />
                <span>HOST / PRESENTER SIGN IN</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
