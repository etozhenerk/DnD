export const creatorSteps = [
  {id: 'appearance', title: 'Образ', heading: 'Образ героя', description: 'Имя, внешность, предыстория, характер и мотивация.'},
  {id: 'race', title: 'Раса', heading: 'Раса героя', description: 'Народы Восьми Земель и их особенности.'},
  {id: 'class', title: 'Класс', heading: 'Призвание героя', description: 'Класс и стиль, в котором герой будет действовать.'},
  {id: 'attributes', title: 'Характеристики', heading: 'Характеристики', description: 'Стартовый пресет класса и распределение очков.'},
  {id: 'abilities', title: 'Навыки', heading: 'Ваши навыки', description: 'Собственные способности: описание, урон или лечение.'},
  {id: 'equipment', title: 'Снаряжение', heading: 'Снаряжение', description: 'Предметы, с которыми герой отправится в приключение.'},
  {id: 'review', title: 'Итог', heading: 'Проверка героя', description: 'Сводка выбора и проверка перед завершением персонажа.'},
] as const;

export type CreatorStep = typeof creatorSteps[number];
