"""Shared output paths and player-facing action costs for printed cards."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REVISION = '2026-09-18'


def output_paths(hero_id):
    destination = ROOT / 'output/pdf' / f'hero-cards-{REVISION}'
    audit_dir = ROOT / 'tmp/pdfs' / f'hero-cards-{REVISION}'
    destination.mkdir(parents=True, exist_ok=True)
    audit_dir.mkdir(parents=True, exist_ok=True)
    stem = f'{hero_id}-penisuela-a4'
    return destination / f'{stem}.pdf', audit_dir / f'{stem}.sources.json'


def action_meta(action):
    activation = action.get('activation')
    if not activation:
        kinds = {effect['type'] for effect in action['effects']}
        activation = ('passive' if 'passive' in kinds else
                      'attack' if kinds & {'replace-attack', 'expose-weakness'} else 'action')
    labels = {'action': 'Действие', 'passive': 'Пассивно', 'movement': 'Перемещение',
              'bonus': 'Бонусное действие', 'attack': 'Вместо атаки'}
    scopes = {'campaign': 'кампанию', 'battle': 'бой', 'turn': 'ход',
              'location': 'локацию', 'round': 'раунд'}
    uses = action['uses']
    result = f"{labels[activation]} · {uses['max']}/{scopes[uses['scope']]}"
    if activation == 'action':
        result += ' · конец хода'
    return result
