import {creationRules, getClassFocus} from '../../../../entities/character-form';
import type {ClassProfile} from '../../../../entities/character-form';
import {getAttributeLabel} from '../../../../entities/character';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene';
import styles from './ClassDescription.module.css';

export type ClassDescriptionProps = {profile: ClassProfile};

export function ClassDescription({profile}: ClassDescriptionProps) {
  return (
    <SceneTextPanel collapsible={false} resetKey={profile.id} className={styles.description}>
      <h3>{profile.name}</h3>
      <p>{profile.description}</p>
      <dl className={styles.facts}>
        <div><dt>Стиль игры</dt><dd>{profile.playStyle}</dd></div>
        <div><dt>Сильные характеристики</dt><dd>{getClassFocus(profile).map(getAttributeLabel).join(' и ')}</dd></div>
        <div><dt>Слабые стороны</dt><dd>{profile.weakness}</dd></div>
      </dl>
      <h4>Что задаёт класс</h4>
      <ul className={styles.impact}>
        <li><strong>Характеристики.</strong> Основа класса сохраняется. На следующем этапе вы распределите ещё {creationRules.classFoundation.bonusBudget} очка поверх неё.</li>
        <li><strong>Здоровье.</strong> База — {profile.baseHp} HP. Телосложение добавляет {creationRules.derivedStats.maxHp.constitutionMultiplier} HP за единицу модификатора; отрицательное значение уменьшает здоровье.</li>
        <li><strong>Защита.</strong> База — {profile.baseAc}. Положительный вклад Ловкости учитывается до +{profile.dexterityAcCap}; отрицательная Ловкость снижает защиту.</li>
      </ul>
      <p className={styles.skills}>{creationRules.classSelection.skillExplanation}</p>
    </SceneTextPanel>
  );
}
