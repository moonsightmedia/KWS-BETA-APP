"""Generate the iOS icon from the existing Kletterwelt artwork (Pillow required).

No redraw or font substitution: preserve the original proportions and composite
onto an opaque white square. Run from any working directory.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'public/080616_Kletterwelt-Sauerland_Logo_ohne_Hintergrund_ohne_Schrift.png'
TARGET = ROOT / 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'


def main():
    with Image.open(SOURCE) as original:
        artwork = ImageOps.exif_transpose(original).convert('RGBA')
        artwork.thumbnail((944, 944), Image.Resampling.LANCZOS)
        icon = Image.new('RGB', (1024, 1024), 'white')
        icon.paste(artwork, ((1024 - artwork.width) // 2,
                            (1024 - artwork.height) // 2), artwork)
        icon.save(TARGET, 'PNG', optimize=True)
    with Image.open(TARGET) as check:
        assert check.size == (1024, 1024) and check.mode == 'RGB'
    print(json.dumps({'size': [1024, 1024], 'mode': 'RGB',
                      'source': str(SOURCE.relative_to(ROOT)),
                      'sha256': hashlib.sha256(TARGET.read_bytes()).hexdigest()}))


if __name__ == '__main__':
    main()
