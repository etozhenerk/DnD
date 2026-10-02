"""Check actual HTTP response fixtures emitted by integration tests against OpenAPI."""

import json
from pathlib import Path
import sys

from jsonschema import Draft202012Validator, FormatChecker
import yaml


ROOT = Path(__file__).resolve().parents[2]


def main():
    contract = yaml.safe_load((ROOT / "shared/api/openapi.yaml").read_text())
    fixtures = Path(sys.argv[1])
    cases = {
        "advisor-created.json": {"$ref": "#/components/schemas/AdvisorSessionCreated"},
        "advisor-session.json": {"$ref": "#/components/schemas/AdvisorSession"},
        "advisor-guide.json": {"$ref": "#/components/schemas/AdvisorGuide"},
        "options.json": contract["paths"]["/creator/options"]["get"]["responses"]["200"]["content"]["application/json"]["schema"],
        "validation.json": {"$ref": "#/components/schemas/Validation"},
        "character.json": {"$ref": "#/components/schemas/Character"},
        "legacy-character.json": {"$ref": "#/components/schemas/Character"},
        "draft-access-denied.json": contract["components"]["responses"]["DraftsRequireAuthentication"]["content"]["application/json"]["schema"],
        "created-character.json": contract["paths"]["/characters"]["post"]["responses"]["201"]["content"]["application/json"]["schema"],
        "creation-validation.json": contract["paths"]["/characters"]["post"]["responses"]["422"]["content"]["application/json"]["schema"],
        "create-character-request.json": {"$ref": "#/components/schemas/CreateCharacter"},
    }
    for name, schema in cases.items():
        wrapped = {"allOf": [schema], "components": contract["components"]}
        Draft202012Validator.check_schema(wrapped)
        validator = Draft202012Validator(wrapped, format_checker=FormatChecker())
        validator.validate(json.loads((fixtures / name).read_text()))
        print(f"PASS: {name} matches OpenAPI")


if __name__ == "__main__":
    main()
