import { useState } from 'react';
import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';
import { playSfx } from '../speech';
import { useStore } from '../store';
import { IconBack, IconSpeakerOff, IconSpeakerOn } from './icons';

interface KidButtonProps {
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  color?: 'coral' | 'sky' | 'green' | 'yellow' | 'purple' | 'white' | 'mint';
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

export function KidButton({
  children,
  onClick,
  color = 'coral',
  disabled,
  className = '',
  style,
  ariaLabel,
}: KidButtonProps) {
  return (
    <button
      className={`kid-btn ${color} ${className}`}
      disabled={disabled}
      style={style}
      aria-label={ariaLabel}
      onClick={(e) => {
        if (!disabled) playSfx('tap');
        onClick?.(e);
      }}
    >
      <span className="kid-btn-shine" aria-hidden="true" />
      <span className="kid-btn-content">{children}</span>
    </button>
  );
}

export function Stars({ count, size = 34 }: { count: number; size?: number }) {
  return (
    <div className="stars" style={{ fontSize: size }}>
      {[0, 1, 2].map((i) => (
        <svg
          key={i}
          className={`star-svg ${i < count ? 'on' : 'off'}`}
          viewBox="0 0 24 24"
          width={size * 0.9}
          height={size * 0.9}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`starGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFE082" />
              <stop offset="100%" stopColor="#FFB300" />
            </linearGradient>
          </defs>
          <path
            fill={i < count ? `url(#starGrad-${i})` : '#E6E0F0'}
            stroke={i < count ? '#E6A700' : '#CFC7E2'}
            strokeWidth="1.2"
            strokeLinejoin="round"
            d="M12 2.6l2.8 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.5 6.3 20.4l1.1-6.4L2.7 9.4l6.5-.9z"
          />
        </svg>
      ))}
    </div>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-fill" style={{ width: `${pct}%` }}>
        <span className="progress-shimmer" aria-hidden="true" />
      </div>
    </div>
  );
}

export function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      className={`toggle ${on ? 'on' : ''}`}
      onClick={() => {
        playSfx('tap');
        onClick();
      }}
      role="switch"
      aria-checked={on}
      aria-label={label}
    >
      <span className="toggle-knob" />
    </button>
  );
}

export function Badge({
  children,
  color = 'yellow',
}: {
  children: ReactNode;
  color?: 'yellow' | 'green' | 'coral' | 'sky' | 'purple';
}) {
  return <span className={`badge ${color}`}>{children}</span>;
}

function buildBurstStars(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    dx: (Math.random() - 0.5) * 240,
    dy: -(40 + Math.random() * 180),
    delay: Math.random() * 0.12,
    size: 18 + Math.random() * 18,
    emoji: ['⭐', '✨', '🌟'][i % 3],
  }));
}

/** 答题正确时的星星爆裂特效（固定定位在点击位置） */
export function StarBurst({ x, y, count = 10 }: { x: number; y: number; count?: number }) {
  const [stars] = useState(() => buildBurstStars(count));
  return (
    <div className="star-burst" style={{ left: x, top: y }} aria-hidden="true">
      {stars.map((s, i) => (
        <span
          key={i}
          className="burst-star"
          style={
            {
              '--dx': `${s.dx}px`,
              '--dy': `${s.dy}px`,
              animationDelay: `${s.delay}s`,
              fontSize: s.size,
            } as CSSProperties
          }
        >
          {s.emoji}
        </span>
      ))}
    </div>
  );
}

function buildConfettiItems(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    emoji: ['🎉', '⭐', '✨', '🌈', '🎊', '💖', '🦖'][i % 7],
    dur: 2.4 + Math.random() * 1.6,
    size: 20 + Math.random() * 20,
  }));
}

export function Confetti({ show, count = 30 }: { show: boolean; count?: number }) {
  const [items] = useState(() => buildConfettiItems(count));
  if (!show) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {items.map((c, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${c.left}%`,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.dur}s`,
            fontSize: c.size,
          }}
        >
          {c.emoji}
        </span>
      ))}
    </div>
  );
}

export function TopBar({
  title,
  onBack,
  right,
}: {
  title?: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const sound = useStore((s) => s.sound);
  const toggleSound = useStore((s) => s.toggleSound);
  return (
    <header className="topbar">
      {onBack ? (
        <KidButton color="white" className="icon-btn" onClick={onBack} ariaLabel="back">
          <IconBack size={22} />
        </KidButton>
      ) : (
        <span />
      )}
      <div className="topbar-title">{title}</div>
      <div className="topbar-right">
        {right ?? (
          <KidButton color="white" className="icon-btn" onClick={toggleSound} ariaLabel="sound">
            {sound ? <IconSpeakerOn size={22} /> : <IconSpeakerOff size={22} />}
          </KidButton>
        )}
      </div>
    </header>
  );
}
