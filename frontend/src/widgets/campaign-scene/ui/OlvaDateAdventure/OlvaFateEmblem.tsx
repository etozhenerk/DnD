import styles from './OlvaFateEmblem.module.css';
export function OlvaFateEmblem({kind = 'scales'}: {kind?: string}) {
  return <svg className={styles.emblem} viewBox="0 0 80 80" aria-hidden="true">
    <circle cx="40" cy="40" r="36"/><circle cx="40" cy="40" r="31" className={styles.inner}/>
    {kind === 'polina' ? <><path d="M40 58S18 44 18 30C18 17 34 18 40 28C46 18 62 17 62 30C62 44 40 58 40 58Z"/><path d="M28 38h24m-16-5-5 5 5 5m8-10 5 5-5 5"/></>
      : kind === 'separate' ? <><path d="M35 24C25 14 15 24 19 36C23 48 34 55 37 56M45 24C55 14 65 24 61 36C57 48 46 55 43 56M41 22l-5 12 9 7-9 10 5 9"/></>
      : kind === 'gift' ? <><path d="M25 56h30V34H25Zm-4-22h38v-9H21Zm19-9v31M40 24C18 24 30 7 40 24C62 24 50 7 40 24Z"/><path d="m59 47 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z"/></>
      : <><path d="M40 20v40m-12 0h24M21 29h38M25 29l-9 18h18Zm30 0-9 18h18Z"/><circle cx="40" cy="20" r="3"/></>}
  </svg>;
}
