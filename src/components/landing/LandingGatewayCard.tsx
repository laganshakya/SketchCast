import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  Lock,
  Crown,
  User as UserIcon,
  Key,
  RefreshCw,
  QrCode,
  ArrowRight,
  Shield,
  CheckCircle,
  AlertCircle,
  Mail,
  Send,
  Check,
  Loader2,
} from 'lucide-react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInAnonymously,
  resendVerificationEmail,
  dbCheckRoomExists,
} from '../../lib/supabase';
import { generateGuaranteedUniqueRoomCode } from '../../lib/roomUtils';
import { playClickSound, playPopSound, playWhoosh } from '../../lib/soundFx';

interface LandingGatewayCardProps {
  onAuthenticated: (name: string, role: 'host' | 'attendee', roomCode?: string) => void;
  initialRoomCode: string;
  onOpenQR: () => void;
  onVerifyCertLookup?: (certId: string) => void;
  activeMode?: 'guest' | 'signin' | 'signup';
}

export const LandingGatewayCard: React.FC<LandingGatewayCardProps> = ({
  onAuthenticated,
  initialRoomCode: _initialRoomCode,
  onOpenQR,
  onVerifyCertLookup: _onVerifyCertLookup,
  activeMode = 'guest',
}) => {
  const [tab, setTab] = useState<'guest' | 'signin' | 'signup'>(activeMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'host' | 'attendee'>('attendee');

  // Attendee/Guest room key: strictly empty unless explicitly passed via ?room= in URL
  const [attendeeRoomKey, setAttendeeRoomKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryRoom = params.get('room');
      if (queryRoom && queryRoom.trim()) {
        return queryRoom.trim().toUpperCase();
      }
    }
    return '';
  });

  // Host room key: guaranteed unique, auto-generated against database
  const [hostRoomKey, setHostRoomKey] = useState<string>('');
  const [isGeneratingHostKey, setIsGeneratingHostKey] = useState(false);

  // Debounced room check status for attendee entry
  const [roomCheckStatus, setRoomCheckStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [verifiedRoomTitle, setVerifiedRoomTitle] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Email verification state
  const [verificationSentEmail, setVerificationSentEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const [prevActiveMode, setPrevActiveMode] = useState(activeMode);
  if (activeMode !== prevActiveMode) {
    setPrevActiveMode(activeMode);
    if (activeMode && activeMode !== tab) {
      setTab(activeMode);
    }
  }

  const generateNewHostKey = useCallback(async () => {
    setIsGeneratingHostKey(true);
    try {
      const uniqueCode = await generateGuaranteedUniqueRoomCode();
      setHostRoomKey(uniqueCode);
    } catch (err) {
      console.warn('Failed to generate unique host code:', err);
    } finally {
      setIsGeneratingHostKey(false);
    }
  }, []);

  // Pre-generate guaranteed unique host key when in host mode or registering
  useEffect(() => {
    if ((role === 'host' || tab !== 'guest') && !hostRoomKey && !isGeneratingHostKey) {
      let isCancelled = false;
      queueMicrotask(async () => {
        if (isCancelled) return;
        setIsGeneratingHostKey(true);
        try {
          const uniqueCode = await generateGuaranteedUniqueRoomCode();
          if (!isCancelled) setHostRoomKey(uniqueCode);
        } catch (err) {
          console.warn('Failed to generate unique host code:', err);
        } finally {
          if (!isCancelled) setIsGeneratingHostKey(false);
        }
      });
      return () => {
        isCancelled = true;
      };
    }
  }, [role, tab, hostRoomKey, isGeneratingHostKey]);

  // Debounced room existence check for attendee/guest typing
  useEffect(() => {
    const clean = attendeeRoomKey.trim().toUpperCase();
    let isCancelled = false;

    const timer = setTimeout(async () => {
      if (!clean || clean.length < 3) {
        if (!isCancelled) {
          setRoomCheckStatus('idle');
          setVerifiedRoomTitle(null);
        }
        return;
      }

      if (!isCancelled) setRoomCheckStatus('checking');

      try {
        const { exists, room } = await dbCheckRoomExists(clean);
        if (isCancelled) return;
        if (exists && room) {
          setRoomCheckStatus('valid');
          setVerifiedRoomTitle(room.title);
        } else {
          setRoomCheckStatus('invalid');
          setVerifiedRoomTitle(null);
        }
      } catch {
        if (!isCancelled) setRoomCheckStatus('idle');
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [attendeeRoomKey]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const generateRandomGuestHandle = () => {
    const adjectives = ['Pixel', 'Cyber', 'Async', 'Quantum', 'Turbo', 'Hyper', 'Vector', 'Cloud', 'Logic', 'Matrix', 'Atlas', 'Nova'];
    const nouns = ['Coder', 'Hacker', 'Architect', 'Engineer', 'Dev', 'Explorer', 'Pilot', 'Builder', 'Kernel', 'Node', 'Spectator', 'Guild'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setDisplayName(`${adj}${noun}_${num}`);
  };

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

    const isHostMode = tab !== 'guest' && role === 'host';

    if (isHostMode) {
      // Host Flow: Ensure guaranteed unique host room key
      let targetHostKey = hostRoomKey;
      if (!targetHostKey || isGeneratingHostKey) {
        targetHostKey = await generateGuaranteedUniqueRoomCode();
        setHostRoomKey(targetHostKey);
      }

      try {
        if (tab === 'signin') {
          const { user, error } = await signInWithEmail(email.trim(), password);
          if (error) throw error;

          const resolvedName =
            user?.user_metadata?.full_name ||
            user?.user_metadata?.name ||
            email.split('@')[0] ||
            'Host';

          playPopSound();
          onAuthenticated(resolvedName, 'host', targetHostKey);
        } else if (tab === 'signup') {
          const name = displayName.trim() || email.split('@')[0] || 'Host';
          const { session, error } = await signUpWithEmail(email.trim(), password, name);
          if (error) throw error;

          if (session) {
            playPopSound();
            onAuthenticated(name, 'host', targetHostKey);
          } else {
            setVerificationSentEmail(email.trim());
            setSuccessMessage('Account created! Please check your email inbox to verify your address.');
            setResendCooldown(60);
          }
        }
      } catch (err: any) {
        console.error('[LandingGatewayCard] Auth error:', err);
        setErrorMessage(err?.message || 'Authentication failed. Please verify credentials.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Attendee / Guest Flow: Strictly verify room exists
      const cleanRoomKey = attendeeRoomKey.trim().toUpperCase();
      if (!cleanRoomKey) {
        setErrorMessage('Please enter a Room Key / Passcode to enter the arena.');
        setIsLoading(false);
        return;
      }

      const { exists } = await dbCheckRoomExists(cleanRoomKey);
      if (!exists) {
        setErrorMessage(`Room "${cleanRoomKey}" does not exist. Please check your passcode and try again.`);
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
          if (error) throw error;

          const resolvedName =
            user?.user_metadata?.full_name ||
            user?.user_metadata?.name ||
            email.split('@')[0] ||
            'Attendee';

          playPopSound();
          onAuthenticated(resolvedName, 'attendee', cleanRoomKey);
        } else if (tab === 'signup') {
          const name = displayName.trim() || email.split('@')[0] || 'Attendee';
          const { session, error } = await signUpWithEmail(email.trim(), password, name);
          if (error) throw error;

          if (session) {
            playPopSound();
            onAuthenticated(name, 'attendee', cleanRoomKey);
          } else {
            setVerificationSentEmail(email.trim());
            setSuccessMessage('Account created! Please check your email inbox to verify your address.');
            setResendCooldown(60);
          }
        }
      } catch (err: any) {
        console.error('[LandingGatewayCard] Auth error:', err);
        setErrorMessage(err?.message || 'Authentication failed. Please verify credentials.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="w-full bg-paper-elevated text-ink p-5 sm:p-7 md:p-8 rounded-3xl border border-hairline shadow-xl relative font-sans">
      {/* Header Accent */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-ink text-lime border border-black/20 dark:border-lime/30 flex items-center justify-center font-mono shrink-0 shadow-xs">
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

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onOpenQR();
          }}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-paper-card hover:bg-paper text-ink border border-hairline flex items-center space-x-1.5 text-xs font-mono font-bold cursor-pointer transition-colors shadow-subtle shrink-0"
          title="Open Room QR Code"
        >
          <QrCode className="w-4 h-4 text-orange shrink-0" />
          <span className="hidden sm:inline">QR SCAN</span>
        </button>
      </div>

      {/* Verification Sent Screen */}
      {verificationSentEmail ? (
        <div className="space-y-4 font-mono text-xs">
          <div className="p-4 bg-paper-card rounded-2xl border border-hairline space-y-3">
            <div className="flex items-center space-x-2 text-orange font-bold text-sm">
              <Mail className="w-5 h-5 animate-pulse shrink-0" />
              <span>CONFIRMATION TRANSMITTED</span>
            </div>
            <p className="text-xs text-muted leading-relaxed font-sans">
              Verification link dispatched to:
              <br />
              <strong className="text-ink bg-paper px-2 py-0.5 rounded-lg border border-hairline break-all text-xs inline-block mt-1 font-mono">
                {verificationSentEmail}
              </strong>
            </p>
            <div className="text-[11px] text-muted space-y-1 bg-paper p-3 rounded-xl border border-hairline font-sans">
              <div className="font-bold text-ink font-mono uppercase text-[10px]">Next Steps:</div>
              <div>1. Check your email inbox.</div>
              <div>2. Click the verification link.</div>
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
              className="w-full py-3 bg-paper-card hover:bg-paper disabled:opacity-50 text-ink text-xs font-mono font-bold uppercase rounded-xl border border-hairline flex items-center justify-center space-x-2 cursor-pointer transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {resendCooldown > 0 ? `RESEND IN ${resendCooldown}S` : 'RESEND VERIFICATION EMAIL'}
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
          {/* 3-Tab Switcher */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-paper-card border border-hairline rounded-2xl mb-5 font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setTab('guest');
                setErrorMessage(null);
              }}
              className={`py-2.5 px-2 rounded-xl font-bold uppercase transition-all cursor-pointer text-center flex items-center justify-center space-x-1.5 ${
                tab === 'guest'
                  ? 'bg-ink text-paper shadow-xs'
                  : 'text-muted hover:text-ink border border-transparent'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 shrink-0 ${tab === 'guest' ? 'text-lime' : 'text-muted'}`} />
              <span className="truncate">GUEST</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setTab('signin');
                setErrorMessage(null);
              }}
              className={`py-2.5 px-2 rounded-xl font-bold uppercase transition-all cursor-pointer text-center flex items-center justify-center space-x-1.5 ${
                tab === 'signin'
                  ? 'bg-ink text-paper shadow-xs'
                  : 'text-muted hover:text-ink border border-transparent'
              }`}
            >
              <Lock className={`w-3.5 h-3.5 shrink-0 ${tab === 'signin' ? 'text-orange' : 'text-muted'}`} />
              <span className="truncate">HOST IN</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setTab('signup');
                setErrorMessage(null);
              }}
              className={`py-2.5 px-2 rounded-xl font-bold uppercase transition-all cursor-pointer text-center flex items-center justify-center space-x-1.5 ${
                tab === 'signup'
                  ? 'bg-ink text-paper shadow-xs'
                  : 'text-muted hover:text-ink border border-transparent'
              }`}
            >
              <Crown className={`w-3.5 h-3.5 shrink-0 ${tab === 'signup' ? 'text-lime' : 'text-muted'}`} />
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

          {/* Auth & Room Entry Form */}
          <form onSubmit={handleSubmit} className="space-y-4 font-mono">
              {/* Room Key Input */}
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
                      disabled={isGeneratingHostKey}
                      onClick={() => {
                        playPopSound();
                        generateNewHostKey();
                      }}
                      className="text-[10px] bg-paper text-orange hover:bg-black/[0.04] px-2 py-0.5 rounded-lg font-bold uppercase flex items-center gap-1 border border-hairline transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isGeneratingHostKey ? 'animate-spin' : ''}`} /> SHUFFLE
                    </button>
                  ) : (
                    <div>
                      {roomCheckStatus === 'checking' && (
                        <span className="text-[10px] text-muted font-mono flex items-center gap-1 font-bold">
                          <Loader2 className="w-2.5 h-2.5 animate-spin text-orange" /> CHECKING...
                        </span>
                      )}
                      {roomCheckStatus === 'valid' && (
                        <span className="text-[10px] text-emerald-600 dark:text-lime font-mono font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> VERIFIED
                        </span>
                      )}
                      {roomCheckStatus === 'invalid' && (
                        <span className="text-[10px] text-orange font-mono font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> NOT FOUND
                        </span>
                      )}
                      {roomCheckStatus === 'idle' && (
                        <span className="text-[10px] text-muted font-mono font-bold">REQUIRED</span>
                      )}
                    </div>
                  )}
                </div>

                {tab !== 'guest' && role === 'host' ? (
                  <div className="flex items-center bg-paper border border-hairline rounded-xl px-3 py-2.5">
                    <Lock className="w-4 h-4 text-muted mr-2 shrink-0" />
                    <span className="text-sm font-bold tracking-widest text-ink flex-1 select-all font-mono">
                      {isGeneratingHostKey ? (
                        <span className="text-muted text-xs animate-pulse">GENERATING UNIQUE KEY...</span>
                      ) : (
                        hostRoomKey || 'GENERATING...'
                      )}
                    </span>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-lime/30 text-ink border border-lime flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" /> UNIQUE
                    </span>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={attendeeRoomKey}
                      onChange={(e) => setAttendeeRoomKey(e.target.value.toUpperCase())}
                      placeholder="e.g. SKT-789 or DEV-101"
                      className={`w-full px-3.5 py-2.5 text-xs bg-paper border rounded-xl text-ink font-bold tracking-wider focus:outline-none transition-colors ${
                        roomCheckStatus === 'valid'
                          ? 'border-emerald-500/50 dark:border-lime/50'
                          : roomCheckStatus === 'invalid'
                          ? 'border-orange/50'
                          : 'border-hairline focus:border-ink'
                      }`}
                      required
                    />
                    {roomCheckStatus === 'valid' && verifiedRoomTitle && (
                      <div className="mt-1.5 text-[10px] font-mono text-emerald-600 dark:text-lime flex items-center gap-1 truncate">
                        <span>Active Room:</span>
                        <span className="font-bold truncate">{verifiedRoomTitle}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Guest Mode Fields */}
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
                      placeholder="e.g. PixelArchitect_42 (or leave blank for random)"
                      className="w-full px-3.5 py-2.5 text-xs bg-paper border border-hairline rounded-xl text-ink font-bold focus:outline-none focus:border-ink transition-colors"
                    />
                  </div>

                  <div className="p-3 bg-paper-card border border-hairline rounded-2xl text-[11px] font-mono text-muted flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-orange shrink-0" />
                    <span>Frictionless 1-click access: Zero account or install required.</span>
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
                          : `ENTER ROOM [${attendeeRoomKey.trim().toUpperCase() || 'PASSCODE'}]`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                /* Host Sign In / Sign Up */
                <>
                  {tab === 'signup' && (
                    <div>
                      <label className="text-xs font-bold uppercase block mb-1.5 text-ink">
                        Full Name / Alias
                      </label>
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
                    <label className="text-xs font-bold uppercase block mb-1.5 text-ink">
                      Email Address
                    </label>
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
                    <label className="text-xs font-bold uppercase block mb-1.5 text-ink">
                      Password
                    </label>
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

                  <div>
                    <label className="text-xs font-bold uppercase block mb-1.5 text-ink">
                      Arena Role:
                    </label>
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
                          if (!hostRoomKey) generateNewHostKey();
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
                          ? role === 'host'
                            ? `SIGN IN & ENTER [${hostRoomKey.toUpperCase() || 'ROOM'}]`
                            : `SIGN IN & ENTER [${attendeeRoomKey.trim().toUpperCase() || 'ROOM'}]`
                          : role === 'host'
                          ? 'REGISTER HOST ACCOUNT'
                          : 'REGISTER ATTENDEE ACCOUNT'}
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
  );
};
