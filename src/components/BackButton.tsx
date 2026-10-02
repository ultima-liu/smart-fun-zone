import type { ButtonHTMLAttributes } from 'react';
import { useStore } from '../store';
import { IconBack } from './icons';

/** 子页面统一返回入口：箭头与文字同时显示，保留各页面的返回目标。 */
export default function BackButton({ label, className = '', ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { label?: string }) {
  const lang = useStore((s) => s.lang);
  const text = label ?? props['aria-label'] ?? (lang === 'zh' ? '返回' : 'Back');
  return <button {...props} type="button" className={`page-back ${className}`} aria-label={props['aria-label'] ?? text}>
    <IconBack size={20} /><span>{text}</span>
  </button>;
}
