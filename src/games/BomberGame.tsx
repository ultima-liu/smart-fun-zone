import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../store';
import Modal from '../components/Modal';
import { BomberAudio, preloadBomberAudio, type BomberTrack } from './bomberAudio';
import { bomberSpriteUrl, loadBomberSprites } from './bomberSprites';
import { advanceBomber, bomberXY, BOMBER_STAGES, BOMBER_ENEMIES, BOMBER_POWERS, BOMBER_LEVELS, continueBomberRun, retryBomberStage, triggerBomberRemote, createBomberState, moveBomberPlayer, nextBomberStage, plantBomberBomb, type BomberDifficulty, type BomberDirection, type BomberPower, type BomberEnemyKind, type BomberState } from './bomberEngine';
import { BOMBER_HEIGHT, BOMBER_WIDTH, bomberCameraX, bomberTimeLeft, drawBomberBoard } from './bomberArtwork';
import './bomber.css';

export interface BomberOutcome { result: 'win' | 'lose'; difficulty: BomberDifficulty; durationSec: number; score: number; stage: number }
interface Props { lang: 'zh' | 'en'; playerName: string; headerAction?: ReactNode; onComplete: (outcome: BomberOutcome) => void }
type Phase = 'retry' | 'ready' | 'playing' | 'paused' | 'clear' | 'over';
const KEYS: Record<string, BomberDirection> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
const ISLANDS = { zh: ['薄荷草岛', '晚霞花园', '星光城堡'], en: ['Mint Meadow', 'Sunset Garden', 'Starlight Castle'] };
const clock = (seconds: number) => Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');

function bomberMusicTrack(state: BomberState): BomberTrack { return state.bonus ? 'bonus' : state.invincibleUntil > state.elapsed || state.stagePowerCollected && state.firePass ? 'invincible' : state.stagePowerCollected ? 'upgrade' : 'main'; }

export default function BomberGame({ lang, playerName, headerAction, onComplete }: Props) {
  const zh = lang === 'zh';
  const sound = useStore(s => s.sound);
  const soundRef = useRef(sound); soundRef.current = sound;
  const [audio] = useState(() => new BomberAudio());
  const [difficulty, setDifficulty] = useState<BomberDifficulty>('normal');
  const [initialState] = useState(() => createBomberState('normal', Math.floor(Math.random() * 4294967296)));
  const game = useRef(initialState);
  const [phase, setPhase] = useState<Phase>('ready');
  const phaseRef = useRef<Phase>('ready');
  const heldKeys = useRef<string[]>([]), touchDirection = useRef<BomberDirection | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const finished = useRef(false), completion = useRef(onComplete);
  completion.current = onComplete;
  const [best, setBest] = useState(0);
  const snapshot = () => {
    const state = game.current;
    return { score: state.score, lives: state.lives, stage: state.stage, time: bomberTimeLeft(state), enemies: state.enemies.length, bombs: state.bombs.length, range: state.range, capacity: state.capacity, speed: state.speed, bonus: state.bonus, overtime: state.overtime, remote: state.remote, wallPass: state.wallPass, bombPass: state.bombPass, firePass: state.firePass, invincible: Math.max(0, Math.ceil((state.invincibleUntil - state.elapsed) / 1000)), result: state.status, camera: bomberCameraX(bomberXY(state.player.at).x * 60 + 30), ...bomberXY(state.player.at) };
  };
  const [view, setView] = useState(snapshot);
  const clearInput = useCallback(() => { heldKeys.current = []; touchDirection.current = null; }, []);
  const transition = useCallback((next: Phase) => { phaseRef.current = next; setPhase(next); clearInput(); }, [clearInput]);
  const draw = useCallback(() => {
    const element = canvas.current, context = element?.getContext('2d');
    if (!element || !context) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    if (element.width !== BOMBER_WIDTH * ratio) { element.width = BOMBER_WIDTH * ratio; element.height = BOMBER_HEIGHT * ratio; }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawBomberBoard(context, game.current, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  const publish = useCallback(() => {
    const state = game.current;
    for (const event of state.events.splice(0)) {
      audio.effect(event, soundRef.current);
      if (event === 'hurt') audio.music('miss');
      if (event === 'clear') audio.music('clear');
      if (event === 'win') audio.music('ending');
      if (event === 'lose') audio.music('over');
    }
    if (state.status === 'playing' && phaseRef.current === 'playing') audio.music(bomberMusicTrack(game.current));
    setView(snapshot());
    if (state.status === 'retry') transition('retry');
    if (state.status === 'clear') transition('clear');
    if ((state.status === 'win' || state.status === 'lose') && !finished.current) {
      finished.current = true; transition('over'); setBest((previous) => Math.max(previous, state.score));
      completion.current({ result: state.status, difficulty: state.difficulty, durationSec: Math.max(1, Math.round(state.elapsed / 1000)), score: state.score, stage: state.stage });
    }
    draw();
  }, [audio, draw, transition]);
  const focusBoard = () => canvas.current?.focus({ preventScroll: true });
  const reset = (level = difficulty) => {
    audio.stop(); game.current = createBomberState(level, Math.floor(Math.random() * 4294967296)); finished.current = false;
    setDifficulty(level); transition('ready'); publish();
  };
  const start = () => { transition('playing'); audio.music(bomberMusicTrack(game.current), true); focusBoard(); };
  const pause = useCallback(() => {
    if (phaseRef.current === 'playing') { transition('paused'); audio.stop(); audio.effect('pause', soundRef.current); }
    else if (phaseRef.current === 'paused') { transition('playing'); audio.music(bomberMusicTrack(game.current)); audio.effect('pause', soundRef.current); canvas.current?.focus({ preventScroll: true }); }
  }, [audio, transition]);
  const plant = useCallback(() => { if (phaseRef.current !== 'playing') return; plantBomberBomb(game.current); publish(); }, [publish]);
  const detonate = useCallback(() => { if (phaseRef.current !== 'playing') return; if (triggerBomberRemote(game.current)) { advanceBomber(game.current, 1); publish(); } }, [publish]);
  const move = useCallback((direction: BomberDirection) => { if (phaseRef.current !== 'playing') return; moveBomberPlayer(game.current, direction); publish(); }, [publish]);

  useEffect(() => {
    draw();
    if (phase !== 'playing') return;
    let frame = 0, previous = performance.now(), lastUpdate = previous;
    const tick = (now: number) => {
      if (phaseRef.current !== 'playing') return;
      const delta = Math.min(100, Math.max(0, now - previous)); previous = now;
      const lastKey = heldKeys.current[heldKeys.current.length - 1];
      advanceBomber(game.current, delta, touchDirection.current ?? KEYS[lastKey] ?? null);
      if (now - lastUpdate > 80 || game.current.events.length || game.current.status !== 'playing') { publish(); lastUpdate = now; }
      else draw();
      if (phaseRef.current === 'playing') frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, draw, publish]);

  useEffect(() => {
    const keyup = (event: KeyboardEvent) => { heldKeys.current = heldKeys.current.filter((key) => key !== event.key && key !== event.key.toLowerCase()); };
    const blur = () => { clearInput(); audio.stop(); if (phaseRef.current === 'playing') transition('paused'); };
    const visibility = () => { if (document.hidden) blur(); };
    window.addEventListener('keyup', keyup); window.addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('keyup', keyup); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility); clearInput(); };
  }, [audio, clearInput, transition]);
  const musicActive = phase === 'ready' || phase === 'playing';
  useEffect(() => {
    preloadBomberAudio(); const stopSprites = loadBomberSprites(draw);
    return () => { stopSprites(); audio.dispose(); };
  }, [audio, draw]);
  useEffect(() => { if (!sound) audio.muteEffects(); }, [audio, sound]);
  useEffect(() => {
    if (phase === 'paused') { audio.stop(); return; }
    if (!musicActive) return;
    const startMusic = () => { if (!document.hidden) audio.music(phaseRef.current === 'ready' ? 'title' : bomberMusicTrack(game.current)); };
    const visibility = () => { if (!document.hidden) startMusic(); };
    startMusic(); window.addEventListener('focus', startMusic); document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('focus', startMusic); document.removeEventListener('visibilitychange', visibility); };
  }, [audio, phase, musicActive]);

  const chapter = view.stage <= 15 ? 0 : view.stage <= 30 ? 1 : 2;
  const activePowers = (['remote', 'wallPass', 'bombPass', 'firePass'] as const).filter((power) => view[power]);
  const status = phase === 'retry' ? (zh ? '重试本关：火力、容量与速度保留，特殊能力失去' : 'Retry this stage. Keep fire, bombs and speed; lose special abilities.') : phase === 'ready' ? (zh ? '经典闯关就绪：一颗炸弹、一格火力，逐关成长' : 'Start small: one bomb, one tile of fire. Grow stage by stage.') : phase === 'paused' ? (zh ? '已暂停，炸弹也在休息' : 'Paused — even the bombs are resting') : phase === 'clear' ? (zh ? '本关完成！' : 'Stage complete!') : phase === 'over' ? (zh ? '本次探险结束' : 'Adventure ended') : view.bonus ? (zh ? '奖励关：限时尽情炸怪，不会受伤！' : 'Bonus: blast creatures before the timer ends. You cannot be hurt!') : view.overtime ? (zh ? '时间耗尽！旋风追兵出动，尽快清敌进门' : 'Time is up! Spinners arrive. Clear them and reach the exit!') : view.enemies ? (zh ? '还剩 ' + view.enemies + ' 只小怪 · 炸开砖墙寻找出口' : view.enemies + ' creatures left · search the bricks for an exit') : (zh ? '怪物已清空！找到砖墙下的出口，别再炸到门' : 'All creatures cleared! Uncover the exit. Keep blasts away from it.');
  const overlayTitle = phase === 'ready' ? (zh ? playerName + '，出发吧！' : 'Ready, ' + playerName + '?') : phase === 'paused' ? (zh ? '小岛等你回来' : 'The island can wait') : phase === 'retry' ? (zh ? '小心爆风，再试一回' : 'Mind the flames. Try again.') : phase === 'clear' ? (zh ? (view.bonus ? '奖励挑战完成！' : '第 ' + view.stage + ' 关完成！') : (view.bonus ? 'Bonus complete!' : 'Stage ' + view.stage + ' complete!')) : view.result === 'win' ? (zh ? '50 关，全部突破！' : 'All 50 stages cleared!') : (zh ? '生命用完了，可以续关' : 'Out of lives. You can continue.');
  const overlayBody = phase === 'ready' ? (zh ? '炸砖找道具，消灭所有怪物，再找到出口。\n横向探索迷宫，逐关积累能力。' : 'Find the upgrade, defeat every creature, uncover the exit.\nExplore a scrolling maze and build your abilities.') : phase === 'paused' ? (zh ? '计时、怪物与炸弹引线都已暂停。' : 'The timer, creatures and bomb fuses are paused.') : phase === 'retry' ? (zh ? '剩余 ' + view.lives + ' 条生命。本关地图重新开始。\n火力、炸弹容量与疾跑靴保留。' : view.lives + ' lives left. Restart this maze.\nKeep fire, bomb capacity and speed.') : phase === 'clear' ? (zh ? '得分 ' + view.score + ' · 装备带到下一关' : 'Score ' + view.score + ' · keep your upgrades') : (zh ? '到达第 ' + view.stage + ' 关 · 获得 ' + view.score + ' 分' : 'Reached stage ' + view.stage + ' · scored ' + view.score);
  const nextLabel = phase === 'ready' ? (zh ? '开始探险' : 'Start adventure') : phase === 'paused' ? (zh ? '继续探险' : 'Continue adventure') : phase === 'retry' ? (zh ? '重试本关' : 'Retry stage') : phase === 'clear' ? (!view.bonus && view.stage % 5 === 0 ? (zh ? '进入奖励关' : 'Enter bonus stage') : (zh ? '前往下一关' : 'Next stage')) : view.result === 'lose' ? (zh ? '续关探险' : 'Continue this stage') : (zh ? '再探险一次' : 'Explore again');
  return <section className="bm-game" aria-labelledby="bm-title" onPointerDownCapture={() => { if (musicActive) { audio.unlock(); audio.music(phaseRef.current === 'ready' ? 'title' : bomberMusicTrack(game.current)); } }} onKeyDown={(event) => {
    if (musicActive) { audio.unlock(); audio.music(phaseRef.current === 'ready' ? 'title' : bomberMusicTrack(game.current)); }
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key, direction = KEYS[key];
    if (key === 'p' || key === 'Escape') { event.preventDefault(); if (!event.repeat) pause(); return; }
    if (phaseRef.current !== 'playing') return;
    if (direction) { event.preventDefault(); if (!heldKeys.current.includes(key)) { heldKeys.current.push(key); move(direction); } }
    if ((key === 'x' || key === 'b') && event.target === canvas.current) { event.preventDefault(); if (!event.repeat) detonate(); }
    if ((key === ' ' || key === 'Enter' || key === 'z') && event.target === canvas.current) { event.preventDefault(); if (!event.repeat) plant(); }
  }}>
    <header className="bm-heading">{headerAction}<div><span>STAR ISLE · {zh ? '经典爆破冒险' : 'CLASSIC BOMBER ADVENTURE'}</span><h2 id="bm-title">{zh ? '星岛炸弹人' : 'Star Isle Bomber'}</h2><p>{zh ? '炸开砖墙，找出暗门。带着越来越强的装备一路闯关。' : 'Break the bricks, find the hidden exit. Grow stronger with every stage.'}</p></div><div className="bm-badge" aria-label={zh ? '本次访问最高分 ' + best : 'Session best ' + best}><span>✦</span><small>{zh ? '本次最高' : 'SESSION BEST'}</small><b>{best.toLocaleString()}</b></div></header>
    <div className="bm-toolbar"><div role="group" aria-label={zh ? '炸弹人难度' : 'Bomber difficulty'}>{(Object.keys(BOMBER_LEVELS) as BomberDifficulty[]).map((level) => <button key={level} aria-pressed={level === difficulty} disabled={phase !== 'ready' && phase !== 'over'} onClick={() => reset(level)}>{BOMBER_LEVELS[level][lang]}</button>)}</div><span>{zh ? '50 关 · 每五关奖励挑战' : '50 STAGES · BONUS EVERY FIVE'}</span><button className="bm-pause" disabled={phase !== 'playing' && phase !== 'paused'} onClick={pause}>{phase === 'paused' ? (zh ? '继续' : 'Resume') : (zh ? '暂停' : 'Pause')}</button></div>
    <div className="bm-layout"><div className="bm-play">
      <div className="bm-hud"><div><small>{zh ? '探险得分' : 'SCORE'}</small><b data-testid="bm-score">{view.score.toLocaleString()}</b></div><div><small>{zh ? '剩余生命' : 'LIVES'}</small><b className="bm-hearts" data-testid="bm-lives" aria-label={zh ? '剩余 ' + view.lives + ' 条生命' : view.lives + ' lives left'}>{view.lives > 5 ? '♥ × ' + view.lives : '♥'.repeat(view.lives)}<i>{'♡'.repeat(Math.max(0, BOMBER_LEVELS[difficulty].lives - view.lives))}</i></b></div><div><small>{zh ? '关卡' : 'STAGE'}</small><b>{String(view.stage).padStart(2, '0')}<em> / {BOMBER_STAGES}</em></b></div><div className={view.time < 30 ? 'bm-urgent' : ''}><small>{zh ? (view.overtime ? '追击危机' : '剩余时间') : (view.overtime ? 'DANGER' : 'TIME LEFT')}</small><b data-testid="bm-time">{clock(view.time)}</b></div></div>
      <div className="bm-island-label"><span><i />{view.bonus ? (zh ? '奖励关 · 安全爆破' : 'BONUS · SAFE BLASTING') : ISLANDS[lang][chapter]}</span><small>{zh ? '方向移动 · Z 放弹 · X 引爆' : 'ARROWS MOVE · Z PLANTS · X DETONATES'}</small></div>
      <div className="bm-stage"><canvas ref={canvas} tabIndex={0} role="img" aria-label={zh ? '炸弹人横向卷轴迷宫，31 列 13 行，角色位于第 ' + (view.x + 1) + ' 列第 ' + (view.y + 1) + ' 行；方向键移动，空格放弹，X 遥控引爆' : 'Scrolling maze, 31 by 13. Hero column ' + (view.x + 1) + ', row ' + (view.y + 1) + '. Arrow keys move, Space plants, X detonates.'} data-player-x={view.x} data-player-y={view.y} data-camera-x={view.camera} data-bombs={view.bombs} data-enemies={view.enemies} data-stage={view.stage} data-phase={phase} data-bonus={view.bonus} data-remote={view.remote} />
        {phase !== 'playing' && <Modal controls={<div className="bm-modal-back">{headerAction}</div>}><div className="bm-overlay-card bm-screen-card"><div className="bm-orbit" aria-hidden="true">{phase === 'over' ? (view.result === 'win' ? '★' : '♡') : phase === 'clear' ? '✦' : phase === 'paused' ? 'Ⅱ' : phase === 'retry' ? '♡' : <img src={bomberSpriteUrl('hero-down-idle')} alt="" />}</div><span className="bm-eyebrow">{phase === 'ready' ? 'READY, LITTLE EXPLORER?' : phase === 'clear' ? 'STAGE COMPLETE' : phase === 'paused' ? 'TAKE A LITTLE BREAK' : phase === 'retry' ? 'ONE MORE TRY' : 'YOUR ISLAND STORY'}</span><h3>{overlayTitle}</h3><p>{overlayBody}</p>
          {phase === 'ready' && <div className="bm-ready-keys"><span>↑ ↓ ← → / WASD</span><span>{zh ? 'Z / 空格 · 放弹' : 'Z / SPACE · BOMB'}</span></div>}
          <button className="bm-primary" onClick={() => { if (phase === 'ready') start(); else if (phase === 'paused') pause(); else if (phase === 'retry') { retryBomberStage(game.current); publish(); start(); } else if (phase === 'clear') { nextBomberStage(game.current); publish(); start(); } else if (view.result === 'lose') { continueBomberRun(game.current); finished.current = false; publish(); start(); } else reset(); }}>{nextLabel}<span aria-hidden="true">→</span></button>
          {(phase === 'paused' || phase === 'over' && view.result === 'lose') && <button className="bm-text-button" onClick={() => reset()}>{zh ? '从第 1 关重新开始' : 'Restart from stage 1'}</button>}
        </div></Modal>}
      </div>

      <div className="bm-controls"><div className="bm-dpad" role="group" aria-label={zh ? '移动方向盘' : 'Direction pad'}><span className="bm-dpad-center" aria-hidden="true">✦</span>{(['up', 'left', 'down', 'right'] as BomberDirection[]).map((direction) => <button key={direction} className={'bm-direction ' + direction} disabled={phase !== 'playing'} aria-label={{ up: zh ? '向上移动' : 'Move up', left: zh ? '向左移动' : 'Move left', down: zh ? '向下移动' : 'Move down', right: zh ? '向右移动' : 'Move right' }[direction]} onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); touchDirection.current = direction; move(direction); }} onPointerUp={() => { if (touchDirection.current === direction) touchDirection.current = null; }} onPointerCancel={() => { touchDirection.current = null; }} onLostPointerCapture={() => { if (touchDirection.current === direction) touchDirection.current = null; }} onClick={(event) => { if (event.detail === 0) move(direction); }}>{ { up: '↑', left: '←', down: '↓', right: '→' }[direction]}</button>)}</div><div className="bm-bomb-control"><button className="bm-bomb-button" disabled={phase !== 'playing' || view.bombs >= view.capacity} onPointerDown={(event) => { event.preventDefault(); plant(); focusBoard(); }} onClick={(event) => { if (event.detail === 0) plant(); }}><span aria-hidden="true">✹</span><b>{zh ? 'A · 放炸弹' : 'A · Plant bomb'}</b><small>{view.bombs} / {view.capacity}</small></button><button className="bm-remote-button" disabled={phase !== 'playing' || !view.remote || !view.bombs} onClick={() => { detonate(); focusBoard(); }}>{zh ? 'B · 遥控引爆' : 'B · Detonate'}<small>{view.remote ? 'X / B' : (zh ? '第 3 关解锁' : 'Find in stage 3')}</small></button><p>{zh ? '一格火力起步，别让爆风碰到已露出的门' : 'Start with one tile of fire. Protect the exposed exit.'}</p></div></div>
      <p className="bm-status" role="status">{status}</p>
    </div><aside className="bm-guide"><div className="bm-guide-title"><span>CLASSIC FIELD NOTES</span><h3>{zh ? '经典闯关手册' : 'Classic field guide'}</h3><p>{zh ? '炸砖、清敌、找门。越闯越强。' : 'Break bricks. Clear creatures. Find the exit.'}</p></div><div className="bm-route" aria-label={zh ? '三岛五十关进度' : 'Three islands, fifty stages'}>{ISLANDS[lang].map((island, index) => <div key={island} className={index === chapter ? 'current' : index < chapter ? 'done' : ''}><i>{index < chapter ? '✓' : ([1, 16, 31][index])}</i><span>{island}<small>{[1, 16, 31][index]}–{[15, 30, 50][index]}</small></span></div>)}</div>
      <div className="bm-equipment"><h4>{zh ? '随身装备' : 'YOUR EQUIPMENT'}</h4><dl><div><dt>{zh ? '爆风距离' : 'Blast range'}</dt><dd>{view.range} {zh ? '格' : 'tiles'}</dd></div><div><dt>{zh ? '炸弹容量' : 'Bomb capacity'}</dt><dd>{view.capacity}</dd></div><div><dt>{zh ? '移动速度' : 'Move speed'}</dt><dd>×{(180 / view.speed).toFixed(1)}</dd></div><div><dt>{zh ? '本关隐藏道具' : 'Hidden upgrade'}</dt><dd>{game.current.stagePowerCollected ? (zh ? '已获得' : 'Collected') : (zh ? '未获得' : 'Not found')}</dd></div></dl><div className="bm-active-powers">{activePowers.map((power) => <span key={power}><img src={bomberSpriteUrl(power)} alt="" />{BOMBER_POWERS[power][lang]}</span>)}{view.invincible > 0 && <span>{zh ? '无敌 ' : 'Invincible '}{view.invincible}s</span>}</div></div>
      <div className="bm-tip"><b>{view.remote ? '◎' : '2.67'}<small>{view.remote ? 'REMOTE' : 'SEC'}</small></b><p>{zh ? '十字爆风遇石墙或第一块软砖停止。每关只有一件隐藏道具；露出的门和道具被炸会放出援兵。' : 'Cross-shaped flames stop at walls or the first brick. Blasting an exposed exit or upgrade releases reinforcements.'}</p></div>
      <details className="bm-manual"><summary>{zh ? '八种经典能力' : 'Eight classic upgrades'}</summary><div className="bm-power-guide">{(Object.keys(BOMBER_POWERS) as BomberPower[]).map((power) => { const item = BOMBER_POWERS[power]; return <div key={power}><i className="bm-item-icon" style={{ background: item.color + '25' }}><img src={bomberSpriteUrl(power)} alt="" /></i><span><b>{item[lang]}</b><small>{zh ? item.descZh : item.descEn}</small></span></div>; })}</div></details>
      <details className="bm-manual"><summary>{zh ? '当前怪物图鉴' : 'Current creature guide'}</summary><div className="bm-enemy-guide">{Object.entries(BOMBER_ENEMIES).filter(([kind]) => game.current.enemies.some((monster) => monster.kind === kind)).map(([kind, spec]) => <div key={kind}><i className="bm-creature-icon"><img src={bomberSpriteUrl(kind as BomberEnemyKind)} alt="" /></i><span><b>{spec[lang]} · {spec.points}</b><small>{zh ? (spec.wallPass ? '穿砖 · ' : '') + (spec.chase ? '追踪' : '巡逻') + (spec.alert ? ' · 躲弹' : '') : (spec.wallPass ? 'Brick pass · ' : '') + (spec.chase ? 'Chases' : 'Patrols') + (spec.alert ? ' · Dodges' : '')}</small></span></div>)}</div></details>
      <p className="bm-guide-footer">{zh ? 'Z / 空格放弹 · X / B 遥控引爆\nP / Esc 暂停 · 切后台自动暂停\n死亡重试本关，基础升级保留' : 'Z / Space plants · X / B detonates\nP / Esc pauses · auto-pause in background\nRetry a stage and keep basic upgrades'}</p>
    </aside></div>
  </section>;
}
