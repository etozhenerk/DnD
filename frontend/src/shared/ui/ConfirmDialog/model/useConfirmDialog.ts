import {useEffect, useId, useRef} from 'react';

export function useConfirmDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return {dialog, titleId: id + '-title', descriptionId: id + '-description'};
}
