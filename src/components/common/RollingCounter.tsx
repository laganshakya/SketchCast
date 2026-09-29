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

  const charItems = characters.map((char, index) => {
    const slot = characters.length - 1 - index;
    return {
      char,
      slotId: `digit-slot-${slot}`,
      isDigit: !isNaN(Number(char)),
    };
  });

  return (
    <span className={`inline-flex items-baseline overflow-hidden select-none font-mono ${className}`}>
      {charItems.map((item) => {
        if (!item.isDigit) {
          return (
            <span key={item.slotId} className="inline-block">
              {item.char}
            </span>
          );
        }

        return (
          <span
            key={item.slotId}
            className="relative inline-flex flex-col items-center justify-center overflow-hidden"
            style={{ minWidth: '0.62em' }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={`${item.slotId}-${item.char}`}
                initial={{ y: '70%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                exit={{ y: '-70%', opacity: 0 }}
                transition={{
                  duration: 0.22,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="inline-block"
              >
                {item.char}
              </motion.span>
            </AnimatePresence>
          </span>
        );
      })}
    </span>
  );
};
