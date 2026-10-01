import {useState} from 'react';
import {useLocalImages} from '../../../shared/lib/local-images';

export function useCreatorMedia() {
  const portraits = useLocalImages(8);
  const iconImages = useLocalImages(4);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [icons, setIcons] = useState<Record<string, string>>({});
  const selected = portraits.images.find((image) => image.id === selectedId) ?? portraits.images[0];

  async function uploadIcon(skillId: string, files: FileList | null) {
    const added = await iconImages.addFiles(files);
    if (!added[0]) return;
    const previous = icons[skillId];
    if (previous) iconImages.remove(previous);
    setIcons((current) => ({...current, [skillId]: added[0].id}));
  }

  function removeIcon(skillId: string) {
    const imageId = icons[skillId];
    if (imageId) iconImages.remove(imageId);
    setIcons((current) => {
      const next = {...current};
      delete next[skillId];
      return next;
    });
  }

  return {
    portraits, selected, selectPortrait: setSelectedId, uploadIcon, removeIcon,
    iconError: iconImages.error,
    getIcon: (skillId: string) => iconImages.images.find((image) => image.id === icons[skillId])?.url,
  };
}

export type CreatorMedia = ReturnType<typeof useCreatorMedia>;
