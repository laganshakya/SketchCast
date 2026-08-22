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
  Flame,
  Info,
  Crown,
  Key,
  QrCode,
  RefreshCw,
  X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { signInWithEmail, signUpWithEmail, signInAnonymously } from '../../lib/supabase';

interface LandingAuthPageProps {
  onAuthenticated: (name: string, role: 'host' | 'attendee', roomCode?: string) => void;
  roomCode: string;
}

export const LandingAuthPage: React.FC<LandingAuthPageProps> = ({
  onAuthenticated,
  roomCode,
}) => {
  const [tab, setTab] = useState<'signin' | 'signup' | 'guest'>('guest');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'host' | 'attendee'>('attendee');
  const [roomKey, setRoomKey] = useState(roomCode || 'SKT-789');
  const [showQRPreview, setShowQRPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check URL query param for room on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryRoom = params.get('room');
      if (queryRoom && queryRoom.trim()) {
        setRoomKey(queryRoom.trim().toUpperCase());
      }
    }
  }, []);

  const handleTabChange = (nextTab: 'signin' | 'signup' | 'guest') => {
    setTab(nextTab);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (nextTab === 'guest') {
      setRole('attendee');
    }
  };

  const handleRoleSelect = (selectedRole: 'host' | 'attendee') => {
    if (tab === 'guest' && selectedRole === 'host') {
      setErrorMessage('Guest access is attendee-only. Please Sign In or Register to access Host/Admin controls.');
      return;
    }
    setRole(selectedRole);
    setErrorMessage(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanRoomKey = roomKey.trim().toUpperCase();

    if (!cleanRoomKey) {
      setErrorMessage('Please enter a Room Key / Passcode to join or host a room.');
      setIsLoading(false);
      return;
    }

    const finalRole: 'host' | 'attendee' = tab === 'guest' ? 'attendee' : role;

    try {
      if (tab === 'signin') {
        const { user, error } = await signInWithEmail(email, password);
        if (error) {
          setErrorMessage(error.message);
        } else if (user) {
          const name = user.user_metadata?.display_name || user.email?.split('@')[0] || (finalRole === 'host' ? 'Host Admin' : 'TechAttendee');
          setSuccessMessage(`Welcome, ${name}! Entering Room [${cleanRoomKey}] as ${finalRole.toUpperCase()}...`);
          setTimeout(() => onAuthenticated(name, finalRole, cleanRoomKey), 500);
        }
      } else if (tab === 'signup') {
        const name = displayName.trim() || (finalRole === 'host' ? 'Host Admin' : 'TechAttendee');
        const { user, error } = await signUpWithEmail(email, password, name);
        if (error) {
          setErrorMessage(error.message);
        } else if (user) {
          setSuccessMessage(`Account created! Entering Room [${cleanRoomKey}] as ${finalRole.toUpperCase()}...`);
          setTimeout(() => onAuthenticated(name, finalRole, cleanRoomKey), 500);
        }
      } else if (tab === 'guest') {
        const name = displayName.trim() || 'Guest ' + Math.floor(100 + Math.random() * 900);
        await signInAnonymously(name);
        setSuccessMessage(`Joining Room [${cleanRoomKey}] as Attendee: ${name}...`);
        setTimeout(() => onAuthenticated(name, 'attendee', cleanRoomKey), 400);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-retro-grid text-slate-100 flex flex-col justify-between select-none overflow-y-auto font-sans">
      {/* Top Retro Hazard Bar */}
      <div className="h-2 w-full hazard-stripes shrink-0" />

      {/* Main Hero & Auth Container */}
      <div className="max-w-6xl mx-auto w-full p-4 sm:p-6 md:p-8 flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
        {/* Left Hero Brand & Features */}
        <div className="flex-1 space-y-5 max-w-xl text-left">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-neo-card border-2 border-black brutal-shadow-sm font-mono text-xs text-neo-mint">
            <Radio className="w-3.5 h-3.5 animate-pulse text-neo-mint" />
            <span className="font-extrabold uppercase">LIVE AUDIENCE ENGAGEMENT ARENA</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-heavy uppercase tracking-tight text-white leading-none">
              SKETCH<span className="text-neo-yellow">CAST</span>
            </h1>
            <p className="text-sm sm:text-base font-mono font-bold text-slate-300">
              Interactive audience platform for <span className="bg-neo-yellow text-black px-1 border border-black">Live Quizzing</span>, <span className="bg-neo-cyan text-black px-1 border border-black">Community Polls</span>, and <span className="bg-neo-pink text-white px-1 border border-black">Q&A Upvotes</span>.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 font-mono">
            <div className="p-3 bg-neo-card border-2 border-black brutal-shadow-sm flex items-start space-x-2.5">
              <div className="p-1.5 bg-neo-yellow text-black border border-black shrink-0">
                <Zap className="w-4 h-4 fill-black stroke-black" />
              </div>
              <div>
                <div className="text-xs font-black uppercase text-white">TECH QUIZZING</div>
                <div className="text-[11px] text-slate-400">Timed speed rounds & leaderboard streaks</div>
              </div>
            </div>

            <div className="p-3 bg-neo-card border-2 border-black brutal-shadow-sm flex items-start space-x-2.5">
              <div className="p-1.5 bg-neo-cyan text-black border border-black shrink-0">
                <Vote className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black uppercase text-white">LIVE POLLS</div>
                <div className="text-[11px] text-slate-400">Instant animated percentage distribution</div>
              </div>
            </div>

            <div className="p-3 bg-neo-card border-2 border-black brutal-shadow-sm flex items-start space-x-2.5">
              <div className="p-1.5 bg-neo-pink text-white border border-black shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black uppercase text-white">Q&A UPVOTING</div>
                <div className="text-[11px] text-slate-400">Crowdsourced triage & stage spotlight</div>
              </div>
            </div>

            <div className="p-3 bg-neo-card border-2 border-black brutal-shadow-sm flex items-start space-x-2.5">
              <div className="p-1.5 bg-neo-mint text-black border border-black shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black uppercase text-white">HIGH SCORES</div>
                <div className="text-[11px] text-slate-400">Top 3 visual podium & player rankings</div>
              </div>
            </div>
          </div>

          {/* Quick QR Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowQRPreview(true)}
              className="px-3.5 py-2 bg-neo-card-darker hover:bg-[#1A1D29] text-slate-200 border-2 border-black font-mono text-xs font-bold brutal-shadow-sm transition-all flex items-center space-x-2"
            >
              <QrCode className="w-4 h-4 text-neo-yellow" />
              <span>SHOW ROOM QR CODE</span>
            </button>
            <div className="inline-flex items-center space-x-2 text-xs font-mono font-bold text-slate-400 bg-neo-card-darker px-3 py-2 border border-black">
              <span>ACTIVE KEY:</span>
              <span className="text-neo-yellow font-black">{roomKey}</span>
            </div>
          </div>
        </div>

        {/* Right Neo-Brutalist Auth Box */}
        <div className="w-full max-w-md bg-neo-cream text-black p-6 sm:p-7 border-4 border-black brutal-shadow-lg relative">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-11 h-11 bg-neo-yellow text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy">
              <Shield className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-heavy uppercase tracking-tight text-black">
                ENTER ARENA
              </h2>
              <p className="text-xs font-mono text-slate-700">
                {tab === 'guest' ? 'Attendee Fast Guest Join' : 'Host / Attendee Account Access'}
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-black border-2 border-black mb-4 font-mono text-xs">
            <button
              type="button"
              onClick={() => handleTabChange('guest')}
              className={`py-1.5 font-black uppercase transition-all ${
                tab === 'guest'
                  ? 'bg-neo-mint text-black border border-black brutal-shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Attendee Quick Guest Access"
            >
              GUEST
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('signin')}
              className={`py-1.5 font-black uppercase transition-all ${
                tab === 'signin'
                  ? 'bg-neo-yellow text-black border border-black brutal-shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              SIGN IN
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('signup')}
              className={`py-1.5 font-black uppercase transition-all ${
                tab === 'signup'
                  ? 'bg-neo-cyan text-black border border-black brutal-shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              REGISTER
            </button>
          </div>

          {/* Feedback Banners */}
          {errorMessage && (
            <div className="p-2.5 bg-neo-pink text-white border-2 border-black font-mono text-xs font-bold mb-3 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-2.5 bg-neo-mint text-black border-2 border-black font-mono text-xs font-bold mb-3 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0 stroke-3" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Guest Notice Banner */}
          {tab === 'guest' && (
            <div className="p-2 bg-[#E2F9F0] border-2 border-black font-mono text-[11px] font-bold text-slate-800 mb-3 flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 text-[#00A86B] shrink-0" />
              <span>Guest mode is exclusively for <strong>Attendees</strong>. Hosts must sign in.</span>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-3 font-mono">
            {/* ROOM KEY / PASSCODE FIELD */}
            <div className="p-3 bg-amber-50 border-2 border-black">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black uppercase flex items-center gap-1.5 text-black">
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    {role === 'host' && tab !== 'guest'
                      ? 'HOST ROOM KEY (AUTO-ASSIGNED):'
                      : 'ROOM KEY / PASSCODE TO JOIN:'}
                  </span>
                </label>
                {role === 'host' && tab !== 'guest' ? (
                  <button
                    type="button"
                    onClick={generateRandomRoomKey}
                    className="text-[10px] bg-black text-white hover:bg-neo-pink px-2 py-0.5 font-black uppercase flex items-center gap-1 border border-black transition-colors"
                    title="Shuffle unique room key"
                  >
                    <RefreshCw className="w-3 h-3" /> SHUFFLE KEY
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-500 font-bold uppercase">
                    REQUIRED
                  </span>
                )}
              </div>

              {role === 'host' && tab !== 'guest' ? (
                <div className="flex items-center bg-white border-2 border-black px-3 py-2">
                  <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <span className="text-base font-black tracking-widest text-black flex-1 select-all">
                    {roomKey}
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-neo-mint text-black border border-black">
                    UNIQUE KEY
                  </span>
                </div>
              ) : (
                <input
                  type="text"
                  value={roomKey}
                  onChange={(e) => setRoomKey(e.target.value.toUpperCase())}
                  placeholder="e.g. SKT-789 or ARCH-101"
                  className="w-full px-3 py-1.5 text-sm bg-white border-2 border-black text-black font-black tracking-wider focus:outline-none focus:bg-neo-yellow/20"
                  required
                />
              )}

              <p className="text-[10px] text-slate-600 font-bold mt-1.5">
                {role === 'host' && tab !== 'guest'
                  ? 'Auto-generated collision-free room code. Attendees will use this key to enter your live session.'
                  : 'Enter the Room Key provided by your Host or loaded from the QR code.'}
              </p>
            </div>

            {(tab === 'signup' || tab === 'guest') && (
              <div>
                <label className="text-xs font-black uppercase block mb-1">
                  {tab === 'guest' ? 'Guest Attendee Alias' : 'Your Display Name'}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={tab === 'guest' ? 'e.g. CodeNinja_42' : 'e.g. Elena Rostova'}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border-2 border-black text-black font-bold focus:outline-none focus:bg-neo-yellow/15"
                    required
                  />
                </div>
              </div>
            )}

            {tab !== 'guest' && (
              <>
                <div>
                  <label className="text-xs font-black uppercase block mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border-2 border-black text-black font-bold focus:outline-none focus:bg-neo-yellow/15"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black uppercase block mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border-2 border-black text-black font-bold focus:outline-none focus:bg-neo-yellow/15"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Role Selection (Only shown for Sign In & Register; Guest is locked to Attendee) */}
            {tab !== 'guest' ? (
              <div>
                <label className="text-xs font-black uppercase block mb-1">Select Arena Role:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('attendee')}
                    className={`py-1.5 text-xs font-black uppercase border-2 border-black transition-all flex items-center justify-center space-x-1 ${
                      role === 'attendee'
                        ? 'bg-neo-mint text-black brutal-shadow-sm'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>ATTENDEE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('host')}
                    className={`py-1.5 text-xs font-black uppercase border-2 border-black transition-all flex items-center justify-center space-x-1 ${
                      role === 'host'
                        ? 'bg-neo-yellow text-black brutal-shadow-sm'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>HOST / ADMIN</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2 bg-slate-100 border-2 border-black text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>ASSIGNED ROLE:</span>
                <span className="px-2 py-0.5 bg-neo-mint text-black font-black uppercase border border-black text-[10px]">
                  ATTENDEE
                </span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow active:translate-x-px active:translate-y-px active:shadow-none flex items-center justify-center space-x-2 transition-all ${
                  tab === 'signin'
                    ? 'bg-neo-yellow hover:bg-[#FFF04D]'
                    : tab === 'signup'
                    ? 'bg-neo-cyan hover:bg-[#33F3FF]'
                    : 'bg-neo-mint hover:bg-[#26F7A9]'
                }`}
              >
                <span>
                  {isLoading
                    ? 'CONNECTING TO ROOM...'
                    : tab === 'signin'
                    ? `LOG IN & JOIN [${roomKey.toUpperCase() || 'ROOM'}]`
                    : tab === 'signup'
                    ? `REGISTER & ENTER [${roomKey.toUpperCase() || 'ROOM'}]`
                    : `JOIN ROOM [${roomKey.toUpperCase() || 'ROOM'}] AS GUEST`}
                </span>
                <ArrowRight className="w-4 h-4 stroke-3" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* QR Code Quick Modal */}
      {showQRPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-neo-cream text-black w-full max-w-xs p-6 border-4 border-black brutal-shadow-lg relative text-center">
            <button
              onClick={() => setShowQRPreview(false)}
              className="absolute top-4 right-4 p-1 bg-black text-white hover:bg-neo-pink transition-colors border-2 border-black"
            >
              <X className="w-5 h-5 stroke-3" />
            </button>

            <div className="flex flex-col items-center mb-3">
              <div className="w-12 h-12 bg-neo-yellow text-black border-2 border-black brutal-shadow-sm flex items-center justify-center mb-2 -rotate-3">
                <QrCode className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-heavy uppercase tracking-tight text-black">
                SCAN TO ENTER
              </h3>
              <p className="text-xs font-mono text-slate-700">
                Scan with phone camera to auto-join
              </p>
            </div>

            <div className="p-3 bg-white border-4 border-black inline-block mx-auto mb-3 brutal-shadow-sm">
              <QRCodeSVG
                value={currentJoinUrl}
                size={160}
                bgColor="#FFFFFF"
                fgColor="#000000"
                level="Q"
                includeMargin={false}
              />
            </div>

            <div className="bg-neo-card-darker text-white p-2 border-2 border-black font-mono">
              <div className="text-[9px] font-extrabold text-neo-yellow uppercase mb-0.5">
                ROOM PASSCODE
              </div>
              <div className="text-xl font-black tracking-wider text-neo-cyan">
                {roomKey.toUpperCase() || 'SKT-789'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Retro Footer */}
      <footer className="h-10 border-t-2 border-black bg-[#11131B] px-4 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0">
        <div>SKETCHCAST // SUPABASE REALTIME V2.6</div>
        <div className="flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 text-neo-yellow" />
          <span>NEO-BRUTALISM RETRO ARENA</span>
        </div>
      </footer>
    </div>
  );
};
