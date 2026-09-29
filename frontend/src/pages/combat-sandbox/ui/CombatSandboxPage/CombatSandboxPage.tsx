import {CombatSandbox} from '../../../../widgets/combat-sandbox/ui/CombatSandbox/CombatSandbox';
import styles from './CombatSandboxPage.module.css';

export function CombatSandboxPage() {
  return (
    <main className={styles.page}>
      <CombatSandbox />
    </main>
  );
}
