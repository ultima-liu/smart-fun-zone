import type { CSSProperties } from 'react';
import type { CardSetId } from '../content/starCards';

export type FramedCardSet = Exclude<CardSetId, 'journey' | 'hulu'>;

export const CARD_THEMES: Record<FramedCardSet, { edge: string; accent: string; paper: string; ink: string }> = {
  npc: { edge: '#c8b4ed', accent: '#ffe2a1', paper: '#202044', ink: '#f3edff' },
  brook: { edge: '#62dbe7', accent: '#e8bd74', paper: '#102c3b', ink: '#eaf9ff' },
  bruco: { edge: '#b8c9d3', accent: '#ffc645', paper: '#17232f', ink: '#f1f6fb' },
  'paw-patrol': { edge: '#3170cf', accent: '#ef5748', paper: '#163c7a', ink: '#ffffff' },
  monster: { edge: '#b8a0df', accent: '#dbefa3', paper: '#332443', ink: '#f5edff' },
  hanzi: { edge: '#a84f3c', accent: '#b78345', paper: '#faf0dc', ink: '#3c3029' },
  ship: { edge: '#6abedd', accent: '#bceaff', paper: '#102637', ink: '#eafaff' },
  mystery: { edge: '#b49bdb', accent: '#e9cf99', paper: '#2b203b', ink: '#f5e8d2' },
  outfit: { edge: '#b3d5c3', accent: '#eebea9', paper: '#23433e', ink: '#f0f9f4' },
  badge: { edge: '#ccac66', accent: '#f5dfa6', paper: '#3d3221', ink: '#fff3d6' },
  game: { edge: '#63e2b0', accent: '#f1c765', paper: '#172c2c', ink: '#effff6' },
};

export function cardThemeClass(setId: CardSetId): string {
  return setId === 'journey' ? ' journey-card' : setId === 'hulu' ? ' hulu-card' : ` themed-card card-theme-${setId}`;
}

export function cardThemeStyle(setId: CardSetId): CSSProperties {
  if (setId === 'journey' || setId === 'hulu') return {};
  const theme = CARD_THEMES[setId];
  return { '--card-edge': theme.edge, '--card-accent': theme.accent, '--card-paper': theme.paper, '--card-ink': theme.ink } as CSSProperties;
}
