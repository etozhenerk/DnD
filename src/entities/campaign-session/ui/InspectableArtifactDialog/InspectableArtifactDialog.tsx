import {useEffect, useMemo, useState} from 'react';
import type {CampaignSceneInspectable} from '../../model/types';
import {ArtifactGlyph} from '../ArtifactGlyph/ArtifactGlyph';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './InspectableArtifactDialog.module.css';

interface InspectableArtifactDialogProps {
  artifact: CampaignSceneInspectable;
  onClose: () => void;
}

type CopyBlock = {
  kind: 'summary' | 'reveal' | 'conclusion';
  text: string;
};

type LetterSegment = CopyBlock & {
  paragraphIndex: number;
};

function paginateArtifact(artifact: CampaignSceneInspectable, includeSummary: boolean, pageCharacterLimit: number) {
  const blocks: CopyBlock[] = [
    ...(includeSummary ? [{kind: 'summary' as const, text: artifact.summary}] : []),
    ...artifact.revealText
      .split(/\n{2,}/u)
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text): CopyBlock => ({kind: 'reveal', text})),
    {kind: 'conclusion', text: artifact.useText},
  ];

  return blocks.reduce<CopyBlock[][]>((pages, block) => {
    const currentPage = pages.at(-1);
    const currentLength = currentPage?.reduce((length, item) => length + item.text.length, 0) ?? 0;

    if (!currentPage || (currentPage.length > 0 && currentLength + block.text.length > pageCharacterLimit)) {
      pages.push([block]);
    } else {
      currentPage.push(block);
    }

    return pages;
  }, []);
}

function paginateLetter(
  artifact: CampaignSceneInspectable,
  firstPageCharacterLimit: number,
  pageCharacterLimit: number,
) {
  const revealSegments = artifact.revealText
    .split(/\n{2,}/u)
    .flatMap((paragraph, paragraphIndex) => paragraph
      .trim()
      .split(/(?<=[.!?…])\s+/u)
      .filter(Boolean)
      .map((text): LetterSegment => ({kind: 'reveal', paragraphIndex, text})));
  const segments: LetterSegment[] = [
    ...revealSegments,
    {kind: 'conclusion', paragraphIndex: revealSegments.length, text: artifact.useText},
  ];

  const pages = segments.reduce<LetterSegment[][]>((result, segment) => {
    let currentPage = result.at(-1);
    const currentLength = currentPage?.reduce((length, item) => length + item.text.length, 0) ?? 0;
    const currentPageLimit = result.length <= 1 ? firstPageCharacterLimit : pageCharacterLimit;

    if (!currentPage || currentLength + segment.text.length > currentPageLimit) {
      currentPage = [];
      result.push(currentPage);
    }

    const previousSegment = currentPage.at(-1);
    if (previousSegment?.paragraphIndex === segment.paragraphIndex && previousSegment.kind === segment.kind) {
      previousSegment.text += ` ${segment.text}`;
    } else {
      currentPage.push({...segment});
    }

    return result;
  }, []);

  return pages.map((page) => page.map(({kind, text}): CopyBlock => ({kind, text})));
}

export function InspectableArtifactDialog({artifact, onClose}: InspectableArtifactDialogProps) {
  const isLetter = artifact.id === 'journey-letter';
  const pages = useMemo(
    () => isLetter ? paginateLetter(artifact, 400, 600) : paginateArtifact(artifact, true, 880),
    [artifact, isLetter],
  );
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => setPageIndex(0), [artifact.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') setPageIndex((current) => Math.max(0, current - 1));
      if (event.key === 'ArrowRight') setPageIndex((current) => Math.min(pages.length - 1, current + 1));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, pages.length]);

  const currentPage = pages[pageIndex] ?? pages[0];

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <section
        className={`${styles.panel} ${isLetter ? styles.documentPanel : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${artifact.id}-title`}
      >
        <button className={styles.closeIcon} type="button" onClick={onClose} aria-label="Закрыть описание" autoFocus>×</button>
        {!isLetter ? (
          <div className={styles.artworkWrap}>
            {artifact.visualKind ? (
              <ArtifactGlyph kind={artifact.visualKind} size="art" />
            ) : artifact.image ? (
              <img className={styles.artwork} src={resolveAsset(artifact.image)} alt={artifact.summary} />
            ) : null}
          </div>
        ) : null}
        <div className={`${styles.copy} ${isLetter ? styles.documentCopy : ''}`}>
          <h2 id={`${artifact.id}-title`}>{artifact.label}</h2>
          <div className={styles.page} aria-live="polite">
            {isLetter && pageIndex === 0 ? (
              <img
                className={styles.letterArt}
                src={resolveAsset(artifact.image ?? '')}
                alt="Чёрный конверт с картой-письмом и золотой печатью"
              />
            ) : null}
            {currentPage.map((block, index) => (
              <p className={styles[block.kind]} key={`${pageIndex}-${block.kind}-${index}`}>{block.text}</p>
            ))}
          </div>
          {pages.length > 1 && (
            <nav className={styles.pagination} aria-label="Страницы описания предмета">
              <button
                type="button"
                onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
                disabled={pageIndex === 0}
                aria-label="Предыдущая страница"
              >
                ‹
              </button>
              <span className={styles.pageMarks} aria-label={`Страница ${pageIndex + 1} из ${pages.length}`}>
                {pages.map((_, index) => (
                  <span key={index} aria-hidden="true">{index === pageIndex ? '◆' : '◇'}</span>
                ))}
              </span>
              <button
                type="button"
                onClick={() => setPageIndex((current) => Math.min(pages.length - 1, current + 1))}
                disabled={pageIndex === pages.length - 1}
                aria-label="Следующая страница"
              >
                ›
              </button>
            </nav>
          )}
        </div>
      </section>
    </div>
  );
}
