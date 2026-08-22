import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, LogOut, CheckCircle, AlertCircle, Sparkles, Shield, Info } from 'lucide-react';
import {
  signUpWithEmail,
  signInWithEmail,
  signInAnonymously,
  signOutUser
} from '../../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  userName: string;
  setUserName: (name: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userName,
  setUserName,
}) => {
  const [tab, setTab] = useState<'signin' | 'signup' | 'anon'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(userName);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (tab === 'signin') {
        const { user, error } = await signInWithEmail(email, password);
        if (error) {
          setErrorMessage(error.message);
        } else if (user) {
          const name = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Attendee';
          setUserName(name);
          setSuccessMessage(`Welcome back, ${name}!`);
          setTimeout(onClose, 1200);
        }
      } else if (tab === 'signup') {
        const { user, error } = await signUpWithEmail(email, password, displayName || userName);
        if (error) {
          setErrorMessage(error.message);
        } else if (user) {
          setUserName(displayName || userName);
          setSuccessMessage('Account registered successfully!');
          setTimeout(onClose, 1200);
        }
      } else if (tab === 'anon') {
        const { user, error } = await signInAnonymously(displayName || userName);
        if (error) {
          setErrorMessage(error.message);
        } else if (user) {
          setUserName(displayName || userName);
          setSuccessMessage(`Joined as guest attendee: ${displayName || userName}!`);
          setTimeout(onClose, 1000);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-neo-cream text-black w-full max-w-md p-4 sm:p-6 border-4 border-black brutal-shadow-lg relative font-sans max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1 sm:p-1.5 bg-black text-white hover:bg-neo-pink transition-colors border-2 border-black cursor-pointer z-10"
          title="Close modal"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-3" />
        </button>

        {/* Header */}
        <div className="flex items-start space-x-2.5 sm:space-x-3 mb-3.5 sm:mb-4 pr-8 sm:pr-10">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-neo-yellow text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy shrink-0">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-heavy uppercase tracking-tight text-black leading-tight">
              SUPABASE AUTH & PROFILE
            </h3>
            <p className="text-[11px] sm:text-xs font-mono text-slate-700 mt-0.5">
              {currentUser ? 'Manage active session' : 'Sign in or join as guest attendee'}
            </p>
          </div>
        </div>

        {/* If already logged in */}
        {currentUser ? (
          <div className="space-y-3.5 sm:space-y-4 font-mono">
            <div className="p-3 sm:p-4 bg-[#F4EFE0] border-2 border-black space-y-2">
              <div className="flex items-center justify-between text-xs font-bold flex-wrap gap-1">
                <span className="text-slate-600">SESSION STATUS:</span>
                <span className="bg-neo-mint text-black px-2 py-0.5 border border-black uppercase text-[10px]">
                  AUTHENTICATED
                </span>
              </div>
              <div className="text-xs sm:text-sm font-black text-black break-all">
                {currentUser.email || 'Anonymous Guest Session'}
              </div>
              <div className="text-xs text-slate-700">
                Display Name: <span className="font-black text-black bg-neo-yellow px-1 border border-black">{userName}</span>
              </div>
            </div>

            <div className="flex flex-col-reverse xs:flex-row justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-full xs:w-auto px-4 py-2 text-xs font-mono font-bold uppercase border-2 border-black bg-slate-200 hover:bg-slate-300 text-black cursor-pointer text-center"
              >
                CLOSE
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isLoading}
                className="w-full xs:w-auto px-4 py-2 bg-neo-pink hover:bg-[#FF4782] text-white text-xs font-mono font-black uppercase border-2 border-black brutal-shadow active:translate-x-px active:translate-y-px active:shadow-none flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>SIGN OUT</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Tab Switcher */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-black border-2 border-black mb-3.5 sm:mb-4 font-mono text-xs">
              <button
                type="button"
                onClick={() => { setTab('signin'); setErrorMessage(null); }}
                className={`py-1.5 font-black uppercase transition-all cursor-pointer ${
                  tab === 'signin'
                    ? 'bg-neo-yellow text-black border border-black brutal-shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                SIGN IN
              </button>
              <button
                type="button"
                onClick={() => { setTab('signup'); setErrorMessage(null); }}
                className={`py-1.5 font-black uppercase transition-all cursor-pointer ${
                  tab === 'signup'
                    ? 'bg-neo-cyan text-black border border-black brutal-shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                SIGN UP
              </button>
              <button
                type="button"
                onClick={() => { setTab('anon'); setErrorMessage(null); }}
                className={`py-1.5 font-black uppercase transition-all cursor-pointer ${
                  tab === 'anon'
                    ? 'bg-neo-mint text-black border border-black brutal-shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Attendee Guest Only"
              >
                GUEST
              </button>
            </div>

            {/* Error / Success Feedback */}
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

            {tab === 'anon' && (
              <div className="p-2 bg-[#E2F9F0] border-2 border-black font-mono text-[10px] sm:text-[11px] font-bold text-slate-800 mb-3 flex items-center space-x-1.5">
                <Info className="w-3.5 h-3.5 text-[#00A86B] shrink-0" />
                <span>Guest auth is for <strong>Attendees only</strong>. Hosts require email login.</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuth} className="space-y-3 font-mono">
              {(tab === 'signup' || tab === 'anon') && (
                <div>
                  <label className="text-xs font-black uppercase block mb-1">
                    {tab === 'anon' ? 'Guest Attendee Alias' : 'Display Name / Alias'}
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

              {tab !== 'anon' && (
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
                </>
              )}

              <div className="flex flex-col-reverse xs:flex-row justify-end gap-2 pt-1.5 sm:pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full xs:w-auto px-4 py-2 text-xs font-mono font-bold uppercase border-2 border-black bg-slate-200 hover:bg-slate-300 text-black cursor-pointer text-center"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full xs:w-auto px-5 py-2 text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow active:translate-x-px active:translate-y-px active:shadow-none flex items-center justify-center space-x-1.5 cursor-pointer ${
                    tab === 'signin'
                      ? 'bg-neo-yellow hover:bg-[#FFF04D]'
                      : tab === 'signup'
                      ? 'bg-neo-cyan hover:bg-[#33F3FF]'
                      : 'bg-neo-mint hover:bg-[#26F7A9]'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isLoading ? 'AUTHENTICATING...' : tab === 'signin' ? 'LOG IN' : tab === 'signup' ? 'REGISTER' : 'JOIN AS GUEST'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
