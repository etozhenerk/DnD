import type {OlvaEvidence} from './olvaQuest';

export function getOlvaDocument(evidence: OlvaEvidence) {
  const pageBlocks = evidence.documentPages;
  const pages = pageBlocks.map(blocks => blocks.map(block => block.text).join('\n\n'));
  const messages = evidence.kind === 'messages' ? evidence.text.split('\n').filter(Boolean).map(line => {
    const match = line.match(/^(\d{2}:\d{2}) · ([^:]+): (.*)$/);
    return match ? {time: match[1], author: match[2], text: match[3]} : {time: '', author: '', text: line};
  }) : [];
  return {pages, pageBlocks, messages};
}
