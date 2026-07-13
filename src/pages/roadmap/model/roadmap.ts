import productRoadmapSource from '../../../../docs/product-roadmap.md?raw';
import stage1Source from '../../../../docs/roadmap/stage-1-static-mvp.md?raw';
import stage2Source from '../../../../docs/roadmap/stage-2-agent-campaign.md?raw';
import stage3Source from '../../../../docs/roadmap/stage-3-backend.md?raw';
import stage4Source from '../../../../docs/roadmap/stage-4-character-editor.md?raw';
import stage5Source from '../../../../docs/roadmap/stage-5-auth.md?raw';
import stage6Source from '../../../../docs/roadmap/stage-6-campaign-studio.md?raw';
import stage7Source from '../../../../docs/roadmap/stage-7-game-sessions.md?raw';

export type MarkdownBlock =
  | {type: 'heading'; level: 3 | 4; text: string}
  | {type: 'paragraph'; text: string}
  | {type: 'list'; ordered: boolean; items: string[]}
  | {type: 'quote'; text: string}
  | {type: 'code'; text: string};

export interface RoadmapSection {
  title: string;
  blocks: MarkdownBlock[];
}

export interface RoadmapStage {
  number: number;
  title: string;
  status: string;
  goal: string;
  sections: RoadmapSection[];
}

function normalizeInline(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function plainText(value: string): string {
  return normalizeInline(value
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, ''));
}

function parseBlocks(lines: string[]): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{3,4})\s+(.+)$/);
    if (heading) {
      blocks.push({type: 'heading', level: heading[1].length as 3 | 4, text: heading[2]});
      index += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }
      blocks.push({type: 'code', text: code.join('\n')});
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push({type: 'quote', text: normalizeInline(quote.join(' '))});
      continue;
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      const isOrdered = Boolean(ordered);
      const items: string[] = [];
      const pattern = isOrdered ? /^\s*\d+[.)]\s+(.+)$/ : /^\s*[-*]\s+(.+)$/;
      while (index < lines.length) {
        const item = lines[index].match(pattern);
        if (!item) break;
        items.push(normalizeInline(item[1]));
        index += 1;
      }
      blocks.push({type: 'list', ordered: isOrdered, items});
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length) {
      const current = lines[index];
      if (!current.trim() || /^(#{2,4})\s+/.test(current) || current.startsWith('```') || /^>\s?/.test(current) || /^\s*[-*]\s+/.test(current) || /^\s*\d+[.)]\s+/.test(current)) break;
      paragraph.push(current);
      index += 1;
    }
    blocks.push({type: 'paragraph', text: normalizeInline(paragraph.join(' '))});
  }

  return blocks;
}

function parseSections(source: string): RoadmapSection[] {
  const sectionSource = source.slice(source.indexOf('## Цель'));
  const lines = sectionSource.split('\n');
  const sections: RoadmapSection[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];

  const flush = () => {
    if (currentTitle) sections.push({title: currentTitle, blocks: parseBlocks(currentLines)});
    currentLines = [];
  };

  lines.forEach((line) => {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      flush();
      currentTitle = heading[1];
    } else {
      currentLines.push(line);
    }
  });
  flush();

  return sections;
}

function parseStage(source: string): RoadmapStage {
  const titleMatch = source.match(/^# Этап (\d+)\.\s+(.+)$/m);
  const statusMatch = source.match(/^Статус:\s*(.+?)\.?$/m);
  const sections = parseSections(source);
  const goal = sections.find((section) => section.title === 'Цель')?.blocks
    .filter((block): block is Extract<MarkdownBlock, {type: 'paragraph'}> => block.type === 'paragraph')
    .map((block) => plainText(block.text))
    .join(' ') ?? '';

  if (!titleMatch) throw new Error('Не удалось прочитать заголовок этапа roadmap');

  return {
    number: Number(titleMatch[1]),
    title: titleMatch[2],
    status: statusMatch?.[1] ?? 'Не указан',
    goal,
    sections,
  };
}

const stageSources = [stage1Source, stage2Source, stage3Source, stage4Source, stage5Source, stage6Source, stage7Source];

export const roadmapStages = stageSources.map(parseStage);

export const roadmapOverview = {
  title: productRoadmapSource.match(/^#\s+(.+)$/m)?.[1] ?? 'Продуктовый roadmap',
  status: productRoadmapSource.match(/^Статус:\s*(.+?)\.?$/m)?.[1] ?? '',
  updatedAt: productRoadmapSource.match(/^Дата фиксации:\s*(.+?)\.?$/m)?.[1] ?? '',
};
