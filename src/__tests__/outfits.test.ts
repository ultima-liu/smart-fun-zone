import { describe, expect, it } from 'vitest';
import { PREMIUM_OUTFITS, premiumOutfitById } from '../content/outfits';

describe('premium outfits', () => {
  it('provides a reusable default and six complete collectible outfits', () => {
    expect(PREMIUM_OUTFITS).toHaveLength(7);
    expect(PREMIUM_OUTFITS[0].default).toBe(true);
    expect(new Set(PREMIUM_OUTFITS.map((outfit) => outfit.id)).size).toBe(7);
    expect(PREMIUM_OUTFITS.every((outfit) => outfit.image.startsWith('/assets/outfits/'))).toBe(true);
  });

  it('includes the three Chinese festival limited outfits', () => {
    expect(PREMIUM_OUTFITS.map((outfit) => outfit.id)).toEqual(expect.arrayContaining([
      'o-midautumn-moon-rabbit',
      'o-national-day-mountains',
      'o-spring-festival-snow',
    ]));
  });

  it('falls back to the academy outfit for legacy or missing outfit ids', () => {
    expect(premiumOutfitById('o-legacy').id).toBe('o-academy');
    expect(premiumOutfitById().id).toBe('o-academy');
  });
});
