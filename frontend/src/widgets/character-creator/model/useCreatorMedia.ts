import {useState} from 'react';
import {useLocalImages} from '../../../shared/lib/local-images';

export function useCreatorMedia() {
  const portraits = useLocalImages(8);
  const iconImages = useLocalImages(4);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [icons, setIcons] = useState<Record<string, string>>({});
  const selected = portraits.images.find((image) => image.id === selectedId) ?? portraits.images[0];

  async function uploadIcon(skillId: string, files: FileList | readonly File[] | null) {
    const added = await iconImages.addFiles(files);
    if (!added[0]) return false;
    const previous = icons[skillId];
    if (previous) iconImages.remove(previous);
    setIcons((current) => ({...current, [skillId]: added[0].id}));
    return true;
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
    getIconImage: (skillId: string) => iconImages.images.find((image) => image.id === icons[skillId]),
    hasIcons: Object.keys(icons).length > 0,
    getIcon: (skillId: string) => iconImages.images.find((image) => image.id === icons[skillId])?.url,
    acceptAdvisorImage: async (kind: 'portrait' | 'icon', target: string | undefined, file: File) => {
      if (kind === 'icon') {
        return target ? uploadIcon(target, [file]) : false;
      } else {
        const added = await portraits.addFiles([file]);
        if (added[0]) setSelectedId(added[0].id);
        return !!added[0];
      }
    },
  };
}

export type CreatorMedia = ReturnType<typeof useCreatorMedia>;
