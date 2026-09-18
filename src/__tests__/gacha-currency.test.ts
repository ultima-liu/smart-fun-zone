import { afterEach, describe, expect, it, vi } from 'vitest';
import { drawLoot } from '../content/expedition';
import { drawCards } from '../content/starCards';
import { useStore } from '../store';

describe('gacha currency rules', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps duplicate cards as a result marker without converting them to a material', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const result = drawCards(2, ['npc-a-guang'], 'npc');

    expect(result.duplicateCount).toBe(2);
    expect(result).not.toHaveProperty('convertedShards');
  });

  it('does not include a card-currency drop in expedition loot', () => {
    const drop = drawLoot(1);

    expect(drop).not.toHaveProperty('cardShard');
    expect(drop).toMatchObject({ beans: 4, stardust: 2 });
  });

  it('deducts beans from the wallet when summoning', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const original = useStore.getState();
    useStore.setState({
      points: { gachaKid: 100 },
      pointLog: { gachaKid: [] },
      materials: { gachaKid: { stardust: 7 } },
      archivedCards: { gachaKid: [] },
    });

    const result = useStore.getState().drawCards('gachaKid', 1);

    expect(result.ids).toHaveLength(1);
    expect(useStore.getState().points.gachaKid).toBe(0);
    expect(useStore.getState().materials.gachaKid).toEqual({ stardust: 7 });
    useStore.setState(original, true);
  });
});
