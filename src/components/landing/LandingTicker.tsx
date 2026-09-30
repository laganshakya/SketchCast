import React from 'react';

export const LandingTicker: React.FC = () => {
  const tickerItems = [
    'STUDIO NOMA ARCHITECTURE',
    'SUB-40MS REALTIME SYNCHRONIZATION',
    'ZERO-INSTALL GUEST ACCESS',
    'LIVE AUDIENCE CONSENSUS & SENTIMENT',
    'COMPETITIVE SPEED-MULTIPLIED QUIZZES',
    'MESH AI QUESTION CLUSTERING & TRIAGE',
    'LIGHTWEIGHT SUB-40MS EDGE MESH',
    'AUTOMATED AI SESSION SUMMARY REPORTS',
    'ZERO-FRICTION QR SCAN ENTRY',
    'TACTILE PAPER-GRAIN DESIGN',
  ];

  return (
    <div className="w-full bg-ink text-paper py-2.5 overflow-hidden border-b border-hairline font-mono text-[11px] font-bold tracking-widest uppercase select-none relative z-30 shadow-xs">
      <div className="marquee">
        <div className="marquee-track flex items-center">
          {tickerItems.concat(tickerItems).map((item, index) => (
            <span key={index} className="inline-flex items-center space-x-2 shrink-0">
              <span className="text-lime text-xs">✦</span>
              <span>{item}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
