import React from 'react';
import { motion } from 'motion/react';
import { Zap, Smartphone, Trophy, Cpu } from 'lucide-react';

export const LandingTelemetry: React.FC = () => {
  const metrics = [
    {
      icon: <Zap className="w-5 h-5 text-orange" />,
      value: '< 40ms',
      label: 'REALTIME SYNC',
      description: 'Sub-second WebSocket broadcast across thousands of live devices.',
      accent: 'border-orange/30 bg-orange/5',
    },
    {
      icon: <Smartphone className="w-5 h-5 text-lime" />,
      value: '0 App Installs',
      label: 'FRICTIONLESS WEB',
      description: 'Camera QR code scan or direct URL. Instant 1-tap participation.',
      accent: 'border-lime/30 bg-lime/5',
    },
    {
      icon: <Cpu className="w-5 h-5 text-sky" />,
      value: 'Mesh Fallback',
      label: 'EDGE REDUNDANCY',
      description: 'Dual-pipeline resilience keeps live polling uninterrupted anywhere.',
      accent: 'border-sky/30 bg-sky/5',
    },
    {
      icon: <Trophy className="w-5 h-5 text-orange" />,
      value: 'Cryptographic',
      label: 'VERIFIED PASSES',
      description: 'Instant tamper-proof Masterclass certificates with QR validation.',
      accent: 'border-orange/30 bg-orange/5',
    },
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {metrics.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className={`p-5 sm:p-6 rounded-3xl border border-hairline hover:border-ink/30 transition-all ${item.accent} backdrop-blur-xs shadow-card group`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-2xl bg-paper border border-hairline shrink-0 shadow-subtle group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <span className="font-mono text-[10px] font-bold text-muted uppercase tracking-widest">
                METRIC #{idx + 1}
              </span>
            </div>

            <div className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-1">
              {item.value}
            </div>

            <div className="font-mono text-xs font-bold text-orange uppercase tracking-wider mb-2">
              {item.label}
            </div>

            <p className="text-xs text-muted leading-relaxed font-sans">
              {item.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
