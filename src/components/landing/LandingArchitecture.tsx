import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Cpu,
  Wifi,
  Server,
  Smartphone,
  Laptop,
  CheckCircle2,
  Zap,
  Play,
} from 'lucide-react';
import { playPopSound } from '../../lib/soundFx';

export const LandingArchitecture: React.FC = () => {
  const [packetActive, setPacketActive] = useState(false);
  const [latencyMs, setLatencyMs] = useState(28);

  const simulatePacket = () => {
    playPopSound();
    setPacketActive(true);
    setLatencyMs(Math.floor(22 + Math.random() * 14));
    setTimeout(() => {
      setPacketActive(false);
    }, 1800);
  };

  return (
    <section id="architecture" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="bg-paper-card text-ink rounded-3xl border border-hairline-strong p-6 sm:p-10 lg:p-12 shadow-elevated relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-lime/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-orange/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 text-center max-w-3xl mx-auto mb-10 sm:mb-12 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-lime/30 border border-lime text-ink font-mono text-xs font-bold">
            <Cpu className="w-3.5 h-3.5 text-orange" />
            <span className="uppercase tracking-wider">SUB-40MS SYNCHRONIZATION</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-ink">
            Under the hood: Resilient Edge Mesh.
          </h2>

          <p className="text-sm sm:text-base font-sans text-muted leading-relaxed">
            Engineered with Supabase Realtime WebSockets multiplexing and zero-locking presence channels. Even on congested conference Wi-Fi networks, updates propagate to every attendee screen in under 40 milliseconds.
          </p>

          <div className="pt-2">
            <button
              onClick={simulatePacket}
              className="px-3.5 sm:px-4 py-2 rounded-full bg-paper hover:bg-paper-elevated border border-hairline text-ink font-mono text-[11px] sm:text-xs font-bold uppercase flex items-center space-x-2 mx-auto cursor-pointer shadow-subtle hover:border-orange transition-all max-w-full text-center"
            >
              <Play className="w-3.5 h-3.5 text-orange shrink-0" />
              <span className="hidden sm:inline">TEST SIMULATED </span><span>BROADCAST PACKET</span>
            </button>
          </div>
        </div>

        {/* Visualized Architecture Pipeline Flow */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pt-4">
          {/* Step 1: Presenter Node */}
          <div className="p-6 rounded-2xl bg-paper border border-hairline relative flex flex-col justify-between shadow-xs">
            {packetActive && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute -top-3 right-4 px-2 py-0.5 rounded-full bg-orange text-white font-mono text-[9px] font-bold uppercase animate-bounce"
              >
                EVENT DISPATCHED
              </motion.div>
            )}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-paper-card border border-hairline text-orange">
                  <Laptop className="w-6 h-6" />
                </div>
                <span className="font-mono text-xs text-muted font-bold">NODE 01</span>
              </div>
              <h4 className="font-serif text-lg font-bold text-ink mb-1">
                Presenter Cockpit
              </h4>
              <p className="text-xs text-muted font-sans leading-relaxed">
                Host triggers a quiz round, reveals answers, or highlights an attendee Q&A spotlight.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-hairline font-mono text-[10px] text-muted flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-orange" />
              <span>Channel: broadcast:room_events</span>
            </div>
          </div>

          {/* Step 2: Supabase Realtime Edge Hub */}
          <div className="p-6 rounded-2xl bg-paper border border-hairline relative flex flex-col justify-between shadow-xs">
            {packetActive && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.1, opacity: 1 }}
                className="absolute -top-3 right-4 px-2 py-0.5 rounded-full bg-lime text-ink font-mono text-[9px] font-bold uppercase animate-pulse"
              >
                RELAYED {latencyMs}MS
              </motion.div>
            )}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-paper-card border border-hairline text-lime">
                  <Server className="w-6 h-6" />
                </div>
                <span className="font-mono text-xs text-muted font-bold">NODE 02</span>
              </div>
              <h4 className="font-serif text-lg font-bold text-ink mb-1">
                Edge WebSocket Mesh
              </h4>
              <p className="text-xs text-muted font-sans leading-relaxed">
                Multi-tenant pub/sub channels fan out lightweight payloads globally without database serialization delay.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-hairline font-mono text-[10px] text-muted flex items-center gap-1.5">
              <Wifi className="w-3 h-3 text-lime" />
              <span>Verified Latency: ~{latencyMs}ms</span>
            </div>
          </div>

          {/* Step 3: Audience Client Devices */}
          <div className="p-6 rounded-2xl bg-paper border border-hairline relative flex flex-col justify-between shadow-xs">
            {packetActive && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.1, opacity: 1 }}
                className="absolute -top-3 right-4 px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[9px] font-bold uppercase"
              >
                100% DELIVERED
              </motion.div>
            )}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-paper-card border border-hairline text-sky">
                  <Smartphone className="w-6 h-6" />
                </div>
                <span className="font-mono text-xs text-muted font-bold">NODE 03</span>
              </div>
              <h4 className="font-serif text-lg font-bold text-ink mb-1">
                5,000+ Crowd Devices
              </h4>
              <p className="text-xs text-muted font-sans leading-relaxed">
                Hardware-accelerated DOM diffing and instant tactile haptics render voting results seamlessly.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-hairline font-mono text-[10px] text-muted flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-lime" />
              <span>Full Mesh Sync Guaranteed</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
