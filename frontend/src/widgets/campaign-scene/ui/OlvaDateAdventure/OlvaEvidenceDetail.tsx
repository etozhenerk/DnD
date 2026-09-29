import {useState} from 'react';
import {olvaQuest, type OlvaEvidence, type OlvaSide} from '../../../../entities/campaign-session/model/olvaQuest';
import {getOlvaDocument} from '../../../../entities/campaign-session/model/olvaDocuments';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {OlvaEvidenceObject} from './OlvaEvidenceObject';
import {OlvaCallingCardMark} from './OlvaCallingCardMark';
import {OlvaPortrait} from './OlvaPortrait';
import styles from './OlvaEvidenceDetail.module.css';

interface Props {evidence: OlvaEvidence; side: OlvaSide; complete: boolean; onPlace: (side: string) => void;}
export function OlvaEvidenceDetail({evidence, side, complete, onPlace}: Props) {
  const [page, setPage] = useState(0);
  const [speaker, setSpeaker] = useState<'stas' | 'polina' | 'olva'>('stas');
  const document = getOlvaDocument(evidence);
  return <section className={styles.detail} aria-label={evidence.title}>
    <div className={styles.examination}>
      <article className={styles.document} data-kind={evidence.kind} data-reverse={page > 0} aria-label={page > 0 ? 'Оборот предмета' : evidence.caption}>
        {evidence.kind === 'messages' ? <>
          <div className={styles.phoneBar}><span>06:29</span><span>● ▰</span></div>
          <div className={styles.contact}><span className={styles.contactPortrait}><OlvaPortrait speakerId="polina"/></span><span>Полинетта <small>Переписка со Станисом</small></span></div>
          <div className={styles.messages}>{document.messages.map((message, index) => <div key={index} className={styles.message} data-outgoing={message.author === 'Станис'}><p>{message.text}</p><time>{message.time}</time></div>)}</div>
          <div className={styles.phoneHome}/>
        </> : <>
          {evidence.kind !== 'womanizer' && evidence.kind !== 'photo' && <div className={styles.evidencePicture}><OlvaEvidenceObject evidence={evidence}/></div>}
          {evidence.kind === 'photo' && evidence.artwork && <img className={styles.photograph} src={resolveAsset(evidence.artwork)} alt={page === 0 ? evidence.artworkAlt : ''} aria-hidden={page > 0} draggable={false}/>}
          {evidence.kind === 'womanizer' && <img className={styles.giftObject} src={resolveAsset(olvaQuest.gift.artwork)} alt="Вуманайзер Pussy Sultan"/>}
          {evidence.kind === 'calendar' && <div className={styles.binding} aria-hidden="true">{Array.from({length:7}, (_, i) => <i key={i}/>)}</div>}
          {evidence.kind === 'gift' && <div className={styles.ribbon} aria-hidden="true"/>}
          {evidence.kind === 'business-card' && <span className={styles.rose} aria-hidden="true"><OlvaCallingCardMark/></span>}
          <div className={styles.writing}>{document.pageBlocks.map((blocks, index) => <div key={index} className={styles.page} data-visible={page === index} aria-hidden={page !== index}>{blocks.map((block, i) => <p key={i} data-author={block.author}>{block.text}</p>)}</div>)}</div>
          {evidence.kind === 'business-card' && <img className={styles.lipstick} src={resolveAsset(olvaQuest.callingCardKissArtwork)} alt={page > 0 ? 'Отпечаток помады, оставленный на обороте визитки' : ''} aria-hidden={page === 0} draggable={false}/>}
          {evidence.kind === 'receipt' && <div className={styles.barcode} aria-hidden="true"/>}
          {evidence.kind === 'invitation' && <span className={styles.seal} aria-hidden="true">С</span>}
        </>}
      </article>
      {document.pages.length > 1 && <div className={styles.pageTurn}><span>{page + 1} / {document.pages.length}</span><button type="button" onClick={() => setPage((page + 1) % document.pages.length)}>{evidence.kind === 'gift' ? 'Другая записка ↻' : 'Перевернуть ↻'}</button></div>}
    </div>
    <aside className={styles.accounts} aria-label="Голоса пары и Оливии">
      <div className={styles.speakerSelection}>{olvaQuest.speakers.map(person => <button key={person.id} className={styles.speakerButton} type="button" aria-pressed={speaker === person.id} onClick={() => setSpeaker(person.id as typeof speaker)}><span className={styles.speakerPortrait}><OlvaPortrait speakerId={person.id}/></span><span>{person.name}</span></button>)}</div>
      <blockquote className={styles.speech} key={speaker} data-speaker={speaker}><span className={styles.quoteMark} aria-hidden="true">“</span><p>{evidence[speaker]}</p><cite>{olvaQuest.speakers.find(s => s.id === speaker)?.name}</cite></blockquote>
      <div className={styles.placement}><span>Чьи доводы это усиливает?</span><div className={styles.sides}>
        {olvaQuest.sides.map(s => <button key={s.id} type="button" disabled={complete} aria-pressed={side === s.id} onClick={() => onPlace(s.id)}>{s.id === 'stas' ? 'Станиса' : s.id === 'polina' ? 'Полинетты' : 'Пока не ясно'}</button>)}
      </div></div>
    </aside>
  </section>;
}
