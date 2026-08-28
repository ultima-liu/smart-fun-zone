import { registerGame, getGame, listGames } from '../gameRegistry';
import { numberFarmDef } from './numberFarm';
import { memoryMatchDef } from './memoryMatch';
import { oddOneOutDef } from './oddOneOut';
import { applePickDef } from './applePick';
import { shapeCastleDef } from './shapeCastle';
import { pinyinFishingDef } from './pinyinFishing';
import { hanziPuzzleDef } from './hanziPuzzle';
import { englishZooDef } from './englishZoo';
import { patternTrainDef } from './patternTrain';
import { trashSortDef } from './trashSort';
import { animalHuntDef } from './animalHunt';
import { trafficLightDef } from './trafficLight';

/* 全部 12 个游戏已实现 */
registerGame(numberFarmDef);
registerGame(memoryMatchDef);
registerGame(oddOneOutDef);
registerGame(applePickDef);
registerGame(shapeCastleDef);
registerGame(pinyinFishingDef);
registerGame(hanziPuzzleDef);
registerGame(englishZooDef);
registerGame(patternTrainDef);
registerGame(trashSortDef);
registerGame(animalHuntDef);
registerGame(trafficLightDef);

export { getGame, listGames };
