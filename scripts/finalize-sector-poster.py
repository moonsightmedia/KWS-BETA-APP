"""Normalize Chromium's sub-mm page rounding; validate names, links and fonts."""
import json
from pathlib import Path
from pypdf import PdfReader, PdfWriter
from pypdf.generic import RectangleObject

root = Path(__file__).resolve().parents[1]
out = root / 'docs/print/sectors'
manifest = json.loads((out / 'qr-manifest.json').read_text(encoding='utf-8'))
for filename, width, height, bleed in [
    ('kws-sektoren-a3.pdf', 420, 297, 0),
    ('kws-sektoren-a3-beschnitt.pdf', 426, 303, 3),
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
    writer.add_metadata({'/Title': 'Kletterwelt Sauerland - Dein Sektor. Deine Beta.', '/Author': 'Kletterwelt Sauerland', '/Subject': 'A3 Hallenorientierung mit 19 Sektor-QR-Codes'})
    with path.open('wb') as stream:
        writer.write(stream)
    page = PdfReader(path).pages[0]
    text = page.extract_text()
    assert all(entry['name'] in text for entry in manifest['entries'])
    urls = [a.get_object()['/A']['/URI'] for a in page.get('/Annots', []) if a.get_object().get('/A', {}).get('/URI')]
    assert len(urls) == 19 and set(urls) == {entry['url'] for entry in manifest['entries']}
    for ref in page['/Resources']['/Font'].get_object().values():
        font = ref.get_object()
        for child in font.get('/DescendantFonts', [font]):
            descriptor = child.get_object().get('/FontDescriptor')
            assert descriptor and any(key in descriptor.get_object() for key in ['/FontFile', '/FontFile2', '/FontFile3']), 'Font not embedded'
    print(f'{filename}: exact {width} x {height} mm, one page, 19 names/links, embedded fonts, TrimBox verified')
