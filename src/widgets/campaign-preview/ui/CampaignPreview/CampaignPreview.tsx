import type {CSSProperties} from 'react';
import {Link} from 'react-router-dom';
import type {CampaignPreview as CampaignPreviewData} from '../../../../entities/campaign-preview/model/types';
import {useCampaignPreview} from '../../../../features/navigate-campaign-preview/model/useCampaignPreview';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './CampaignPreview.module.css';

export function CampaignPreview({preview}: {preview: CampaignPreviewData}) {
  const {
    currentIndex,
    canGoPrevious,
    canGoNext,
    isLast,
    goTo,
    goPrevious,
    goNext,
  } = useCampaignPreview(preview.slides.length);
  const slide = preview.slides[currentIndex];
  const slideImage = resolveAsset(slide.image);
  const previousArrow = resolveAsset('assets/concepts/ui/hero-book-arrow-left.png');
  const nextArrow = resolveAsset('assets/concepts/ui/hero-book-arrow-right.png');
  const previewStyle = {
    '--preview-parchment': `url("${resolveAsset('assets/concepts/campaigns/penisuela/ui/preview-legend-parchment.png')}")`,
  } as CSSProperties;

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
        <Link className={styles.backLink} to={`/region/${preview.regionId}`}>← Вернуться к Пенисуэле</Link>
        <div className={styles.heading}>
          <p>{preview.eyebrow}</p>
          <h1>{preview.title}</h1>
        </div>
      </header>

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

      <div className={styles.caption} key={`${slide.id}-caption`}>
        <p className={styles.speaker}>{slide.speaker.label}</p>
        <p className={`${styles.line} ${slide.speaker.kind === 'narrator' ? styles.narrationLine : ''}`}>{slide.text}</p>
        {isLast ? <Link className={styles.finishLink} to={`/campaign/${preview.campaignId}/play/hotel-overload`}>Проснуться на Пенисуэле</Link> : null}
      </div>

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
