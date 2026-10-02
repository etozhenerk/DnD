import type {AdvisorContext} from '../../../entities/character-advisor';

export type AdvisorImageTarget = {id: string; name: string; description: string};
export type AdvisorImageIntent = {kind: 'portrait' | 'icon'; target?: string};

export function getAdvisorImageTargets(context: AdvisorContext): AdvisorImageTarget[] {
  const section = context.formData?.abilities;
  if (!section || typeof section !== 'object' || !('items' in section) || !Array.isArray(section.items)) return [];
  return section.items.filter((item): item is AdvisorImageTarget =>
    !!item && typeof item === 'object' && typeof item.id === 'string' &&
    typeof item.name === 'string' && typeof item.description === 'string');
}

// Only explicit drawing commands bypass the text model; ambiguous requests stay conversational.
export function getAdvisorImageIntent(message: string, context: AdvisorContext, selectedId: string): AdvisorImageIntent | null {
  const text = message.toLocaleLowerCase('ru').trim();
  const command = /(?:^|[\s,.!?])(?:нарисуй|рисуй|сгенерируй|сгенерь|сгенери|создай|сделай)\s/;
  if (!command.test(text) || /(?:^|\s)(?:не|как|почему|зачем)\s/.test(text)) return null;
  const portrait = /(?:портрет|аватар|изображение героя|картинк[ау] героя)/.test(text);
  const icon = /иконк/.test(text);
  if (portrait === icon) return null;
  // Drawing and building the character together needs the model's tool planning.
  if (/(?:заполни|собери|все поля|всю анкету)/.test(text)) return null;
  if (portrait) return {kind: 'portrait'};
  const skills = getAdvisorImageTargets(context);
  const named = skills.filter((skill) => skill.name.trim() && text.includes(skill.name.toLocaleLowerCase('ru').trim()));
  if (named.length > 1 || /(?:все|всем|каждому|несколько|две|три)\s+икон/.test(text)) return null;
  const target = named[0] ?? skills.find((skill) => skill.id === selectedId) ?? skills[0];
  return target ? {kind: 'icon', target: target.id} : null;
}
