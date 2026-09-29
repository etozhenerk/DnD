import type {GallerySessionSnapshot} from './gallerySession';

export type DialoguePresetEffect =
  | {type: 'consume-assist'; assistId: string}
  | {type: 'consume-flag'; flag: string}
  | {type: 'consume-use'; useId: string}
  | {type: 'grant-item'; itemId: string; count: number}
  | {type: 'modify-relationship'; target: string; value: number}
  | {type: 'remove-item'; itemId: string; count: number}
  | {type: 'set-flag'; flag: string; value: boolean}
  | {type: 'start-battle'; encounterId: string};

export interface DialoguePresetConditions {
  activeChannelKnown?: boolean;
  alexisCalmed?: boolean;
  all?: DialoguePresetConditions[];
  always?: boolean;
  apologyOffered?: boolean;
  approach?: string;
  askedAboutAfterShow?: boolean;
  askedAboutBride?: boolean;
  askedAboutEgorikAndNastya?: boolean;
  askedAboutEnvelope?: boolean;
  askedAboutPayment?: boolean;
  askedAboutRecipient?: boolean;
  askedAboutSatyr?: boolean;
  askedForDiagnosis?: boolean;
  askedForFutureConversation?: boolean;
  askedToFakeGroom?: boolean;
  askedToPublishRecording?: boolean;
  askedWhatHeWants?: boolean;
  askedWhatSheWants?: boolean;
  automaticYesDetected?: boolean;
  bossPhase?: number;
  calledGroom?: boolean;
  chargeReady?: boolean;
  checkId?: string;
  checkResult?: 'success' | 'failure';
  choiceDirection?: string;
  clue?: string;
  consentConfirmed?: boolean;
  danceLoopActive?: boolean;
  discovered?: boolean;
  egorikVoiceRejected?: boolean;
  eligibleHeroIds?: string[];
  equals?: boolean;
  familyChoicePending?: boolean;
  familyChoiceResolved?: boolean;
  flag?: string;
  groomDoorOpen?: boolean;
  itemHeld?: string;
  itemOffered?: string;
  itemRecovered?: string;
  kostryulkaUseAvailable?: boolean;
  motivationQuestionAnswered?: boolean;
  payerIdentified?: boolean;
  portraitPointedOut?: boolean;
  pressureUsed?: boolean;
  pressuredForAnswer?: boolean;
  privateAnswerCaptured?: boolean;
  questAccepted?: boolean;
  questDecision?: string;
  recordingDiscussed?: boolean;
  requiresFlag?: string;
  satyrFreed?: boolean;
  showAborted?: boolean;
  showResolved?: boolean;
  shownEgorikRecording?: boolean;
  technicalNeedExplained?: boolean;
  value?: boolean;
  waterWallActive?: boolean;
}

export interface DialogueVoiceDefinition {
  characterId: string;
  voice: string;
  tempo: string;
  vocabulary: string[];
  forbidden: string[];
  gesture: string;
}

export interface DialoguePresetDefinition {
  id: string;
  characterId: string;
  sceneIds: string[];
  label: string;
  intent: string;
  tone: string;
  conditions: DialoguePresetConditions;
  text: string;
  gmNote: string;
  reveals: string[];
  effects: DialoguePresetEffect[];
}

export interface DialogueBankDefinition {
  version: number;
  campaignId: string;
  status: 'approved';
  selectionPolicy: 'gm-only';
  voices: DialogueVoiceDefinition[];
  presets: DialoguePresetDefinition[];
}

export interface DialogueConditionEvaluation {
  available: boolean;
  unmet: string[];
}

const contextualConditionLabels: Partial<Record<keyof DialoguePresetConditions, string>> = {
  apologyOffered: 'извинение предложено в текущем разговоре',
  approach: 'выбран нужный подход к разговору',
  askedAboutAfterShow: 'задан вопрос о событиях после шоу',
  askedAboutBride: 'задан вопрос о невесте',
  askedAboutEgorikAndNastya: 'задан вопрос о Егорике и Настасье',
  askedAboutEnvelope: 'задан вопрос о конверте',
  askedAboutPayment: 'задан вопрос об оплате',
  askedAboutRecipient: 'задан вопрос о получателе',
  askedAboutSatyr: 'задан вопрос о Satyr',
  askedForDiagnosis: 'запрошен диагноз',
  askedForFutureConversation: 'запрошен будущий прямой разговор',
  askedToFakeGroom: 'Егорика попросили изображать жениха',
  askedToPublishRecording: 'задан вопрос о публикации записи',
  askedWhatHeWants: 'Станиса спросили о его желании',
  askedWhatSheWants: 'Полинетту спросили о её желании',
  automaticYesDetected: 'в разговоре замечено автоматическое «да»',
  calledGroom: 'Егорика назвали женихом',
  chargeReady: 'атака разгона подготовлена и показана игрокам',
  consentConfirmed: 'Полинетта явно подтвердила согласие',
  itemOffered: 'предмет предложен в текущем разговоре',
  motivationQuestionAnswered: 'вопрос о мотивации получил честный ответ',
  portraitPointedOut: 'герои указали на портрет',
  pressuredForAnswer: 'на собеседника давят ради ответа',
  privateAnswerCaptured: 'камера захватила личный ответ',
  questDecision: 'игроки озвучили указанное решение по поручению',
  recordingDiscussed: 'обсуждение записи началось',
  shownEgorikRecording: 'Satyr показана запись с Егориком',
  waterWallActive: 'водяная стена активна в текущем эпизоде',
};

function addRequirement(unmet: string[], ready: boolean, description: string) {
  if (!ready) unmet.push(description);
}

function getCurrentCombatPhase(state: GallerySessionSnapshot) {
  if (!state.combat) return 0;
  const correctedCommandIds = new Set(state.events.flatMap((event) => (
    event.type === 'action-corrected' ? [event.correctedCommandId] : []
  )));
  const phaseEvent = [...state.events].reverse().find((event) => (
    event.type === 'combat-phase-advanced'
    && !correctedCommandIds.has(event.commandId)
  ));
  return phaseEvent?.type === 'combat-phase-advanced' ? phaseEvent.phase : 1;
}

function evaluateSingleCondition(
  conditions: DialoguePresetConditions,
  state: GallerySessionSnapshot,
  selectedHeroId: string | null,
) {
  const unmet: string[] = [];
  if (conditions.always === false) unmet.push('условие always должно быть истинным');

  conditions.all?.forEach((nested) => {
    unmet.push(...evaluateSingleCondition(nested, state, selectedHeroId));
  });

  if (conditions.flag) {
    const expected = conditions.value ?? conditions.equals ?? true;
    addRequirement(
      unmet,
      Boolean(state.flags[conditions.flag]) === expected,
      `флаг ${conditions.flag} должен быть ${expected ? 'включён' : 'выключен'}`,
    );
  }
  if (conditions.requiresFlag) {
    addRequirement(unmet, Boolean(state.flags[conditions.requiresFlag]), `нужен флаг ${conditions.requiresFlag}`);
  }
  if (conditions.itemRecovered) {
    const recoveredEarlier = conditions.itemRecovered === 'pussy-sultan-golden-scepter-microphone'
      && Boolean(state.flags['scepter-recovered'] || state.flags['scepter-returned']);
    addRequirement(
      unmet,
      state.inventory.includes(conditions.itemRecovered) || recoveredEarlier,
      `нужен предмет ${conditions.itemRecovered}`,
    );
  }
  if (conditions.itemHeld) {
    addRequirement(unmet, state.inventory.includes(conditions.itemHeld), `нужен предмет ${conditions.itemHeld}`);
  }
  if (conditions.clue && conditions.discovered !== false) {
    addRequirement(unmet, state.clues.includes(conditions.clue), `нужна улика ${conditions.clue}`);
  }
  if (conditions.checkId) {
    addRequirement(
      unmet,
      state.lastRoll?.checkId === conditions.checkId,
      `последняя проверка должна быть ${conditions.checkId}`,
    );
    if (conditions.checkResult) {
      addRequirement(
        unmet,
        state.lastRoll?.checkId === conditions.checkId
          && state.lastRoll.success === (conditions.checkResult === 'success'),
        `результат проверки должен быть ${conditions.checkResult}`,
      );
    }
  }
  if (conditions.eligibleHeroIds) {
    addRequirement(
      unmet,
      selectedHeroId !== null && conditions.eligibleHeroIds.includes(selectedHeroId),
      `нужно выбрать подходящего героя: ${conditions.eligibleHeroIds.join(', ')}`,
    );
  }
  if (conditions.bossPhase !== undefined) {
    const phase = getCurrentCombatPhase(state);
    addRequirement(unmet, phase === conditions.bossPhase, `нужна фаза босса ${conditions.bossPhase}`);
  }

  const stateAliases: Array<[
    keyof DialoguePresetConditions,
    boolean | undefined,
    boolean,
    string,
  ]> = [
    ['activeChannelKnown', conditions.activeChannelKnown, state.combat?.encounterId === 'last-take-module', 'должен быть известен активный канал финального модуля'],
    ['alexisCalmed', conditions.alexisCalmed, Boolean(state.flags['alexis-calmed']), 'Алексис должна быть успокоена'],
    ['danceLoopActive', conditions.danceLoopActive, !state.flags['dance-troupe-freed'], 'танцоры ещё должны оставаться под заклятием'],
    ['egorikVoiceRejected', conditions.egorikVoiceRejected, state.clues.includes('egorik-not-groom'), 'голос Егорика должен быть отклонён'],
    ['familyChoicePending', conditions.familyChoicePending, Boolean(state.flags['stas-call-consent']) && !state.flags['family-branch-womanizer'] && !state.flags['family-branch-therapy'], 'семейный выбор должен ожидать решения'],
    ['familyChoiceResolved', conditions.familyChoiceResolved, Boolean(state.flags['stas-marriage-ended'] || state.flags['polina-family-plan']), 'семейный выбор должен быть завершён'],
    ['groomDoorOpen', conditions.groomDoorOpen, Boolean(state.flags['groom-voice-key']), 'дверь комнаты жениха должна быть открыта'],
    ['kostryulkaUseAvailable', conditions.kostryulkaUseAvailable, !state.usedAbilities.includes('kostryulka-campaign-help'), 'помощь Кострюльки должна быть доступна'],
    ['payerIdentified', conditions.payerIdentified, Boolean(state.flags['prokhor-payer-identified']), 'плательщица должна быть установлена'],
    ['questAccepted', conditions.questAccepted, Boolean(state.flags['pussy-quest-accepted']), 'поручение Pussy Sultan должно быть принято'],
    ['satyrFreed', conditions.satyrFreed, Boolean(state.flags['satyr-freed']), 'Satyr должен быть освобождён'],
    ['showAborted', conditions.showAborted, state.lastStoryAction?.actionId === 'abort-show-18-broadcast', 'эфир должен быть аварийно прерван'],
    ['showResolved', conditions.showResolved, Boolean(state.flags['show-18-complete']), 'эфир должен быть завершён'],
    ['technicalNeedExplained', conditions.technicalNeedExplained, state.lastStoryAction?.actionId === 'explain-reset-to-couple', 'техническая необходимость должна быть объяснена'],
  ];
  stateAliases.forEach(([key, expected, actual, description]) => {
    if (expected === undefined) return;
    addRequirement(unmet, actual === expected, description);
  });

  if (conditions.pressureUsed !== undefined) {
    addRequirement(
      unmet,
      Boolean(state.flags['couple-pressure-used']) === conditions.pressureUsed,
      `давление должно быть ${conditions.pressureUsed ? 'применено' : 'не применено'}`,
    );
  }

  Object.entries(contextualConditionLabels).forEach(([key, description]) => {
    const value = conditions[key as keyof DialoguePresetConditions];
    if (value === undefined) return;
    if (key === 'approach') {
      unmet.push(`${description}: ${String(value)}`);
      return;
    }
    if (key === 'itemOffered' || key === 'questDecision') {
      unmet.push(`${description}: ${String(value)}`);
      return;
    }
    if (value === true) unmet.push(description);
  });

  if (conditions.choiceDirection) {
    const stateChoice = state.flags['stas-marriage-ended']
      ? 'stas'
      : state.flags['polina-family-plan']
        ? 'polina'
        : null;
    addRequirement(
      unmet,
      stateChoice === conditions.choiceDirection,
      `направление выбора должно быть ${conditions.choiceDirection}`,
    );
  }

  return unmet;
}

export function evaluateDialoguePresetConditions(
  preset: DialoguePresetDefinition,
  state: GallerySessionSnapshot,
  selectedHeroId: string | null,
): DialogueConditionEvaluation {
  const unmet = [...new Set(evaluateSingleCondition(preset.conditions, state, selectedHeroId))];
  return {available: unmet.length === 0, unmet};
}

export function describeDialogueEffect(effect: DialoguePresetEffect) {
  switch (effect.type) {
    case 'consume-assist': return `Расход поддержки: ${effect.assistId}`;
    case 'consume-flag': return `Погасить флаг: ${effect.flag}`;
    case 'consume-use': return `Расход применения: ${effect.useId}`;
    case 'grant-item': return `Выдать предмет: ${effect.itemId} × ${effect.count}`;
    case 'modify-relationship': return `Отношение ${effect.target}: ${effect.value >= 0 ? '+' : ''}${effect.value}`;
    case 'remove-item': return `Убрать предмет: ${effect.itemId} × ${effect.count}`;
    case 'set-flag': return `Флаг ${effect.flag} → ${effect.value ? 'да' : 'нет'}`;
    case 'start-battle': return `Начать бой: ${effect.encounterId}`;
  }
}

export function getDialogueSceneContexts(sceneId: string) {
  const contexts = new Set([sceneId]);
  if (sceneId === 'hotel-overload-search') contexts.add('hotel-overload');
  if (
    ['alexis-room', 'alexis-room-after-pussy', 'pussy-audience', 'pussy-prop-room', 'pussy-scepter-return'].includes(sceneId)
    || sceneId.startsWith('hotel-gallery')
    || sceneId.startsWith('hotel-vip')
    || sceneId.startsWith('vip-prop-room')
    || sceneId === 'hotel-archive-alexis'
  ) contexts.add('hotel-gallery');
  if (sceneId.startsWith('closed-bar')) {
    contexts.add('closed-bar');
  }
  return contexts;
}
