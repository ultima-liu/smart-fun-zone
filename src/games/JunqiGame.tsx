import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { sfx } from '../sfx';
import { ARMY_CAMPS, ARMY_HQ, ARMY_PIECES, armyBattle, armyLegalMoves, armyPoint, armyRoadNeighbors, chooseArmyMove, createArmyState, isArmyRailEdge, playArmyMove, shuffleArmySide, swapArmyPlacement, type ArmyDifficulty, type ArmyMove, type ArmyState } from './junqiEngine';
import './junqi.css';

export interface JunqiOutcome { result: 'win' | 'lose' | 'draw'; durationSec: number; difficulty: ArmyDifficulty }
interface Props { lang: 'zh' | 'en'; playerName: string; headerAction?: ReactNode; onComplete: (outcome: JunqiOutcome) => void }
type Phase = 'setup' | 'playing' | 'paused' | 'over';
const LEVELS = { easy: { zh: '新兵', en: 'Cadet' }, normal: { zh: '棋手', en: 'Tactician' }, hard: { zh: '参谋', en: 'Strategist' } };
const fmtTime = (milliseconds: number) => `${Math.floor(milliseconds / 60_000)}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, '0')}`;
const LINKS = Array.from({ length: 60 }, (_, index) => armyRoadNeighbors(index).filter((to) => to > index).map((to) => ({ from: index, to, rail: isArmyRailEdge(index, to) }))).flat();

export default function JunqiGame({ lang, playerName, headerAction, onComplete }: Props) {
  const zh = lang === 'zh';
  const [difficulty, setDifficulty] = useState<ArmyDifficulty>('easy');
  const [state, setState] = useState<ArmyState>(() => createArmyState());
  const [phase, setPhase] = useState<Phase>('setup');
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<ArmyMove | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [confirmResign, setConfirmResign] = useState(false);
  const [wins, setWins] = useState(0);
  const activeMs = useRef(0), finished = useRef(false);
  const history = useRef<Array<{ state: ArmyState; log: string[] }>>([]);
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const targets = useMemo(() => selected !== null && phase === 'playing' ? armyLegalMoves(state.board, selected) : [], [selected, phase, state.board]);
  const canPlay = phase === 'playing' && state.turn === 'red' && !state.winner;
  const selectedPiece = selected === null ? null : state.board[selected];
  const musicActive = phase === 'setup' || phase === 'playing';
  const status = phase === 'setup' ? (zh ? '布阵中 · 红方先行' : 'DEPLOY · RED PLAYS FIRST') : phase === 'paused' ? (zh ? '棋桌已暂停' : 'MATCH PAUSED') : phase === 'over' ? (zh ? '对局结束' : 'MATCH ENDED') : state.turn === 'blue' ? (zh ? '电脑正在调兵…' : 'Computer is planning…') : (zh ? `${playerName}，轮到红方行棋` : `${playerName}, red to move`);

  const reset = () => {
    setState(createArmyState()); setPhase('setup'); setSelected(null); setHint(null); setElapsed(0); setLog([]); setMessage(''); setConfirmResign(false);
    activeMs.current = 0; finished.current = false; history.current = [];
  };
  const pause = useCallback(() => {
    if (phase === 'playing') { sfx.junqiBgmStop(); setPhase('paused'); }
    else if (phase === 'paused') { sfx.junqiBgmStart(); setPhase('playing'); }
    setConfirmResign(false);
  }, [phase]);
  const undo = () => {
    if ((phase !== 'playing' && phase !== 'paused') || !history.current.length || state.winner) return;
    const previous = history.current.pop()!;
    setState(previous.state); setLog(previous.log); setSelected(null); setHint(null); setMessage(zh ? '已回到你上一次行棋前。' : 'Back to before your last move.'); sfx.click();
  };
  const move = (action: ArmyMove) => {
    const next = playArmyMove(state, action);
    if (!next) return;
    const attacker = state.board[action.from]!, defender = state.board[action.to];
    const actor = attacker.side === 'red' ? (zh ? '红方' : 'Red') : (zh ? '蓝方' : 'Blue');
    const name = ARMY_PIECES[attacker.kind][lang];
    let description = `${actor} · ${name} ${zh ? '调动' : 'moves'}`;
    if (defender) {
      const battle = armyBattle(attacker.kind, defender.kind);
      description = `${actor} · ${name} ${battle === 'both' ? (zh ? '与对方同归于尽' : 'trades equally') : battle === 'attacker' ? (zh ? `取下${ARMY_PIECES[defender.kind].zh}` : `takes ${ARMY_PIECES[defender.kind].en}`) : (zh ? '进攻受阻，被取下' : 'is captured')}`;
      sfx.lkMatch(1);
    } else sfx.click();
    if (state.turn === 'red') { history.current.push({ state, log }); if (history.current.length > 80) history.current.shift(); }
    setState(next); setLog((previous) => [...previous, description].slice(-8)); setSelected(null); setHint(null); setMessage('');
  };

  useEffect(() => {
    if (!musicActive) return;
    const startMusic = () => { if (!document.hidden) sfx.junqiBgmStart(); };
    const stopMusic = () => sfx.junqiBgmStop();
    const onVisibility = () => { if (document.hidden) stopMusic(); else startMusic(); };
    startMusic();
    window.addEventListener('focus', startMusic);
    window.addEventListener('blur', stopMusic);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', startMusic);
      window.removeEventListener('blur', stopMusic);
      document.removeEventListener('visibilitychange', onVisibility);
      stopMusic();
    };
  }, [musicActive]);

  useEffect(() => {
    if (phase !== 'playing' || state.turn !== 'blue' || state.winner) return;
    const timer = window.setTimeout(() => {
      const action = chooseArmyMove(state, difficulty);
      if (action) move(action);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [state, phase, difficulty]);

  useEffect(() => {
    if (phase !== 'playing' || state.winner) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now(); activeMs.current += now - previous; previous = now; setElapsed(activeMs.current);
    }, 200);
    return () => window.clearInterval(timer);
  }, [phase, state.winner]);

  useEffect(() => {
    if (!state.winner || finished.current) return;
    finished.current = true;
    setPhase('over');
    const result = state.winner === 'draw' ? 'draw' : state.winner === 'red' ? 'win' : 'lose';
    if (result === 'win') { setWins((previous) => previous + 1); sfx.memWin(); }
    else sfx.memMiss();
    onComplete({ result, durationSec: Math.max(1, Math.round(activeMs.current / 1000)), difficulty });
  }, [state.winner, onComplete, difficulty]);

  useEffect(() => {
    const autoPause = () => { setPhase((previous) => previous === 'playing' ? 'paused' : previous); };
    const onVisibility = () => { if (document.hidden) autoPause(); };
    window.addEventListener('blur', autoPause); document.addEventListener('visibilitychange', onVisibility);
    return () => { window.removeEventListener('blur', autoPause); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  const selectCell = (index: number) => {
    const piece = state.board[index];
    if (phase === 'setup') {
      if (piece?.side !== 'red') { setMessage(zh ? '只能调整下方红色棋子，行营要留空。' : 'Arrange the red pieces below. Leave camps empty.'); return; }
      if (selected === null || selected === index) { setSelected(selected === index ? null : index); setMessage(''); return; }
      const board = swapArmyPlacement(state.board, selected, index);
      if (board) { setState(createArmyState(board)); setSelected(null); setMessage(zh ? '布阵已调整。' : 'Deployment updated.'); sfx.click(); }
      else setMessage(zh ? '这两枚不能交换：军旗留在大本营，地雷在后两排，炸弹不放第一排。' : 'Keep flags in HQ, mines in the last two rows and bombs behind the front row.');
      return;
    }
    if (!canPlay) return;
    if (selected !== null && targets.includes(index)) { move({ from: selected, to: index }); return; }
    if (piece?.side === 'red') {
      setSelected(selected === index ? null : index); setHint(null);
      setMessage(armyLegalMoves(state.board, index).length ? '' : (zh ? '这枚棋子暂时不能移动。地雷、军旗和大本营中的棋子固定不动。' : 'This piece cannot move. Mines, flags and pieces in HQ stay put.'));
      sfx.click();
    } else setMessage(zh ? '先选一枚红方棋子，再点发光落点。行营中的敌子不能攻击。' : 'Select a red piece, then a glowing destination. Enemy camps are protected.');
  };
  const showHint = () => {
    if (!canPlay) return;
    const action = chooseArmyMove(state, 'normal', () => .5);
    if (action) { setHint(action); setSelected(action.from); setMessage(zh ? '金色光圈是建议的一步，点落点即可行棋。' : 'The gold ring marks a suggested move. Tap it to play.'); sfx.memHint(); }
  };

  return <section className="jq-game" aria-labelledby="jq-title" onPointerDownCapture={() => { if (musicActive) sfx.junqiBgmStart(); }} onKeyDown={(event) => {
    if (musicActive) sfx.junqiBgmStart();
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.key.toLowerCase() === 'p' || event.key === 'Escape') { event.preventDefault(); pause(); }
    if (event.key.toLowerCase() === 'u') { event.preventDefault(); undo(); }
    if (event.key.toLowerCase() === 'h') { event.preventDefault(); showHint(); }
  }}>
    <header className="jq-heading">{headerAction}<div><span>STAR COMMAND · {zh ? '云端战略棋室' : 'TACTICAL TABLE'}</span><h2 id="jq-title">{zh ? '星阵军棋' : 'Starlight Army Chess'}</h2><p>{zh ? '一方沙盘，两支小队。看准路线，护住军旗。' : 'Two small armies. One brilliant plan. Protect your flag.'}</p></div><div className="jq-seal" aria-label={zh ? `本次访问获胜 ${wins} 局` : `${wins} wins this session`}><span aria-hidden="true">⚑</span><small>{zh ? `胜局 ${wins}` : `WINS ${wins}`}</small></div></header>
    <div className="jq-toolbar"><div role="group" aria-label={zh ? '军棋电脑难度' : 'Army computer level'}>{(Object.keys(LEVELS) as ArmyDifficulty[]).map((item) => <button key={item} type="button" aria-pressed={difficulty === item} disabled={phase !== 'setup' && phase !== 'over'} onClick={() => { setDifficulty(item); reset(); }}>{LEVELS[item][lang]}</button>)}</div><span>{zh ? '双人明棋 · 执红先行' : 'OPEN PIECES · RED FIRST'}</span></div>
    <div className="jq-layout">
      <div className="jq-table"><div className="jq-table-head"><span><i className="blue" />{zh ? '蓝方 · 电脑小队' : 'BLUE · COMPUTER'}</span><b>{zh ? '陆战棋沙盘' : 'FIELD TABLE'}</b><span><i className="red" />{zh ? '红方 · 我方小队' : 'RED · YOUR ARMY'}</span></div>
        <div className="jq-board-wrap"><div ref={boardRef} className={`jq-board ${phase === 'setup' ? 'deploying' : ''}`} role="grid" aria-label={zh ? '军棋棋盘，5 列 12 行' : 'Army chess board, 5 columns and 12 rows'}>
          <svg className="jq-map" viewBox="0 0 480 716" aria-hidden="true">
            <path d="M0 335H480V381H0Z" fill="#163b32" /><path d="M0 337H480M0 379H480" stroke="#b1a173" strokeWidth="1" strokeDasharray="3 5" />
            <path d="M103 365L112 349L121 365M132 365L143 344L155 365M334 365L344 347L354 365M365 365L376 342L388 365" stroke="#8d9c77" strokeWidth="1.5" />
            {LINKS.map(({ from, to, rail }) => { const a = armyPoint(from), b = armyPoint(to); return <g key={`${from}-${to}`}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rail ? '#b7a171' : '#68856a'} strokeWidth={rail ? 5 : 1.4} />{rail && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#285244" strokeWidth="3" strokeDasharray="3 5" />}</g>; })}
            <text x="240" y="363" textAnchor="middle" fill="#d1c494" fontSize="10" letterSpacing="3">{zh ? '星 山 界' : 'STAR PASS'}</text>
            {Array.from({ length: 60 }, (_, index) => { const point = armyPoint(index); return ARMY_CAMPS.has(index) ? <g key={index}><circle cx={point.x} cy={point.y} r="19" fill="#244f3d" stroke="#97b785" strokeWidth="2" /><circle cx={point.x} cy={point.y} r="14" fill="none" stroke="#73916a" strokeDasharray="2 3" /><text x={point.x} y={point.y + 4} fill="#aac493" textAnchor="middle" fontSize="10">{zh ? '营' : 'C'}</text></g> : ARMY_HQ.has(index) ? <g key={index}><rect x={point.x - 32} y={point.y - 18} width="64" height="36" rx="6" fill="#465438" stroke="#cdb475" strokeWidth="2" /></g> : <circle key={index} cx={point.x} cy={point.y} r="7" fill="#315943" stroke="#79926e" />; })}
          </svg>
          {state.board.map((piece, index) => {
            const point = armyPoint(index), legal = targets.includes(index);
            const label = `${zh ? `第 ${Math.floor(index / 5) + 1} 行第 ${index % 5 + 1} 列` : `Row ${Math.floor(index / 5) + 1}, column ${index % 5 + 1}`}，${piece ? `${piece.side === 'red' ? (zh ? '红方' : 'Red') : (zh ? '蓝方' : 'Blue')} ${ARMY_PIECES[piece.kind][lang]}` : ARMY_CAMPS.has(index) ? (zh ? '空行营' : 'Empty camp') : ARMY_HQ.has(index) ? (zh ? '空大本营' : 'Empty HQ') : (zh ? '空兵站' : 'Empty station')}${legal ? (zh ? '，可落子' : ', legal destination') : ''}`;
            return <button key={index} ref={(element) => { cellRefs.current[index] = element; }} role="gridcell" type="button" aria-label={label} aria-selected={selected === index} className={`jq-cell ${piece?.side ?? 'empty'} ${piece ? `kind-${piece.kind}` : ''} ${ARMY_CAMPS.has(index) ? 'camp' : ''} ${ARMY_HQ.has(index) ? 'hq' : ''} ${selected === index ? 'selected' : ''} ${legal ? 'target' : ''} ${hint?.to === index ? 'suggested' : ''} ${state.last?.from === index || state.last?.to === index ? 'last' : ''}`} style={{ left: `${point.x / 480 * 100}%`, top: `${point.y / 716 * 100}%` }} onClick={() => selectCell(index)} onKeyDown={(event) => {
              const directions: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -5, ArrowDown: 5 };
              const delta = directions[event.key];
              if (!delta) return;
              event.preventDefault();
              const next = index + delta;
              if (next >= 0 && next < 60 && (Math.abs(delta) !== 1 || Math.floor(next / 5) === Math.floor(index / 5))) cellRefs.current[next]?.focus();
            }}>{piece && <span className="jq-piece"><small aria-hidden="true">{piece.kind === 'flag' ? '⚑' : piece.kind === 'mine' ? '✹' : piece.kind === 'bomb' ? '✦' : '★'}</small><b>{zh ? ARMY_PIECES[piece.kind].zh : ARMY_PIECES[piece.kind].short}</b><em>{ARMY_PIECES[piece.kind].rank > 0 ? String(ARMY_PIECES[piece.kind].rank).padStart(2, '0') : piece.kind === 'flag' ? 'HQ' : piece.kind === 'mine' ? 'M' : 'B'}</em></span>}{legal && !piece && <i className="jq-dot" aria-hidden="true" />}</button>;
          })}
          {(phase === 'paused' || phase === 'over') && <div className="jq-overlay"><div><span>STAR COMMAND</span><b>{phase === 'paused' ? (confirmResign ? (zh ? '结束这盘对弈？' : 'End this match?') : (zh ? '棋桌休息一下' : 'A tactical break')) : state.winner === 'red' ? (zh ? '夺旗成功，指挥得漂亮！' : 'Victory, commander!') : state.winner === 'draw' ? (zh ? '势均力敌，握手和棋' : 'A well-matched draw') : (zh ? '再整队，下一盘加油！' : 'Regroup for the next match!')}</b><p>{phase === 'over' ? (zh ? `行棋 ${state.moves} 步 · 用时 ${fmtTime(elapsed)}` : `${state.moves} moves · ${fmtTime(elapsed)}`) : (zh ? '计时和电脑都已暂停。' : 'The clock and computer are paused.')}</p><button type="button" className="jq-primary" onClick={phase === 'over' ? reset : pause}>{phase === 'over' ? (zh ? '再来一局' : 'Play again') : (zh ? '继续对弈' : 'Resume match')}</button>{confirmResign && <button type="button" className="jq-concede" onClick={() => { setConfirmResign(false); setState((previous) => ({ ...previous, winner: 'blue' })); }}>{zh ? '确认认输' : 'Confirm surrender'}</button>}</div></div>}
        </div></div>
        <div className="jq-table-foot"><span>{zh ? '━ 铁路快行' : '━ RAILWAY'}</span><span>{zh ? '◉ 行营保护' : '◉ SAFE CAMP'}</span><span>{zh ? '▣ 大本营固定' : '▣ FIXED HQ'}</span></div>
      </div>
      <aside className="jq-console">
        <div className="jq-status"><span>COMMAND CENTER</span><h3>{zh ? '小队指挥台' : 'Command center'}</h3><p role="status">{status}</p><div><span>{zh ? '行棋' : 'Moves'}<b>{state.moves}</b></span><span>{zh ? '用时' : 'Time'}<b data-testid="junqi-time">{fmtTime(elapsed)}</b></span></div></div>
        {phase === 'setup' ? <div className="jq-deploy-note"><b>{zh ? '先布阵，再出发' : 'Deploy, then begin'}</b><p>{zh ? '点下方两枚红子可以交换位置。军旗放大本营，地雷放后两排，炸弹不放第一排。也可以直接使用当前阵型。' : 'Tap two red pieces to swap. Flags stay in HQ, mines in the last two rows, bombs behind the front row. This formation is ready to play.'}</p><button type="button" className="jq-secondary" onClick={() => { setState(createArmyState(shuffleArmySide(state.board, 'red'))); setSelected(null); setMessage(''); sfx.click(); }}>{zh ? '换一套布阵' : 'Shuffle formation'}</button><button type="button" className="jq-primary" onClick={() => { sfx.junqiBgmStart(); setPhase('playing'); setSelected(null); setMessage(''); cellRefs.current[32]?.focus({ preventScroll: true }); }}>{zh ? '开始对弈' : 'Start match'}<span aria-hidden="true">→</span></button></div> : <div className="jq-actions"><button type="button" onClick={undo} disabled={!history.current.length || !!state.winner}>{zh ? '悔一回合' : 'Undo turn'}</button><button type="button" onClick={showHint} disabled={!canPlay}>{zh ? '行棋提示' : 'Move hint'}</button><button type="button" onClick={pause} disabled={phase === 'over'}>{phase === 'paused' ? (zh ? '继续' : 'Resume') : (zh ? '暂停' : 'Pause')}</button><button type="button" disabled={phase === 'over'} onClick={() => { setPhase('paused'); setConfirmResign(true); }}>{zh ? '认输' : 'Surrender'}</button></div>}
        <p className="jq-message" aria-live="polite">{message || (selectedPiece ? (zh ? `已选${ARMY_PIECES[selectedPiece.kind].zh}：${phase === 'setup' ? '点另一枚红子交换。' : '点发光位置行棋。'}` : `${ARMY_PIECES[selectedPiece.kind].en} selected. Tap a ${phase === 'setup' ? 'red piece to swap.' : 'glowing destination.'}`) : (zh ? '选棋子 → 看路线 → 点落点' : 'Choose a piece → find a route → tap a destination'))}</p>
        <div className="jq-rank-guide"><span>{zh ? '军衔速查' : 'RANK GUIDE'}</span><p>{zh ? '司令 › 军长 › 师长 › 旅长 › 团长\n› 营长 › 连长 › 排长 › 工兵' : 'CMD › GEN › DIV › BRG › REG\n› BTN › CO › PLT › ENG'}</p><small>{zh ? '大吃小 · 同级同归于尽' : 'Higher wins · Equal ranks trade'}</small></div>
        <div className="jq-specials"><p><b>{zh ? '工兵' : 'Engineer'}</b>{zh ? '能排雷，铁路上还能转弯。' : 'Clears mines and turns on rails.'}</p><p><b>{zh ? '炸弹' : 'Bomb'}</b>{zh ? '与任何敌子同归于尽。' : 'Trades with any enemy piece.'}</p><p><b>{zh ? '军旗' : 'Flag'}</b>{zh ? '夺取对方军旗即可获胜。' : 'Capture the enemy flag to win.'}</p></div>
        <div className="jq-casualties"><span>{zh ? '本局被取下的棋子' : 'CAPTURED PIECES'}</span><div>{state.removed.length ? state.removed.map((piece, i) => <small className={piece.side} key={`${piece.id}-${i}`}>{zh ? ARMY_PIECES[piece.kind].zh : ARMY_PIECES[piece.kind].short}</small>) : <p>{zh ? '双方小队整装待发' : 'Both armies are ready'}</p>}</div></div>
        <div className="jq-log"><span>{zh ? '最近调动' : 'RECENT MOVES'}</span>{log.length ? log.slice(-4).map((line, i) => <p key={`${i}-${line}`}>{line}</p>) : <p>{zh ? '从第一步开始你的布局' : 'Your plan begins with the first move'}</p>}</div>
        <small className="jq-key-note">{zh ? 'Web / Pad：点选行棋\n方向键移动焦点 · Enter 落子\nH 提示 · U 悔棋 · P / Esc 暂停' : 'Web / Pad: tap to play\nArrows: focus · Enter: select\nH: hint · U: undo · P / Esc: pause'}</small>
      </aside>
    </div>
  </section>;
}
