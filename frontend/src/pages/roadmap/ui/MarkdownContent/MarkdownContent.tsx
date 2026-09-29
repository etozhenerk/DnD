import type {ReactNode} from 'react';
import type {MarkdownBlock} from '../../model/roadmap';
import styles from './MarkdownContent.module.css';

interface MarkdownContentProps {
  blocks: MarkdownBlock[];
}

function renderInline(text: string): ReactNode[] {
  const tokenPattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+]\([^)]+\))/g;

  return text.split(tokenPattern).filter(Boolean).map((token, index) => {
    if (token.startsWith('**') && token.endsWith('**')) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith('`') && token.endsWith('`')) return <code key={index}>{token.slice(1, -1)}</code>;

    const link = token.match(/^\[([^\]]+)]\(([^)]+)\)$/);
    if (link && /^https?:\/\//.test(link[2])) {
      return <a href={link[2]} key={index} rel="noreferrer" target="_blank">{link[1]}<span className={styles.external} aria-hidden="true">↗</span></a>;
    }
    if (link) return <span key={index}>{link[1]}</span>;
    return token;
  });
}

export function MarkdownContent({blocks}: MarkdownContentProps) {
  return (
    <div className={styles.content}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return block.level === 3
            ? <h3 key={index}>{renderInline(block.text)}</h3>
            : <h4 key={index}>{renderInline(block.text)}</h4>;
        }
        if (block.type === 'paragraph') return <p key={index}>{renderInline(block.text)}</p>;
        if (block.type === 'quote') return <blockquote key={index}>{renderInline(block.text)}</blockquote>;
        if (block.type === 'code') return <pre key={index}><code>{block.text}</code></pre>;
        const List = block.ordered ? 'ol' : 'ul';
        return <List key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}</List>;
      })}
    </div>
  );
}
