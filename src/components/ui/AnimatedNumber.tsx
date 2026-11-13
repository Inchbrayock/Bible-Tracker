import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { SPRING_TACTILE } from '../../lib/motion';

interface AnimatedNumberProps {
  value: number | string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Animates live metric updates with an upward spring tick when `value` changes,
 * while skipping initial mount and always keeping a single semantic text node in the DOM.
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  className = '',
  children,
}) => {
  const mountedRef = useRef(false);
  const prevValueRef = useRef(value);
  const didChange = mountedRef.current && prevValueRef.current !== value;
  const direction =
    typeof value === 'number' && typeof prevValueRef.current === 'number'
      ? value >= prevValueRef.current
        ? 1
        : -1
      : 1;

  useEffect(() => {
    mountedRef.current = true;
    prevValueRef.current = value;
  }, [value]);

  return (
    <motion.span
      key={String(value)}
      initial={didChange ? { y: direction * 7, opacity: 0.25, scale: 1.05 } : false}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={SPRING_TACTILE}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.span>
  );
};
