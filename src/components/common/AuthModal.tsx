import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  LogOut,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Shield,
  Send,
  ArrowRight,
  Check,
  ArrowRightLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  signUpWithEmail,
  signInWithEmail,
  signOutUser,
  resendVerificationEmail,
  isEmailVerified
} from '../../lib/supabase';
import { refreshAuthExpiry } from '../../hooks/useRoomSession';
import type { User } from '@supabase/supabase-js';
import { playClickSound, playWhoosh } from '../../lib/soundFx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  userName: string;
  setUserName: (name: string) => void;
  roomCode?: string;
  onOpenChangeRoom?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userName,
  setUserName,
  roomCode,
  onOpenChangeRoom,
}) => {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(userName);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Email verification states
  const [verificationSentEmail, setVerificationSentEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(userName);
      setErrorMessage(null);
      setSuccessMessage(null);
      setVerificationSentEmail(null);
      setResendStatus(null);
    }
  }, [isOpen, userName]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleResend = async (targetEmail: string) => {
    if (resendCooldown > 0 || !targetEmail) return;
    setResendStatus('Sending verification email...');
    try {
      const { error } = await resendVerificationEmail(targetEmail);
      if (error) {
        setResendStatus(`Failed: ${error.message}`);
      } else {
        setResendStatus(`Verification link sent to ${targetEmail}!`);
        setResendCooldown(60);
      }
    } catch {
      setResendStatus('Failed to send verification email.');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setResendStatus(null);

    try {
      if (tab === 'signin') {
        const { user, session, error } = await signInWithEmail(email, password);
        if (error) {
          const errMsg = error.message.toLowerCase();
          if (errMsg.includes('email not confirmed') || errMsg.includes('not verified')) {
            setVerificationSentEmail(email);
            setErrorMessage('Your email is not verified yet. Please check your inbox.');
          } else {
            setErrorMessage(error.message);
          }
        } else if (user) {
          if (!isEmailVerified(user) && !session) {
            await signOutUser();
            setVerificationSentEmail(email);
            setErrorMessage('Your email is not verified yet. Please check your inbox.');
          } else {
            const name = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Attendee';
            setUserName(name);
            refreshAuthExpiry();
            setSuccessMessage(`Welcome back, ${name}!`);
            setTimeout(onClose, 1000);
          }
        }
      } else if (tab === 'signup') {
        const name = displayName.trim() || userName || 'Attendee';
        const { user, session, error } = await signUpWithEmail(email, password, name);
        if (error) {
          setErrorMessage(error.message);
        } else if (user) {
          if (!isEmailVerified(user) && !session) {
            setVerificationSentEmail(email);
            setResendCooldown(60);
          } else {
            setUserName(name);
            refreshAuthExpiry();
            setSuccessMessage('Account registered & verified successfully!');
            setTimeout(onClose, 1000);
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOutUser();
    setIsLoading(false);
    setSuccessMessage('Signed out successfully.');
    setTimeout(onClose, 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm font-sans"
        >
          <motion.div
            initial={{ scale: 0.9, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 15, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="bg-neo-cream text-black w-full max-w-md p-4 sm:p-6 border-4 border-black brutal-shadow-lg relative font-sans max-h-[90vh] overflow-y-auto"
          >
            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1 sm:p-1.5 bg-black text-white hover:bg-neo-pink transition-colors border-2 border-black cursor-pointer z-10"
              title="Close modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-3" />
            </motion.button>

            {/* Modal Header */}
            <div className="flex items-start space-x-2.5 sm:space-x-3 mb-3.5 sm:mb-4 pr-8 sm:pr-10">
              <div className="w-9 h-9 sm:w-11 sm:h-11 bg-neo-yellow text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy shrink-0 -rotate-2">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-heavy uppercase tracking-tight text-black leading-tight">
                  {currentUser ? 'ACCOUNT & SESSION' : tab === 'signin' ? 'AUTHENTICATION & LOGIN' : 'CREATE ACCOUNT'}
                </h3>
                <p className="text-[11px] sm:text-xs font-mono text-slate-700 mt-0.5">
                  {currentUser ? 'Manage verified attendee profile' : 'Verified Attendee & Host Access'}
                </p>
              </div>
            </div>

            {currentUser ? (
              /* Signed In Profile View */
              <div className="space-y-3.5 font-mono">
                <div className="p-3 bg-white border-2 border-black space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 stroke-3" />
                    <span>AUTHENTICATED ACCOUNT</span>
                  </div>

                  <div className="text-xs text-slate-700 space-y-1">
                    <div>
                      <span className="text-slate-500 font-bold">Email:</span>{' '}
                      <strong className="text-black">{currentUser.email}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold">Display Name:</span>{' '}
                      <strong className="text-black">{userName}</strong>
                    </div>
                  </div>
                </div>

                {/* Arena Room Switcher in Settings */}
                {onOpenChangeRoom && (
                  <div className="p-3 bg-white border-2 border-black space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600 font-mono">CURRENT ARENA ROOM:</span>
                      <span className="font-extrabold text-black font-mono bg-neo-yellow px-1.5 py-0.5 border border-black text-xs">
                        {roomCode || 'SKT-789'}
                      </span>
                    </div>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        playClickSound();
                        onClose();
                        onOpenChangeRoom();
                      }}
                      className="w-full py-2 bg-neo-yellow hover:bg-[#FFF04D] text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer transition-all"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>CHANGE / SWITCH ARENA ROOM</span>
                    </motion.button>
                  </div>
                )}

                <div className="flex flex-col-reverse xs:flex-row justify-end gap-2 pt-1">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      playClickSound();
                      onClose();
                    }}
                    className="w-full xs:w-auto px-4 py-2 text-xs font-mono font-bold uppercase border-2 border-black bg-slate-200 hover:bg-slate-300 text-black cursor-pointer text-center"
                  >
                    CLOSE
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleSignOut}
                    disabled={isLoading}
                    className="w-full xs:w-auto px-4 py-2 bg-neo-pink hover:bg-[#FF4782] text-white text-xs font-mono font-black uppercase border-2 border-black brutal-shadow flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>SIGN OUT</span>
                  </motion.button>
                </div>
              </div>
            ) : verificationSentEmail ? (
              /* Email Verification Pending View */
              <div className="space-y-3.5 font-mono">
                <div className="p-3.5 bg-amber-50 border-2 border-black space-y-2.5">
                  <div className="flex items-center space-x-2 text-amber-900 font-heavy text-xs">
                    <Mail className="w-4 h-4 text-amber-600 animate-bounce shrink-0" />
                    <span>CONFIRMATION EMAIL SENT</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-snug">
                    Please check your inbox (or Spam) at:
                    <br />
                    <strong className="text-black bg-neo-yellow px-1 border border-black break-all text-xs font-black">
                      {verificationSentEmail}
                    </strong>
                  </p>
                  <div className="text-[10px] text-slate-600 bg-white p-2 border border-black space-y-0.5">
                    <div>1. Click the verification link in your email.</div>
                    <div>2. Return here and Sign In to start.</div>
                  </div>
                </div>

                {resendStatus && (
                  <div className={`p-2 text-xs font-bold border-2 border-black flex items-center space-x-1.5 ${
                    resendStatus.includes('sent') ? 'bg-neo-mint text-black' : 'bg-neo-pink text-white'
                  }`}>
                    {resendStatus.includes('sent') ? <Check className="w-3.5 h-3.5 stroke-3 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{resendStatus}</span>
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleResend(verificationSentEmail)}
                    disabled={resendCooldown > 0}
                    className="w-full py-2 bg-neo-cyan hover:bg-[#33F3FF] disabled:bg-slate-200 disabled:text-slate-500 text-black text-xs font-black uppercase border-2 border-black brutal-shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {resendCooldown > 0
                        ? `RESEND IN ${resendCooldown}S`
                        : 'RESEND VERIFICATION EMAIL'}
                    </span>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      playClickSound();
                      setVerificationSentEmail(null);
                      setTab('signin');
                    }}
                    className="w-full py-2 bg-neo-yellow hover:bg-[#FFF04D] text-black text-xs font-black uppercase border-2 border-black brutal-shadow flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <span>I'VE VERIFIED ➔ SIGN IN</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-3" />
                  </motion.button>
                </div>
              </div>
            ) : (
              <div>
                {/* Tab Switcher */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-black border-2 border-black mb-3.5 sm:mb-4 font-mono text-xs">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      playClickSound();
                      setTab('signin');
                      setErrorMessage(null);
                    }}
                    className={`py-1.5 font-black uppercase transition-all cursor-pointer text-center ${
                      tab === 'signin'
                        ? 'bg-neo-yellow text-black border border-black brutal-shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    SIGN IN
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      playClickSound();
                      setTab('signup');
                      setErrorMessage(null);
                    }}
                    className={`py-1.5 font-black uppercase transition-all cursor-pointer text-center ${
                      tab === 'signup'
                        ? 'bg-neo-cyan text-black border border-black brutal-shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    CREATE ACCOUNT
                  </motion.button>
                </div>

                {/* Quick Room Switcher */}
                {onOpenChangeRoom && (
                  <div className="mb-3.5 p-2 bg-[#1A1E2B] border-2 border-black flex items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className="text-slate-400 font-bold text-[10px]">CURRENT ROOM:</span>
                      <span className="font-extrabold text-neo-yellow text-xs">{roomCode || 'SKT-789'}</span>
                    </div>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        playClickSound();
                        onClose();
                        onOpenChangeRoom();
                      }}
                      className="px-2.5 py-1 bg-neo-yellow hover:bg-[#FFF04D] text-black text-[10px] font-black uppercase border border-black brutal-shadow-sm flex items-center space-x-1 cursor-pointer transition-all"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      <span>SWITCH ROOM</span>
                    </motion.button>
                  </div>
                )}

                {/* Error / Success Feedback */}
                {errorMessage && (
                  <div className="p-2.5 bg-neo-pink text-white border-2 border-black font-mono text-xs font-bold mb-3 flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div>{errorMessage}</div>
                      {errorMessage.toLowerCase().includes('not verified') && email && (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleResend(email)}
                          className="mt-1 px-2 py-0.5 bg-white text-black text-[10px] font-black uppercase border border-black hover:bg-neo-yellow cursor-pointer"
                        >
                          Resend Verification Link
                        </motion.button>
                      )}
                    </div>
                  </div>
                )}
                {successMessage && (
                  <div className="p-2.5 bg-neo-mint text-black border-2 border-black font-mono text-xs font-bold mb-3 flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 shrink-0 stroke-3" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleAuth} className="space-y-3 font-mono">
                  {tab === 'signup' && (
                    <div>
                      <label className="text-xs font-black uppercase block mb-1">
                        Display Name / Alias
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="e.g. Alex Chen"
                          className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs bg-white border-2 border-black text-black font-bold focus:outline-none focus:bg-neo-yellow/15"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-black uppercase block mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs bg-white border-2 border-black text-black font-bold focus:outline-none focus:bg-neo-yellow/15"
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
                        className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs bg-white border-2 border-black text-black font-bold focus:outline-none focus:bg-neo-yellow/15"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col-reverse xs:flex-row justify-end gap-2 pt-1.5 sm:pt-2">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        playClickSound();
                        onClose();
                      }}
                      className="w-full xs:w-auto px-4 py-2 text-xs font-mono font-bold uppercase border-2 border-black bg-slate-200 hover:bg-slate-300 text-black cursor-pointer text-center"
                    >
                      CANCEL
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => playWhoosh()}
                      disabled={isLoading}
                      className={`w-full xs:w-auto px-5 py-2 text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow flex items-center justify-center space-x-1.5 cursor-pointer ${
                        tab === 'signin'
                          ? 'bg-neo-yellow hover:bg-[#FFF04D]'
                          : 'bg-neo-cyan hover:bg-[#33F3FF]'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{isLoading ? 'AUTHENTICATING...' : tab === 'signin' ? 'LOG IN' : 'REGISTER & VERIFY'}</span>
                    </motion.button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
