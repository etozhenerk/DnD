import type {FantasyIconName} from '../../../shared/ui/FantasyIcon';
import {advisorExamples} from './advisor-examples';

export const advisorTasks: ReadonlyArray<{
  id: string; title: string; detail: string; icon: FantasyIconName; prompt: string;
}> = [
  {...advisorExamples[0], title: 'Имя и история', detail: 'Чтобы запомнили', icon: 'feather'},
  {...advisorExamples[1], title: 'Раса и класс', detail: 'Под твой стиль', icon: 'shield'},
  {...advisorExamples[2], title: 'Особый навык', detail: 'С изюминкой', icon: 'sun'},
  {
    id: 'hero', title: 'Герой с нуля', detail: 'Придумаем вместе', icon: 'book',
    prompt: 'Хочу придумать героя с нуля для Восьми Земель. Сначала задай мне два коротких вопроса о характере и стиле игры, потом предложи цельный образ: имя, историю, расу, класс и идею навыка. Учитывай уже заполненную анкету и наш лор.',
  },
];
