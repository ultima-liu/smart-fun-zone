#!/usr/bin/env node
/**
 * 生成词卡手绘插图（SVG）：public/assets/english-textbook/words/<slug>.svg
 * 风格：柔和渐变 + 高光 + 软阴影的绘制感插画，240×240 视窗，透明背景。
 * 词卡在 src/pages/EnglishTextbookLessonPage.tsx 中按 <slug>.svg 约定加载，缺图回落纯文字。
 * 运行：node scripts/render-word-pictures.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets', 'english-textbook', 'words');
mkdirSync(outDir, { recursive: true });

const wrap = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">${inner}</svg>`;
const ground = `<ellipse cx="120" cy="210" rx="64" ry="10" fill="rgba(70,90,130,.16)"/>`;
const lg = (id, c1, c2) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`;
const rg = (id, c1, c2) =>
  `<radialGradient id="${id}" cx=".38" cy=".32" r=".85"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>`;
const O = '#3c4258';

const pictures = {};

/* ---------- 身体部位 ---------- */
pictures.ear = `${rg('sk', '#ffd9b8', '#f0b088')}
${lg('sk2', '#ffd9b8', '#e8a276')}
${ground}
<path d="M108 44 C64 40 52 96 72 136 C88 170 100 186 94 206 L130 206 C136 178 128 164 140 142 C152 120 152 54 108 44 Z" fill="url(#sk2)"/>
<path d="M112 70 C86 68 80 100 94 124" fill="none" stroke="#c97e58" stroke-width="8" stroke-linecap="round"/>
<path d="M118 96 C104 98 102 114 110 128" fill="none" stroke="#c97e58" stroke-width="6" stroke-linecap="round"/>
<path d="M84 210 L140 210" stroke="#c97e58" stroke-width="6" stroke-linecap="round"/>`;

pictures.eye = `${lg('lid', '#f7cdb2', '#eda87e')}
${rg('iris', '#7fd0e8', '#1f6f9e')}
${ground}
<path d="M44 118 C80 74 160 74 196 118 C160 156 80 156 44 118 Z" fill="#fff" stroke="${O}" stroke-width="4"/>
<circle cx="120" cy="116" r="27" fill="url(#iris)" stroke="${O}" stroke-width="3"/>
<circle cx="120" cy="116" r="11" fill="#22283b"/>
<circle cx="111" cy="107" r="6" fill="#fff"/>
<path d="M52 92 C92 52 148 52 188 92" fill="none" stroke="#5b4632" stroke-width="10" stroke-linecap="round"/>
<path d="M84 150 l-8 14 M120 156 l0 15 M156 150 l8 14" stroke="${O}" stroke-width="4" stroke-linecap="round"/>`;

pictures.mouth = `${rg('lip', '#ff8f9c', '#e2404f')}
${ground}
<path d="M46 104 C80 66 100 92 120 92 C140 92 160 66 194 104 C160 158 80 158 46 104 Z" fill="url(#lip)" stroke="${O}" stroke-width="4"/>
<path d="M58 112 C90 130 150 130 182 112 L168 136 C140 150 100 150 72 136 Z" fill="#fff"/>
<path d="M92 138 C106 150 134 150 148 138 C140 152 100 152 92 138 Z" fill="#ff7d92"/>
<path d="M120 92 L120 118" stroke="${O}" stroke-width="3"/>`;

pictures.hand = `${lg('sk', '#ffd9b8', '#efb289')}
${ground}
<rect x="98" y="118" width="52" height="70" rx="20" fill="url(#sk)" stroke="#e0a172" stroke-width="3"/>
<rect x="96" y="52" width="15" height="66" rx="7.5" fill="url(#sk)" stroke="#e0a172" stroke-width="3"/>
<rect x="114" y="42" width="15" height="76" rx="7.5" fill="url(#sk)" stroke="#e0a172" stroke-width="3"/>
<rect x="132" y="48" width="15" height="70" rx="7.5" fill="url(#sk)" stroke="#e0a172" stroke-width="3"/>
<rect x="150" y="60" width="15" height="58" rx="7.5" fill="url(#sk)" stroke="#e0a172" stroke-width="3"/>
<path d="M98 150 C76 138 68 148 62 158 C74 166 88 168 100 168 Z" fill="url(#sk)" stroke="#e0a172" stroke-width="3"/>
<path d="M104 132 C118 138 134 138 146 132" fill="none" stroke="#e0a172" stroke-width="3"/>`;

pictures.arm = `${lg('sk', '#ffd9b8', '#efb289')}
${lg('sl', '#5aa7dd', '#3d7fb8')}
${ground}
<path d="M52 196 C56 150 76 118 108 102 L138 88 L150 118 L118 134 C94 148 84 168 82 196 Z" fill="url(#sl)"/>
<path d="M138 88 C158 74 180 76 192 90 C204 104 198 128 178 136 C162 142 146 134 142 122" fill="url(#sk)" stroke="#e0a172" stroke-width="3"/>
<path d="M150 96 C162 88 176 90 184 100" fill="none" stroke="#e0a172" stroke-width="3"/>
<path d="M148 104 C160 98 172 100 178 108" fill="none" stroke="#e0a172" stroke-width="3"/>`;

/* ---------- 动作与礼貌用语 ---------- */
pictures.help = `${lg('sa', '#ffd9b8', '#efb289')}
${lg('sb', '#ffe6c8', '#f6c793')}
${rg('hb', '#ff9aa8', '#e2404f')}
${ground}
<path d="M40 190 C44 148 70 122 108 118 L128 116 L132 148 L110 152 C88 156 74 172 72 190 Z" fill="url(#sa)"/>
<path d="M200 190 C196 148 170 122 132 118 L118 116 L114 148 L132 152 C156 156 168 172 170 190 Z" fill="url(#sb)"/>
<path d="M120 96 C104 82 118 62 132 72 C138 60 158 66 154 82 C152 94 136 102 120 96 Z" fill="url(#hb)" stroke="${O}" stroke-width="3"/>`;

pictures.listen = `${rg('sk', '#ffd9b8', '#f0b088')}
${ground}
<path d="M104 58 C66 54 56 104 74 140 C88 170 98 186 92 204 L126 204 C132 178 124 162 136 142 C148 122 148 66 104 58 Z" fill="url(#sk)"/>
<path d="M108 82 C84 80 78 108 92 130" fill="none" stroke="#c97e58" stroke-width="7" stroke-linecap="round"/>
<path d="M168 78 C186 96 186 128 168 146" fill="none" stroke="#4f9bd8" stroke-width="8" stroke-linecap="round"/>
<path d="M186 60 C214 88 214 138 186 166" fill="none" stroke="#7fc3e8" stroke-width="8" stroke-linecap="round"/>
<path d="M204 42 C240 80 240 148 204 184" fill="none" stroke="#b8e0f2" stroke-width="8" stroke-linecap="round"/>`;

pictures.say = `${lg('bb', '#7fd0e8', '#3f8ed0')}
${ground}
<path d="M44 52 L188 52 C202 52 210 62 210 74 L210 128 C210 140 202 150 188 150 L118 150 L84 184 L92 150 L52 150 C40 150 32 140 32 128 L32 74 C32 62 40 52 44 52 Z" fill="url(#bb)" stroke="${O}" stroke-width="4"/>
<text x="120" y="116" text-anchor="middle" font-family="system-ui, sans-serif" font-size="44" font-weight="900" fill="#fff">Hi!</text>
<path d="M60 96 C76 78 104 74 122 84" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".55"/>`;

pictures.share = `${lg('sa', '#ffd9b8', '#efb289')}
${lg('sb', '#ffe6c8', '#f6c793')}
${rg('ball', '#ffd27a', '#f09a3e')}
${ground}
<path d="M34 200 C38 164 62 142 96 140 L116 138 L120 168 L100 172 C78 176 64 188 62 200 Z" fill="url(#sa)"/>
<path d="M206 200 C202 164 178 142 144 140 L124 138 L120 168 L140 172 C162 176 176 188 178 200 Z" fill="url(#sb)"/>
<circle cx="120" cy="112" r="38" fill="url(#ball)" stroke="${O}" stroke-width="3"/>
<path d="M96 92 C104 82 118 80 126 86" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".7"/>`;

pictures.smile = `${rg('face', '#ffe9a8', '#ffc94d')}
${ground}
<circle cx="120" cy="118" r="78" fill="url(#face)" stroke="${O}" stroke-width="4"/>
<path d="M86 100 C92 92 104 92 110 100" fill="none" stroke="${O}" stroke-width="6" stroke-linecap="round"/>
<path d="M130 100 C136 92 148 92 154 100" fill="none" stroke="${O}" stroke-width="6" stroke-linecap="round"/>
<path d="M76 128 C96 168 144 168 164 128 C146 146 94 146 76 128 Z" fill="#8a4b32"/>
<circle cx="88" cy="122" r="7" fill="#ffb0a0" opacity=".55"/><circle cx="152" cy="122" r="7" fill="#ffb0a0" opacity=".55"/>`;

/* ---------- 家庭成员：半身像 ---------- */
const portrait = ({ hair, shirt1, shirt2, extra = '' }) => `${lg('hr', '#000', '#111')}
${lg('sh', shirt1, shirt2)}
${rg('fc', '#ffd9b8', '#f0b088')}
${ground}
<path d="M48 210 C48 172 80 152 120 152 C160 152 192 172 192 210 Z" fill="url(#sh)"/>
<circle cx="120" cy="106" r="52" fill="url(#fc)" stroke="#e0a172" stroke-width="3"/>
${hair}
<circle cx="102" cy="108" r="5.5" fill="${O}"/><circle cx="138" cy="108" r="5.5" fill="${O}"/>
<path d="M104 130 C112 140 128 140 136 130" fill="none" stroke="#b06a4a" stroke-width="5" stroke-linecap="round"/>
<circle cx="88" cy="122" r="7" fill="#ffb0a0" opacity=".55"/><circle cx="152" cy="122" r="7" fill="#ffb0a0" opacity=".55"/>
${extra}`;

const hairTop = (c) => `<path d="M68 104 C68 62 172 62 172 104 C172 84 152 74 120 74 C88 74 68 84 68 104 Z" fill="${c}"/>`;
const glasses = `<g stroke="${O}" stroke-width="3" fill="none"><circle cx="98" cy="108" r="12"/><circle cx="142" cy="108" r="12"/><path d="M110 108 L130 108"/></g>`;

pictures.mother = portrait({
  hair: `${hairTop('#5d4028')}<path d="M68 100 C64 140 76 158 84 162 L74 108 Z" fill="#5d4028"/><path d="M172 100 C176 140 164 158 156 162 L166 108 Z" fill="#5d4028"/>`,
  shirt1: '#f2917d', shirt2: '#d96a58',
});
pictures.father = portrait({
  hair: `${hairTop('#38302a')}<path d="M166 92 C170 78 160 70 148 68 L168 84 Z" fill="#38302a"/>`,
  shirt1: '#4f9bd8', shirt2: '#3574ad',
});
pictures.grandmother = portrait({
  hair: `${hairTop('#cfcfd8')}<circle cx="120" cy="56" r="20" fill="#cfcfd8"/><path d="M70 108 C66 134 78 150 88 154 L78 112 Z" fill="#cfcfd8"/><path d="M170 108 C174 134 162 150 152 154 L162 112 Z" fill="#cfcfd8"/>`,
  shirt1: '#b58ad8', shirt2: '#9468bd',
  extra: glasses,
});
pictures.grandfather = portrait({
  hair: `<path d="M70 100 C72 78 88 70 120 70 C152 70 168 78 170 100 C170 88 154 80 120 80 C86 80 70 88 70 100 Z" fill="#cfcfd8"/>`,
  shirt1: '#57bd8d', shirt2: '#3d9a6c',
  extra: `${glasses}<path d="M96 138 C106 146 134 146 144 138 C140 150 100 150 96 138 Z" fill="#cfcfd8"/>`,
});
pictures.me = portrait({
  hair: `${hairTop('#2b2622')}<circle cx="84" cy="84" r="12" fill="#2b2622"/><circle cx="156" cy="84" r="12" fill="#2b2622"/>`,
  shirt1: '#ffd23e', shirt2: '#f0a83a',
});
pictures['baby-sister'] = `${lg('onesie', '#ffe27a', '#f0b429')}
${rg('bfc', '#ffe0c2', '#f6c79e')}
${ground}
<path d="M74 208 C74 184 96 172 120 172 C144 172 166 184 166 208 Z" fill="url(#onesie)" stroke="${O}" stroke-width="3"/>
<circle cx="94" cy="196" r="9" fill="url(#bfc)" stroke="#e0a172" stroke-width="2.5"/>
<circle cx="146" cy="196" r="9" fill="url(#bfc)" stroke="#e0a172" stroke-width="2.5"/>
<circle cx="120" cy="140" r="40" fill="url(#bfc)" stroke="#e0a172" stroke-width="3"/>
<path d="M120 102 C116 94 124 94 120 86 C116 94 124 94 120 102" fill="none" stroke="#c98a4e" stroke-width="4" stroke-linecap="round"/>
<circle cx="106" cy="138" r="5" fill="#22283b"/><circle cx="134" cy="138" r="5" fill="#22283b"/>
<circle cx="98" cy="150" r="8" fill="#ffb0a0" opacity=".6"/><circle cx="142" cy="150" r="8" fill="#ffb0a0" opacity=".6"/>
<path d="M112 154 C116 160 124 160 128 154" fill="none" stroke="#b06a4a" stroke-width="4" stroke-linecap="round"/>`;
pictures.sister = portrait({
  hair: `${hairTop('#6b4326')}<circle cx="66" cy="98" r="14" fill="#6b4326"/><circle cx="174" cy="98" r="14" fill="#6b4326"/><path d="M68 100 C64 128 74 146 82 150 L74 110 Z" fill="#6b4326"/><path d="M172 100 C176 128 166 146 158 150 L166 110 Z" fill="#6b4326"/>`,
  shirt1: '#f78fb8', shirt2: '#e06a9a',
});
pictures.brother = portrait({
  hair: `<path d="M70 100 C70 68 170 68 170 100 L158 84 L146 96 L132 80 L118 94 L104 80 L90 94 L78 86 Z" fill="#38302a"/>`,
  shirt1: '#63c5e8', shirt2: '#3f9dc2',
});
pictures.uncle = portrait({
  hair: `${hairTop('#443528')}<path d="M166 90 C172 76 160 66 146 64 L168 82 Z" fill="#443528"/>`,
  shirt1: '#8d6e63', shirt2: '#6d544b',
});
pictures.aunt = portrait({
  hair: `${hairTop('#99491f')}<path d="M66 102 C58 142 74 162 86 166 L72 112 Z" fill="#99491f"/><path d="M174 102 C182 142 166 162 154 166 L168 112 Z" fill="#99491f"/>`,
  shirt1: '#f2b3c7', shirt2: '#de8fab',
  extra: '<circle cx="80" cy="126" r="5" fill="#f4c95d"/><circle cx="160" cy="126" r="5" fill="#f4c95d"/>',
});
pictures.cousin = portrait({
  hair: `<path d="M70 102 C70 66 170 66 170 102 C162 84 142 78 120 82 C98 78 78 84 70 102 Z" fill="#2b2622"/>`,
  shirt1: '#9b59c9', shirt2: '#7c3fa6',
});

/* ---------- 动物 ---------- */
pictures.fish = `${lg('bd', '#ff9d4d', '#f0703a')}
${lg('fin', '#ffb877', '#f0824a')}
${ground}
<path d="M186 108 L226 76 L222 122 L226 160 L186 132 Z" fill="url(#fin)" stroke="${O}" stroke-width="3"/>
<ellipse cx="112" cy="120" rx="74" ry="52" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<path d="M120 70 C142 54 168 58 176 74 C160 84 136 84 120 70 Z" fill="url(#fin)" stroke="${O}" stroke-width="3"/>
<path d="M96 74 C112 62 134 64 144 76 L128 96 C118 88 106 82 96 74 Z" fill="url(#fin)" stroke="${O}" stroke-width="3"/>
<circle cx="66" cy="108" r="10" fill="#fff" stroke="${O}" stroke-width="3"/><circle cx="64" cy="110" r="4.5" fill="#22283b"/>
<path d="M52 128 C60 136 70 136 78 130" fill="none" stroke="${O}" stroke-width="4" stroke-linecap="round"/>
<path d="M150 118 C158 110 170 110 178 118 M150 132 C158 124 170 124 178 132" fill="none" stroke="#c8562e" stroke-width="4" stroke-linecap="round"/>
<circle cx="42" cy="86" r="6" fill="#bfe3f2"/><circle cx="30" cy="66" r="4" fill="#bfe3f2"/>`;

pictures.cat = `${lg('bd', '#f6b45a', '#e88f3c')}
${ground}
<path d="M84 190 C72 168 74 140 92 124 L148 124 C166 140 168 168 156 190 Z" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<path d="M148 178 C168 178 182 162 180 144" fill="none" stroke="#e88f3c" stroke-width="14" stroke-linecap="round"/>
<circle cx="120" cy="96" r="46" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<path d="M84 70 L78 38 L106 56 Z" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<path d="M156 70 L162 38 L134 56 Z" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<path d="M88 56 L86 44 L98 52 Z" fill="#f2a0c0"/><path d="M152 56 L154 44 L142 52 Z" fill="#f2a0c0"/>
<circle cx="104" cy="92" r="6" fill="#22283b"/><circle cx="136" cy="92" r="6" fill="#22283b"/>
<path d="M116 106 L124 106 L120 112 Z" fill="#e2404f"/>
<path d="M120 112 C120 120 112 122 106 118 M120 112 C120 120 128 122 134 118" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>
<path d="M104 108 L82 104 M104 114 L84 118 M136 108 L158 104 M136 114 L156 118" stroke="${O}" stroke-width="2.5" stroke-linecap="round"/>
<path d="M100 138 C110 132 130 132 140 138 M104 152 C112 147 128 147 136 152" fill="none" stroke="#c8741f" stroke-width="5" stroke-linecap="round"/>`;

pictures.bird = `${lg('bd', '#7fd0e8', '#3f8ed0')}
${lg('wg', '#5bb7dd', '#2f74a8')}
${rg('bel', '#ffffff', '#cfe9f5')}
${ground}
<path d="M150 96 L196 76 L188 108 L198 132 L152 122 Z" fill="url(#wg)" stroke="${O}" stroke-width="3"/>
<circle cx="102" cy="112" r="52" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<path d="M70 150 C92 178 122 180 138 164 C124 178 92 176 70 150 Z" fill="url(#bel)"/>
<path d="M150 128 C128 142 100 140 84 126 C104 136 132 138 150 128 Z" fill="url(#bel)"/>
<path d="M58 74 L76 88 L54 96 Z" fill="#f5a03c" stroke="${O}" stroke-width="3"/>
<circle cx="66" cy="92" r="7" fill="#fff" stroke="${O}" stroke-width="2.5"/><circle cx="64" cy="94" r="3.2" fill="#22283b"/>
<path d="M96 182 L96 202 M112 180 L112 202" stroke="#f5a03c" stroke-width="6" stroke-linecap="round"/>
<path d="M88 204 L96 198 L104 204 M104 202 L112 196 L120 202" fill="none" stroke="#f5a03c" stroke-width="5" stroke-linecap="round"/>`;

pictures.rabbit = `${lg('bd', '#ffffff', '#dfe9f2')}
${rg('bel', '#ffffff', '#e8f1f8')}
${ground}
<ellipse cx="120" cy="164" rx="46" ry="42" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<ellipse cx="120" cy="172" rx="24" ry="26" fill="url(#bel)"/>
<circle cx="146" cy="176" r="13" fill="#fff" stroke="${O}" stroke-width="2.5"/>
<path d="M94 62 C86 24 104 16 112 48 C116 62 114 76 110 84 Z" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<path d="M146 62 C154 24 136 16 128 48 C124 62 126 76 130 84 Z" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<ellipse cx="106" cy="52" rx="5" ry="12" fill="#ffb7c9"/><ellipse cx="134" cy="52" rx="5" ry="12" fill="#ffb7c9"/>
<circle cx="120" cy="108" r="42" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<circle cx="102" cy="102" r="6" fill="#22283b"/><circle cx="138" cy="102" r="6" fill="#22283b"/>
<ellipse cx="120" cy="118" rx="8" ry="6" fill="#ff8fa8" stroke="${O}" stroke-width="2"/>
<path d="M120 124 L120 130 M120 130 C114 136 106 134 102 130 M120 130 C126 136 134 134 138 130" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>
<path d="M92 118 L72 114 M92 124 L74 126 M148 118 L168 114 M148 124 L166 126" stroke="${O}" stroke-width="2.5" stroke-linecap="round"/>`;

pictures.dog = `${lg('bd', '#c98a4e', '#a96c33')}
${rg('mz', '#ffe2c2', '#f2c08a')}
${ground}
<path d="M86 192 C74 168 78 142 96 126 L146 126 C164 142 168 168 156 192 Z" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<circle cx="120" cy="96" r="48" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<path d="M76 66 C58 62 50 84 60 100 C68 112 84 112 90 100 Z" fill="#8a5a28" stroke="${O}" stroke-width="3"/>
<path d="M164 66 C182 62 190 84 180 100 C172 112 156 112 150 100 Z" fill="#8a5a28" stroke="${O}" stroke-width="3"/>
<ellipse cx="120" cy="112" rx="30" ry="24" fill="url(#mz)"/>
<circle cx="102" cy="88" r="6.5" fill="#22283b"/><circle cx="138" cy="88" r="6.5" fill="#22283b"/>
<ellipse cx="120" cy="106" rx="11" ry="8" fill="#22283b"/>
<path d="M120 114 L120 122 M120 122 C114 130 104 128 100 124" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>
<path d="M108 128 C114 140 126 140 132 128 C130 142 110 142 108 128 Z" fill="#ff8fa8"/>
<path d="M160 176 C178 170 188 152 184 138" fill="none" stroke="#a96c33" stroke-width="13" stroke-linecap="round"/>`;

pictures.lion = `${rg('mane', '#ffb14d', '#e07a1f')}
${lg('fc2', '#ffd08a', '#f0a744')}
${ground}
<circle cx="120" cy="112" r="74" fill="url(#mane)"/>
<path d="M120 30 L132 52 L108 52 Z M182 66 L188 90 L164 84 Z M58 66 L52 90 L76 84 Z" fill="#e07a1f"/>
<circle cx="120" cy="116" r="46" fill="url(#fc2)" stroke="${O}" stroke-width="3"/>
<circle cx="104" cy="108" r="6" fill="#22283b"/><circle cx="136" cy="108" r="6" fill="#22283b"/>
<ellipse cx="120" cy="128" rx="17" ry="13" fill="#fff2d8"/>
<ellipse cx="120" cy="124" rx="9" ry="6.5" fill="#8a4b32"/>
<path d="M120 130 L120 138 M120 138 C114 144 106 142 102 138 M120 138 C126 144 134 142 138 138" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>
<path d="M96 96 C100 90 108 90 112 96 M128 96 C132 90 140 90 144 96" fill="none" stroke="${O}" stroke-width="4" stroke-linecap="round"/>`;

pictures.monkey = `${lg('bd', '#a8734a', '#8a5a34')}
${rg('fc3', '#ffd9b8', '#eeb083')}
${ground}
<path d="M150 178 C178 174 192 150 186 130" fill="none" stroke="#8a5a34" stroke-width="13" stroke-linecap="round"/>
<ellipse cx="120" cy="160" rx="42" ry="40" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<ellipse cx="120" cy="166" rx="22" ry="24" fill="url(#fc3)"/>
<circle cx="120" cy="92" r="44" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<circle cx="82" cy="86" r="15" fill="url(#fc3)" stroke="${O}" stroke-width="2.5"/><circle cx="158" cy="86" r="15" fill="url(#fc3)" stroke="${O}" stroke-width="2.5"/>
<path d="M92 66 C96 54 110 50 120 56 C130 50 144 54 148 66 C138 60 102 60 92 66 Z" fill="#8a5a34"/>
<ellipse cx="120" cy="102" rx="27" ry="21" fill="url(#fc3)"/>
<circle cx="107" cy="94" r="5.5" fill="#22283b"/><circle cx="133" cy="94" r="5.5" fill="#22283b"/>
<ellipse cx="120" cy="108" rx="8" ry="6" fill="#6b4326"/>
<path d="M120 114 L120 118 M120 118 C115 123 108 122 105 118 M120 118 C125 123 132 122 135 118" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>`;

pictures.panda = `${lg('bd', '#ffffff', '#e4e9ef')}
${ground}
<ellipse cx="120" cy="162" rx="46" ry="42" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<circle cx="84" cy="160" r="15" fill="#3a3f52"/><circle cx="156" cy="160" r="15" fill="#3a3f52"/>
<circle cx="120" cy="96" r="48" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<circle cx="88" cy="62" r="15" fill="#3a3f52"/><circle cx="152" cy="62" r="15" fill="#3a3f52"/>
<ellipse cx="102" cy="94" rx="15" ry="18" fill="#3a3f52" transform="rotate(-14 102 94)"/>
<ellipse cx="138" cy="94" rx="15" ry="18" fill="#3a3f52" transform="rotate(14 138 94)"/>
<circle cx="103" cy="92" r="6" fill="#fff"/><circle cx="137" cy="92" r="6" fill="#fff"/>
<ellipse cx="120" cy="114" rx="11" ry="8" fill="#3a3f52"/>
<path d="M120 122 L120 128 M120 128 C115 133 108 132 105 128 M120 128 C125 133 132 132 135 128" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>
<path d="M148 140 C160 128 172 128 178 136" fill="none" stroke="#4a7d3f" stroke-width="9" stroke-linecap="round"/>`;

pictures.elephant = `${lg('bd', '#b8c4d8', '#8e9cb8')}
${lg('ear', '#cdd6e6', '#9aa8c4')}
${ground}
<ellipse cx="126" cy="150" rx="62" ry="56" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<circle cx="86" cy="96" r="48" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<path d="M46 84 C20 78 12 110 30 122 C18 136 30 156 46 152 C64 148 66 128 58 118 C66 108 62 92 46 84 Z" fill="url(#ear)" stroke="${O}" stroke-width="3"/>
<circle cx="82" cy="92" r="6.5" fill="#22283b"/>
<path d="M132 74 C148 52 172 52 182 66 C192 80 184 100 168 104" fill="none" stroke="#8e9cb8" stroke-width="10" stroke-linecap="round"/>
<path d="M110 78 C120 70 134 70 142 78" fill="none" stroke="${O}" stroke-width="4" stroke-linecap="round"/>
<path d="M92 128 C96 148 104 164 118 172 C132 180 148 176 154 166 C158 190 128 202 108 190 C90 180 84 152 88 132 Z" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<path d="M60 116 C60 126 68 130 76 128" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`;

pictures.tiger = `${lg('bd', '#ffb14d', '#e8842a')}
${ground}
<path d="M84 192 C72 170 76 144 94 128 L148 128 C166 144 170 170 158 192 Z" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<path d="M148 178 C168 178 182 162 180 144" fill="none" stroke="#e8842a" stroke-width="14" stroke-linecap="round"/>
<path d="M104 142 L128 138 M100 160 L124 156 M108 178 L132 174" stroke="${O}" stroke-width="5" stroke-linecap="round"/>
<circle cx="120" cy="96" r="46" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<path d="M84 70 L78 38 L106 56 Z" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<path d="M156 70 L162 38 L134 56 Z" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<path d="M96 76 L92 62 M110 70 L110 56 M134 72 L138 58" stroke="${O}" stroke-width="4" stroke-linecap="round"/>
<circle cx="104" cy="90" r="6" fill="#22283b"/><circle cx="136" cy="90" r="6" fill="#22283b"/>
<ellipse cx="120" cy="108" rx="16" ry="12" fill="#fff2d8"/>
<ellipse cx="120" cy="104" rx="8" ry="6" fill="#8a4b32"/>
<path d="M120 110 L120 116 M120 116 C115 121 108 120 105 116 M120 116 C125 121 132 120 135 116" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>
<path d="M88 100 L70 96 M88 108 L72 110 M152 100 L170 96 M152 108 L168 110" stroke="${O}" stroke-width="3" stroke-linecap="round"/>`;

pictures.giraffe = `${lg('bd', '#f5c264', '#e8a53a')}
${rg('pat', '#c47f2a', '#a5651c')}
${ground}
<path d="M104 118 C100 84 100 56 108 34 L136 38 C132 62 134 92 142 116 Z" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<path d="M112 34 L108 14 L118 12 Z" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<path d="M132 38 L132 16 L142 18 Z" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<circle cx="110" cy="12" r="6" fill="#8a5a34"/><circle cx="140" cy="14" r="6" fill="#8a5a34"/>
<path d="M148 44 C168 40 184 52 186 68 C188 82 176 92 162 92 C150 92 142 84 142 72 Z" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<ellipse cx="100" cy="182" rx="44" ry="28" fill="url(#bd)" stroke="${O}" stroke-width="3"/>
<path d="M76 208 L76 190 M124 208 L124 190" stroke="#c4922f" stroke-width="10" stroke-linecap="round"/>
<circle cx="160" cy="66" r="6.5" fill="#22283b"/>
<path d="M154 82 C160 88 170 88 176 82" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>
<circle cx="118" cy="66" r="9" fill="url(#pat)"/><circle cx="106" cy="92" r="8" fill="url(#pat)"/><circle cx="126" cy="100" r="8" fill="url(#pat)"/>
<circle cx="92" cy="168" r="10" fill="url(#pat)"/><circle cx="122" cy="178" r="9" fill="url(#pat)"/><circle cx="108" cy="150" r="8" fill="url(#pat)"/>
<path d="M186 60 C194 66 194 78 188 84" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>`;

/* ---------- 水果植物 ---------- */
pictures.apple = `${rg('ap', '#ff7d6e', '#d92f2f')}
${ground}
<path d="M120 84 C160 60 196 92 192 136 C188 176 152 208 120 202 C88 208 52 176 48 136 C44 92 80 60 120 84 Z" fill="url(#ap)" stroke="${O}" stroke-width="3"/>
<path d="M120 82 C118 64 124 52 138 44" fill="none" stroke="#7a4a26" stroke-width="9" stroke-linecap="round"/>
<path d="M124 62 C140 44 164 44 172 56 C160 72 136 74 124 62 Z" fill="#5ab544" stroke="#3d8a2c" stroke-width="3"/>
<path d="M84 104 C92 96 102 94 110 98" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".65"/>`;
pictures.apples = pictures.apple;

pictures.bananas = `${lg('bn', '#ffe27a', '#f0b429')}
${ground}
<path d="M56 70 C60 130 96 178 160 188 C186 192 202 180 204 166 C170 176 130 168 104 140 C86 120 78 96 80 72 C72 62 62 62 56 70 Z" fill="url(#bn)" stroke="${O}" stroke-width="3"/>
<path d="M62 84 C70 132 102 168 148 180" fill="none" stroke="#d99a1b" stroke-width="5" stroke-linecap="round"/>
<path d="M52 64 C58 56 68 56 74 62 L66 78 C58 78 52 72 52 64 Z" fill="#8a5a34" stroke="${O}" stroke-width="3"/>`;
pictures.banana = pictures.bananas;

pictures.oranges = `${rg('or', '#ffb14d', '#f0781f')}
${ground}
<circle cx="120" cy="134" r="66" fill="url(#or)" stroke="${O}" stroke-width="3"/>
<path d="M120 70 C118 58 122 50 132 46" fill="none" stroke="#5d7d3a" stroke-width="8" stroke-linecap="round"/>
<path d="M132 48 C150 36 172 42 176 56 C162 68 140 64 132 48 Z" fill="#5d9a44" stroke="#42762e" stroke-width="3"/>
<circle cx="96" cy="112" r="7" fill="#ffc98a" opacity=".8"/><circle cx="122" cy="96" r="5" fill="#ffc98a" opacity=".7"/><circle cx="148" cy="126" r="6" fill="#ffc98a" opacity=".6"/>
<path d="M84 106 C92 94 106 86 118 86" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".55"/>`;
pictures.orange = pictures.oranges;

pictures.grapes = `${rg('gr', '#b98cd8', '#7c3fa6')}
${ground}
<path d="M120 44 C118 58 118 66 120 76" fill="none" stroke="#5d7d3a" stroke-width="8" stroke-linecap="round"/>
<path d="M122 56 C140 44 162 48 166 60 C152 72 130 68 122 56 Z" fill="#5d9a44" stroke="#42762e" stroke-width="3"/>
<g fill="url(#gr)" stroke="${O}" stroke-width="2.5">
<circle cx="96" cy="92" r="19"/><circle cx="134" cy="90" r="19"/><circle cx="78" cy="124" r="19"/><circle cx="115" cy="122" r="19"/><circle cx="152" cy="122" r="19"/><circle cx="96" cy="156" r="19"/><circle cx="134" cy="156" r="19"/><circle cx="115" cy="188" r="19"/>
</g>
<path d="M86 86 C92 82 100 82 104 86" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".6"/>
<path d="M124 84 C130 80 138 80 142 84" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".6"/>`;

pictures.tree = `${lg('tr', '#8a5a34', '#6b4326')}
${rg('cr', '#8ed17a', '#4a9a34')}
${ground}
<path d="M108 210 L112 138 L128 138 L132 210 Z" fill="url(#tr)" stroke="${O}" stroke-width="3"/>
<path d="M120 148 C100 132 84 134 74 142 M120 162 C138 148 156 150 164 158" fill="none" stroke="#6b4326" stroke-width="7" stroke-linecap="round"/>
<circle cx="120" cy="96" r="52" fill="url(#cr)" stroke="#3d8a2c" stroke-width="3"/>
<circle cx="72" cy="116" r="34" fill="url(#cr)" stroke="#3d8a2c" stroke-width="3"/>
<circle cx="168" cy="116" r="34" fill="url(#cr)" stroke="#3d8a2c" stroke-width="3"/>
<circle cx="94" cy="76" r="9" fill="#e2404f"/><circle cx="140" cy="66" r="9" fill="#e2404f"/><circle cx="160" cy="100" r="8" fill="#e2404f"/><circle cx="72" cy="96" r="7" fill="#e2404f"/>`;
pictures.trees = pictures.tree;

pictures.flowers = `${lg('st', '#5d9a44', '#42762e')}
${rg('pt', '#ff9fb5', '#f26a92')}
${ground}
<path d="M118 208 C116 172 116 140 120 112" fill="none" stroke="#5d9a44" stroke-width="8" stroke-linecap="round"/>
<path d="M119 168 C104 158 92 160 86 170 C96 178 110 176 119 168 Z" fill="#5d9a44"/>
<path d="M121 146 C136 136 148 138 154 148 C144 156 130 154 121 146 Z" fill="#5d9a44"/>
<g stroke="${O}" stroke-width="2.5">
<ellipse cx="120" cy="70" rx="17" ry="26" fill="url(#pt)"/>
<ellipse cx="120" cy="70" rx="17" ry="26" fill="url(#pt)" transform="rotate(60 120 86)"/>
<ellipse cx="120" cy="70" rx="17" ry="26" fill="url(#pt)" transform="rotate(-60 120 86)"/>
</g>
<circle cx="120" cy="86" r="15" fill="#ffd23e" stroke="${O}" stroke-width="3"/>
<path d="M104 62 C110 56 118 54 124 56" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".6"/>`;

pictures.grass = `${lg('g1', '#7ecb5a', '#4a9a34')}
${lg('g2', '#5d9a44', '#3d7a2c')}
${ground}
<path d="M60 206 C58 168 66 138 84 118 C80 150 82 180 88 206 Z" fill="url(#g1)"/>
<path d="M96 206 C96 156 106 118 126 96 C118 134 116 172 118 206 Z" fill="url(#g2)"/>
<path d="M132 206 C136 164 148 134 170 116 C158 148 154 178 154 206 Z" fill="url(#g1)"/>
<path d="M162 206 C166 180 176 162 192 152 C184 172 182 190 182 206 Z" fill="url(#g2)"/>
<path d="M40 206 C44 182 54 166 68 158 C60 176 56 192 56 206 Z" fill="url(#g2)"/>
<path d="M74 128 C86 120 98 120 108 126 M128 104 C140 96 154 96 164 102" fill="none" stroke="#7ecb5a" stroke-width="4" stroke-linecap="round"/>`;

pictures.sun = `${rg('sun', '#ffe9a8', '#ffb625')}
${ground}
<g stroke="#ffb625" stroke-width="9" stroke-linecap="round">
<path d="M120 22 L120 48"/><path d="M120 172 L120 198"/><path d="M22 118 L48 118"/><path d="M172 118 L198 118"/>
<path d="M52 52 L71 71"/><path d="M169 165 L188 184"/><path d="M188 52 L169 71"/><path d="M71 165 L52 184"/>
</g>
<circle cx="120" cy="118" r="54" fill="url(#sun)" stroke="#f09a1b" stroke-width="3"/>
<circle cx="100" cy="100" r="10" fill="#fff" opacity=".55"/>
<path d="M98 132 C106 142 134 142 142 132" fill="none" stroke="#e8912a" stroke-width="5" stroke-linecap="round"/>`;

pictures.air = `${lg('lf', '#7ecb5a', '#4a9a34')}
${ground}
<path d="M34 78 C74 58 118 58 158 76 C186 88 206 86 218 74" fill="none" stroke="#7fc3e8" stroke-width="12" stroke-linecap="round"/>
<path d="M48 120 C88 102 132 104 168 120 C192 130 208 128 218 118" fill="none" stroke="#a9d8ee" stroke-width="10" stroke-linecap="round"/>
<path d="M64 160 C98 146 136 148 166 162" fill="none" stroke="#cfeaf7" stroke-width="9" stroke-linecap="round"/>
<path d="M168 148 C188 138 208 142 214 156 C206 168 184 170 172 160 C180 158 192 160 198 164" fill="url(#lf)" stroke="#3d8a2c" stroke-width="3"/>`;

pictures.water = `${lg('dr', '#8ed8f5', '#2f88c4')}
${ground}
<path d="M120 34 C160 88 186 122 186 154 C186 190 156 212 120 212 C84 212 54 190 54 154 C54 122 80 88 120 34 Z" fill="url(#dr)" stroke="${O}" stroke-width="3"/>
<path d="M96 84 C82 106 70 126 70 146" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".5"/>
<path d="M78 170 C88 182 104 188 118 186" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".4"/>`;

/* ---------- 颜色：光泽气球 ---------- */
const balloon = (name, top, bottom, stroke) => {
  pictures[name] = `${lg('bl', top, bottom)}
${ground}
<path d="M120 176 C120 192 112 198 104 204" fill="none" stroke="${stroke}" stroke-width="5" stroke-linecap="round"/>
<path d="M108 168 L132 168 L126 180 L114 180 Z" fill="${bottom}" stroke="${O}" stroke-width="3"/>
<ellipse cx="120" cy="106" rx="66" ry="76" fill="url(#bl)" stroke="${stroke}" stroke-width="3.5"/>
<path d="M78 68 C86 52 102 42 118 40" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".6"/>
<ellipse cx="146" cy="70" rx="9" ry="14" fill="#fff" opacity=".35" transform="rotate(24 146 70)"/>`;
};
balloon('red', '#ff8a7a', '#d92f2f', '#b02323');
balloon('orange', '#ffc37a', '#f0781f', '#c65e12');
balloon('yellow', '#ffe9a8', '#f0b429', '#cf9512');
balloon('green', '#9ad98a', '#3d9a4c', '#2e7a3a');
balloon('blue', '#8ed8f5', '#2f88c4', '#1f6ba0');
balloon('purple', '#cbaee0', '#7c3fa6', '#5f2d82');
balloon('pink', '#ffd3e2', '#f26a9a', '#d14e7e');
balloon('brown', '#d8ab7a', '#8a5a34', '#6b4326');
balloon('black', '#6b7285', '#33384a', '#22283b');
balloon('white', '#ffffff', '#e6ecf2', '#a9b6c4');

/* ---------- 数字：玩具积木 ---------- */
const digits = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10' };
const blockColors = {
  one: ['#ffd23e', '#c98f12'], two: ['#7fd0e8', '#2f74a8'], three: ['#9ad98a', '#2e7a3a'], four: ['#ffb3c1', '#c73855'],
  five: ['#cbaee0', '#5f2d82'], six: ['#ffb14d', '#b35d12'], seven: ['#8ed8f5', '#1f6ba0'], eight: ['#f6b45a', '#a35d18'],
  nine: ['#b98cd8', '#5f2d82'], ten: ['#57bd8d', '#2e7a3a'],
};
for (const [word, digit] of Object.entries(digits)) {
  const [c1, c2] = blockColors[word];
  pictures[word] = `${lg('bk', c1, c2)}
${ground}
<rect x="52" y="52" width="136" height="140" rx="22" fill="url(#bk)" stroke="${O}" stroke-width="4"/>
<rect x="66" y="66" width="108" height="112" rx="16" fill="#fff" opacity=".88"/>
<text x="120" y="146" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="${word === 'ten' ? 62 : 76}" fill="${c2}">${digit}</text>`;
}

let count = 0;
for (const [slug, inner] of Object.entries(pictures)) {
  writeFileSync(join(outDir, `${slug}.svg`), wrap(inner));
  count += 1;
}
console.log(`rendered ${count} word pictures -> ${outDir}`);
