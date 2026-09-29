"""Render the plain-paragraph privacy policy; keep its public copy in sync."""
from pathlib import Path
from html import escape
root = Path(__file__).resolve().parent.parent
source = (root / 'legal/PRIVACY_POLICY.md').read_text()
parts = []
for block in source.strip().split('\n\n'):
    if block.startswith('# '):
        parts.append('<h1>' + escape(block[2:]) + '</h1>')
    elif block.startswith('## '):
        parts.append('<h2>' + escape(block[3:]) + '</h2>')
    else:
        parts.append('<p>' + escape(block).replace('support@vericodestudio.com', '<a href="mailto:support@vericodestudio.com">support@vericodestudio.com</a>') + '</p>')
page = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>DoseTracker Privacy Policy | VeriCode</title>
<meta name="description" content="How DoseTracker handles local health records, optional Sentry diagnostics, permissions, deletion and support communications.">
<style>body{margin:0;background:#fbf8f3;color:#102238;font:17px/1.65 system-ui,sans-serif}main{max-width:760px;margin:auto;padding:32px 22px 72px}h1{font-size:2rem;line-height:1.2}h2{font-size:1.35rem;margin-top:32px}a{color:#075e69;overflow-wrap:anywhere}a:focus-visible{outline:3px solid #075e69;outline-offset:4px}p{overflow-wrap:anywhere}</style>
</head><body><main><nav><a href="./index.html">DoseTracker</a> · <a href="./support.html">Support</a></nav>
''' + '\n'.join(parts) + '\n</main></body></html>\n'
(root / 'landing/privacy.html').write_text(page)
(root / 'landing/legal/PRIVACY_POLICY.md').write_text(source)
