import React from 'react';
import { motion } from 'motion/react';

export interface SketchCastLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  variant?: 'tile' | 'glyph';
  animated?: boolean;
  collapsedOnMobile?: boolean;
  className?: string;
  onClick?: () => void;
}

const SIZE_MAP = {
  xs: {
    tile: 'w-6 h-6 sm:w-7 sm:h-7',
    iconSize: 26,
    text: 'text-xs sm:text-sm',
  },
  sm: {
    tile: 'w-8 h-8 sm:w-9 sm:h-9',
    iconSize: 34,
    text: 'text-xs min-[360px]:text-sm sm:text-base',
  },
  md: {
    tile: 'w-9 h-9 sm:w-10 sm:h-10',
    iconSize: 38,
    text: 'text-base sm:text-lg',
  },
  lg: {
    tile: 'w-11 h-11 sm:w-12 sm:h-12',
    iconSize: 46,
    text: 'text-xl sm:text-2xl',
  },
  xl: {
    tile: 'w-12 h-12 min-[420px]:w-14 min-[420px]:h-14 sm:w-16 sm:h-16',
    iconSize: 60,
    text: 'text-2xl min-[380px]:text-3xl sm:text-4xl lg:text-[2.6rem]',
  },
};

/**
 * SketchCast Mascot Logo — Sparky the Cyber-Chameleon Face
 */
export const ChameleonFaceGlyph: React.FC<{
  size?: number;
  className?: string;
}> = ({ size = 36, className = '' }) => {
  return (
    <img
      src="/chameleon-logo.png"
      alt="SketchCast Mascot"
      style={{ width: size, height: size }}
      className={`object-contain filter drop-shadow-[0_1px_6px_rgba(34,211,238,0.25)] select-none pointer-events-none ${className}`}
    />
  );
};

// Backwards-compatible alias for existing imports
export const SignalSparkGlyph = ChameleonFaceGlyph;

export const SketchCastLogo: React.FC<SketchCastLogoProps> = ({
  size = 'sm',
  showWordmark = true,
  variant: _variant = 'tile',
  animated = true,
  collapsedOnMobile = false,
  className = '',
  onClick,
}) => {
  const config = SIZE_MAP[size];

  const content = (
    <div
      onClick={onClick}
      className={`inline-flex items-center space-x-2 sm:space-x-3 select-none max-w-full ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Chameleon Mascot Face Icon Graphic (Border-free, crisp & enlarged) */}
      <div
        className={`${config.tile} flex items-center justify-center shrink-0 relative select-none`}
      >
        <img
          src="/chameleon-logo.png"
          alt="SketchCast Mascot"
          className="w-full h-full object-contain filter drop-shadow-[0_2px_12px_rgba(34,211,238,0.3)] select-none pointer-events-none transition-transform duration-200 group-hover:scale-105"
        />
      </div>

      {/* Wordmark */}
      {showWordmark && (
        <div className="flex items-center space-x-0.5 tracking-tight min-w-0">
          <span
            className={`${config.text} font-display font-extrabold tracking-tight text-white uppercase shrink-0 leading-none whitespace-nowrap`}
          >
            SKETCH
            {collapsedOnMobile ? (
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-300 hidden min-[360px]:inline ml-px">
                CAST
              </span>
            ) : (
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-300 ml-px">
                CAST
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );

  if (!animated) {
    return content;
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="inline-flex shrink-0"
    >
      {content}
    </motion.div>
  );
};
