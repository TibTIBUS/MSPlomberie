"""Check local recovery fidelity and preview safety. No network or sends."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
class Document(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.ids=[]; self.refs=[]; self.images=[]; self.feed(text)
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if a.get('id'): self.ids.append(a['id'])
        if tag=='img': self.images.append(a)
        if 'data-qr-download' not in a:
            for key in ('href','src'):
                if a.get(key): self.refs.append(a[key])

cfg=json.loads((DIST/'config.js').read_text().split(' = ',1)[1].rstrip(';\n'))
mode=cfg['mode']; errors=[]
for page in DIST.glob('*.html'):
    text=page.read_text();doc=Document(text)
    if len(doc.ids)!=len(set(doc.ids)): errors.append(f'{page.name}: duplicate IDs')
    for image in doc.images:
        if 'alt' not in image: errors.append(f'{page.name}: image without alt')
    for ref in doc.refs:
        u=urlsplit(ref)
        if u.scheme or u.netloc: continue
        target=DIST/u.path.lstrip('/') if u.path.startswith('/') else page.parent/u.path if u.path else page
        if target.is_dir(): target=target/'index.html'
        if not target.exists() and not target.suffix and target.with_suffix('.html').exists(): target=target.with_suffix('.html')
        if not target.exists(): errors.append(f'{page.name}: missing {ref}'); continue
        if u.fragment and target.suffix=='.html' and u.fragment not in Document(target.read_text()).ids: errors.append(f'{page.name}: missing anchor {ref}')
    if mode=='preview':
        if 'content="index, follow"' in text: errors.append(f'{page.name}: preview indexable')
        if re.search(r'<script>[^<]*fetch\([\'\"]/.netlify/functions',text,re.S): errors.append(f'{page.name}: preview calls live function')
        if 'data-netlify="true"' in text: errors.append(f'{page.name}: preview capture enabled')
if mode=='preview':
    assert cfg['formEnabled'] is False and cfg['indexable'] is False
    assert 'onsubmit="return false"' in (DIST/'index.html').read_text()
    assert not (DIST/'sitemap.xml').exists()
    assert 'Disallow: /' in (DIST/'robots.txt').read_text()
else:
    for item in json.loads((ROOT/'docs/published-files-20261027.json').read_text()):
        path=DIST/item['path']
        if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest()!=item['sha256']: errors.append('published snapshot differs: '+item['path'])
assert not errors, '\n'.join(errors)
print(f'Checks OK: {mode}; links, anchors, images and safety/fidelity')
