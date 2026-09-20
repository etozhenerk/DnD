import {useEffect, useRef, useState, type Dispatch} from 'react';
import {getOlvaQuestView, olvaQuest, type OlvaEvidence} from '../../../../entities/campaign-session/model/olvaQuest';
import type {GallerySessionSnapshot} from '../../../../entities/campaign-session/model/gallerySession';
import type {SceneCheckHero} from '../../../../features/navigate-campaign-scene/ui/SceneCheckPanel/SceneCheckPanel';
import type {OlvaTableNavigationState, OlvaTableNavigationAction} from '../../../../features/navigate-campaign-scene/model/olvaTableNavigation';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {OlvaTablePiece} from './OlvaTablePiece';
import {OlvaEvidenceObject} from './OlvaEvidenceObject';
import {OlvaEvidenceDetail} from './OlvaEvidenceDetail';
import {OlvaPortrait} from './OlvaPortrait';
import {OlvaFateEmblem} from './OlvaFateEmblem';
import styles from './OlvaEvidenceTable.module.css';

interface Props {
  state: GallerySessionSnapshot;
  navigation: OlvaTableNavigationState;
  dispatchNavigation: Dispatch<OlvaTableNavigationAction>;
  heroes: SceneCheckHero[];
  act: (id: string) => boolean;
  onBack: () => void;
  onExit: () => void;
}

export function OlvaEvidenceTable({state, heroes, act, onBack, onExit, navigation, dispatchNavigation}: Props) {
  const view = getOlvaQuestView(state);
  const board = useRef<HTMLDivElement>(null);
  const opened = navigation.screen === 'evidence' ? view.evidence.find(e => e.id === navigation.evidenceId) : undefined;
  const voting = navigation.screen === 'voting';
  const giftIntroduction = navigation.screen === 'unlock';
  const [voter, setVoter] = useState<string | null>(null);
  const [submitReady, setSubmitReady] = useState(false);
  useEffect(() => {
    setSubmitReady(false);
    const timer = window.setTimeout(() => setSubmitReady(true), 450);
    return () => window.clearTimeout(timer);
  }, [voting]);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {dispatchNavigation({type:'back'}); setVoter(null);}
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [dispatchNavigation]);
  const dropSide = (x: number, y: number) => Array.from(board.current?.querySelectorAll<HTMLElement>('[data-olva-side]') ?? [])
    .find(element => {const r = element.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;})?.dataset.olvaSide;
  const place = (id: string, side: string) => {
    if (view.complete || view.placements[id] === side) return;
    if (act(`table-place-${id}-${side}`)) setNotice('Доказательство переложено.');
  };
  const vote = (id: string, side: string) => {
    if (view.complete) return;
    if (view.votes[id] === side || act(`table-vote-${id}-${side}`)) {setVoter(null); setNotice('Голос записан. Его можно изменить.');}
  };
  const read = (evidence: OlvaEvidence) => {
    dispatchNavigation({type:'inspect',id:evidence.id});
    if (!view.complete && !view.has(`read-${evidence.id}`)) act(`table-read-${evidence.id}`);
  };
  const endings = olvaQuest.endings.filter(ending => ending.id !== 'gift' || view.giftOnTable);
  const heroPiece = (hero: SceneCheckHero) => <OlvaTablePiece key={hero.id} label={`Голос ${hero.name}`} variant="hero"
    selected={voter === hero.id} disabled={view.complete}
    onOpen={() => {if (!view.complete) setVoter(voter === hero.id ? null : hero.id);}}
    onDrop={(x, y) => {const side = dropSide(x, y); if (side) vote(hero.id, side);}}>
    <img draggable={false} className={styles.heroImage} src={resolveAsset(hero.token)} alt=""/><span>{hero.name}</span>
  </OlvaTablePiece>;
  const back = () => {setVoter(null);dispatchNavigation({type:'back'});};
  const beginVoting = () => {
    const revealGift = view.giftOnTable && !view.has('gift-unlock-notice-seen');
    dispatchNavigation({type:'decide',revealGift});
    if (!revealGift) act('table-vote');
  };
  const continueVoting = () => {
    if (act('table-vote-after-compromise')) dispatchNavigation({type:'vote'});
  };

  return <div className={styles.table} ref={board} aria-label="Стол доказательств">
    <header className={styles.header}>
      <button type="button" onClick={back}>{opened || giftIntroduction ? '← К столу' : voting && !view.complete ? '← К доказательствам' : '← К разговору'}</button>
      <div className={styles.titlePlate}><span>{opened ? 'Личные вещи' : voting ? 'Голосование героев' : 'Разбор отношений'}</span><h1>{opened ? opened.title : giftIntroduction ? olvaQuest.gift.unlockNotice.title : voting ? 'Судьба пары' : olvaQuest.title}</h1></div>
      <button type="button" onClick={onExit}>Выйти из бунгало</button>
    </header>
    {opened ? <OlvaEvidenceDetail key={opened.id} evidence={opened} side={view.placements[opened.id]} complete={view.complete} onPlace={side => place(opened.id, side)}/>
      : giftIntroduction ? <section className={styles.unlockNotice} aria-label={olvaQuest.gift.unlockNotice.title}>
        <span className={styles.unlockEmblem}><OlvaFateEmblem kind="gift"/></span>
        <h2>{olvaQuest.gift.unlockNotice.ending}</h2>
        <p>{olvaQuest.gift.unlockNotice.description}</p>
        <p className={styles.unlockInventory}>{olvaQuest.gift.unlockNotice.inventoryNote}</p>
        <button type="button" onClick={continueVoting}>{olvaQuest.gift.unlockNotice.continueLabel}</button>
      </section> : <>
        <p className={styles.hint}>{voting ? voter ? `Выбран голос: ${heroes.find(h => h.id === voter)?.name}. Нажмите на решение.` : 'Перетащите портрет к решению — или выберите портрет, затем решение.' : 'Расположите доказательства между Станисом и Полинеттой. Их судьбу решим после обсуждения.'}</p>
        {!voting ? <div className={styles.zones}>
          {olvaQuest.sides.map(side => <section key={side.id} data-olva-side={side.id} className={styles.zone} data-side={side.id} aria-label={side.label}>
            <div className={styles.sideHeading}><span className={styles.sidePortrait}>{side.id === 'middle' ? <OlvaFateEmblem/> : <OlvaPortrait speakerId={side.id}/>}</span><h2>{side.id === 'middle' ? 'Под вопросом' : side.id === 'stas' ? 'Доводы Станиса' : 'Доводы Полинетты'}</h2></div><div className={styles.evidenceGrid} style={{gridTemplateColumns: `repeat(${view.evidence.filter(e => view.placements[e.id] === side.id).length > 6 ? 3 : 2}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${Math.max(3, Math.ceil(view.evidence.filter(e => view.placements[e.id] === side.id).length / (view.evidence.filter(e => view.placements[e.id] === side.id).length > 6 ? 3 : 2)))}, minmax(0, 1fr))`}}>
              {view.evidence.filter(e => view.placements[e.id] === side.id).map(evidence => <OlvaTablePiece key={evidence.id} label={`Рассмотреть: ${evidence.title}`} disabled={view.complete} onOpen={() => read(evidence)} onDrop={(x, y) => {const target = dropSide(x, y); if (target) place(evidence.id, target);}}>
                <OlvaEvidenceObject evidence={evidence}/><span className={styles.objectLabel}>{evidence.title}{view.has(`read-${evidence.id}`) ? ' · ✓' : ''}</span>
              </OlvaTablePiece>)}
            </div>
          </section>)}
        </div> : <>
          <div className={`${styles.zones} ${styles.ballots}`} style={{gridTemplateColumns: `repeat(${endings.length}, minmax(0, 1fr))`}}>
            {endings.map(ending => <section key={ending.id} data-olva-side={ending.id} className={styles.fateZone} data-ending={ending.id} aria-label={ending.label}>
              <button className={styles.choice} type="button" disabled={!voter || view.complete} onClick={() => {if (voter) vote(voter, ending.id);}}>
                <span className={styles.endingArt}><img src={resolveAsset(ending.background)} alt="" draggable={false}/><span className={styles.endingEmblem}><OlvaFateEmblem kind={ending.id}/></span></span><strong>{ending.label}</strong><span className={styles.consequence}>{ending.consequence}</span>
              </button>
              <span className={styles.count}>{view.counts[ending.id as keyof typeof view.counts]}</span>
              <div className={styles.heroGrid}>{heroes.filter(h => view.votes[h.id] === ending.id).map(heroPiece)}</div>
            </section>)}
          </div>
          <div className={styles.unvoted} aria-label="Герои без голоса">{heroes.filter(h => !view.votes[h.id]).map(heroPiece)}</div>
        </>}
        <footer className={styles.footer}>
          <div className={styles.gift}><span className={styles.giftEmblem}><OlvaFateEmblem kind="gift"/></span>
            {view.giftOnTable ? <><span>{view.complete ? view.ending?.id === 'gift' ? 'Вуманайзер у Полинетты' : 'Подарок остался в сумке' : 'Вуманайзер на столе'}</span>{!view.complete && <button type="button" onClick={() => {act('table-withdraw-gift'); setVoter(null);}}>Убрать подарок</button>}</>
              : view.giftAvailable && !view.complete && !voting ? <button type="button" onClick={() => {act('table-offer-gift');}}>Положить Вуманайзер на стол</button> : <span>{voting ? `${view.voted} из 5 голосов` : `Прочитано ${view.readCount} из ${view.evidence.length}`}</span>}
          </div>
          {!view.complete && (voting ? <button type="button" disabled={!view.canConfirm || !submitReady} onClick={() => {if (act(`table-finish-${view.winner?.id}`)) onBack();}}>{view.winner?.id === 'gift' ? 'Передать подарок и принять исход' : 'Подтвердить итог голосования'}</button> : <button type="button" onClick={beginVoting}>Перейти к голосованию</button>)}
        </footer>
        <p className={styles.status} role="status">{voting && view.voted === 5 && !view.winner ? 'Ничья. Обсудите разногласия и измените голоса.' : notice}</p>
      </>}
  </div>;
}
