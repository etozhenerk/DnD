"""Validate the draft schemas and report bounded damage/healing estimates in CI."""

from itertools import combinations, product
import json
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker
import yaml


ROOT = Path(__file__).resolve().parents[2]
PROPOSAL = ROOT / "docs/architecture/character-abilities-v1/gameplay.json"
CONTRACT = ROOT / "shared/api/proposals/character-abilities-v1.yaml"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validator(contract, name):
    schema = {
        "$ref": f"#/components/schemas/{name}",
        "components": contract["components"],
    }
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema, format_checker=FormatChecker())


def verify_schemas(proposal, contract):
    require(contract["openapi"] == "3.1.0" and contract["x-status"] == "draft", "schema status")
    for name in contract["components"]["schemas"]:
        validator(contract, name)
    profiles = proposal["profiles"]
    schemas = contract["components"]["schemas"]
    require(set(schemas["ProfileId"]["enum"]) == {p["id"] for p in profiles}, "profile IDs differ")
    require(schemas["ModifierStat"]["enum"] == proposal["modifierStats"], "stat choices differ")
    skills = schemas["CharacterSkillsInput"]
    require(skills["x-budget-points"] == proposal["budget"]["points"], "budget differs")
    require(skills["properties"]["items"]["maxItems"] == proposal["budget"]["maximumCustomAbilities"], "skill limit differs")
    require(skills["properties"]["narrativeItems"]["maxItems"] == proposal["narrativeAbilities"]["maximum"], "narrative limit differs")
    profile_schema = validator(contract, "AbilityProfile")
    for profile in profiles:
        profile_schema.validate(profile)
        require(profile["uses"]["max"] > 0, "unlimited active skill")
        require(profile["target"] == ("one-enemy" if profile["kind"] == "damage" else "one-friendly"), "target differs from kind")
    ability_schema = validator(contract, "CustomAbilityInput")
    for profile in profiles:
        valid = {"id": "test-skill", "name": "Тест", "description": "", "profileId": profile["id"], "modifierStat": "wisdom"}
        ability_schema.validate(valid)
        for field, value in [("points", 0), ("effects", [{"type": "healing", "amount": 999}]), ("uses", None), ("modifierStat", "constitution"), ("profileId", "infinite-healing"), ("name", "   "), ("iconAssetId", "not-a-uuid")]:
            invalid = {**valid, field: value}
            require(not ability_schema.is_valid(invalid), f"unsafe input accepted: {field}")
    whole = validator(contract, "CharacterSkillsInput")
    base = {"name": "Обычная атака", "description": "", "modifierStat": "strength"}
    valid_section = {"basicAction": base, "items": [], "narrativeItems": []}
    whole.validate(valid_section)
    too_many = {**valid_section, "items": [valid] * (proposal["budget"]["maximumCustomAbilities"] + 1)}
    require(not whole.is_valid(too_many), "skill count limit bypass")


def legal_builds(proposal):
    for count in range(proposal["budget"]["maximumCustomAbilities"] + 1):
        for build in combinations(proposal["profiles"], count):
            if sum(p["points"] for p in build) <= proposal["budget"]["points"]:
                yield build


def expected_amount(profile, modifier):
    dice = profile["dice"]
    modifier = max(0, modifier) if profile["kind"] == "healing" else modifier
    results = product(range(1, dice["sides"] + 1), repeat=dice["count"])
    return sum(max(0, sum(roll) + modifier) for roll in results) / dice["sides"] ** dice["count"]


def expected_damage(profile, modifier, ac, attack_bonus_base):
    normal_hits = sum(roll + attack_bonus_base + modifier >= ac for roll in range(2, 20))
    return expected_amount(profile, modifier) * (normal_hits + 2) / 20


def build_potential(proposal, build, modifier, ac, rounds):
    base = expected_damage(proposal["basicAction"], modifier, ac, proposal["resolution"]["attackBonusBase"])
    extras, healing = [], []
    for profile in build:
        if profile["kind"] == "damage":
            amount = expected_damage(profile, modifier, ac, proposal["resolution"]["attackBonusBase"])
            extras.extend([max(0, amount - base)] * profile["uses"]["max"])
        else:
            healing.extend([expected_amount(profile, modifier)] * profile["uses"]["max"])
    damage_max = base * rounds + sum(sorted(extras, reverse=True)[:rounds])
    healing_max = sum(sorted(healing, reverse=True)[:rounds])
    return damage_max, healing_max


def verify_sources_and_examples(proposal):
    rules = json.loads((ROOT / "content/rules.json").read_text())
    creation = json.loads((ROOT / "content/character-creation.json").read_text())
    characters = json.loads((ROOT / "content/characters.json").read_text())
    require(proposal["status"] == "draft", "proposal must remain draft before approval")
    require(proposal["sourceRulesVersion"] == rules["version"], "source rules changed")
    require(proposal["sourceCharacterCreationRulesetId"] == creation["id"], "source creation rules changed")
    require(proposal["budget"]["uniqueProfiles"] is True, "duplicate profiles need a new balance model")
    profiles = {p["id"]: p for p in proposal["profiles"]}
    require(len(profiles) == len(proposal["profiles"]), "duplicate profile ID")
    classes = {p["id"]: p for p in creation["classProfiles"]}
    hp = 0
    for build in proposal["exampleBuilds"]:
        require(len(set(build["profileIds"])) == len(build["profileIds"]), "duplicate example profile")
        require(len(build["profileIds"]) <= proposal["budget"]["maximumCustomAbilities"], "example exceeds count")
        points = sum(profiles[name]["points"] for name in build["profileIds"])
        require(points == build["points"] and points <= proposal["budget"]["points"], "example exceeds budget")
        cls = classes[build["classId"]]
        hp += cls["baseHp"] + creation["derivedStats"]["maxHp"]["constitutionMultiplier"] * cls["defaultStats"]["constitution"]
    existing = {c["id"]: c for c in characters}
    reference_hp = sum(existing[name]["maxHp"] for name in proposal["referencePartyIds"])
    require(hp == 176 and reference_hp == 183, "documented party HP changed")
    print(f"Example party: {hp} HP; reference party: {reference_hp} HP")


def main():
    proposal = json.loads(PROPOSAL.read_text())
    contract = yaml.safe_load(CONTRACT.read_text())
    verify_schemas(proposal, contract)
    verify_sources_and_examples(proposal)
    builds = list(legal_builds(proposal))
    print(f"Checked {len(builds)} legal profile combinations")
    print("rounds | modifier | AC | max expected damage | max potential healing")
    for rounds, modifier, ac in product(proposal["reviewScenarios"]["roundCounts"], proposal["reviewScenarios"]["modifiers"], proposal["reviewScenarios"]["targetACs"]):
        results = [build_potential(proposal, build, modifier, ac, rounds) for build in builds]
        damage = max(result[0] for result in results)
        healing = max(result[1] for result in results)
        if modifier == 4:
            require(healing == (28 if rounds == 3 else 32), "documented healing bound changed")
        print(f"{rounds:6} | {modifier:8} | {ac:2} | {damage:19.2f} | {healing:21.2f}")
    print("PASS: draft schemas, invalid inputs, sources, examples and bounded estimates")


if __name__ == "__main__":
    main()
