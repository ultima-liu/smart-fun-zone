import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { playSfx, speak, startThrust, stopThrust } from '../speech';

interface P { x: number; y: number }

interface ArrivalFlightProps {
  onDone: () => void;
  /** 进入总部大楼后播放的欢迎语（已按语言生成好的文案） */
  greet?: string;
  lang?: 'zh' | 'en';
}

/** 到达首页的入场动画：左上舱门开 → 小飞船飞出 → 飞向卷星总部大楼 → 抵达闪光消失并播欢迎语 */
export default function ArrivalFlight({ onDone, greet, lang }: ArrivalFlightProps) {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<P | null>(null);
  const [target, setTarget] = useState<P | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [welcomeOn, setWelcomeOn] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    // 等页面入场动画完全稳定后再测量，避免目标偏移
    const wait = window.setTimeout(() => {
      const doorEl = document.querySelector('.af-door');
      const spotEl =
        document.querySelector('.juan-hero-big .js-spot.hq .js-spot-art') ??
        document.querySelector('.juan-hero-big .js-spot.hq');
      const dr = doorEl?.getBoundingClientRect();
      const sr = spotEl?.getBoundingClientRect();
      if (dr) setStart({ x: dr.left + dr.width / 2, y: dr.top + dr.height / 2 });
      if (sr) setTarget({ x: sr.left + sr.width / 2, y: sr.top + sr.height / 2 - 10 });
      setReady(true);
      // 开门（上下开，1.1s）——音效与开合同步
      timers.current.push(window.setTimeout(() => { playSfx('door'); setOpen(true); }, 90));
      // 飞船起飞（is-fly 动画 delay 1.15s → 实际约 1.24s 出发）→ 启动持续引擎声
      timers.current.push(window.setTimeout(() => startThrust(), 1100));
      // 进入总部大楼：闪光、抵达音效与欢迎词同步出现
      timers.current.push(window.setTimeout(() => {
        stopThrust();
        playSfx('enter');
        if (greet) speak(greet, lang ?? 'zh');
        setFlashOn(true);
        setWelcomeOn(true);
      }, 4300));
      timers.current.push(window.setTimeout(() => onDone(), 6600));
    }, 1000);
    timers.current.push(wait);
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      stopThrust();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className="af-layer" aria-hidden="true">
      {/* 左上角舱门（初始关闭，上下开启） */}
      <div className={`af-door${open ? ' is-open' : ''}`}>
        <i className="af-leaf af-leaf-t" />
        <i className="af-leaf af-leaf-b" />
        <span className="af-door-glow" />
      </div>

      {/* 小飞船：自门心飞出，机头转向目标，沿弧线飞向卷星总部大楼 */}
      {ready && start && target && (() => {
        const dx = target.x - start.x;
        const dy = target.y - start.y;
        const ang = (Math.atan2(dx, -dy) * 180) / Math.PI; // 机头朝上的飞船需转到的角度
        return (
          <span
            className={`af-ship${open ? ' is-fly' : ''}`}
            style={
              {
                left: start.x,
                top: start.y,
                '--dx': `${dx}px`,
                '--dy': `${dy}px`,
                '--ang': `${ang}deg`,
              } as React.CSSProperties
            }
          >
            <svg viewBox="0 0 26 40" width="34" height="52" className="af-ship-svg">
              <polygon points="10.5,28 13,38 15.5,28" fill="#F6C24B" />
              <polygon points="12,29 13,34.5 14,29" fill="#FFF3CE" />
              <polygon points="10,17 4,27 9.5,25" fill="#A99BF2" />
              <polygon points="16,17 22,27 16.5,25" fill="#A99BF2" />
              <path d="M13 2 L17 10 Q18.6 15 18.6 21 L18.6 27 A5.6 5.6 0 0 1 13 32.6 A5.6 5.6 0 0 1 7.4 27 L7.4 21 Q7.4 15 9 10 Z" fill="#DCD3FF" stroke="#7C6AF0" strokeWidth="1.6" />
              <circle cx="13" cy="17" r="3.4" fill="#9ED6F7" stroke="#6B62D6" strokeWidth="1.2" />
            </svg>
          </span>
        );
      })()}

      {/* 总部大楼处抵达闪光 */}
      {target && <span className={`af-flash${flashOn ? ' on' : ''}`} style={{ left: target.x, top: target.y }} />}

      {/* 欢迎词：抵达闪光后出现，给视觉与语音留出完整的识别时间 */}
      <div className={`af-welcome${welcomeOn ? ' on' : ''}`}>
        <span className="af-welcome-orbit" aria-hidden="true"><i /><i /><i /></span>
        <span className="af-welcome-kicker">WELCOME BACK · 卷星航站</span>
        <strong>{lang === 'en' ? 'Welcome home!' : '欢迎回家！'}</strong>
        {greet && <span className="af-welcome-greet">{greet}</span>}
        <span className="af-welcome-line" aria-hidden="true" />
      </div>
    </div>,
    document.body,
  );
}
