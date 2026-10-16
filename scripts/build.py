"""Build static files for GitHub Pages and Netlify. Preview is fail-closed."""
import json
import hashlib
import os
from pathlib import Path
import re
import shutil
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist'
# Pages meant for search engines once the site is launched. Tools (qr, avis,
# merci, aperçu) always stay noindex.
PUBLIC_PAGES = ('index.html', 'pompe-a-chaleur.html', 'panneaux-solaires.html', 'salle-de-bains.html',
                'mentions-legales.html', 'confidentialite.html')
SITEMAP_PAGES = ('index.html', 'pompe-a-chaleur.html', 'panneaux-solaires.html', 'salle-de-bains.html')
LD_JSON = re.compile(r'(<script type="application/ld\+json">)(.*?)(</script>)', re.S)


def page_url(site_url, page):
    return site_url + '/' + ('' if page == 'index.html' else page)


def resolve_site_refs(value, site_url):
    """JSON-LD values written as "site:/path" become absolute URLs once siteUrl
    is known; without it they are dropped (an @id stays as a local fragment)."""
    if isinstance(value, list):
        return [resolve_site_refs(v, site_url) for v in value]
    if not isinstance(value, dict):
        return value
    out = {}
    for key, item in value.items():
        if isinstance(item, str) and item.startswith('site:/'):
            path = item[len('site:/'):]
            if site_url:
                out[key] = site_url + '/' + path
            elif key == '@id' and path.startswith('#'):
                out[key] = path
            continue
        out[key] = resolve_site_refs(item, site_url)
    return out


def apply_site_url(cfg, is_netlify, mode):
    site_url = cfg.get('siteUrl', '').rstrip('/')
    # Indexing is only ever opened on the real Netlify production build: the
    # GitHub Pages mock-up must never compete with the launched site.
    indexable = bool(cfg.get('indexable')) and is_netlify and mode == 'production'
    if cfg.get('indexable') and not site_url:
        raise ValueError('indexable requires siteUrl')
    for page in OUT.glob('*.html'):
        html = page.read_text()
        html = LD_JSON.sub(lambda m: m.group(1) + json.dumps(resolve_site_refs(json.loads(m.group(2)), site_url), ensure_ascii=False) + m.group(3), html)
        if page.name in PUBLIC_PAGES and site_url:
            url = page_url(site_url, page.name)
            html = html.replace('</head>', f'  <link rel="canonical" href="{url}"><meta property="og:url" content="{url}">\n</head>', 1)
        if page.name in PUBLIC_PAGES and indexable:
            html = re.sub(r'<meta name="robots" content="noindex,\s*nofollow">', '<meta name="robots" content="index, follow">', html)
        page.write_text(html)
    if indexable:
        (OUT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nDisallow: /qr.html\nDisallow: /avis.html\nDisallow: /apercu-responsive.html\nSitemap: {site_url}/sitemap.xml\n')
        urls = ''.join(f'  <url><loc>{page_url(site_url, p)}</loc></url>\n' for p in SITEMAP_PAGES)
        (OUT / 'sitemap.xml').write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n')
    return indexable


def write_qr_worker():
    """Precache exactly the versioned files the built qr.html loads."""
    page = (OUT / 'qr.html').read_text()
    files = ['qr.html', 'qr.webmanifest', 'assets/icon-192.png', 'assets/icon-512.png']
    for ref in re.findall(r'(?:src|href)="([^"#:]+)"', page):
        if ref not in files and ref not in ('./',) and not ref.endswith('.html'):
            files.append(ref)
    digest = hashlib.sha256()
    for ref in files:
        digest.update(ref.encode()); digest.update((OUT / ref.split('?')[0]).read_bytes())
    worker = OUT / 'qr-sw.js'
    worker.write_text(worker.read_text()
                      .replace('__QR_CACHE_VERSION__', digest.hexdigest()[:12])
                      .replace('__QR_PRECACHE__', json.dumps(files)))


def build():
    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(ROOT / 'site', OUT)
    cfg = json.loads((ROOT / 'site-config.json').read_text())
    # GitHub Pages always stays in preview, independent of source config.
    is_netlify = os.environ.get('NETLIFY') == 'true'
    mode = os.environ.get('MSP_MODE', 'preview') if is_netlify else 'preview'
    if mode not in ('preview', 'test', 'production'):
        raise ValueError('MSP_MODE must be preview, test or production')
    cfg['mode'] = mode
    cfg['formEnabled'] = is_netlify and mode in ('test', 'production')
    # Public contact is independent from notification recipients.
    cfg['contactEmail'] = 'msplomberie50@hotmail.com'
    for key in ('googleBusinessUrl', 'googleReviewUrl', 'demoReviewUrl', 'siteUrl'):
        if cfg.get(key) and (urlparse(cfg[key]).scheme != 'https' or not urlparse(cfg[key]).netloc):
            raise ValueError(f'{key}: expected a complete HTTPS URL')
    (OUT / 'config.js').write_text('window.MSP_CONFIG = ' + json.dumps(cfg, ensure_ascii=False) + ';\n')
    if cfg['googleReviewUrl'] or cfg['demoReviewUrl']:
        import qrcode
        from qrcode.image.svg import SvgPathImage
        qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=4)
        qr.add_data(cfg['googleReviewUrl'] or cfg['demoReviewUrl']); qr.make(fit=True)
        qr.make_image(image_factory=SvgPathImage).save(OUT / 'assets' / 'avis-google.svg')
    if not cfg['formEnabled']:
        html = (OUT / 'index.html').read_text()
        html = html.replace('action="/merci"', 'action="#contact" onsubmit="return false"')
        html = html.replace('</form>', '<noscript><p class="noscript">Version de présentation : aucun envoi n’est possible.</p></noscript></form>')
        (OUT / 'index.html').write_text(html)
        (OUT / 'merci.html').write_text('<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maquette msplomberie</title><link rel="stylesheet" href="styles.css"><main class="wrap simple-content"><h1>Version de présentation</h1><p>Aucun message n’a été envoyé.</p><a class="btn" href="./#contact">Retour au formulaire</a></main></html>')
    indexable = apply_site_url(cfg, is_netlify, mode)
    # A changed stylesheet/script/map must not reuse the previous cached asset.
    assets = ('styles.css', 'app.js', 'config.js', 'assets/secteur-intervention.svg', 'assets/avis-google.svg')
    for page in OUT.glob('*.html'):
        html = page.read_text()
        for asset in assets:
            version = hashlib.sha256((OUT / asset).read_bytes()).hexdigest()[:12]
            for attribute in ('src', 'href'):
                html = html.replace(f'{attribute}="{asset}"', f'{attribute}="{asset}?v={version}"')
        page.write_text(html)
    write_qr_worker()
    preview_page = OUT / 'apercu-responsive.html'
    if preview_page.exists():
        preview_version = hashlib.sha256((OUT / 'index.html').read_bytes()).hexdigest()[:12]
        preview_page.write_text(preview_page.read_text().replace('__MSP_PREVIEW_VERSION__', preview_version))
    (OUT / '.nojekyll').touch()
    print(f'Build OK: {mode}; form enabled: {cfg["formEnabled"]}; indexable: {indexable}; {len(list(OUT.rglob("*")))} paths')

if __name__ == '__main__':
    build()
