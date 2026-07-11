import {useState} from 'react';
import type {Character} from '../../../../entities/character/model/types';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {getStatLabel} from '../../../../shared/lib/character/getStatLabel';
import styles from './HeroLegends.module.css';

export function HeroLegends({heroes}: {heroes: Character[]}) {
  const [skillPages, setSkillPages] = useState<Record<string, boolean>>({});

  return (
    <section className={styles.legends}>
      <header className={styles.heading}>
        <span>Книга странников</span>
        <h2>Имена, вписанные в легенду</h2>
        <p>Пять судеб на страницах одной хроники.</p>
      </header>
      <div className={styles.shelf}>
        {heroes.map((hero) => {
          const isSkillsPage = Boolean(skillPages[hero.id]);

          return (
            <article className={styles.book} key={hero.id}>
              {!isSkillsPage ? (
                <>
                  <div className={styles.portraitPage}>
                    <img src={resolveAsset(hero.visual.portrait)} alt={hero.visual.alt} />
                    <div className={styles.hp}><small>HP</small><strong>{hero.maxHp}</strong></div>
                    <div className={styles.ac}><small>AC</small><strong>{hero.ac}</strong></div>
                  </div>
                  <div className={styles.storyPage}>
                    <p className={styles.race}>{hero.race}</p>
                    <h3>{hero.name}</h3>
                    <strong className={styles.role}>{hero.role}</strong>
                    <div className={styles.ornament}>✦</div>
                    <p className={styles.story}>{hero.story}</p>
                    <div className={styles.motivation}>
                      <span>Стремление</span>
                      <p>{hero.motivation}</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.statsPage}>
                    <p className={styles.race}>Лист героя</p>
                    <h3>{hero.name}</h3>
                    <div className={styles.stats}>
                      {Object.entries(hero.stats).map(([stat, value]) => (
                        <div key={stat}>
                          <span>{getStatLabel(stat as keyof Character['stats'])}</span>
                          <strong>{value >= 0 ? '+' : ''}{value}</strong>
                        </div>
                      ))}
                    </div>
                    <div className={styles.vitals}><span>HP <strong>{hero.maxHp}</strong></span><span>AC <strong>{hero.ac}</strong></span></div>
                  </div>
                  <div className={styles.abilitiesPage}>
                    <p className={styles.race}>Навыки и особенности</p>
                    <div className={styles.abilities}>
                      {hero.abilities.map((ability) => (
                        <div key={ability.id}><h4>{ability.name}</h4><p>{ability.description}</p><small>{ability.effect}</small></div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <footer className={styles.pagination}>
                <button type="button" aria-label={`Предыдущий разворот: ${hero.name}`} disabled={!isSkillsPage} onClick={() => setSkillPages((pages) => ({...pages, [hero.id]: false}))}>‹</button>
                <span>{isSkillsPage ? 'II · навыки' : 'I · легенда'}</span>
                <button type="button" aria-label={`Следующий разворот: ${hero.name}`} disabled={isSkillsPage} onClick={() => setSkillPages((pages) => ({...pages, [hero.id]: true}))}>›</button>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}
