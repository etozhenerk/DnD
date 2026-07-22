import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import type {CombatTargetView} from './combatTypes';
import {combatPortraitStyle} from './combatPortraitStyle';
import styles from './CombatTargetList.module.css';

interface CombatTargetListProps {
  allowDowned?: boolean;
  locked: boolean;
  onSelect: (targetId: string) => void;
  selectedId: string;
  targets: CombatTargetView[];
}

const frameAtlasPath = 'assets/concepts/campaigns/penisuela/ui/token-frame-atlas.png';
const statIcons = {
  hp: 'assets/concepts/ui/hero-book-icon-hp.png',
  ac: 'assets/concepts/ui/hero-book-icon-ac.png',
};

export function CombatTargetList({allowDowned = false, locked, onSelect, selectedId, targets}: CombatTargetListProps) {
  return (
    <section
      className={styles.section}
      data-layout={targets.length <= 2 ? 'rows' : 'tokens'}
      aria-labelledby="combat-targets-title"
    >
      <div className={styles.heading}>
        <div>
          <p>Цель действия</p>
          <h2 id="combat-targets-title">{targets[0]?.faction === 'enemy' ? 'Противники' : 'Герои'}</h2>
        </div>
        {locked ? <strong>Зафиксирована</strong> : <span>Выберите цель</span>}
      </div>
      <div className={styles.list}>
        {targets.map((target) => {
          const selected = target.id === selectedId;
          const downed = target.hp <= 0;
          const revivable = downed && allowDowned;
          return (
            <button
              className={`${styles.target} ${selected ? styles.selected : ''} ${downed ? styles.downed : ''} ${revivable ? styles.revivable : ''}`}
              data-faction={target.faction}
              key={target.id}
              style={combatPortraitStyle(target)}
              type="button"
              disabled={downed && !allowDowned}
              aria-pressed={selected}
              aria-disabled={locked || (downed && !allowDowned)}
              aria-label={`${target.name}, HP ${target.hp} из ${target.maxHp}, AC ${target.ac}${downed ? allowDowned ? ', можно поднять лечением' : ', выведен из боя' : ''}`}
              onClick={() => {
                if (!locked && (!downed || allowDowned)) onSelect(target.id);
              }}
              title={`${target.name}: ${target.hp}/${target.maxHp} HP, AC ${target.ac}${revivable ? ' · Можно поднять' : ''}`}
            >
              <span className={styles.token}>
                <img className={styles.portrait} src={resolveAsset(target.token)} alt="" />
                {target.faction === 'enemy' ? (
                  <span className={styles.frame} aria-hidden="true"><img src={resolveAsset(frameAtlasPath)} alt="" /></span>
                ) : null}
              </span>
              <span className={styles.copy}>
                <strong>{target.name}</strong>
                <span className={styles.health} aria-hidden="true">
                  <i style={{width: `${Math.max(0, target.hp / target.maxHp * 100)}%`}} />
                </span>
                <span className={styles.stats}>
                  <span><img src={resolveAsset(statIcons.hp)} alt="" /><small>HP</small><strong>{target.hp}/{target.maxHp}</strong></span>
                  <span><img src={resolveAsset(statIcons.ac)} alt="" /><small>AC</small><strong>{target.ac}</strong></span>
                </span>
              </span>
              <span className={styles.state}>{revivable ? 'Поднять' : downed ? 'Выведен' : selected ? 'Выбрана' : ''}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
