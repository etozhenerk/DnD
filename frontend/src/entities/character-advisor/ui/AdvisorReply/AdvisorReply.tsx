import {parseAdvisorReply} from '../../lib/reply-format';
import {useTypedReply} from '../../model/useTypedReply';
import styles from './AdvisorReply.module.css';

export type AdvisorReplyProps = {text: string; animate: boolean};

export function AdvisorReply({text, animate}: AdvisorReplyProps) {
  const visible = useTypedReply(text, animate);
  return (
    <div className={styles.reply}>
      <span className={styles.accessible}>{text}</span>
      <div aria-hidden="true">
        {parseAdvisorReply(visible).map((line, index) => (
          <p key={index} className={styles[line.kind]}>
            {line.tokens.map((token, tokenIndex) => {
              if (token.kind === 'strong') return <strong key={tokenIndex}>{token.text}</strong>;
              if (token.kind === 'code') return <code key={tokenIndex}>{token.text}</code>;
              return <span key={tokenIndex}>{token.text}</span>;
            })}
          </p>
        ))}
      </div>
    </div>
  );
}
