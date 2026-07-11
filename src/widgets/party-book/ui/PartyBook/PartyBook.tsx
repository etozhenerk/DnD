import {useState} from 'react';
import type {Character} from '../../../../entities/character/model/types';
import {CharacterProfile} from '../../../../entities/character/ui/CharacterProfile/CharacterProfile';
import {CharacterTabs} from '../../../../entities/character/ui/CharacterTabs/CharacterTabs';
import styles from './PartyBook.module.css';

export function PartyBook({party}: {party: Character[]}) {
  const [activeId, setActiveId] = useState(party[0]?.id ?? '');
  const activeCharacter = party.find((character) => character.id === activeId) ?? party[0];

  if (!activeCharacter) return null;

  return (
    <section className={styles.section}>
      <div className={styles.heading}><p>Герои Нор’Иль’Скальда</p><h2>Отряд, который вернул прибытие</h2></div>
      <CharacterTabs characters={party} activeId={activeCharacter.id} onSelect={setActiveId} />
      <CharacterProfile character={activeCharacter} />
    </section>
  );
}
