import { useEffect, useRef, useState } from 'react';
import { WORLD_APPEARANCES, type WorldAppearance } from './appearances';
import './appearance-picker.css';
type Props = {
  appearance: WorldAppearance;
  lang: 'zh' | 'en';
  onSelect: (value: WorldAppearance) => void;
  disabled: boolean;
};
export default function WorldAppearancePicker({ appearance, lang, onSelect, disabled }: Props) {
  const panel = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const selected = WORLD_APPEARANCES.find((item) => item.id === appearance)!;
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !panel.current?.contains(event.target) && panel.current)
        panel.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && panel.current) {
        panel.current.open = false;
        panel.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return (
    <details
      className="world-appearance"
      ref={panel}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary
        aria-label={`${lang === 'zh' ? '星球外观' : 'World appearance'}：${selected.name[lang]}`}
      >
        <span className={`appearance-mini appearance-${appearance}`} aria-hidden="true" />
        <span>
          {lang === 'zh' ? '星球外观' : 'World'} <b>{selected.name[lang]}</b>
        </span>
        <i aria-hidden="true">⌄</i>
      </summary>
      <fieldset>
        <legend>{lang === 'zh' ? '选择你的卷星' : 'Choose your world'}</legend>
        <div className="appearance-choices">
          {WORLD_APPEARANCES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === appearance}
              disabled={disabled}
              onClick={() => onSelect(item.id)}
            >
              <span className={`appearance-mini appearance-${item.id}`} aria-hidden="true" />
              <span>
                <b>{item.name[lang]}</b>
                <small>{item.detail[lang]}</small>
              </span>
              {item.id === appearance && <i aria-hidden="true">✓</i>}
            </button>
          ))}
        </div>
        <p role="status">{selected.detail[lang]}</p>
        <button
          className="appearance-done"
          onClick={() => {
            if (panel.current) panel.current.open = false;
            panel.current?.querySelector('summary')?.focus();
          }}
        >
          {lang === 'zh' ? '完成选择' : 'Done'}
        </button>
      </fieldset>
    </details>
  );
}
