import {FantasyHeading} from '../../../../shared/ui/FantasyHeading';
import type {CreatedCharacterItem} from '../../../../entities/character';
import {getUsesLabel} from '../../../../entities/character';
import styles from './CharacterEquipment.module.css';

export type CharacterEquipmentProps = {items: CreatedCharacterItem[]};

export function CharacterEquipment({items}: CharacterEquipmentProps) {
  return (
    <section className={styles.section} aria-label="Снаряжение персонажа">
      <FantasyHeading>Снаряжение</FantasyHeading>
      {items.length === 0 && <p>Снаряжение не добавлено.</p>}
      <div className={styles.items}>{items.map((item) => (
        <article key={item.id} className={styles.item}>
          <h3>{item.name}</h3>
          {item.description && <p>{item.description}</p>}
          {item.effectText && <p>{item.effectText}</p>}
          {item.charges && <small>Заряды: {getUsesLabel(item.charges.scope, item.charges.max)}</small>}
        </article>
      ))}</div>
    </section>
  );
}
