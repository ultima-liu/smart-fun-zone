import type { ReactNode } from 'react';
import type { StarCard } from '../content/starCards';
import { HULU_CARDS, HULU_FACTIONS } from '../content/huluCards';
import { characterPortrait } from '../content/characterAssets';

export function HuluCollectionHero({ zh, have = 0, leading }: { zh: boolean; have?: number; leading?: ReactNode }) {
  return (
    <section className="hulu-collection-hero" aria-label={zh ? '葫芦娃 · 七色葫芦山' : 'Calabash Brothers collection'}>
      <div className="hulu-hero-copy">
        <span className="hulu-eyebrow">{zh ? '童年动画馆 / 葫芦娃' : 'ANIMATION GALLERY / CALABASH BROTHERS'}</span>
        <div className="hulu-hero-heading">{leading}<h2>{zh ? '七色葫芦山' : 'Seven-Color Mountain'}</h2></div>
        <p>{zh ? '七种本领，一份同心。重访葫芦山，认识勇敢的兄弟与山间伙伴。' : 'Seven powers, one shared heart. Meet the brave brothers and their mountain friends.'}</p>
        <div className="hulu-hero-tags">{Object.values(HULU_FACTIONS).map((faction) => <span key={faction.en}>{zh ? faction.zh : faction.en}</span>)}</div>
        <div className="hulu-progress"><span>{zh ? '我的收藏' : 'Collected'} <b>{have}</b> / {HULU_CARDS.length}</span><progress value={have} max={HULU_CARDS.length} aria-label={zh ? '葫芦娃收集进度' : 'Calabash collection progress'} /></div>
      </div>
      <div className="hulu-hero-scene" aria-hidden="true">
        <svg className="hulu-vine" viewBox="0 0 420 130">
          <path d="M-10 55Q85 6 160 39T310 35T440 30" fill="none" stroke="#527246" strokeWidth="5" />
          {HULU_CARDS.slice(0, 7).map((card, i) => <g key={card.id} transform={`translate(${24 + i * 59} ${38 + Math.sin(i) * 13})`}>
            <path d="M0 0q-8 9-2 19M-2 4q-20-13-22 2q17 8 22-2" fill="#719055" stroke="#527246" strokeWidth="2" />
            <path d="M-2 16c-15-8-25 12-12 22c-23 20-9 44 12 44s35-24 12-44c13-10 3-30-12-22Z" fill={card.palette[0]} stroke="#344e35" strokeWidth="2" />
            <path d="M-8 24q-5 5-2 10M-12 51q-7 10 0 18" fill="none" stroke="#fff7d8" strokeWidth="3" opacity=".6" />
          </g>)}
        </svg>
        <div className="hulu-hero-characters">{['hulu-1', 'hulu-7'].map((id) => <img key={id} src={characterPortrait(id)} alt="" />)}</div>
        <span className="hulu-scene-caption">{zh ? '同心同行 · 各显本领' : 'TOGETHER, EVERY POWER SHINES'}</span>
      </div>
    </section>
  );
}

export function HuluLoreDetails({ card, zh }: { card: StarCard; zh: boolean }) {
  const lore = card.hulu;
  if (!lore) return null;
  return (
    <div className="hulu-lore">
      <dl>
        <div><dt>{zh ? '伙伴关系' : 'Group'}</dt><dd>{zh ? HULU_FACTIONS[lore.faction].zh : HULU_FACTIONS[lore.faction].en}</dd></div>
        <div><dt>{zh ? '人物本领' : 'Power'}</dt><dd>{zh ? lore.ability.zh : lore.ability.en}</dd></div>
      </dl>
      <p><b>{zh ? '一起学一学' : 'Think together'}</b>{zh ? lore.lesson.zh : lore.lesson.en}</p>
    </div>
  );
}
