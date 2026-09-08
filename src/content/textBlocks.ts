import type { ContentBlock } from './skills';

/** 栏目标题 → 内容块类型 */
const TITLES: Record<string, ContentBlock['kind']> = {
  '识字加油站': 'title',
  '字词句运用': 'exercise',
  '书写提示': 'tip',
  '日积月累': 'memo',
  '和大人一起读': 'read',
  '读一读': 'read',
  '用拼音': 'pinyin',
  '比一比': 'exercise',
  '比一比，读一读': 'exercise',
  '连一连': 'exercise',
  '口语交际': 'exercise',
  '展示台': 'exercise',
  '我的发现': 'tip',
};

/** 把一整段混合文本按栏目标题拆成结构化块；无栏目则退化为普通段落块 */
export function parseTextBlocks(text: string): ContentBlock[] {
  const lines = text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const blocks: ContentBlock[] = [];
  let cur: ContentBlock | null = null;
  for (const line of lines) {
    const kind = TITLES[line];
    if (kind) {
      cur = { kind, title: line, lines: [] };
      blocks.push(cur);
      continue;
    }
    if (!cur) {
      cur = { kind: 'text', lines: [] };
      blocks.push(cur);
    }
    cur.lines.push(line);
  }
  if (blocks.length === 0) {
    blocks.push({ kind: 'text', lines: [] });
  }
  return blocks;
}
