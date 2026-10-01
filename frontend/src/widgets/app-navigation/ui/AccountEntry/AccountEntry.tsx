import {UserIcon} from '../../../../shared/ui/UserIcon';
import styles from './AccountEntry.module.css';

export function AccountEntry() {
  return (
    <button className={styles.entry} type="button" disabled title="Вход появится после подключения авторизации">
      <UserIcon /><span>Войти</span>
    </button>
  );
}
