import {useMemo, useState, type CSSProperties} from 'react';
import type {Character} from '../../../../entities/character/model/types';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {getTriggerLabel, getUsesLabel, isPassiveAbility} from '../../../../shared/lib/character/getAbilityMeta';
import {getCombatNotes} from '../../../../shared/lib/character/getCombatNotes';
import {getStatLabel} from '../../../../shared/lib/character/getStatLabel';
import styles from './HeroLegends.module.css';

export function HeroLegends({heroes}: {heroes: Character[]}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeHero = heroes[activeIndex] ?? heroes[0];
  const facePosition: Record<string, string> = {
    bubsilda: 'center 24%',
    linda: '42% 24%',
    lambert: 'center 22%',
    'lord-krayneplot': '47% 24%',
    'golovach-lena': 'center 18%',
  };
  const faceScale: Record<string, string> = {
    bubsilda: '1.18',
    linda: '1.14',
    lambert: '1.12',
    'lord-krayneplot': '1.16',
    'golovach-lena': '1.2',
  };
  const sceneStyle = {
    '--arrow-left-image': `url("${resolveAsset('assets/concepts/ui/hero-book-arrow-left.png')}")`,
    '--arrow-right-image': `url("${resolveAsset('assets/concepts/ui/hero-book-arrow-right.png')}")`,
    '--bookmark-image': `url("${resolveAsset('assets/concepts/ui/hero-book-bookmark.png')}")`,
    '--icon-ac': `url("${resolveAsset('assets/concepts/ui/hero-book-icon-ac.png')}")`,
    '--icon-attack': `url("${resolveAsset('assets/concepts/ui/hero-book-icon-attack.png')}")`,
    '--icon-hp': `url("${resolveAsset('assets/concepts/ui/hero-book-icon-hp.png')}")`,
    '--hero-book-cover': `url("${resolveAsset('assets/concepts/style/planned-campaign-open-book.png')}")`,
  } as CSSProperties;

  const passiveAbilities = useMemo(
    () => activeHero.abilities.filter(isPassiveAbility),
    [activeHero],
  );
  const activeAbilities = useMemo(
    () => activeHero.abilities.filter((ability) => !passiveAbilities.includes(ability)),
    [activeHero, passiveAbilities],
  );
  const combatNotes = useMemo(() => getCombatNotes(activeHero), [activeHero]);
  const primaryAttack = combatNotes[0];

  if (!activeHero) return null;

  const openPrevious = () => setActiveIndex((index) => (index - 1 + heroes.length) % heroes.length);
  const openNext = () => setActiveIndex((index) => (index + 1) % heroes.length);

  return (
    <section className={styles.legends} style={sceneStyle} aria-label="Книга героев">
      <div className={styles.stage}>
        <nav className={styles.bookmarks} aria-label="Выбор героя">
          {heroes.map((hero, index) => (
            <button
              aria-label={`Открыть героя: ${hero.name}`}
              aria-selected={hero.id === activeHero.id}
              className={`${styles.bookmarkButton} ${hero.id === activeHero.id ? styles.currentHero : ''}`}
              key={hero.id}
              onClick={() => setActiveIndex(index)}
              style={{
                '--face-position': facePosition[hero.id] ?? 'center 16%',
                '--face-scale': faceScale[hero.id] ?? '1.9',
              } as CSSProperties}
              type="button"
            >
              <span className={styles.bookmarkPortrait}><img src={resolveAsset(hero.visual.portrait)} alt="" /></span>
            </button>
          ))}
        </nav>
        <button className={`${styles.pageTurn} ${styles.previous}`} onClick={openPrevious} type="button" aria-label="Предыдущий герой">‹</button>
        <article className={styles.book} aria-labelledby={`hero-title-${activeHero.id}`}>
          <div className={styles.bookInner}>
            <section className={`${styles.bookPage} ${styles.identityPage}`} aria-label={`Легенда героя ${activeHero.name}`}>
              <div className={styles.portraitFrame}>
                <img src={resolveAsset(activeHero.visual.portrait)} alt={activeHero.visual.alt} />
              </div>
              <div className={styles.identityCopy}>
                <p className={`${styles.kicker} ${activeHero.race.length > 42 ? styles.longKicker : ''}`}>{activeHero.race}</p>
                <h2 id={`hero-title-${activeHero.id}`}>{activeHero.name}</h2>
                <strong className={styles.role}>{activeHero.role}</strong>
                <div className={styles.heroSummary}>
                  <div className={`${styles.vital} ${styles.hpVital}`} aria-label={`HP ${activeHero.maxHp}`}><span aria-hidden="true" /><strong>{activeHero.maxHp}</strong></div>
                  <div className={`${styles.vital} ${styles.acVital}`} aria-label={`Защита ${activeHero.ac}`}><span aria-hidden="true" /><strong>{activeHero.ac}</strong></div>
                  {primaryAttack ? (
                    <div className={styles.primaryAttack} aria-label={`Основная атака: ${primaryAttack.name}`}>
                      <span aria-hidden="true" />
                      <div><strong>{primaryAttack.name}</strong><p>{primaryAttack.effect}</p></div>
                    </div>
                  ) : null}
                </div>
                <div className={styles.stats} aria-label="Характеристики">
                  {Object.entries(activeHero.stats).map(([stat, value]) => (
                    <div key={stat}>
                      <span>{getStatLabel(stat as keyof Character['stats'])}</span>
                      <strong>{value >= 0 ? '+' : ''}{value}</strong>
                    </div>
                  ))}
                </div>
                <p className={styles.story}>{activeHero.story}</p>
                <div className={styles.motivation}>
                  <span>Стремление</span>
                  <p>{activeHero.motivation}</p>
                </div>
              </div>
            </section>

            <section className={`${styles.bookPage} ${styles.sheetPage}`} aria-label={`Характеристики и навыки героя ${activeHero.name}`}>
              <section className={styles.skills} aria-label="Навыки героя">
                <h3>Навыки и эффекты</h3>
                <div className={styles.skillList}>
                  {[...passiveAbilities, ...activeAbilities].map((ability) => (
                    <article className={styles.skillCard} key={ability.id}>
                      <header>
                        <strong>{ability.name}</strong>
                        <span>{getTriggerLabel(ability.trigger)} · {getUsesLabel(ability.uses)}</span>
                      </header>
                      <p>{ability.description}</p>
                      <small>{ability.check ? `${ability.check}. ` : ''}{ability.effect}</small>
                    </article>
                  ))}
                </div>
              </section>
            </section>
          </div>
        </article>
        <button className={`${styles.pageTurn} ${styles.next}`} onClick={openNext} type="button" aria-label="Следующий герой">›</button>
      </div>
    </section>
  );
}
