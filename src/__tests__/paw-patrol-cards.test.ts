import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CARD_SETS, cardsBySet } from '../content/starCards';
import { characterPortrait } from '../content/characterAssets';
import CardPortrait from '../components/CardPortrait';

describe('汪汪队立大功角色卡', () => {
  it('将本批七位用户提供的角色素材收录为独立套系', () => {
    const cards = cardsBySet('paw-patrol');
    expect(CARD_SETS.find((set) => set.id === 'paw-patrol')).toMatchObject({ name: { zh: '汪汪队立大功' }, rewardBeans: 300 });
    expect(cards.map((card) => card.id)).toEqual([
      'paw-ryder', 'paw-chase', 'paw-marshall', 'paw-rubble', 'paw-skye', 'paw-rocky', 'paw-zuma',
    ]);
  });

  it('七张卡均从统一入口引用本批角色素材', () => {
    for (const card of cardsBySet('paw-patrol')) {
      expect(characterPortrait(card.id)).toMatch(/^\/assets\/cards\/paw-patrol\/.+\.webp$/);
    }
  });

  it('以本地 WebP 立绘渲染卡面，而非回退到默认矢量人物', () => {
    const card = cardsBySet('paw-patrol')[0];
    const markup = renderToStaticMarkup(createElement(CardPortrait, { card }));
    expect(markup).toContain('/assets/cards/paw-patrol/ryder.webp');
  });
});
