"""Static integrity and preview safety checks, without network or real sends."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'

class Document(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.ids=[]; self.refs=[]; self.images=[]; self.feed(text)
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if a.get('id'): self.ids.append(a['id'])
        if tag == 'img': self.images.append(a)
        if not ('data-qr-download' in a):
            for key in ('href','src'):
                if a.get(key): self.refs.append(a[key])

errors=[]
for f in DIST.glob('*.html'):
    d=Document(f.read_text())
    if len(d.ids)!=len(set(d.ids)): errors.append(f'{f.name}: duplicate IDs')
    for image in d.images:
        if 'alt' not in image: errors.append(f'{f.name}: missing alt')
    for ref in d.refs:
        u=urlsplit(ref)
        if u.scheme or u.netloc: continue
        target = (f.parent/u.path) if u.path else f
        if target.is_dir(): target=target/'index.html'
        if not target.exists(): errors.append(f'{f.name}: missing {ref}')
        elif u.fragment:
            target_ids=Document(target.read_text()).ids
            if u.fragment not in target_ids: errors.append(f'{f.name}: missing anchor {ref}')
cfg=json.loads((DIST/'config.js').read_text().split(' = ',1)[1].rstrip(';\n'))
if cfg['mode']=='preview':
    assert cfg['formEnabled'] is False
    assert cfg['contactEmail']=='msplomberie50@hotmail.com'
    assert 'onsubmit="return false"' in (DIST/'index.html').read_text()
assert 'Ramonage' not in (DIST/'index.html').read_text()
assert 'Facebook' not in (DIST/'index.html').read_text()
assert 'mailto:gestion.localia@gmail.com' not in (DIST/'index.html').read_text()
# A coastal place must be pinned on the land silhouette, not the sea. This
# catches Granville's offshore administrative centroid being used again.
map_svg=ET.fromstring((DIST/'assets/secteur-intervention.svg').read_text())
land_rings=[]
for el in map_svg:
    if el.get('class')=='land':
        land_rings.append([(float(x),float(y)) for x,y in re.findall(r'[ML](-?[\d.]+) (-?[\d.]+)',el.get('d'))])
def on_land(x,y,ring):
    inside=False
    for (a,b),(c,d) in zip(ring,ring[1:]+ring[:1]):
        if (b>y)!=(d>y) and x<(c-a)*(y-b)/(d-b)+a: inside=not inside
    return inside
pins=[el for el in map_svg if el.get('data-city')]
assert len(pins)==4
for pin in pins:
    assert any(on_land(float(pin.get('cx')),float(pin.get('cy')),ring) for ring in land_rings), f'{pin.get("data-city")}: map pin is offshore'
granville=next(pin for pin in pins if pin.get('data-city')=='Granville')
assert -1.61<float(granville.get('data-longitude'))<-1.56 and 48.83<float(granville.get('data-latitude'))<48.85
# SEO basics on every page meant for search engines, and valid structured data.
SERVICE_PAGES=('pompe-a-chaleur.html','panneaux-solaires.html','salle-de-bains.html')
for name in ('index.html',)+SERVICE_PAGES:
    text=(DIST/name).read_text()
    if len(re.findall(r'<h1[\s>]',text))!=1: errors.append(f'{name}: expected exactly one h1')
    if not re.search(r'<title>[^<]{20,}</title>',text): errors.append(f'{name}: missing title')
    if not re.search(r'<meta name="description" content="[^"]{60,}"',text): errors.append(f'{name}: missing description')
    if 'Périers' not in re.search(r'<h1.*?</h1>',text,re.S).group(0): errors.append(f'{name}: h1 should name Périers')
    blocks=re.findall(r'<script type="application/ld\+json">(.*?)</script>',text,re.S)
    if not blocks: errors.append(f'{name}: missing JSON-LD')
    for block in blocks:
        try: data=json.loads(block)
        except ValueError: errors.append(f'{name}: invalid JSON-LD'); continue
        if 'site:/' in block: errors.append(f'{name}: unresolved site:/ reference')
    if name!='index.html' and name not in (DIST/'index.html').read_text(): errors.append(f'{name}: not linked from the homepage')
# The QR card is a tool for Sébastien, not part of the visitor homepage.
assert 'id="google"' not in (DIST/'index.html').read_text()
# QR home-screen shortcut: manifest, icons and a fully generated offline worker.
manifest=json.loads((DIST/'qr.webmanifest').read_text())
assert manifest['start_url']=='qr.html' and all((DIST/i['src']).exists() for i in manifest['icons'])
worker=(DIST/'qr-sw.js').read_text()
assert '__QR_' not in worker
for ref in json.loads(re.search(r'const FILES = (\[.*?\]);',worker).group(1)):
    if not (DIST/ref.split('?')[0]).exists(): errors.append(f'qr-sw.js: missing precached {ref}')
if cfg['mode']!='production':
    assert not (DIST/'sitemap.xml').exists() and 'Disallow: /' in (DIST/'robots.txt').read_text()
    for f in DIST.glob('*.html'):
        if 'content="index, follow"' in f.read_text(): errors.append(f'{f.name}: indexable outside production')
assert not errors, '\n'.join(errors)
print('OK — links, anchors, alternatives, preview transmission guard, four map pins on land, SEO pages and offline QR')
