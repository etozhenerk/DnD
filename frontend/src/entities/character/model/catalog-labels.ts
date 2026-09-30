import type {CreatorCatalog} from './created-character';

export function getCharacterLabels(catalog: CreatorCatalog, raceId: string, classId: string) {
  return {
    race: catalog.races.find((race) => race.id === raceId)?.name ?? raceId,
    className: catalog.classes.find((profile) => profile.id === classId)?.name ?? classId,
  };
}

export function getAttributeLabel(id: string): string {
  const labels: Record<string, string> = {
    strength: 'Сила', dexterity: 'Ловкость', constitution: 'Телосложение',
    wisdom: 'Мудрость', intelligence: 'Интеллект', charisma: 'Харизма',
  };
  return labels[id] ?? id;
}

export function getUsesLabel(scope: string, max: number): string {
  const labels: Record<string, string> = {
    turn: 'ход', round: 'раунд', battle: 'бой', location: 'локацию', campaign: 'кампанию',
  };
  return `${max} за ${labels[scope] ?? scope}`;
}
