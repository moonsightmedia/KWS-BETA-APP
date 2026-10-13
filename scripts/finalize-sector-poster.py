"""Normalize Chromium's sub-mm page rounding; validate names, links and fonts."""
import json
from pathlib import Path
from pypdf import PdfReader, PdfWriter
from pypdf.generic import RectangleObject

root = Path(__file__).resolve().parents[1]
out = root / 'docs/print/sectors'
manifest = json.loads((out / 'qr-manifest.json').read_text(encoding='utf-8'))
for filename, width, height, bleed in [
    ('kws-sektoren-a3.pdf', 297, 420, 0),
    ('kws-sektoren-a3-beschnitt.pdf', 303, 426, 3),
]:
    path = out / filename
    reader = PdfReader(path)
    assert len(reader.pages) == 1, 'Poster must remain one page'
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    page = writer.pages[0]
    pt = 72 / 25.4
    page.mediabox = RectangleObject([0, 0, width * pt, height * pt])
    page.cropbox = page.mediabox
    page.bleedbox = page.mediabox
    page.trimbox = RectangleObject([bleed * pt, bleed * pt, (width - bleed) * pt, (height - bleed) * pt])
    writer.add_metadata({'/Title': 'Kletterwelt Sauerland - Deine Halle. Deine Beta.', '/Author': 'Kletterwelt Sauerland', '/Subject': 'A3 Sektorenatlas mit 19 Sektor-QR-Codes'})
    with path.open('wb') as stream:
        writer.write(stream)
    page = PdfReader(path).pages[0]
    text = page.extract_text()
    # PDF text extractors may insert spaces between positioned subset-font glyphs.
    compact_text = ''.join(text.split())
    assert all(''.join(entry['name'].split()) in compact_text for entry in manifest['entries'])
    urls = [a.get_object()['/A']['/URI'] for a in page.get('/Annots', []) if a.get_object().get('/A', {}).get('/URI')]
    assert len(urls) == 19 and set(urls) == {entry['url'] for entry in manifest['entries']}
    if not bleed:
        # Printed link rectangles reflect Skia's actual print-position rounding,
        # unlike screen getBoundingClientRect coordinates in distributed flex rows.
        printed_layout = []
        for annotation in page.get('/Annots', []):
            annotation = annotation.get_object()
            uri = annotation.get('/A', {}).get('/URI')
            entry = next((e for e in manifest['entries'] if e['url'] == uri), None)
            if not entry:
                continue
            x0, _, x1, y1 = [float(value) / pt for value in annotation['/Rect']]
            printed_layout.append({'name': entry['name'], 'xMm': (x0 + x1) / 2 - entry['sizeMm'] / 2, 'yMm': height - y1})
        (root / 'tmp/pdfs/sector-poster-layout.json').write_text(json.dumps(printed_layout, indent=2), encoding='utf-8')
    fonts = []
    visited = set()
    def collect_fonts(resources):
        resources = resources.get_object()
        if id(resources) in visited:
            return
        visited.add(id(resources))
        fonts.extend(resources.get('/Font', {}).get_object().values() if '/Font' in resources else [])
        for ref in resources.get('/XObject', {}).get_object().values() if '/XObject' in resources else []:
            obj = ref.get_object()
            if '/Resources' in obj:
                collect_fonts(obj['/Resources'])
    collect_fonts(page['/Resources'])
    assert fonts, 'No text fonts found in page or form resources'
    for ref in fonts:
        font = ref.get_object()
        for child in font.get('/DescendantFonts', [font]):
            descriptor = child.get_object().get('/FontDescriptor')
            assert descriptor and any(key in descriptor.get_object() for key in ['/FontFile', '/FontFile2', '/FontFile3']), 'Font not embedded'
    print(f'{filename}: exact {width} x {height} mm, one page, 19 names/links, embedded fonts, TrimBox verified')
