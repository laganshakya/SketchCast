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
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md font-sans"
        >
          <motion.div
            initial={{ scale: 0.95, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 12, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-[#101014] text-white w-[95vw] sm:max-w-md p-4 sm:p-6 rounded-2xl border border-white/[0.08] shadow-2xl relative font-sans max-h-[90dvh] overflow-y-auto"
          >
            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-800/40 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/[0.06] transition-colors cursor-pointer z-10"
              title="Close modal"
            >
              <X className="w-4 h-4 stroke-2" />
            </motion.button>

            {/* Modal Header */}
            <div className="flex items-start space-x-3 mb-5 pr-8">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-white leading-tight font-display">
                  {currentUser ? 'Account Session' : tab === 'signin' ? 'Sign In' : 'Create Account'}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {currentUser ? 'Manage attendee profile and session' : 'Verified Attendee & Host Access'}
                </p>
              </div>
            </div>

            {currentUser ? (
              /* Signed In Profile View */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#141418] border border-white/[0.08] space-y-2.5">
                  <div className="flex items-center space-x-2 text-emerald-400 font-medium text-xs">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Authenticated Account</span>
                  </div>

                  <div className="text-xs text-zinc-300 space-y-1">
                    <div>
                      <span className="text-zinc-500 font-medium">Email:</span>{' '}
                      <strong className="text-white font-mono">{currentUser.email}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-medium">Display Name:</span>{' '}
                      <strong className="text-white">{userName}</strong>
                    </div>
                  </div>
                </div>

                {/* Arena Room Switcher in Settings */}
                {onOpenChangeRoom && (
                  <div className="p-4 rounded-xl bg-[#141418] border border-white/[0.08] space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-zinc-400">Current Room:</span>
                      <span className="font-semibold text-blue-400 font-mono bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20 text-xs">
                        {roomCode || 'SKT-789'}
                      </span>
                    </div>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        playClickSound();
                        onClose();
                        onOpenChangeRoom();
                      }}
                      className="w-full py-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 text-white text-xs font-medium border border-white/[0.06] flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
                      <span>Switch Arena Room</span>
                    </motion.button>
                  </div>
                )}

                <div className="flex flex-col-reverse xs:flex-row justify-end gap-2 pt-2 border-t border-white/[0.08]">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      playClickSound();
                      onClose();
                    }}
                    className="w-full xs:w-auto px-4 py-2 rounded-xl text-xs font-medium border border-white/[0.06] bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer text-center"
                  >
                    Close
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSignOut}
                    disabled={isLoading}
                    className="w-full xs:w-auto px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-medium border border-red-500/30 flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </motion.button>
                </div>
              </div>
            ) : verificationSentEmail ? (
              /* Email Verification Pending View */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2.5">
                  <div className="flex items-center space-x-2 text-blue-400 font-medium text-xs">
                    <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Confirmation Email Sent</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-snug">
                    Please check your inbox (or Spam) at:
                    <br />
                    <strong className="text-white bg-[#0D0D10] px-2 py-0.5 rounded border border-white/[0.08] break-all text-xs font-mono inline-block mt-1">
                      {verificationSentEmail}
                    </strong>
                  </p>
                  <div className="text-[11px] text-zinc-400 bg-[#141418] p-2.5 rounded-lg border border-white/[0.06] space-y-1">
                    <div>1. Click the verification link in your email.</div>
                    <div>2. Return here and sign in to access the room.</div>
                  </div>
                </div>

                {resendStatus && (
                  <div className={`p-2.5 rounded-xl text-xs font-medium border flex items-center space-x-2 ${
                    resendStatus.includes('sent')
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/15 text-red-400 border-red-500/30'
                  }`}>
                    {resendStatus.includes('sent') ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{resendStatus}</span>
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleResend(verificationSentEmail)}
                    disabled={resendCooldown > 0}
                    className="w-full py-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 disabled:text-zinc-600 text-zinc-200 text-xs font-medium border border-white/[0.06] flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 text-blue-400" />
                    <span>
                      {resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : 'Resend Verification Email'}
                    </span>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      playClickSound();
                      setVerificationSentEmail(null);
                      setTab('signin');
                    }}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-md shadow-blue-500/20"
                  >
                    <span>I've Verified ➔ Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>
            ) : (
              <div>
                {/* Tab Switcher */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-[#141418] rounded-xl border border-white/[0.08] mb-4 text-xs font-medium">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      playClickSound();
                      setTab('signin');
                      setErrorMessage(null);
                    }}
                    className={`py-2 rounded-lg font-medium transition-all cursor-pointer text-center ${
                      tab === 'signin'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Sign In
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      playClickSound();
                      setTab('signup');
                      setErrorMessage(null);
                    }}
                    className={`py-2 rounded-lg font-medium transition-all cursor-pointer text-center ${
                      tab === 'signup'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Create Account
                  </motion.button>
                </div>

                {/* Quick Room Switcher */}
                {onOpenChangeRoom && (
                  <div className="mb-4 p-3 rounded-xl bg-[#141418] border border-white/[0.08] flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="text-zinc-400 font-medium">Current Room:</span>
                      <span className="font-semibold text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">{roomCode || 'SKT-789'}</span>
                    </div>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        playClickSound();
                        onClose();
                        onOpenChangeRoom();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 text-white text-xs font-medium border border-white/[0.06] flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <ArrowRightLeft className="w-3 h-3 text-blue-400" />
                      <span>Switch Room</span>
                    </motion.button>
                  </div>
                )}

                {/* Error / Success Feedback */}
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-500/15 text-red-300 border border-red-500/30 text-xs font-medium mb-3 flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <div className="flex-1">
                      <div>{errorMessage}</div>
                      {errorMessage.toLowerCase().includes('not verified') && email && (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleResend(email)}
                          className="mt-1 px-2.5 py-1 rounded-lg bg-zinc-800 text-white text-[11px] font-medium border border-white/[0.08] cursor-pointer"
                        >
                          Resend Verification Link
                        </motion.button>
                      )}
                    </div>
                  </div>
                )}
                {successMessage && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-medium mb-3 flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleAuth} className="space-y-3.5">
                  {tab === 'signup' && (
                    <div>
                      <label className="text-xs font-medium block mb-1 text-zinc-300">
                        Display Name / Alias
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="e.g. Alex Chen"
                          className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#0D0D10] border border-white/[0.08] rounded-xl text-white font-medium focus:outline-none focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium block mb-1 text-zinc-300">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#0D0D10] border border-white/[0.08] rounded-xl text-white font-medium focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium block mb-1 text-zinc-300">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#0D0D10] border border-white/[0.08] rounded-xl text-white font-medium focus:outline-none focus:border-blue-500"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col-reverse xs:flex-row justify-end gap-2 pt-2 border-t border-white/[0.08]">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        playClickSound();
                        onClose();
                      }}
                      className="w-full xs:w-auto px-4 py-2.5 text-xs font-medium border border-white/[0.06] bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl cursor-pointer text-center"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => playWhoosh()}
                      disabled={isLoading}
                      className="w-full xs:w-auto px-5 py-2.5 text-white text-xs font-medium rounded-xl border border-blue-500 bg-blue-600 hover:bg-blue-500 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-blue-500/20"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isLoading ? 'Authenticating...' : tab === 'signin' ? 'Log In' : 'Register & Verify'}</span>
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
