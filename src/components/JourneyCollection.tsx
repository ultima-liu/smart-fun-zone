import type { ReactNode } from 'react';
import type { StarCard } from '../content/starCards';
import { JOURNEY_FACTIONS } from '../content/journeyCards';
import { characterPortrait } from '../content/characterAssets';

export function JourneyCollectionHero({ zh, have = 0, leading }: { zh: boolean; have?: number; leading?: ReactNode }) {
  return (
    <section className="journey-collection-hero" aria-label={zh ? '西游记 · 西行绘卷' : 'Journey to the West collection'}>
      <img src={characterPortrait('journey-wukong')} alt="" className="journey-hero-art" />
      <div className="journey-hero-copy">
        <span className="journey-eyebrow">{zh ? '神魔图鉴 · 壹' : 'MYTHIC COLLECTION · I'}</span>
        <div className="journey-hero-heading">{leading}<h2>{zh ? '西行绘卷' : 'The Westward Scroll'}</h2></div>
        <p>{zh ? '仙佛有相，妖魔有形。展开一卷，重逢西游。' : 'Immortals, pilgrims and spirits. Unroll a world of wonder.'}</p>
        <div className="journey-hero-tags"><span>{zh ? '取经众' : 'Pilgrims'}</span><span>{zh ? '仙佛' : 'Divine'}</span><span>{zh ? '妖魔' : 'Demons'}</span></div>
        <small>{zh ? `十位人物 · 已藏 ${have} / 10` : `Ten characters · Collected ${have} / 10`}</small>
      </div>
      <div className="journey-hero-seal" aria-hidden="true">西<br />游</div>
    </section>
  );
}

export function JourneyLoreDetails({ card, zh }: { card: StarCard; zh: boolean }) {
  const lore = card.journey;
  if (!lore) return null;
  return (
    <div className="journey-lore">
      <span className="journey-lore-title">{zh ? lore.title.zh : lore.title.en}</span>
      <dl>
        <div><dt>{zh ? '归属' : 'Realm'}</dt><dd>{zh ? JOURNEY_FACTIONS[lore.faction].zh : JOURNEY_FACTIONS[lore.faction].en}</dd></div>
        <div><dt>{zh ? '法器 / 本领' : 'Artifact / Gift'}</dt><dd>{zh ? lore.artifact.zh : lore.artifact.en}</dd></div>
      </dl>
      <p>{zh ? lore.design.zh : lore.design.en}</p>
      <a href={`https://zh.wikisource.org/wiki/西遊記/第${String(lore.chapter).padStart(3, '0')}回`} target="_blank" rel="noreferrer">{zh ? `读原著 · 第${lore.chapter}回 ↗` : `Read the novel · Chapter ${lore.chapter} ↗`}</a>
    </div>
  );
}
