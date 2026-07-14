import type {CampaignPerson, CampaignVisual} from '../../../entities/campaign/model/types';
import type {Character} from '../../../entities/character/model/types';
import type {Race, RaceAppearance, RaceCatalogueAudit, RaceCatalogueEntry, RaceConcept} from '../../../entities/race/model/types';
import {campaigns, characters, raceConcepts, races} from '../../../shared/config/gameData';

function toCampaignAppearance(person: CampaignPerson, campaignTitle: string, kind: 'npc' | 'enemy'): RaceAppearance {
  const visual = person.visual;
  return {
    id: person.id,
    name: person.name,
    kind,
    context: kind === 'npc' ? person.role : campaignTitle,
    image: visual && 'image' in visual ? visual.image : visual?.poster,
    video: visual && 'video' in visual ? visual.video : undefined,
    alt: person.visual?.alt,
  };
}

function getCurrentHeroes(raceId: string): RaceAppearance[] {
  return characters
    .filter((character) => character.visual.raceConceptIds.includes(raceId))
    .map((character) => ({
      id: character.id,
      name: character.name,
      kind: 'hero',
      context: character.race,
      image: character.visual.portrait,
      alt: character.visual.alt,
    }));
}

function getHistoricalHeroes(raceId: string): RaceAppearance[] {
  return characters.flatMap((character: Character) => (character.raceHistory ?? [])
    .filter((history) => history.raceConceptId === raceId)
    .map((history) => ({
      id: `${character.id}-${history.raceConceptId}`,
      name: history.displayName,
      kind: 'history' as const,
      context: history.note,
      image: character.visual.portrait,
      alt: character.visual.alt,
    })));
}

function getCampaignPeople(raceId: string, kind: 'npc' | 'enemy'): RaceAppearance[] {
  return campaigns.flatMap((campaign) => {
    const people = kind === 'npc' ? campaign.npcs ?? [] : campaign.enemies;
    return people
      .filter((person) => person.raceConceptIds?.includes(raceId))
      .map((person) => toCampaignAppearance(person, campaign.title, kind));
  });
}

function getCover(race: Race, concept: RaceConcept | undefined, appearances: RaceAppearance[]) {
  if (concept) return {image: concept.path, alt: `Утверждённый визуальный концепт расы «${race.name}».`};

  const appearance = appearances.find((item) => item.image || item.video);
  if (!appearance) throw new Error(`Для расы ${race.id} не найден визуальный материал`);
  return {
    image: appearance.image,
    video: appearance.video,
    alt: appearance.alt ?? `${appearance.name} — представитель расы «${race.name}».`,
  };
}

export function getRaceCatalogue(): RaceCatalogueEntry[] {
  return races.map((race) => {
    const concept = raceConcepts.find((item) => item.id === race.id);
    const heroes = getCurrentHeroes(race.id);
    const history = getHistoricalHeroes(race.id);
    const npcs = getCampaignPeople(race.id, 'npc');
    const enemies = getCampaignPeople(race.id, 'enemy');
    return {
      race,
      concept,
      cover: getCover(race, concept, [...heroes, ...npcs, ...enemies]),
      heroes,
      history,
      npcs,
      enemies,
    };
  });
}

export function getRaceCatalogueAudit(): RaceCatalogueAudit {
  const npcs = campaigns.flatMap((campaign) => (campaign.npcs ?? []).map((person) => ({person, campaignTitle: campaign.title})));
  const enemies = campaigns.flatMap((campaign) => campaign.enemies.map((person) => ({person, campaignTitle: campaign.title})));
  return {
    raceCount: races.length,
    playableCount: races.filter((race) => race.status === 'playable').length,
    heroCount: characters.length,
    npcCount: npcs.length,
    enemyCount: enemies.length,
    unclassifiedNpcs: npcs.filter(({person}) => !person.raceConceptIds?.length).map(({person, campaignTitle}) => `${person.name} — ${campaignTitle}`),
    unclassifiedEnemies: enemies.filter(({person}) => !person.raceConceptIds?.length).map(({person, campaignTitle}) => `${person.name} — ${campaignTitle}`),
  };
}
