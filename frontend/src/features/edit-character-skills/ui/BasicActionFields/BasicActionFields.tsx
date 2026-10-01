import {abilityRules} from '../../../../entities/character-form';
import type {BasicAction} from '../../../../entities/character-form';
import {TextField} from '../../../../shared/ui/TextField';
import {SelectField} from '../../../../shared/ui/SelectField';
import {modifierOptions} from '../../model/skill-options';
import styles from './BasicActionFields.module.css';

export type BasicActionFieldsProps = {value: BasicAction; onChange: (value: BasicAction) => void};

export function BasicActionFields({value, onChange}: BasicActionFieldsProps) {
  return (
    <section className={styles.basic}>
      <header><h3>Базовая атака</h3><span>Бесплатно · без зарядов</span></header>
      <div className={styles.row}>
        <TextField label="Название базовой атаки" value={value.name} maxLength={120} required
          onChange={(name) => onChange({...value, name})} />
        <SelectField label="Характеристика базовой атаки" value={value.modifierStat} options={modifierOptions}
          onChange={(modifierStat) => onChange({...value, modifierStat})} />
      </div>
      <TextField label="Описание базовой атаки" value={value.description} multiline maxLength={2000}
        placeholder="Как герой атакует?" onChange={(description) => onChange({...value, description})} />
      <small>Одна цель · {abilityRules.basicAction.dice.count}d{abilityRules.basicAction.dice.sides} + модификатор · одно действие.</small>
    </section>
  );
}
