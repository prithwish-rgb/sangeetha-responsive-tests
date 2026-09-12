"""
One-time (or re-run-when-updated) converter: reads a postcode column out
of your Excel sheet and writes it into the JSON format the hyperlocal
suite expects (tests/hyperlocal/data/pincodes.json).

Usage:
    python scripts/convert-pincodes.py <path-to-excel-file> <postcode-column-name>

Example:
    python scripts/convert-pincodes.py "Pincode Master.xlsx" "POSTCODE"
"""

import sys
import json
import pandas as pd
from pathlib import Path


def main():
    if len(sys.argv) != 3:
        print("Usage: python scripts/convert-pincodes.py <excel-file> <postcode-column-name>")
        sys.exit(1)

    excel_path = sys.argv[1]
    column_name = sys.argv[2]

    df = pd.read_excel(excel_path)

    if column_name not in df.columns:
        print(f"Column '{column_name}' not found. Available columns: {list(df.columns)}")
        sys.exit(1)

    raw_values = df[column_name].dropna().astype(str).str.strip()

    seen = set()
    pincodes = []
    skipped = []
    for val in raw_values:
        clean = val.replace('.0', '')
        if clean in seen:
            continue
        seen.add(clean)
        if clean.isdigit() and len(clean) == 6:
            pincodes.append({"code": clean})
        else:
            skipped.append(clean)

    output_path = Path(__file__).parent.parent / "tests" / "hyperlocal" / "data" / "pincodes.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(pincodes, indent=2), encoding="utf-8")

    print(f"Wrote {len(pincodes)} pincodes to {output_path}")
    if skipped:
        print(f"Skipped {len(skipped)} value(s) that didn't look like a 6-digit pincode:")
        print(skipped[:20], "..." if len(skipped) > 20 else "")


if __name__ == "__main__":
    main()
