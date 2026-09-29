import {useId} from 'react';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {olvaQuest, type OlvaEvidence} from '../../../../entities/campaign-session/model/olvaQuest';
import styles from './OlvaEvidenceObject.module.css';

export function OlvaEvidenceObject({evidence, large = false}: {evidence: OlvaEvidence; large?: boolean}) {
  const id = useId().replaceAll(':', '');
  const paper = `url(#${id}-paper)`;
  const metal = `url(#${id}-metal)`;
  if (evidence.artwork && evidence.kind === 'photo') return <span className={`${styles.object} ${styles.photograph}`}><img src={resolveAsset(evidence.artwork)} alt="" draggable={false}/></span>;
  if (evidence.artwork) return <img className={`${styles.object} ${large ? styles.large : ''}`} src={resolveAsset(evidence.artwork)} alt="" draggable={false}/>;
  if (evidence.kind === 'womanizer') return <img className={`${styles.object} ${large ? styles.large : ''}`} src={resolveAsset(olvaQuest.gift.artwork)} alt="" draggable={false}/>;
  return <svg className={`${styles.object} ${large ? styles.large : ''}`} viewBox="0 0 160 160" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-paper`} x2=".8" y2="1"><stop stopColor="var(--color-parchment-light)"/><stop offset="1" stopColor="var(--olva-paper)"/></linearGradient>
      <linearGradient id={`${id}-metal`} x2="1" y2="1"><stop stopColor="var(--olva-paper-edge)"/><stop offset=".4" stopColor="var(--color-gold-light)"/><stop offset="1" stopColor="var(--olva-paper-edge)"/></linearGradient>
    </defs>
    {evidence.kind === 'tickets' && <g transform="rotate(-12 80 80)"><path d="M10 42H147V78Q130 87 147 96V132H10V96Q27 87 10 78Z" fill={paper} stroke={metal} strokeWidth="3"/><path d="M111 43V131" stroke="var(--olva-paper-edge)" strokeDasharray="4 4"/><text x="64" y="73" textAnchor="middle" fill="var(--olva-ink)" fontSize="13">КОНЦЕРТ</text><path d="M27 89H98M27 100H88M27 111H98" stroke="var(--olva-paper-edge)" strokeWidth="3"/><path d="M121 60V117m7-57v57m7-57v57" stroke="var(--olva-ink)"/></g>}
    {evidence.kind === 'ledger' && <g transform="rotate(6 80 80)"><rect x="25" y="15" width="111" height="132" rx="7" fill="var(--olva-teal)" stroke={metal} strokeWidth="3"/><path d="M40 17V145" stroke={metal} strokeWidth="5"/><rect x="51" y="43" width="71" height="57" fill={paper}/><text x="86" y="65" textAnchor="middle" fill="var(--olva-ink)" fontSize="10">БЮДЖЕТ</text><path d="M59 78H112M59 87H112M85 72V92" stroke="var(--olva-paper-edge)"/><path d="M80 111V141l9-7 9 7v-30" fill={metal}/></g>}
    {evidence.kind === 'note' && <g transform="rotate(-5 80 80)"><path d="M27 15H117L138 38V145H27Z" fill={paper} stroke="var(--olva-paper-edge)"/><path d="M117 15V38H138" fill="var(--olva-paper)" stroke="var(--olva-paper-edge)"/>{[51,65,79,93,107,121].map(y=><path key={y} d={`M41 ${y}h${y%3===0?68:77}`} stroke="var(--olva-paper-edge)" strokeWidth="2"/>)}<path d="M51 10v27q8 12 14 0V10q-8-12-14 0" fill="none" stroke={metal} strokeWidth="3"/></g>}
    {evidence.kind === 'receipt'  && <g transform="rotate(-9 80 80)">
      <path d="M42 12H112L117 139L108 135L101 141L93 136L85 142L77 136L69 142L61 137L53 142L45 138Z" fill={paper} stroke="var(--olva-paper-edge)"/>
      <path d="M42 12C57 3 115 5 116 15V27H109V16H42" fill="var(--olva-paper)"/>
      <text x="78" y="34" textAnchor="middle" fill="var(--olva-ink)" fontSize="9" letterSpacing="2">ЧЕК</text>
      {[47,57,67,77,87].map((y,i)=><g key={y} stroke="var(--olva-paper-edge)" strokeWidth="2"><path d={`M54 ${y}h${20+i*3}`}/><path d={`M92 ${y}h11`}/></g>)}
      <path d="M54 100h49" stroke="var(--olva-paper-edge)" strokeDasharray="2 3"/>
      <text x="78" y="119" textAnchor="middle" fill="var(--olva-ink)" fontSize="15">193</text>
      <path d="M59 126v6m4-6v6m3-6v6m5-6v6m3-6v6m4-6v6m3-6v6m4-6v6m5-6v6m3-6v6" stroke="var(--olva-ink)"/>
    </g>}
    {evidence.kind === 'messages' && <g transform="rotate(9 80 80)">
      <rect x="39" y="8" width="82" height="143" rx="14" fill="var(--olva-phone)" stroke={metal} strokeWidth="3"/>
      <rect x="45" y="16" width="70" height="126" rx="9" fill="var(--olva-teal)"/>
      <path d="M64 17h32" stroke="var(--olva-phone)" strokeWidth="7" strokeLinecap="round"/>
      <text x="80" y="40" textAnchor="middle" fill="var(--color-parchment-light)" fontSize="12">06:28</text>
      <path d="M51 50h43v19H56l-5 5z" fill="var(--olva-paper)"/>
      <path d="M65 79h43v24h-5l-5 5v-5H65z" fill="var(--olva-phone-edge)"/>
      <path d="M51 113h40v15H56l-5 5z" fill="var(--olva-paper)"/>
      <path d="M57 57h30m-30 6h19m-13 57h26" stroke="var(--olva-paper-edge)" strokeWidth="2"/>
      <path d="M70 87h31m-31 7h23" stroke="var(--color-parchment-light)" strokeWidth="2"/>
    </g>}
    {evidence.kind === 'gift' && <g transform="rotate(-5 80 80)">
      <path d="M24 56L88 32L139 61L75 88Z" fill="var(--olva-teal)" stroke={metal}/>
      <path d="M24 56V116L75 148V88Z" fill="var(--olva-phone)" stroke="var(--olva-teal)"/>
      <path d="M75 88L139 61V121L75 148Z" fill="var(--olva-teal)" stroke="var(--olva-phone-edge)"/>
      <path d="M50 46L102 76V136L113 132V71L61 42Z" fill={metal}/>
      <path d="M113 46L47 72V129L57 136V77L124 51Z" fill={metal}/>
      <path d="M85 55C18 33 64 5 85 55C128 1 144 49 85 55Z" fill={metal} stroke="var(--olva-paper-edge)" strokeWidth="2"/>
      <ellipse cx="85" cy="54" rx="9" ry="6" fill="var(--color-gold-light)"/>
      <path d="M102 91l28-5-3 23-29 4z" fill={paper}/><path d="M104 96l17-3m-18 9 14-2" stroke="var(--olva-paper-edge)"/>
    </g>}
    {evidence.kind === 'invitation' && <g transform="rotate(-7 80 80)">
      <path d="M17 65L81 25L143 65V136H17Z" fill="var(--olva-paper)" stroke="var(--olva-paper-edge)"/>
      <path d="M34 25H127V108H34Z" fill={paper} stroke="var(--olva-paper-edge)"/>
      <path d="M42 32H119V99H42Z" fill="none" stroke="var(--olva-paper-edge)"/>
      <path d="M56 49h50m-43 9h36m-29 9h22" stroke="var(--olva-paper-edge)" strokeWidth="2"/>
      <path d="M17 65L81 108L143 65V136H17Z" fill={paper} stroke="var(--olva-paper-edge)"/>
      <path d="M17 136L64 97M143 136L98 98" stroke="var(--olva-paper-edge)"/>
      <circle cx="81" cy="101" r="15" fill="var(--olva-wine)" stroke={metal} strokeWidth="2"/>
      <path d="M73 104l8-14 8 14z" fill="none" stroke={metal}/>
    </g>}
    {evidence.kind === 'calendar' && <g transform="rotate(5 80 80)">
      <path d="M25 36H131L143 143H15Z" fill="var(--olva-wine)"/>
      <path d="M26 30H133L129 134H20Z" fill={paper} stroke={metal} strokeWidth="2"/>
      <path d="M29 58H128" stroke="var(--olva-paper-edge)"/>
      {[39,59,79,99,119].map(x=><path key={x} d={`M${x} 37v-15q5-8 8 0v14`} fill="none" stroke={metal} strokeWidth="4"/>)}
      <text x="78" y="54" textAnchor="middle" fill="var(--olva-ink)" fontSize="9" letterSpacing="1">СКОРО</text>
      <path d="M29 65H120V120H29Zm0 18h91m-91 18h91m-69-36v55m23-55v55m23-55v55" fill="none" stroke="var(--olva-paper-edge)"/>
      <path d="M32 70l14 10m-13 0 12-10m32 18 13 10m-14 0 14-10m8 20 15 9m-14 1 13-11" stroke="var(--olva-wine)" strokeWidth="3"/>
    </g>}
    {evidence.kind === 'business-card' && <g transform="rotate(-12 80 80)">
      <rect x="12" y="40" width="137" height="84" rx="3" fill="var(--olva-wine)" stroke={metal} strokeWidth="2"/>
      <rect x="18" y="46" width="125" height="72" rx="2" fill="none" stroke="var(--olva-paper-edge)"/>
      <image href={resolveAsset(olvaQuest.callingCardArtwork)} x="20" y="49" width="75" height="65" preserveAspectRatio="xMidYMid meet"/>
      <text x="116" y="78" textAnchor="middle" fill="var(--color-gold-light)" fontSize="12" fontFamily="var(--font-olva-escort)">Рокси</text>
      <text x="116" y="96" textAnchor="middle" fill="var(--color-gold-light)" fontSize="10">18+</text>
    </g>}
  </svg>;
}
