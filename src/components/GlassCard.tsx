import React from 'react';
import { motion } from 'motion/react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
  delay?: number;
  id?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  onClick,
  hoverEffect = true,
  delay = 0,
  id
}) => {
  const Component = onClick ? motion.button : motion.div;
  
  return (
    <Component
      id={id}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.23, 1, 0.32, 1] }}
      onClick={onClick}
      className={`
        glass-panel rounded-2xl p-5 text-left w-full
        ${hoverEffect && onClick ? 'cursor-pointer glass-panel-hover' : ''}
        ${hoverEffect && !onClick ? 'hover:border-white/10 transition-colors duration-300' : ''}
        ${className}
      `}
      style={onClick ? { display: 'block' } : undefined}
    >
      {children}
    </Component>
  );
};
