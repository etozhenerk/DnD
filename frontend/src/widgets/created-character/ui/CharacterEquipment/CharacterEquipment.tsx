import {FantasyFrame} from '../../../../shared/ui/FantasyFrame';
import type {CreatedCharacterItem} from '../../../../entities/character';
import {getUsesLabel} from '../../../../entities/character';
import styles from './CharacterEquipment.module.css';

export type CharacterEquipmentProps = {items: CreatedCharacterItem[]};

export function CharacterEquipment({items}: CharacterEquipmentProps) {
  return (
    <section className={styles.section} aria-label="Снаряжение персонажа">
      <FantasyFrame />
      <h2>Снаряжение</h2>
      {items.length === 0 && <p>Снаряжение не добавлено.</p>}
      {items.map((item) => (
        <article key={item.id}>
          <h3>{item.name}</h3>
          {item.description && <p>{item.description}</p>}
          {item.effectText && <p>{item.effectText}</p>}
          {item.charges && <small>Заряды: {getUsesLabel(item.charges.scope, item.charges.max)}</small>}
        </article>
      ))}
    </section>
  );
}
