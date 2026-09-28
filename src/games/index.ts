import { registerGame, getGame, listGames } from '../gameRegistry';
import { bubblePopDef } from './bubblePop';
import { starCatchDef } from './starCatch';
import { ringTossDef } from './ringToss';
import { balloonBurstDef } from './balloonBurst';
import { memoryMatchDef } from './memoryMatch';
import { oddOneOutDef } from './oddOneOut';
import { animalHuntDef } from './animalHunt';

/* 乐园纯休闲街机游戏（与课程教学无关，2026-09-28 改版）：4 新作 + 3 翻新 */
registerGame(bubblePopDef);
registerGame(starCatchDef);
registerGame(ringTossDef);
registerGame(balloonBurstDef);
registerGame(memoryMatchDef);
registerGame(oddOneOutDef);
registerGame(animalHuntDef);

export { getGame, listGames };
