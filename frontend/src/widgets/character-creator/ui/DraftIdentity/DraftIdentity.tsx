import {FantasyFrame} from '../../../../shared/ui/FantasyFrame';
import {getDraftName} from '../../../../entities/character-draft';
import type {CharacterDraft} from '../../../../entities/character-draft';
import {FantasySeal} from '../../../../shared/ui/FantasySeal';
import styles from './DraftIdentity.module.css';

export type DraftIdentityProps = {draft: CharacterDraft};

export function DraftIdentity({draft}: DraftIdentityProps) {
  return (
    <aside className={styles.identity} aria-label="Ваш герой">
      <FantasyFrame />
      <div className={styles.portrait} aria-hidden="true">
        <div className={styles.seal}><FantasySeal /></div>
        <span>Портрет будущего героя</span>
      </div>
      <p>Черновик героя</p>
      <h2>{getDraftName(draft)}</h2>
      <span className={styles.caption}>Его история только начинается.</span>
      <div className={styles.status}><span aria-hidden="true">✓</span> Черновик сохранён</div>
    </aside>
  );
}
