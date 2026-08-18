import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  glowColor?: 'cyan' | 'violet' | 'emerald' | 'none';
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hoverEffect = true,
  glowColor = 'none',
  onClick,
}) => {
  const glowClasses = {
    cyan: 'glow-cyan',
    violet: 'glow-violet',
    emerald: 'shadow-[0_0_20px_rgba(16,185,129,0.25)]',
    none: '',
  };

  return (
    <div
      onClick={onClick}
      className={`glass-panel rounded-2xl p-5 ${
        hoverEffect ? 'glass-panel-hover cursor-pointer' : ''
      } ${glowClasses[glowColor]} ${className}`}
    >
      {children}
    </div>
  );
};
