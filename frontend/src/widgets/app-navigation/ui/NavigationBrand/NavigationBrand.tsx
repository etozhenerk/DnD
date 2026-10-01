import {Link} from 'react-router-dom';
import {navigationLogo} from '../../config/navigation-art';
import styles from './NavigationBrand.module.css';

export function NavigationBrand() {
  return (
    <Link className={styles.brand} to="/" aria-label="Хроники Восьми Земель — на карту">
      <img className={styles.logo} src={navigationLogo} alt="" aria-hidden="true" width={258} height={86} />
    </Link>
  );
}
