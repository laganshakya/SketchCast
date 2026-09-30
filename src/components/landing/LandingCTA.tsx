import React from 'react';
import { Zap, Crown, ArrowRight, Sparkles } from 'lucide-react';
import { playPopSound } from '../../lib/soundFx';

interface LandingCTAProps {
  onJoinClick: (mode?: 'guest' | 'signin' | 'signup') => void;
  roomCode: string;
}

export const LandingCTA: React.FC<LandingCTAProps> = ({ onJoinClick, roomCode }) => {

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="bg-ink text-paper rounded-3xl p-8 sm:p-12 lg:p-16 border border-hairline shadow-2xl relative overflow-hidden text-center">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-lime/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-lime/20 border border-lime/40 text-lime font-mono text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-lime" />
            <span>LAUNCH YOUR LIVE ARENA IN 1 CLICK</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-paper leading-tight">
            Turn your audience from silent spectators into active competitors.
          </h2>

          <p className="text-sm sm:text-base font-sans text-paper/70 leading-relaxed max-w-xl mx-auto">
            Zero friction, zero installs, sub-40ms real-time synchronization. Experience the modern standard for interactive technical presentations.
          </p>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 font-mono text-xs font-bold uppercase">
            <button
              onClick={() => {
                playPopSound();
                onJoinClick('guest');
              }}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl btn-noma-orange flex items-center justify-center space-x-2 cursor-pointer shadow-lg active:scale-95"
            >
              <Zap className="w-4 h-4" />
              <span>JOIN ARENA ROOM [{roomCode}]</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                playPopSound();
                onJoinClick('signin');
              }}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/15 text-paper border border-white/20 flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-95"
            >
              <Crown className="w-4 h-4 text-lime" />
              <span>PRESENTER & HOST LOGIN</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
