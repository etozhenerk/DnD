export type ReplyToken = {kind: 'text' | 'strong' | 'code'; text: string};
export type ReplyLine = {kind: 'paragraph' | 'heading' | 'list'; tokens: ReplyToken[]};

// Deliberately small Markdown subset. HTML, images and links stay inert text.
export function parseAdvisorReply(text: string): ReplyLine[] {
  return text.split('\n').filter((line) => line.trim()).map((line) => {
    let kind: ReplyLine['kind'] = 'paragraph';
    if (/^#{1,4}\s/.test(line)) {kind = 'heading'; line = line.replace(/^#{1,4}\s+/, '');}
    if (/^([-*]|\d+\.)\s/.test(line)) {kind = 'list'; line = line.replace(/^([-*]|\d+\.)\s+/, '');}
    const tokens: ReplyToken[] = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((token) => {
      if (token.startsWith('**') && token.endsWith('**')) return {kind: 'strong', text: token.slice(2, -2)};
      if (token.startsWith('`') && token.endsWith('`')) return {kind: 'code', text: token.slice(1, -1)};
      return {kind: 'text', text: token};
    });
    return {kind, tokens};
  });
}
