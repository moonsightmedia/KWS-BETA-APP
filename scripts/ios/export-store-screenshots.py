"""Select original XCTest PNG attachments, validate Apple sizes, record hashes."""
import hashlib
import json
import pathlib
import shutil
import struct
import sys

source, output = map(pathlib.Path, sys.argv[1:3])
family = sys.argv[3]
allowed = {"iphone": {(1179, 2556), (1206, 2622)},
           "ipad": {(2048, 2732), (2064, 2752)}}[family]
manifest_files = list(source.rglob("manifest.json"))
if not manifest_files:
    raise SystemExit("xcresult attachment manifest missing")
output.mkdir(parents=True, exist_ok=True)
selected = {}

def visit(node):
    if isinstance(node, list):
        for child in node:
            visit(child)
    elif isinstance(node, dict):
        name = str(node.get("suggestedHumanReadableName", node.get("name", "")))
        filename = node.get("exportedFileName", node.get("fileName", node.get("filename")))
        if name.startswith("store-") and filename:
            raw = source / filename
            if not raw.exists():
                matches = list(source.rglob(pathlib.Path(filename).name))
                if len(matches) != 1:
                    raise ValueError("Ambiguous exported attachment")
                raw = matches[0]
            data = raw.read_bytes()
            if data[:8] != b"\x89PNG\r\n\x1a\n":
                raise ValueError("Store attachment is not an original PNG")
            dimensions = struct.unpack(">II", data[16:24])
            if dimensions not in allowed:
                raise ValueError(f"Unexpected {family} screenshot dimensions {dimensions}")
            basename = name.split("_")[0].split(".png")[0] + ".png"
            if pathlib.Path(basename).name != basename:
                raise ValueError("Unsafe attachment filename")
            shutil.copyfile(raw, output / basename)
            selected[basename] = {"size": dimensions, "sha256": hashlib.sha256(data).hexdigest()}
        for child in node.values():
            if isinstance(child, (dict, list)):
                visit(child)

for manifest in manifest_files:
    visit(json.loads(manifest.read_text()))
if len(selected) != 3:
    raise SystemExit(f"Expected 3 store screenshots, found {len(selected)}")
(output / "verified.json").write_text(json.dumps(selected, indent=2) + "\n")
print(f"Verified {len(selected)} original native {family} screenshots; no resizing")
