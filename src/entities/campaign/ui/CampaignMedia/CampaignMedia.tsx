import {useEffect, useRef, useState} from 'react';
import type {CampaignVisual} from '../../model/types';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';

interface CampaignMediaProps {
  visual: CampaignVisual;
  className?: string;
}

export function CampaignMedia({visual, className}: CampaignMediaProps) {
  const frameRef = useRef<HTMLVideoElement>(null);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);

  useEffect(() => {
    if (!('video' in visual)) return;

    const video = frameRef.current;
    if (!video || !('IntersectionObserver' in window)) {
      setShouldLoadVideo(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShouldLoadVideo(true);
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    }, {rootMargin: '320px'});

    observer.observe(video);
    return () => observer.disconnect();
  }, [visual]);

  if ('video' in visual && visual.video) {
    const videoSource = visual.video;

    return (
      <video
        ref={frameRef}
        aria-label={visual.alt}
        autoPlay
        className={className}
        loop
        muted
        playsInline
        poster={visual.poster ? resolveAsset(visual.poster) : undefined}
        preload="metadata"
        src={shouldLoadVideo ? resolveAsset(videoSource) : undefined}
      />
    );
  }

  if ('image' in visual && visual.image) {
    return <img className={className} src={resolveAsset(visual.image)} alt={visual.alt} loading="lazy" decoding="async" />;
  }

  return null;
}
