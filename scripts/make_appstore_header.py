"""Generate iOS App Store Connect header artwork (brand creative, no device UI).

Apple header sizes: 5244 x 2950 and 3840 x 1646. Output is opaque RGB PNG
(no alpha), written to appstore_assets/ios-campaign-v2/header-and-search/.
Run: python3 scripts/make_appstore_header.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "appstore_assets" / "ios-campaign-v2" / "header-and-search"
TARGETS = [
    ("01-universal-5244x2950.png", 5244, 2950),
    ("02-header-wide-3840x1646.png", 3840, 1646),
]
FONT = "/System/Library/Fonts/SFNS.ttf"


def font(size, weight="Bold"):
    f = ImageFont.truetype(FONT, size)
    try:
        f.set_variation_by_name(weight)
    except Exception:
        pass
    return f


def gradient(w, h, a, b):
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = x / w * 0.65 + y / h * 0.35
            px[x, y] = tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
    return img


def tile(draw_fn, size, ss=4):
    big = Image.new("RGBA", (size[0] * ss, size[1] * ss), (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(big), ss)
    return big.resize(size, Image.LANCZOS)


def capsule(canvas, cx, cy, length, thick, angle, c1, c2):
    def fn(d, ss):
        r = thick * ss // 2
        d.rounded_rectangle((0, 0, length * ss, thick * ss), r, fill=c1)
        d.rounded_rectangle((length * ss // 2, 0, length * ss, thick * ss), r, fill=c2)
        d.rectangle((length * ss // 2, 0, length * ss // 2 + r, thick * ss), fill=c2)
    t = tile(fn, (length, thick)).rotate(angle, expand=True, resample=Image.BICUBIC)
    canvas.alpha_composite(t, (int(cx - t.width / 2), int(cy - t.height / 2)))


def ring(canvas, cx, cy, radius, width, color):
    size = (radius * 2 + width * 2,) * 2

    def fn(d, ss):
        d.ellipse((width * ss, width * ss, (width + radius * 2) * ss, (width + radius * 2) * ss),
                  outline=color, width=width * ss)
    t = tile(fn, size, ss=2)
    canvas.alpha_composite(t, (int(cx - size[0] / 2), int(cy - size[1] / 2)))


def build(w, h):
    s = h / 1646
    canvas = gradient(w, h, (24, 38, 92), (96, 84, 196)).convert("RGBA")

    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((w * 0.5, -h * 0.4, w * 1.05, h * 0.65), fill=(120, 220, 200, 80))
    gd.ellipse((w * 0.35, h * 0.65, w * 0.8, h * 1.4), fill=(255, 150, 130, 60))
    canvas.alpha_composite(glow.filter(ImageFilter.GaussianBlur(int(130 * s))))

    # decorative dial + capsules, right side (no app UI)
    cx, cy = int(w * 0.76), int(h * 0.50)
    for r, a in ((620, 40), (470, 55), (320, 80)):
        ring(canvas, cx, cy, int(r * s), max(3, int(10 * s)), (255, 255, 255, a))
    capsule(canvas, cx - 140 * s, cy - 40 * s, int(560 * s), int(210 * s), 35, (255, 255, 255, 245), (130, 226, 205, 255))
    capsule(canvas, cx + 230 * s, cy + 210 * s, int(380 * s), int(150 * s), -28, (255, 168, 150, 255), (255, 255, 255, 240))
    capsule(canvas, cx + 300 * s, cy - 250 * s, int(300 * s), int(120 * s), 68, (190, 180, 255, 255), (255, 255, 255, 235))

    d = ImageDraw.Draw(canvas)
    left = int(w * 0.09)  # safe margin: header crops differ per device
    icon = Image.open(ROOT / "assets/images/icon-ios.png").convert("RGBA")
    icon = icon.resize((int(170 * s),) * 2, Image.LANCZOS)
    mask = Image.new("L", icon.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *icon.size), int(40 * s), fill=255)
    icon.putalpha(mask)
    top = int(h * 0.20)
    canvas.alpha_composite(icon, (left, top))
    d.text((left + int(215 * s), top + int(50 * s)), "DOSE TRACKER", font=font(int(66 * s)), fill="white")

    y = int(h * 0.40)
    d.text((left, y), "All your medicines.", font=font(int(160 * s), "Heavy"), fill="white")
    d.text((left, y + int(190 * s)), "One clear place.", font=font(int(160 * s), "Heavy"), fill=(190, 245, 230))
    d.text((left, y + int(450 * s)), "Schedules, stock and dose history together.",
           font=font(int(66 * s), "Medium"), fill=(225, 230, 255))
    return canvas.convert("RGB")  # opaque, no alpha


OUT.mkdir(parents=True, exist_ok=True)
for name, w, h in TARGETS:
    path = OUT / name
    build(w, h).save(path, optimize=True)
    print(path)
