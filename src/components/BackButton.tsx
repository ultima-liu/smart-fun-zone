import type { ButtonHTMLAttributes } from 'react';
import { useStore } from '../store';
import { IconBack } from './icons';

/** 子页面统一使用圆形箭头返回入口，目的地用于无障碍名称与悬停说明。 */
export default function BackButton({ label, className = '', ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { label?: string }) {
  const lang = useStore((s) => s.lang);
  const text = label ?? props['aria-label'] ?? (lang === 'zh' ? '返回' : 'Back');
  const destination = props['aria-label'] ?? text;
  return <button {...props} type="button" className={`page-back page-back--icon-only ${className}`} aria-label={destination} title={props.title ?? destination}>
    <IconBack size={20} />
  </button>;
}
