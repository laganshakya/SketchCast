import React, { useState, useEffect } from 'react';
import {
  Zap,
  Vote,
  HelpCircle,
  Trophy,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  Shield,
  CheckCircle,
  AlertCircle,
  Crown,
  Key,
  QrCode,
  RefreshCw,
  X,
  Send,
  Check,
  Sun,
  Moon,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInAnonymously,
  resendVerificationEmail,
} from '../../lib/supabase';
import { playClickSound, playPopSound, playWhoosh } from '../../lib/soundFx';
import { useTheme } from '../../lib/theme';
import { SketchCastLogo, SignalSparkGlyph } from '../common/SketchCastLogo';

interface LandingAuthPageProps {
  onAuthenticated: (name: string, role: 'host' | 'attendee', roomCode?: string) => void;
  roomCode: string;
}

export const LandingAuthPage: React.FC<LandingAuthPageProps> = ({
  onAuthenticated,
  roomCode,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [tab, setTab] = useState<'guest' | 'signin' | 'signup'>('guest');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'host' | 'attendee'>('attendee');
  const [roomKey, setRoomKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryRoom = params.get('room');
      if (queryRoom && queryRoom.trim()) {
        return queryRoom.trim().toUpperCase();
      }
    }
    return roomCode || 'SKT-789';
  });

  const [prevRoomCodeProp, setPrevRoomCodeProp] = useState(roomCode);
  if (roomCode !== prevRoomCodeProp) {
    setPrevRoomCodeProp(roomCode);
    if (roomCode) {
      setRoomKey(roomCode.toUpperCase().trim());
    }
  }

  const [showQRPreview, setShowQRPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Email verification pending state
  const [verificationSentEmail, setVerificationSentEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Countdown timer for resending verification email
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleTabChange = (nextTab: 'guest' | 'signin' | 'signup') => {
    setTab(nextTab);
    setErrorMessage(null);
    setSuccessMessage(null);
    setVerificationSentEmail(null);
    setResendStatus(null);
  };

  const generateRandomGuestHandle = () => {
    const adjectives = ['Pixel', 'Cyber', 'Async', 'Quantum', 'Turbo', 'Hyper', 'Vector', 'Cloud', 'Logic', 'Matrix'];
    const nouns = ['Coder', 'Hacker', 'Architect', 'Engineer', 'Dev', 'Explorer', 'Pilot', 'Builder', 'Kernel', 'Node'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setDisplayName(`${adj}${noun}_${num}`);
  };

  const generateRandomRoomKey = () => {
    const prefixes = ['SKT', 'ARENA', 'DEV', 'TECH', 'LIVE', 'CODE'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(100 + Math.random() * 900);
    setRoomKey(`${randomPrefix}-${randomNum}`);
  };

  const currentJoinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?room=${roomKey.trim().toUpperCase() || 'SKT-789'}`
    : `https://sketchcast.live/?room=${roomKey.trim().toUpperCase() || 'SKT-789'}`;

  const handleResendVerification = async (targetEmail: string) => {
    if (resendCooldown > 0 || !targetEmail) return;
    setResendStatus('Sending verification email...');
    try {
      const { error } = await resendVerificationEmail(targetEmail);
      if (error) {
        setResendStatus(`Failed: ${error.message}`);
      } else {
        setResendStatus(`Verification email sent to ${targetEmail}!`);
        setResendCooldown(60);
      }
    } catch {
      setResendStatus('Failed to send email. Please check your address.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setResendStatus(null);

    const cleanRoomKey = roomKey.trim().toUpperCase();
    if (!cleanRoomKey) {
      setErrorMessage('Please enter a Room Key / Passcode to join or host a room.');
      setIsLoading(false);
      return;
    }

    try {
      if (tab === 'guest') {
        const name = displayName.trim() || 'TechAttendee_' + Math.floor(100 + Math.random() * 900);
        try {
          await signInAnonymously();
        } catch {
          // ignore
        }
        playPopSound();
        onAuthenticated(name, 'attendee', cleanRoomKey);
      } else if (tab === 'signin') {
        const { user, error } = await signInWithEmail(email.trim(), password);
        if (error) {
          throw error;
        }

        const resolvedName =
          user?.user_metadata?.full_name ||
          user?.user_metadata?.name ||
          email.split('@')[0] ||
          'Host';

        playPopSound();
        onAuthenticated(resolvedName, role, cleanRoomKey);
      } else if (tab === 'signup') {
        const name = displayName.trim() || email.split('@')[0] || 'Host';
        const { session, error } = await signUpWithEmail(email.trim(), password, name);
        if (error) {
          throw error;
        }

        if (session) {
          playPopSound();
          onAuthenticated(name, role, cleanRoomKey);
        } else {
          setVerificationSentEmail(email.trim());
          setSuccessMessage('Account created! Please check your email inbox to verify your address.');
          setResendCooldown(60);
        }
      }
    } catch (err: any) {
      console.error('[LandingAuthPage] Auth error:', err);
      setErrorMessage(err?.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-paper text-ink font-sans selection:bg-lime selection:text-ink overflow-x-hidden">
      {/* Top Editorial Ticker Ribbon */}
      <div className="w-full bg-ink text-paper py-2 overflow-hidden border-b border-hairline font-mono text-[11px] font-bold tracking-widest uppercase select-none">
        <div className="marquee">
          <div className="marquee-track">
            <span className="inline-flex items-center"><b>✦</b>STUDIO NOMA ARCHITECTURE</span>
            <span className="inline-flex items-center"><b>✦</b>REAL-TIME AUDIENCE ARENA</span>
            <span className="inline-flex items-center"><b>✦</b>SUB-40MS SYNCHRONIZATION</span>
            <span className="inline-flex items-center"><b>✦</b>LIVE QUIZZING &amp; CONSENSUS</span>
            <span className="inline-flex items-center"><b>✦</b>VERIFIABLE CREDENTIALS</span>
            <span className="inline-flex items-center"><b>✦</b>MESH AI MODERATION &amp; SYNTHESIS</span>
            <span className="inline-flex items-center"><b>✦</b>ZERO-FRICTION 1-CLICK JOIN</span>
            <span className="inline-flex items-center"><b>✦</b>STUDIO NOMA ARCHITECTURE</span>
            <span className="inline-flex items-center"><b>✦</b>REAL-TIME AUDIENCE ARENA</span>
            <span className="inline-flex items-center"><b>✦</b>SUB-40MS SYNCHRONIZATION</span>
            <span className="inline-flex items-center"><b>✦</b>LIVE QUIZZING &amp; CONSENSUS</span>
          </div>
        </div>
      </div>

      {/* Clean Header Bar */}
      <div className="border-b border-hairline bg-paper px-4 sm:px-8 py-3.5 flex items-center justify-between text-xs font-mono min-w-0">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-orange animate-pulse shrink-0" />
          <span className="text-orange font-bold tracking-wider uppercase text-xs shrink-0">ARENA LIVE</span>
          <span className="text-muted/40 shrink-0">/</span>
          <span className="text-muted uppercase text-xs truncate">REALTIME GATEWAY</span>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => {
              playPopSound();
              toggleTheme();
            }}
            className="h-8 px-2.5 rounded-full bg-paper-card hover:bg-paper-elevated text-ink border border-hairline flex items-center space-x-1.5 cursor-pointer transition-colors shadow-subtle text-[11px] font-bold"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-lime" /> : <Moon className="w-3.5 h-3.5 text-orange" />}
            <span className="hidden sm:inline">{isDark ? 'LIGHT' : 'DARK'}</span>
          </button>
          <div className="text-[11px] text-muted font-mono tracking-wider font-semibold hidden md:inline">
            EDITION 2026 • SKETCHCAST
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row items-stretch lg:items-center justify-center p-4 sm:p-8 md:p-12 lg:p-16 gap-8 lg:gap-12 xl:gap-16 max-w-7xl mx-auto w-full min-w-0">
        {/* Left Hero Brand & Editorial Typography */}
        <div className="flex-1 space-y-6 max-w-xl text-left w-full min-w-0">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-lime/30 border border-lime text-ink font-mono text-xs font-bold max-w-full">
            <span className="w-2 h-2 rounded-full bg-orange animate-pulse shrink-0" />
            <span className="uppercase tracking-wider truncate">LIVE INTERACTIVE AUDIENCE PLATFORM</span>
          </div>

          <div className="space-y-4 max-w-full">
            <SketchCastLogo size="xl" showWordmark={true} />
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-ink leading-[1.08] pt-2">
              Ideas in <em className="italic font-serif text-orange">motion.</em>
              <br />Live with the crowd.
            </h1>
            <p className="text-sm sm:text-base font-sans text-muted leading-relaxed max-w-lg">
              High-velocity interactive engagement for tech meetups, masterclasses, and conferences. Real-time competitive quizzes, live audience consensus, and crowdsourced technical Q&A with sub-second synchronization.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 w-full min-w-0">
            <div className="p-4 bg-paper-elevated rounded-2xl border border-hairline hover:border-ink transition-all flex items-start space-x-3.5 min-w-0 shadow-xs">
              <div className="p-2.5 rounded-xl bg-lime/25 text-ink border border-lime shrink-0 flex items-center justify-center">
                <SignalSparkGlyph size={22} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-mono font-bold uppercase text-ink truncate">TECH QUIZZING</div>
                <div className="text-xs text-muted mt-1 leading-snug">Competitive rounds with live takeaway analysis</div>
              </div>
            </div>

            <div className="p-4 bg-paper-elevated rounded-2xl border border-hairline hover:border-ink transition-all flex items-start space-x-3.5 min-w-0 shadow-xs">
              <div className="p-2.5 rounded-xl bg-orange/15 text-orange border border-orange/30 shrink-0">
                <Vote className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-mono font-bold uppercase text-ink truncate">LIVE POLLS</div>
                <div className="text-xs text-muted mt-1 leading-snug">Instant audience consensus & sentiment synthesis</div>
              </div>
            </div>

            <div className="p-4 bg-paper-elevated rounded-2xl border border-hairline hover:border-ink transition-all flex items-start space-x-3.5 min-w-0 shadow-xs">
              <div className="p-2.5 rounded-xl bg-sky/30 text-ink border border-sky shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-mono font-bold uppercase text-ink truncate">Q&A UPVOTING</div>
                <div className="text-xs text-muted mt-1 leading-snug">Crowdsourced question triage & stage spotlight</div>
              </div>
            </div>

            <div className="p-4 bg-paper-elevated rounded-2xl border border-hairline hover:border-ink transition-all flex items-start space-x-3.5 min-w-0 shadow-xs">
              <div className="p-2.5 rounded-xl bg-[#101313] dark:bg-lime/20 text-lime dark:text-lime border border-black/20 dark:border-lime/30 shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-mono font-bold uppercase text-ink truncate">RANKINGS PODIUM</div>
                <div className="text-xs text-muted mt-1 leading-snug">Live podium & verifiable masterclass credentials</div>
              </div>
            </div>
          </div>

          {/* Quick QR Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 w-full min-w-0">
            <button
              type="button"
              onClick={() => setShowQRPreview(true)}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-paper-elevated hover:bg-black/[0.04] text-ink border border-hairline hover:border-ink font-mono text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer touch-target shrink-0 shadow-xs"
            >
              <QrCode className="w-4 h-4 text-orange shrink-0" />
              <span>SHOW ROOM QR CODE</span>
            </button>
            <div className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 text-xs font-mono text-muted bg-paper-card px-4 py-3 rounded-2xl border border-hairline shrink-0">
              <span>ACTIVE KEY:</span>
              <span className="text-ink font-bold font-mono">{roomKey}</span>
            </div>
          </div>
        </div>

        {/* Right Studio Noma Editorial Auth Box */}
        <div className="w-full max-w-md bg-paper-elevated text-ink p-5 sm:p-7 md:p-8 rounded-3xl border border-hairline shadow-xl relative font-sans">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-[#101313] dark:bg-lime/20 text-lime dark:text-lime border border-black/20 dark:border-lime/30 flex items-center justify-center font-mono shrink-0 shadow-xs">
              <Shield className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-[10px] font-mono tracking-widest text-orange uppercase font-bold">
                GATEWAY ACCESS
              </div>
              <h2 className="text-xl font-serif font-bold uppercase tracking-tight text-ink mt-0.5">
                {verificationSentEmail ? 'EMAIL VERIFICATION' : 'ENTER ARENA'}
              </h2>
            </div>
          </div>

          {/* Verification Pending Screen */}
          {verificationSentEmail ? (
            <div className="space-y-4 font-mono">
              <div className="p-4 bg-paper-card rounded-2xl border border-hairline space-y-3">
                <div className="flex items-center space-x-2 text-orange font-bold text-sm">
                  <Mail className="w-5 h-5 animate-pulse shrink-0" />
                  <span>CONFIRMATION LINK SENT</span>
                </div>
                <p className="text-xs text-muted leading-relaxed font-sans">
                  Verification link transmitted to:
                  <br />
                  <strong className="text-ink bg-paper px-2 py-0.5 rounded-lg border border-hairline break-all text-xs inline-block mt-1 font-mono">
                    {verificationSentEmail}
                  </strong>
                </p>
                <div className="text-[11px] text-muted space-y-1 bg-paper p-3 rounded-xl border border-hairline">
                  <div className="font-bold text-ink font-mono">NEXT STEPS:</div>
                  <div>1. Check your email inbox.</div>
                  <div>2. Click confirmation link to verify.</div>
                  <div>3. Return here and sign in.</div>
                </div>
              </div>

              {resendStatus && (
                <div className={`p-3 rounded-xl text-xs font-mono font-bold border flex items-center space-x-2 ${
                  resendStatus.includes('sent')
                    ? 'bg-lime/20 text-ink border-lime'
                    : 'bg-orange/15 text-orange border-orange/30'
                }`}>
                  {resendStatus.includes('sent') ? <Check className="w-4 h-4 shrink-0 text-ink" /> : <AlertCircle className="w-4 h-4 shrink-0 text-orange" />}
                  <span>{resendStatus}</span>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleResendVerification(verificationSentEmail)}
                  disabled={resendCooldown > 0}
                  className="w-full py-3 bg-paper-card hover:bg-black/[0.05] disabled:opacity-50 text-ink text-xs font-mono font-bold uppercase rounded-xl border border-hairline flex items-center justify-center space-x-2 cursor-pointer transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {resendCooldown > 0
                      ? `RESEND IN ${resendCooldown}S`
                      : 'RESEND VERIFICATION EMAIL'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVerificationSentEmail(null);
                    setTab('signin');
                  }}
                  className="w-full py-3.5 btn-noma-orange text-xs font-mono font-bold uppercase rounded-xl flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
                >
                  <span>CONFIRMED ➔ SIGN IN</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tab Switcher */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-paper-card border border-hairline rounded-2xl mb-5 font-mono text-[10px] sm:text-xs">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    handleTabChange('guest');
                  }}
                  className={`py-2 px-1 rounded-xl font-bold uppercase transition-all cursor-pointer text-center flex items-center justify-center space-x-1 ${
                    tab === 'guest'
                      ? 'bg-ink text-paper shadow-xs'
                      : 'text-muted hover:text-ink border border-transparent'
                  }`}
                >
                  <Zap className={`w-3 h-3 shrink-0 ${tab === 'guest' ? 'text-lime' : 'text-muted'}`} />
                  <span className="truncate">GUEST</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    handleTabChange('signin');
                  }}
                  className={`py-2 px-1 rounded-xl font-bold uppercase transition-all cursor-pointer text-center flex items-center justify-center space-x-1 ${
                    tab === 'signin'
                      ? 'bg-ink text-paper shadow-xs'
                      : 'text-muted hover:text-ink border border-transparent'
                  }`}
                >
                  <Lock className={`w-3 h-3 shrink-0 ${tab === 'signin' ? 'text-orange' : 'text-muted'}`} />
                  <span className="truncate">SIGN IN</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    handleTabChange('signup');
                  }}
                  className={`py-2 px-1 rounded-xl font-bold uppercase transition-all cursor-pointer text-center flex items-center justify-center space-x-1 ${
                    tab === 'signup'
                      ? 'bg-ink text-paper shadow-xs'
                      : 'text-muted hover:text-ink border border-transparent'
                  }`}
                >
                  <Crown className={`w-3 h-3 shrink-0 ${tab === 'signup' ? 'text-lime' : 'text-muted'}`} />
                  <span className="truncate">REGISTER</span>
                </button>
              </div>

              {/* Feedback Banners */}
              {errorMessage && (
                <div className="p-3.5 bg-orange/15 text-orange border border-orange/30 rounded-2xl font-mono text-xs mb-4 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{errorMessage}</div>
                </div>
              )}
              {successMessage && (
                <div className="p-3.5 bg-lime/25 text-ink border border-lime rounded-2xl font-mono text-xs mb-4 flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-ink" />
                  <span className="font-medium">{successMessage}</span>
                </div>
              )}

              {/* Auth Form */}
              <form onSubmit={handleSubmit} className="space-y-4 font-mono">
                {/* ROOM KEY FIELD */}
                <div className="p-3.5 bg-paper-card border border-hairline rounded-2xl">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                    <label className="text-xs font-bold uppercase flex items-center gap-1.5 text-ink">
                      <Key className="w-3.5 h-3.5 text-orange" />
                      <span>
                        {tab !== 'guest' && role === 'host'
                          ? 'HOST ROOM KEY (ASSIGNED):'
                          : 'ROOM KEY / PASSCODE:'}
                      </span>
                    </label>
                    {tab !== 'guest' && role === 'host' ? (
                      <button
                        type="button"
                        onClick={() => {
                          playPopSound();
                          generateRandomRoomKey();
                        }}
                        className="text-[10px] bg-paper text-orange hover:bg-black/[0.04] px-2 py-0.5 rounded-lg font-bold uppercase flex items-center gap-1 border border-hairline transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" /> SHUFFLE
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted font-mono font-bold">
                        REQUIRED
                      </span>
                    )}
                  </div>

                  {tab !== 'guest' && role === 'host' ? (
                    <div className="flex items-center bg-paper border border-hairline rounded-xl px-3 py-2.5">
                      <Lock className="w-4 h-4 text-muted mr-2 shrink-0" />
                      <span className="text-sm font-bold tracking-widest text-ink flex-1 select-all font-mono">
                        {roomKey}
                      </span>
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-lime/30 text-ink border border-lime">
                        UNIQUE
                      </span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={roomKey}
                      onChange={(e) => setRoomKey(e.target.value.toUpperCase())}
                      placeholder="e.g. SKT-789 or ARCH-101"
                      className="w-full px-3.5 py-2.5 text-xs bg-paper border border-hairline rounded-xl text-ink font-bold tracking-wider focus:outline-none focus:border-ink transition-colors"
                      required
                    />
                  )}
                </div>

                {/* GUEST MODE SPECIFIC FIELDS */}
                {tab === 'guest' ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold uppercase flex items-center gap-1.5 text-ink">
                          <UserIcon className="w-3.5 h-3.5 text-orange" />
                          <span>YOUR SCREEN ALIAS:</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            playPopSound();
                            generateRandomGuestHandle();
                          }}
                          className="text-[10px] bg-paper-card text-orange hover:bg-black/[0.04] px-2 py-0.5 rounded-lg font-bold uppercase flex items-center gap-1 border border-hairline transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> RANDOM
                        </button>
                      </div>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. PixelDev_42 (or leave blank for random)"
                        className="w-full px-3.5 py-2.5 text-xs bg-paper border border-hairline rounded-xl text-ink font-bold focus:outline-none focus:border-ink transition-colors"
                      />
                    </div>

                    <div className="p-3 bg-paper-card border border-hairline rounded-2xl text-[11px] font-mono text-muted flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-orange shrink-0" />
                      <span>Frictionless 1-click access: No password or signup required.</span>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        onClick={() => playWhoosh()}
                        disabled={isLoading}
                        className="w-full py-3.5 btn-noma-orange text-xs font-mono font-bold uppercase rounded-xl flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
                      >
                        <Zap className="w-4 h-4" />
                        <span>
                          {isLoading
                            ? 'CONNECTING TO ARENA...'
                            : `ENTER ROOM [${roomKey.toUpperCase() || 'ROOM'}]`}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {tab === 'signup' && (
                      <div>
                        <label className="text-xs font-bold uppercase block mb-1.5 text-ink">Full Name / Alias</label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="e.g. Elena Rostova"
                          className="w-full px-3.5 py-2.5 text-xs bg-paper border border-hairline rounded-xl text-ink font-bold focus:outline-none focus:border-ink transition-colors"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-bold uppercase block mb-1.5 text-ink">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full px-3.5 py-2.5 text-xs bg-paper border border-hairline rounded-xl text-ink font-bold focus:outline-none focus:border-ink transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase block mb-1.5 text-ink">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 text-xs bg-paper border border-hairline rounded-xl text-ink font-bold focus:outline-none focus:border-ink transition-colors"
                        required
                        minLength={6}
                      />
                    </div>

                    {/* Role Selection */}
                    <div>
                      <label className="text-xs font-bold uppercase block mb-1.5 text-ink">Arena Role:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            playPopSound();
                            setRole('attendee');
                          }}
                          className={`py-2.5 rounded-xl text-xs font-bold uppercase border transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                            role === 'attendee'
                              ? 'bg-ink text-paper border-ink shadow-xs'
                              : 'bg-paper text-muted border-hairline hover:text-ink'
                          }`}
                        >
                          <UserIcon className="w-3.5 h-3.5" />
                          <span>ATTENDEE</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playPopSound();
                            setRole('host');
                          }}
                          className={`py-2.5 rounded-xl text-xs font-bold uppercase border transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                            role === 'host'
                              ? 'bg-ink text-paper border-ink shadow-xs'
                              : 'bg-paper text-muted border-hairline hover:text-ink'
                          }`}
                        >
                          <Crown className="w-3.5 h-3.5 text-lime" />
                          <span>HOST / ADMIN</span>
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        onClick={() => playWhoosh()}
                        disabled={isLoading}
                        className="w-full py-3.5 btn-noma-orange text-xs font-mono font-bold uppercase rounded-xl flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
                      >
                        <span>
                          {isLoading
                            ? 'AUTHENTICATING...'
                            : tab === 'signin'
                            ? `SIGN IN & ENTER [${roomKey.toUpperCase() || 'ROOM'}]`
                            : 'REGISTER ACCOUNT'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </form>
            </>
          )}
        </div>
      </div>

      {/* QR Code Quick Modal */}
      {showQRPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm font-sans">
          <div className="bg-paper text-ink w-full max-w-sm p-6 sm:p-7 rounded-3xl border border-hairline shadow-2xl relative text-center max-h-[90dvh] overflow-y-auto">
            <button
              onClick={() => setShowQRPreview(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl bg-paper-card text-muted hover:text-ink transition-colors cursor-pointer border border-hairline"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#101313] dark:bg-lime/20 text-lime dark:text-lime border border-black/20 dark:border-lime/30 flex items-center justify-center mb-2.5">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-serif font-bold uppercase tracking-tight text-ink">
                MOBILE ACCESS QR
              </h3>
              <p className="text-xs font-mono text-muted mt-0.5">
                Scan with camera to auto-join room
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

            <div className="bg-paper-elevated text-ink p-3.5 rounded-2xl border border-hairline font-mono">
              <div className="text-[10px] font-bold text-muted uppercase mb-0.5">
                ROOM PASSCODE
              </div>
              <div className="text-xl font-bold tracking-wider text-orange">
                {roomKey.toUpperCase() || 'SKT-789'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Editorial Minimalist Footer */}
      <footer className="border-t border-hairline bg-paper px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-muted shrink-0 text-center sm:text-left">
        <div>SKETCHCAST • STUDIO NOMA EDITION</div>
        <div className="flex items-center gap-2 text-ink">
          <span className="w-2 h-2 bg-orange rounded-full shrink-0" />
          <span className="truncate font-semibold">TACTILE PAPER-GRAIN • HIGH CONTRAST TYPOGRAPHY</span>
        </div>
      </footer>
    </div>
  );
};
