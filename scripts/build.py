"""Prepare the recovered production snapshot, or a fail-closed local preview.

The published files are the editable source of this recovered version. This
script replaces the earlier generator; it does not claim to recover its history.
No network, API, publication, or secret is needed to run it.
"""
from pathlib import Path
import json
import os
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist'

def build():
    mode = os.environ.get('MSP_MODE', 'preview')
    if mode not in ('preview', 'production'):
        raise ValueError('MSP_MODE must be preview or production')
    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(ROOT / 'site', OUT)
    if mode == 'preview':
        cfg = json.loads((OUT / 'config.js').read_text().split(' = ', 1)[1].rstrip(';\n'))
        cfg.update(mode='preview', formEnabled=False, indexable=False)
        (OUT / 'config.js').write_text('window.MSP_CONFIG = ' + json.dumps(cfg, ensure_ascii=False) + ';\n')
        for page in OUT.glob('*.html'):
            html = page.read_text()
            html = re.sub(r'<meta name="robots" content="[^"]*">', '<meta name="robots" content="noindex, nofollow">', html)
            html = re.sub(r'<link rel="canonical"[^>]*>', '', html)
            html = re.sub(r'<meta property="og:url"[^>]*>', '', html)
            # Disable form capture and remove the Netlify detector attributes.
            html = re.sub(r'<form\b[^>]*>', '<form id="project-form" action="#contact" onsubmit="return false">', html)
            html = html.replace('data-netlify="true"', '')
            # The recovered widget's script is standalone. Do not call the live AI
            # service from a preview, and block network calls as a second guard.
            html = re.sub(r'<script>(.*?)</script>', lambda m: '' if 'mspchat' in m.group(1) else m.group(0), html, flags=re.S)
            html = html.replace('id="mspchat-btn"', 'id="mspchat-btn" disabled title="Assistant indisponible dans cet apercu"')
            html = html.replace('</head>', '<meta http-equiv="Content-Security-Policy" content="connect-src &#39;none&#39;; form-action &#39;none&#39;">\n</head>', 1)
            if page.name == 'merci.html':
                html = '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>Apercu MS Plomberie</title><h1>Apercu uniquement</h1><p>Aucun message envoye.</p></html>'
            page.write_text(html)
        (OUT / 'robots.txt').write_text('User-agent: *\nDisallow: /\n')
        (OUT / 'sitemap.xml').unlink(missing_ok=True)
    (OUT / '.nojekyll').touch()
    print(f'Build OK: {mode}; files: {sum(p.is_file() for p in OUT.rglob("*"))}')

if __name__ == '__main__':
    build()
