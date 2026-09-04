import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent / "docs" / "schemas"
files = [
    "mission-package.schema.json",
    "task-contract.schema.json",
    "hitl-receipt.schema.json",
]
for name in files:
    schema_path = root / name
    assert schema_path.exists(), f"Missing schema file: {schema_path}"
    data = json.loads(schema_path.read_text(encoding="utf-8"))
    assert data["$schema"] == "https://json-schema.org/draft/2020-12/schema"
    assert "$id" in data
    assert data["type"] == "object"
    assert data["additionalProperties"] is False
    print(f"VALID {name}: {len(data['required'])} required top-level fields")
print("ALL SCHEMAS VALID")
