import type {CampaignSessionPartyMember} from '../../model/types';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './HeroToken.module.css';

interface HeroTokenProps {
  hero: CampaignSessionPartyMember;
}

export function HeroToken({hero}: HeroTokenProps) {
  return (
    <figure className={styles.token} title={hero.label}>
      <img data-hero-id={hero.characterId} src={resolveAsset(hero.token)} alt={`Жетон героя: ${hero.label}`} />
      <figcaption>{hero.label}</figcaption>
    </figure>
  );
}
