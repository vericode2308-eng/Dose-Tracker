"""YouTube crops for the owner-approved VeriCode artwork. No logo artwork is redrawn."""
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).parent
BRAND = Path('/Users/shome/Documents/Projects/VeriCode Website/public/assets/brand')

icon = Image.open(BRAND / 'icon.png').convert('RGBA')
logo = Image.open(BRAND / 'logo-horizontal.png').convert('RGBA')

# YouTube presents channel pictures as circles. Give the approved mark breathing room.
size = 800
avatar = Image.new('RGBA', (size, size), '#FFFFFF')
icon.thumbnail((600, 600), Image.Resampling.LANCZOS)
avatar.alpha_composite(icon, ((size - icon.width)//2, (size - icon.height)//2))
avatar.save(HERE / 'vericode-avatar.png', optimize=True)

# All meaningful content fits within the 1546 x 423 mobile-safe center.
w, h = 2560, 1440
banner = Image.new('RGB', (w, h), '#FFFFFF')
draw = ImageDraw.Draw(banner)
draw.rectangle((0, 0, 350, h), fill='#06213F')
draw.rectangle((2210, 0, w, h), fill='#06213F')
draw.rectangle((350, 0, 365, h), fill='#0866FF')
draw.rectangle((2195, 0, 2210, h), fill='#00B7A5')
logo.thumbnail((1320, 388), Image.Resampling.LANCZOS)
banner.paste(logo, ((w - logo.width)//2, (h - logo.height)//2), logo)
banner.save(HERE / 'vericode-banner.png', optimize=True)

# Use the same approved mark as a small player watermark.
watermark = avatar.resize((150, 150), Image.Resampling.LANCZOS)
watermark.save(HERE / 'vericode-watermark.png', optimize=True)
