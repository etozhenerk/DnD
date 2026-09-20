import type {CSSProperties} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import type {CampaignPreview as CampaignPreviewData} from '../../../../entities/campaign-preview/model/types';
import {useCampaignPreview} from '../../../../features/navigate-campaign-preview/model/useCampaignPreview';
import {usePreviewMusic} from '../../../../features/navigate-campaign-preview/model/usePreviewMusic';
import {
  SceneMasterControl,
  type SceneMasterAction,
} from '../../../../features/navigate-campaign-scene/ui/SceneMasterControl/SceneMasterControl';
import {SceneTextPanel} from '../../../../features/navigate-campaign-scene/ui/SceneTextPanel/SceneTextPanel';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './CampaignPreview.module.css';

interface CampaignPreviewProps {
  preview: CampaignPreviewData;
  onFinish?: () => void;
}

export function CampaignPreview({preview, onFinish}: CampaignPreviewProps) {
  const [searchParams] = useSearchParams();
  const requestedFrame = searchParams.get('frame');
  const initialIndex = requestedFrame === 'last'
    ? preview.slides.length - 1
    : Math.max(0, Number.parseInt(requestedFrame ?? '1', 10) - 1 || 0);
  const {
    currentIndex,
    canGoPrevious,
    canGoNext,
    isLast,
    goTo,
    goPrevious,
    goNext,
  } = useCampaignPreview(preview.slides.length, initialIndex);
  usePreviewMusic(preview.music, isLast);
  const slide = preview.slides[currentIndex];
  const slideImage = resolveAsset(slide.image);
  const previousArrow = resolveAsset('assets/concepts/ui/hero-book-arrow-left.png');
  const nextArrow = resolveAsset('assets/concepts/ui/hero-book-arrow-right.png');
  const previewStyle = {
    '--preview-parchment': `url("${resolveAsset('assets/concepts/campaigns/penisuela/ui/preview-legend-parchment.png')}")`,
  } as CSSProperties;
  const playHref = `/campaign/${preview.campaignId}/play/${preview.outro?.nextSceneId ?? 'hotel-overload'}`;
  const masterActions: SceneMasterAction[] = canGoNext ? [{
    id: 'next-prologue-slide',
    label: 'Следующий кадр',
    onSelect: goNext,
  }] : [{
    id: 'start-penisuela',
    label: 'Перейти к пробуждению на Пенисуэле',
    ...(onFinish ? {onSelect: onFinish} : {href: playHref}),
  }];

  return (
    <section className={styles.preview} style={previewStyle} aria-label={`Пролог «${preview.title}»`}>
      <div className={styles.ambient} aria-hidden="true">
        <img key={`${slide.id}-ambient`} className={styles.ambientArtwork} src={slideImage} alt="" />
        <div className={styles.ambientShade} />
      </div>

      <div className={styles.stage}>
        <img key={slide.id} className={styles.artwork} src={slideImage} alt={slide.alt} />
        <div className={styles.vignette} aria-hidden="true" />
      </div>

      <header className={styles.header}>
        <div className={styles.heading}>
          <p>{preview.eyebrow}</p>
          <h1>{preview.title}</h1>
        </div>
      </header>
      <SceneMasterControl
        actions={masterActions}
        backHref={`/region/${preview.regionId}`}
        onRestartScene={() => goTo(0)}
        onStepBack={canGoPrevious ? goPrevious : undefined}
        sceneTitle={`${preview.title} · кадр ${slide.order}`}
      />

      <button
        className={`${styles.arrow} ${styles.previous}`}
        type="button"
        onClick={goPrevious}
        disabled={!canGoPrevious}
        aria-label="Предыдущий кадр"
      >
        <img src={previousArrow} alt="" />
      </button>

      {canGoNext ? (
        <button className={`${styles.arrow} ${styles.next}`} type="button" onClick={goNext} aria-label="Следующий кадр">
          <img src={nextArrow} alt="" />
        </button>
      ) : null}

      <SceneTextPanel className={styles.caption} collapsible={false} resetKey={slide.id}>
        <p className={styles.speaker}>{slide.speaker.label}</p>
        <p className={`${styles.line} ${slide.speaker.kind === 'narrator' ? styles.narrationLine : ''}`}>{slide.text}</p>
        {isLast ? (
          onFinish ? (
            <button className={styles.finishLink} type="button" onClick={onFinish}>
              Проследовать за Кострюлькой
            </button>
          ) : (
            <Link className={styles.finishLink} to={playHref}>
              Проследовать за Кострюлькой
            </Link>
          )
        ) : null}
      </SceneTextPanel>

      <nav className={styles.progress} aria-label="Кадры пролога">
        {preview.slides.map((item, index) => (
          <button
            key={item.id}
            className={styles.marker}
            type="button"
            onClick={() => goTo(index)}
            aria-label={`Перейти к кадру ${item.order}`}
            aria-current={index === currentIndex ? 'step' : undefined}
          >
            <span />
          </button>
        ))}
      </nav>

      <p className={styles.liveRegion} aria-live="polite" aria-atomic="true">
        Кадр {slide.order} из {preview.slides.length}. {slide.speaker.label}: {slide.text}
      </p>
    </section>
  );
}
