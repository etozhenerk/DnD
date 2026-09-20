import type {CampaignCreditsDefinition, CampaignCreditsPhoto} from '../../../entities/campaign-session/model/credits';
import {getCharacterById} from '../../../entities/character/model/data';

export interface CreditsRollEntry {
  id: string;
  name: string;
  prototypeName?: string;
}

export interface CreditsRollSectionData {
  id: string;
  title: string;
  rows: {id: string; entries: CreditsRollEntry[]; photos: {photo: CampaignCreditsPhoto; index: number}[]}[];
}

export function buildCreditsRollSections(credits: CampaignCreditsDefinition): CreditsRollSectionData[] {
  const gameMasterIds = new Set(credits.gameMasterIds);
  const cast = credits.cast.map((member) => ({id: member.id, name: member.characterName, prototypeName: member.prototypeName}));
  const sections = [
    {
      id: 'heroes', title: 'Наши герои',
      entries: credits.partyCharacterIds.map((id) => ({id, name: getCharacterById(id)?.name ?? id})),
    },
    {
      id: 'game-master', title: 'Мастер игры',
      entries: cast.filter((member) => gameMasterIds.has(member.id)),
    },
    {
      id: 'cast', title: 'Персонажи и их прототипы',
      entries: cast.filter((member) => !gameMasterIds.has(member.id)),
    },
    {id: 'ai', title: 'Создано с помощью ИИ', entries: credits.aiModels},
  ].filter((section) => section.entries.length);
  let photoIndex = 0;

  return sections.map((section) => {
    const entryIds = new Set(section.entries.map((entry) => entry.id));
    const photos = section.id === 'ai' ? [] : credits.photos.filter((photo) =>
      photo.creditIds.length > 0 && photo.creditIds.every((id) => entryIds.has(id)));
    const placedIds = new Set<string>();
    const rows: CreditsRollSectionData['rows'] = [];

    for (const entry of section.entries) {
      if (placedIds.has(entry.id)) continue;
      const groupIds = new Set([entry.id]);
      const connectedIds = [entry.id];
      // A shared photograph keeps its credited characters in one group.
      for (const id of connectedIds) {
        for (const photo of photos) {
          if (!photo.creditIds.includes(id)) continue;
          for (const creditId of photo.creditIds) {
            if (groupIds.has(creditId)) continue;
            groupIds.add(creditId);
            connectedIds.push(creditId);
          }
        }
      }
      const entries = section.entries.filter((member) => groupIds.has(member.id));
      const groupPhotos = photos.filter((photo) => photo.creditIds.some((id) => groupIds.has(id)));
      entries.forEach((member) => placedIds.add(member.id));
      const previousRow = rows.at(-1);
      if (groupPhotos.length === 0 && previousRow?.photos.length === 0) {
        previousRow.entries.push(...entries);
      } else {
        rows.push({
          id: entry.id, entries,
          photos: groupPhotos.map((photo) => ({photo, index: photoIndex++})),
        });
      }
    }
    return {id: section.id, title: section.title, rows};
  });
}
