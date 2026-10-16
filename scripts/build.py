"""Build static files for GitHub Pages and Netlify. Preview is fail-closed."""
import json
import os
from pathlib import Path
import shutil
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist'

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
    cfg['contactEmail'] = 'msplomberie50@hotmail.com' if mode == 'production' else 'gestion.localia@gmail.com'
    for key in ('facebookUrl', 'googleBusinessUrl', 'googleReviewUrl'):
        if cfg[key] and (urlparse(cfg[key]).scheme != 'https' or not urlparse(cfg[key]).netloc):
            raise ValueError(f'{key}: expected a complete HTTPS URL')
    (OUT / 'config.js').write_text('window.MSP_CONFIG = ' + json.dumps(cfg, ensure_ascii=False) + ';\n')
    if cfg['googleReviewUrl']:
        import qrcode
        from qrcode.image.svg import SvgPathImage
        qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=4)
        qr.add_data(cfg['googleReviewUrl']); qr.make(fit=True)
        qr.make_image(image_factory=SvgPathImage).save(OUT / 'assets' / 'avis-google.svg')
    if not cfg['formEnabled']:
        html = (OUT / 'index.html').read_text()
        html = html.replace('action="/merci"', 'action="#contact" onsubmit="return false"')
        html = html.replace('</form>', '<noscript><p class="noscript">Version de présentation : aucun envoi n’est possible.</p></noscript></form>')
        (OUT / 'index.html').write_text(html)
        (OUT / 'merci.html').write_text('<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maquette msplomberie</title><link rel="stylesheet" href="styles.css"><main class="wrap simple-content"><h1>Version de présentation</h1><p>Aucun message n’a été envoyé.</p><a class="btn" href="./#contact">Retour au formulaire</a></main></html>')
    (OUT / '.nojekyll').touch()
    print(f'Build OK: {mode}; form enabled: {cfg["formEnabled"]}; {len(list(OUT.rglob("*")))} paths')

if __name__ == '__main__':
    build()
