import {useEffect, useRef, useState} from 'react';
import type {CampaignCreditsDefinition} from '../../../../entities/campaign-session/model/credits';
import {getCreditsMusicSession} from '../../../../features/play-campaign-credits/model/creditsMusicAudio';
import {playCreditsPostlude} from '../../../../features/play-campaign-credits/model/playCreditsPostlude';
import styles from './CreditsPostlude.module.css';

interface CreditsPostludeProps {
  music: CampaignCreditsDefinition['music'];
  video: NonNullable<CampaignCreditsDefinition['postCreditsVideo']>;
  closingText: string;
  onComplete: () => void;
}

export function CreditsPostlude({music, video, closingText, onComplete}: CreditsPostludeProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    setPlaying(false);
    return playCreditsPostlude(getCreditsMusicSession(music), video, stage, onComplete, () => setPlaying(true));
  }, [music, video, onComplete]);

  return <section className={styles.stage} aria-label={playing ? video.title : 'Спасибо за историю'}>
    <div ref={stageRef} className={styles.media} />
    {!playing ? <div className={styles.closing}><p>{closingText}</p></div> : null}
  </section>;
}
