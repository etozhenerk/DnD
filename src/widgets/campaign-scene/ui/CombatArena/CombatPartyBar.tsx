import {useEffect, useRef} from 'react';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import type {CombatantView, CombatTargetView} from './combatTypes';
import {combatPortraitStyle} from './combatPortraitStyle';
import styles from './CombatPartyBar.module.css';

interface CombatPartyBarProps {
  combatants: CombatantView[];
  heroes: CombatTargetView[];
  logs: string[];
}

const statIcons = {
  hp: 'assets/concepts/ui/hero-book-icon-hp.png',
  ac: 'assets/concepts/ui/hero-book-icon-ac.png',
};

function splitCombatLog(message: string) {
  const separator = message.indexOf(':');
  if (separator > 0 && separator < 36) return {
    actor: message.slice(0, separator),
    detail: message.slice(separator + 1).trim(),
  };
  return {actor: 'Сцена', detail: message};
}

export function CombatPartyBar({combatants, heroes, logs}: CombatPartyBarProps) {
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const scrollToLatest = () => { log.scrollTop = log.scrollHeight; };
    scrollToLatest();
    const observer = new ResizeObserver(scrollToLatest);
    observer.observe(log);
    return () => observer.disconnect();
  }, [logs]);

  return (
    <footer className={styles.footer} aria-label="Состояние команды и журнал боя">
      <div className={styles.heroes} aria-label="Состояние героев">
        {heroes.map((hero) => (
          <span
            className={hero.hp <= 0 ? styles.downed : ''}
            key={hero.id}
            style={combatPortraitStyle(hero)}
            title={`${hero.name}: ${hero.hp}/${hero.maxHp} HP, AC ${hero.ac}`}
          >
            <img className={styles.heroAvatar} src={resolveAsset(hero.token)} alt="" />
            <span className={styles.heroCopy}>
              <strong>{hero.name}</strong>
              <small>
                <span><img src={resolveAsset(statIcons.hp)} alt="" /><b>{hero.hp}/{hero.maxHp}</b></span>
                <span><img src={resolveAsset(statIcons.ac)} alt="" /><b>{hero.ac}</b></span>
              </small>
            </span>
          </span>
        ))}
      </div>
      <section className={styles.chat} aria-label="Журнал действий">
        <strong>Журнал боя</strong>
        <ol ref={logRef} aria-live="polite">
          {logs.map((message, index) => {
            const entry = splitCombatLog(message);
            const actor = combatants.find((combatant) => combatant.name === entry.actor);
            return (
              <li key={`${index}-${message}`} style={actor ? combatPortraitStyle(actor) : undefined} title={message}>
                {actor ? (
                  <img className={styles.logAvatar} src={resolveAsset(actor.token)} alt="" />
                ) : <span className={styles.sceneMarker} aria-hidden="true">◆</span>}
                <span className={styles.logCopy}>
                  <b>{entry.actor}</b>
                  <span>{entry.detail}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </footer>
  );
}
