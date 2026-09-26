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
  Radio,
  CheckCircle,
  AlertCircle,
  Crown,
  Key,
  QrCode,
  RefreshCw,
  X,
  Send,
  Check
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInAnonymously,
  resendVerificationEmail,
} from '../../lib/supabase';
import { playClickSound, playPopSound, playWhoosh } from '../../lib/soundFx';
import { SketchCastLogo, SignalSparkGlyph } from '../common/SketchCastLogo';

interface LandingAuthPageProps {
  onAuthenticated: (name: string, role: 'host' | 'attendee', roomCode?: string) => void;
  roomCode: string;
}

export const LandingAuthPage: React.FC<LandingAuthPageProps> = ({
  onAuthenticated,
  roomCode,
}) => {
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
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#0A0A0C] bg-architectural-grid text-[#FAFAFA] font-sans selection:bg-[#3B82F6] selection:text-white overflow-x-hidden">
      {/* Clean Top Bar */}
      <div className="border-b border-white/[0.08] bg-[#0E0E11] px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between text-xs font-mono min-w-0">
        <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
          <span className="text-blue-400 font-bold tracking-wider uppercase text-[11px] sm:text-xs shrink-0">ARENA LIVE</span>
          <span className="text-zinc-600 shrink-0 hidden min-[380px]:inline">/</span>
          <span className="text-zinc-400 uppercase text-[10px] sm:text-xs truncate hidden min-[380px]:inline">REALTIME GATEWAY</span>
        </div>
        <div className="text-[10px] sm:text-[11px] text-zinc-500 font-mono shrink-0">
          SKETCHCAST v2.4
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row items-stretch lg:items-center justify-center p-3 sm:p-6 md:p-12 gap-6 lg:gap-8 xl:gap-14 max-w-6xl mx-auto w-full min-w-0">
        {/* Left Hero Brand & Exaggerated Typography */}
        <div className="flex-1 space-y-4 sm:space-y-6 max-w-xl text-left w-full min-w-0">
          <div className="inline-flex items-center space-x-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 font-mono text-[10px] sm:text-xs text-blue-400 max-w-full">
            <Radio className="w-3.5 h-3.5 animate-pulse text-blue-400 shrink-0" />
            <span className="font-bold uppercase tracking-wider truncate">LIVE AUDIENCE ENGAGEMENT ARENA</span>
          </div>

          <div className="space-y-3 sm:space-y-4 max-w-full">
            <SketchCastLogo size="xl" showWordmark={true} />
            <p className="text-xs sm:text-base font-sans text-zinc-400 leading-relaxed max-w-lg break-words">
              High-velocity interactive audience engagement platform designed for modern tech events: real-time quizzing, live consensus polling, and crowdsourced technical Q&A.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 w-full min-w-0">
            <div className="p-4 bg-[#121215] rounded-2xl border border-white/[0.08] hover:border-blue-500/30 transition-all flex items-start space-x-3.5 min-w-0">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 flex items-center justify-center">
                <SignalSparkGlyph size={24} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-mono font-bold uppercase text-white truncate">TECH QUIZZING</div>
                <div className="text-xs text-zinc-400 mt-1 leading-snug">Real-time competitive rounds with instant takeaway analysis</div>
              </div>
            </div>

            <div className="p-4 bg-[#121215] rounded-2xl border border-white/[0.08] hover:border-blue-500/30 transition-all flex items-start space-x-3.5 min-w-0">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                <Vote className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-mono font-bold uppercase text-white truncate">LIVE POLLS</div>
                <div className="text-xs text-zinc-400 mt-1 leading-snug">Instant audience consensus with AI sentiment synthesis</div>
              </div>
            </div>

            <div className="p-4 bg-[#121215] rounded-2xl border border-white/[0.08] hover:border-blue-500/30 transition-all flex items-start space-x-3.5 min-w-0">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-mono font-bold uppercase text-white truncate">Q&A UPVOTING</div>
                <div className="text-xs text-zinc-400 mt-1 leading-snug">Crowdsourced question triage & live stage spotlight</div>
              </div>
            </div>

            <div className="p-4 bg-[#121215] rounded-2xl border border-white/[0.08] hover:border-blue-500/30 transition-all flex items-start space-x-3.5 min-w-0">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-mono font-bold uppercase text-white truncate">RANKINGS PODIUM</div>
                <div className="text-xs text-zinc-400 mt-1 leading-snug">Live podium & verifiable masterclass credentials</div>
              </div>
            </div>
          </div>

          {/* Quick QR Bar: Stacks on mobile to prevent horizontal overflow */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 w-full min-w-0">
            <button
              type="button"
              onClick={() => setShowQRPreview(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#121215] hover:bg-[#18181D] text-white border border-white/[0.08] font-mono text-xs font-bold transition-colors flex items-center justify-center space-x-2 cursor-pointer touch-target shrink-0"
            >
              <QrCode className="w-4 h-4 text-blue-400 shrink-0" />
              <span>SHOW ROOM QR CODE</span>
            </button>
            <div className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 text-xs font-mono text-zinc-400 bg-[#121215] px-4 py-2.5 rounded-xl border border-white/[0.08] shrink-0">
              <span>ACTIVE KEY:</span>
              <span className="text-blue-400 font-bold">{roomKey}</span>
            </div>
          </div>
        </div>

        {/* Right Modern Auth Box */}
        <div className="w-full max-w-md bg-[#121215] text-[#FAFAFA] p-4 sm:p-6 md:p-8 rounded-2xl border border-white/[0.08] shadow-modal relative font-sans">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-mono shrink-0">
              <Shield className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="text-[10px] font-mono tracking-widest text-blue-400 uppercase font-bold">
                GATEWAY ACCESS
              </div>
              <h2 className="text-lg font-display font-extrabold uppercase tracking-tight text-[#FAFAFA]">
                {verificationSentEmail ? 'EMAIL VERIFICATION' : 'ENTER ARENA'}
              </h2>
            </div>
          </div>

          {/* Verification Pending Screen */}
          {verificationSentEmail ? (
            <div className="space-y-4 font-mono">
              <div className="p-4 bg-[#0A0A0C] rounded-xl border border-white/[0.08] space-y-3">
                <div className="flex items-center space-x-2 text-blue-400 font-bold text-sm">
                  <Mail className="w-5 h-5 animate-pulse shrink-0" />
                  <span>CONFIRMATION LINK SENT</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  Verification link transmitted to:
                  <br />
                  <strong className="text-white bg-[#18181D] px-2 py-0.5 rounded-lg border border-white/[0.08] break-all text-xs inline-block mt-1 font-mono">
                    {verificationSentEmail}
                  </strong>
                </p>
                <div className="text-[11px] text-zinc-400 space-y-1 bg-[#121215] p-3 rounded-lg border border-white/[0.06]">
                  <div className="font-bold text-white font-mono">NEXT STEPS:</div>
                  <div>1. Check your email inbox.</div>
                  <div>2. Click confirmation link to verify.</div>
                  <div>3. Return here and sign in.</div>
                </div>
              </div>

              {resendStatus && (
                <div className={`p-2.5 rounded-xl text-xs font-mono font-bold border flex items-center space-x-2 ${
                  resendStatus.includes('sent')
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                    : 'bg-red-950/40 text-red-400 border-red-500/30'
                }`}>
                  {resendStatus.includes('sent') ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{resendStatus}</span>
                </div>
              )}

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleResendVerification(verificationSentEmail)}
                  disabled={resendCooldown > 0}
                  className="w-full py-2.5 bg-[#18181D] hover:bg-[#22222A] disabled:opacity-50 text-[#FAFAFA] text-xs font-mono font-bold uppercase rounded-xl border border-white/[0.08] flex items-center justify-center space-x-2 cursor-pointer transition-colors"
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
                  className="w-full py-2.5 btn-cobalt text-xs font-mono font-bold uppercase rounded-xl flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>CONFIRMED ➔ SIGN IN</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tab Switcher */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-[#0A0A0C] border border-white/[0.08] rounded-xl mb-4 font-mono text-[10px] sm:text-xs">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    handleTabChange('guest');
                  }}
                  className={`py-2 px-1 rounded-lg font-bold uppercase transition-all cursor-pointer text-center flex items-center justify-center space-x-1 ${
                    tab === 'guest'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Zap className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="truncate">GUEST</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    handleTabChange('signin');
                  }}
                  className={`py-2 px-1 rounded-lg font-bold uppercase transition-all cursor-pointer text-center flex items-center justify-center space-x-1 ${
                    tab === 'signin'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Lock className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="truncate">SIGN IN</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    handleTabChange('signup');
                  }}
                  className={`py-2 px-1 rounded-lg font-bold uppercase transition-all cursor-pointer text-center flex items-center justify-center space-x-1 ${
                    tab === 'signup'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Crown className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="truncate">REGISTER</span>
                </button>
              </div>

              {/* Feedback Banners */}
              {errorMessage && (
                <div className="p-3 bg-red-950/40 text-red-400 border border-red-500/30 rounded-xl font-mono text-xs mb-3 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div>{errorMessage}</div>
                  </div>
                </div>
              )}
              {successMessage && (
                <div className="p-3 bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 rounded-xl font-mono text-xs mb-3 flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Auth Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5 font-mono">
                {/* ROOM KEY FIELD */}
                <div className="p-3 bg-[#0A0A0C] border border-white/[0.08] rounded-xl">
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                    <label className="text-xs font-bold uppercase flex items-center gap-1.5 text-zinc-300">
                      <Key className="w-3.5 h-3.5 text-blue-400" />
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
                        className="text-[10px] bg-[#18181D] text-blue-400 hover:bg-[#22222A] px-2 py-0.5 rounded-md font-bold uppercase flex items-center gap-1 border border-white/[0.08] transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" /> SHUFFLE
                      </button>
                    ) : (
                      <span className="text-[10px] text-zinc-500 font-mono">
                        REQUIRED
                      </span>
                    )}
                  </div>

                  {tab !== 'guest' && role === 'host' ? (
                    <div className="flex items-center bg-[#18181D] border border-white/[0.08] rounded-lg px-3 py-2">
                      <Lock className="w-4 h-4 text-zinc-500 mr-2 shrink-0" />
                      <span className="text-sm font-bold tracking-widest text-white flex-1 select-all">
                        {roomKey}
                      </span>
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        UNIQUE
                      </span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={roomKey}
                      onChange={(e) => setRoomKey(e.target.value.toUpperCase())}
                      placeholder="e.g. SKT-789 or ARCH-101"
                      className="w-full px-3 py-2 text-xs bg-[#18181D] border border-white/[0.08] rounded-lg text-white font-bold tracking-wider focus:outline-none focus:border-blue-500"
                      required
                    />
                  )}
                </div>

                {/* GUEST MODE SPECIFIC FIELDS */}
                {tab === 'guest' ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold uppercase flex items-center gap-1.5 text-zinc-300">
                          <UserIcon className="w-3.5 h-3.5 text-blue-400" />
                          <span>YOUR SCREEN ALIAS:</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            playPopSound();
                            generateRandomGuestHandle();
                          }}
                          className="text-[10px] bg-[#18181D] text-blue-400 hover:bg-[#22222A] px-2 py-0.5 rounded-md font-bold uppercase flex items-center gap-1 border border-white/[0.08] transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> RANDOM
                        </button>
                      </div>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. PixelDev_42 (or leave blank for random)"
                        className="w-full px-3 py-2 text-xs bg-[#18181D] border border-white/[0.08] rounded-lg text-white font-bold focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="p-3 bg-[#0A0A0C] border border-white/[0.08] rounded-xl text-[11px] font-mono text-zinc-400 flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>Frictionless 1-click access: No password or signup required.</span>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        onClick={() => playWhoosh()}
                        disabled={isLoading}
                        className="w-full py-3 btn-cobalt text-xs font-mono font-bold uppercase rounded-xl flex items-center justify-center space-x-2 cursor-pointer"
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
                        <label className="text-xs font-bold uppercase block mb-1 text-zinc-300">Full Name / Alias</label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="e.g. Elena Rostova"
                          className="w-full px-3 py-2 text-xs bg-[#18181D] border border-white/[0.08] rounded-lg text-white font-bold focus:outline-none focus:border-blue-500"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-bold uppercase block mb-1 text-zinc-300">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full px-3 py-2 text-xs bg-[#18181D] border border-white/[0.08] rounded-lg text-white font-bold focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase block mb-1 text-zinc-300">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 text-xs bg-[#18181D] border border-white/[0.08] rounded-lg text-white font-bold focus:outline-none focus:border-blue-500"
                        required
                        minLength={6}
                      />
                    </div>

                    {/* Role Selection */}
                    <div>
                      <label className="text-xs font-bold uppercase block mb-1 text-zinc-300">Arena Role:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            playPopSound();
                            setRole('attendee');
                          }}
                          className={`py-2 rounded-lg text-xs font-bold uppercase border transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                            role === 'attendee'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              : 'bg-[#18181D] text-zinc-400 border-white/[0.08] hover:text-white'
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
                          className={`py-2 rounded-lg text-xs font-bold uppercase border transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                            role === 'host'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              : 'bg-[#18181D] text-zinc-400 border-white/[0.08] hover:text-white'
                          }`}
                        >
                          <Crown className="w-3.5 h-3.5" />
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
                        className="w-full py-3 btn-cobalt text-xs font-mono font-bold uppercase rounded-xl flex items-center justify-center space-x-2 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm font-sans">
          <div className="bg-[#121215] text-[#FAFAFA] w-full max-w-xs p-4 sm:p-6 rounded-2xl border border-white/[0.08] shadow-modal relative text-center max-h-[90dvh] overflow-y-auto">
            <button
              onClick={() => setShowQRPreview(false)}
              className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-2">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-base font-display font-extrabold uppercase tracking-tight text-[#FAFAFA]">
                MOBILE ACCESS QR
              </h3>
              <p className="text-xs font-mono text-zinc-400">
                Scan with phone camera to auto-join
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-white/[0.08] inline-block mx-auto mb-3">
              <QRCodeSVG
                value={currentJoinUrl}
                size={160}
                bgColor="#FFFFFF"
                fgColor="#000000"
                level="Q"
                includeMargin={false}
              />
            </div>

            <div className="bg-[#0A0A0C] text-[#FAFAFA] p-3 rounded-xl border border-white/[0.08] font-mono">
              <div className="text-[10px] font-bold text-zinc-500 uppercase mb-0.5">
                ROOM PASSCODE
              </div>
              <div className="text-lg font-bold tracking-wider text-blue-400">
                {roomKey.toUpperCase() || 'SKT-789'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Minimalist Footer */}
      <footer className="border-t border-white/[0.08] bg-[#0E0E11] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-zinc-500 shrink-0 text-center sm:text-left">
        <div>SKETCHCAST • SUPABASE REALTIME SYNC</div>
        <div className="flex items-center gap-2 text-zinc-400">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
          <span className="truncate">EXAGGERATED MINIMALISM & KINETIC TYPOGRAPHY</span>
        </div>
      </footer>
    </div>
  );
};
