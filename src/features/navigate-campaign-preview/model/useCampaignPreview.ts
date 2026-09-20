import {useCallback, useEffect, useState} from 'react';

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (
    target.isContentEditable
    || target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.tagName === 'SELECT'
  );
}

export function useCampaignPreview(slideCount: number, initialIndex = 0) {
  const lastIndex = Math.max(0, slideCount - 1);
  const [currentIndex, setCurrentIndex] = useState(() => (
    Math.min(Math.max(initialIndex, 0), lastIndex)
  ));

  const goTo = useCallback((index: number) => {
    setCurrentIndex(Math.min(Math.max(index, 0), lastIndex));
  }, [lastIndex]);

  const goPrevious = useCallback(() => {
    setCurrentIndex((index) => Math.max(0, index - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((index) => Math.min(lastIndex, index + 1));
  }, [lastIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isEditableTarget(event.target)) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrevious();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'Home') {
        event.preventDefault();
        goTo(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        goTo(lastIndex);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrevious, goTo, lastIndex]);

  return {
    currentIndex,
    canGoPrevious: currentIndex > 0,
    canGoNext: currentIndex < lastIndex,
    isLast: currentIndex === lastIndex,
    goTo,
    goPrevious,
    goNext,
  };
}
