"""Validate the separate V2 build, especially links and preview form isolation."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist'


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path, self.ids, self.refs, self.forms = path, set(), [], []
        self.h1, self.robots = 0, False
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            assert a['id'] not in self.ids, (self.path, 'duplicate id', a['id'])
            self.ids.add(a['id'])
        if tag == 'h1':
            self.h1 += 1
        if tag == 'meta' and a.get('name') == 'robots':
            self.robots = 'noindex' in a.get('content', '')
        if tag == 'form':
            self.forms.append(a)
        if tag == 'img':
            assert 'alt' in a, (self.path, a)
            if a.get('src'):
                assert 'width' in a and 'height' in a, (self.path, a)
        for attr in ('href', 'src', 'data-image'):
            if a.get(attr):
                self.refs.append(a[attr])


pages = {p.resolve(): Page(p) for p in (OUT / 'v2').glob('*.html')}
assert len(pages) == 6
for path, page in pages.items():
    assert page.h1 == 1 and page.robots, path
    for ref in page.refs:
        url = urlsplit(ref)
        if url.scheme or url.netloc:
            continue
        target = (path.parent / unquote(url.path)).resolve() if url.path else path
        if target.is_dir():
            target /= 'index.html'
        assert target.is_relative_to(OUT.resolve()), (path, ref)
        assert target.exists(), (path, ref)
        if url.fragment and target.suffix == '.html':
            parsed = pages.get(target) or Page(target)
            assert unquote(url.fragment) in parsed.ids, (path, ref)
    for form in page.forms:
        assert form.get('onsubmit') == 'return false', path
        assert not any(k in form for k in ('action', 'data-netlify', 'method')), path
    html = path.read_text()
    assert not re.search(r'facebook|ramonage|granul[ée]s|gestion\.localia', html, re.I), path

js = (OUT / 'v2/v2.js').read_text()
assert 'e.preventDefault()' in js
assert not re.search(r'\b(fetch|XMLHttpRequest|sendBeacon)\b', js)
assert '(prefers-reduced-motion: reduce)' in js
css = (OUT / 'v2/v2.css').read_text()
assert '@media(prefers-reduced-motion:reduce)' in css
assert (OUT / 'v2/assets/manrope.woff2').stat().st_size > 10_000
print('OK — V2: 6 pages, local links/anchors, image alternatives, preview-only form and reduced motion')
