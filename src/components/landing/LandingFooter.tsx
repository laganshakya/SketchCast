import React from 'react';
import { SketchCastLogo } from '../common/SketchCastLogo';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="w-full bg-paper border-t border-hairline font-mono text-xs text-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <SketchCastLogo size="md" showWordmark={true} />
            <p className="text-[11px] text-muted max-w-sm font-sans pt-1">
              High-velocity interactive audience engagement for tech meetups, masterclasses, and conferences.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-paper-card border border-hairline text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-ink font-bold">ALL SYSTEMS OPERATIONAL</span>
            <span className="text-muted/40">•</span>
            <span>SUB-40MS MESH</span>
          </div>
        </div>

        <div className="pt-6 border-t border-hairline flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <div>
            © 2026 SKETCHCAST • STUDIO NOMA EDITION. ALL RIGHTS RESERVED.
          </div>
          <div className="flex items-center space-x-4">
            <a href="#features" className="hover:text-ink transition-colors">FEATURES</a>
            <a href="#demo" className="hover:text-ink transition-colors">LIVE DEMO</a>
            <a href="#cockpit" className="hover:text-ink transition-colors">PRESENTER</a>
            <a href="#architecture" className="hover:text-ink transition-colors">ARCHITECTURE</a>
            <a href="#faq" className="hover:text-ink transition-colors">FAQ</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
