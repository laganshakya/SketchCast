import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface RollingCounterProps {
  value: number | string;
  className?: string;
  padZero?: boolean;
}

export const RollingCounter: React.FC<RollingCounterProps> = ({
  value,
  className = '',
  padZero = false,
}) => {
  const displayValue = padZero && typeof value === 'number' && value < 10 && value >= 0
    ? `0${value}`
    : String(value);

  const characters = displayValue.split('');

  return (
    <span className={`inline-flex items-baseline overflow-hidden select-none font-mono ${className}`}>
      {characters.map((char, index) => {
        const isDigit = !isNaN(Number(char));

        if (!isDigit) {
          return (
            <span key={`char-${index}`} className="inline-block">
              {char}
            </span>
          );
        }

        return (
          <span
            key={`pos-${index}`}
            className="relative inline-flex flex-col items-center justify-center overflow-hidden"
            style={{ minWidth: '0.62em' }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={`${index}-${char}`}
                initial={{ y: '70%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                exit={{ y: '-70%', opacity: 0 }}
                transition={{
                  duration: 0.22,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="inline-block"
              >
                {char}
              </motion.span>
            </AnimatePresence>
          </span>
        );
      })}
    </span>
  );
};
