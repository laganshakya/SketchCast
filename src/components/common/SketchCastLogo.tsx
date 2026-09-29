import React from 'react';
import { motion } from 'motion/react';

export interface SketchCastLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  variant?: 'tile' | 'glyph' | 'noma';
  animated?: boolean;
  collapsedOnMobile?: boolean;
  className?: string;
  onClick?: () => void;
}

const SIZE_MAP = {
  xs: {
    mark: 'w-5 h-5',
    text: 'text-xs',
  },
  sm: {
    mark: 'w-6 h-6 sm:w-7 sm:h-7',
    text: 'text-xs min-[360px]:text-sm sm:text-base',
  },
  md: {
    mark: 'w-8 h-8 sm:w-9 sm:h-9',
    text: 'text-base sm:text-lg',
  },
  lg: {
    mark: 'w-10 h-10 sm:w-11 sm:h-11',
    text: 'text-xl sm:text-2xl',
  },
  xl: {
    mark: 'w-12 h-12 min-[420px]:w-14 min-[420px]:h-14',
    text: 'text-2xl min-[380px]:text-3xl sm:text-4xl lg:text-[2.6rem]',
  },
};

/**
 * Studio Noma Rotated Brand Mark
 */
export const NomaBrandMark: React.FC<{ size?: string; className?: string }> = ({
  size = 'w-7 h-7',
  className = '',
}) => {
  return (
    <div
      className={`${size} bg-orange rounded-[50%_50%_4px_50%] -rotate-45 shrink-0 shadow-sm transition-transform duration-300 group-hover:rotate-0 ${className}`}
    />
  );
};

export const ChameleonFaceGlyph: React.FC<{
  size?: number;
  className?: string;
}> = ({ size = 32, className = '' }) => {
  return (
    <img
      src="/favicon.svg"
      alt="SketchCast Logo"
      style={{ width: size, height: size }}
      className={`object-contain filter drop-shadow-[0_1px_4px_rgba(255,99,55,0.2)] select-none pointer-events-none ${className}`}
    />
  );
};

export const SignalSparkGlyph = ChameleonFaceGlyph;

export const SketchCastLogo: React.FC<SketchCastLogoProps> = ({
  size = 'sm',
  showWordmark = true,
  variant = 'noma',
  animated = true,
  collapsedOnMobile = false,
  className = '',
  onClick,
}) => {
  const config = SIZE_MAP[size];

  const content = (
    <div
      onClick={onClick}
      className={`group inline-flex items-center space-x-2 sm:space-x-2.5 select-none max-w-full ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Brand Mark */}
      {variant === 'glyph' ? (
        <ChameleonFaceGlyph />
      ) : (
        <NomaBrandMark size={config.mark} />
      )}

      {/* Wordmark */}
      {showWordmark && (
        <div className="flex items-center tracking-tight min-w-0 font-sans">
          <span className={`${config.text} font-extrabold tracking-tight text-ink uppercase shrink-0 leading-none whitespace-nowrap`}>
            SKETCH
            {collapsedOnMobile ? (
              <span className="text-orange hidden min-[360px]:inline ml-0.5">
                CAST
              </span>
            ) : (
              <span className="text-orange ml-0.5">
                CAST
              </span>
            )}
            <span className="font-mono text-[9px] text-muted ml-1 font-semibold lowercase align-top tracking-normal">
              ®
            </span>
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
