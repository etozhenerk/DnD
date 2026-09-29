import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {CampaignPreviewOutro as CampaignPreviewOutroData} from '../../../../entities/campaign-preview/model/types';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import {CombatSkillVideoOverlay} from '../CombatSkillVideoOverlay/CombatSkillVideoOverlay';
import styles from './CampaignPreviewOutro.module.css';

interface CampaignPreviewOutroProps {
  outro: CampaignPreviewOutroData;
  onComplete: () => void;
}

export function CampaignPreviewOutro({outro, onComplete}: CampaignPreviewOutroProps) {
  const [showTitle, setShowTitle] = useState(false);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const cue = useMemo(() => ({
    id: outro.video.id,
    title: outro.video.title,
    videoSrc: resolveAsset(outro.video.source),
  }), [outro.video]);
  const finishVideo = useCallback(() => setShowTitle(true), []);

  useEffect(() => {
    if (!showTitle) return;

    titleRef.current?.focus();
    const timer = window.setTimeout(onComplete, outro.titleCard.durationMs);
    return () => window.clearTimeout(timer);
  }, [onComplete, outro.titleCard.durationMs, showTitle]);

  if (!showTitle) {
    return <CombatSkillVideoOverlay
      cue={cue}
      onComplete={finishVideo}
      playbackRate={1}
      ariaLabel={outro.video.title}
      fit="contain"
    />;
  }

  return (
    <section className={styles.titleCard} aria-label="Переход к следующей сцене">
      <p ref={titleRef} className={styles.title} tabIndex={-1}>
        {outro.titleCard.text}
      </p>
    </section>
  );
}
