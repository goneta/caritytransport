from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

COLORS = {
    "bg": (17, 24, 39),
    "panel": (37, 99, 235),
    "accent": (16, 185, 129),
    "white": (255, 255, 255),
    "muted": (219, 234, 254),
}

try:
    FONT_LARGE = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 108)
    FONT_SMALL = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 42)
except Exception:
    FONT_LARGE = ImageFont.load_default()
    FONT_SMALL = ImageFont.load_default()


def rounded_rectangle(draw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def draw_mark(size: int, maskable: bool = False) -> Image.Image:
    img = Image.new("RGBA", (size, size), COLORS["bg"])
    draw = ImageDraw.Draw(img)
    scale = size / 512
    safe = int(56 * scale) if maskable else int(28 * scale)

    # Subtle diagonal route background.
    for offset in range(-size, size * 2, int(52 * scale)):
        draw.line([(offset, size), (offset + size, 0)], fill=(31, 41, 55), width=max(2, int(5 * scale)))

    card = (safe, safe, size - safe, size - safe)
    rounded_rectangle(draw, card, int(88 * scale), COLORS["panel"])

    # Bus body.
    bus = (int(122 * scale), int(194 * scale), int(390 * scale), int(326 * scale))
    rounded_rectangle(draw, bus, int(28 * scale), COLORS["white"])
    rounded_rectangle(draw, (int(146 * scale), int(214 * scale), int(230 * scale), int(260 * scale)), int(10 * scale), COLORS["muted"])
    rounded_rectangle(draw, (int(244 * scale), int(214 * scale), int(340 * scale), int(260 * scale)), int(10 * scale), COLORS["muted"])
    draw.rectangle((int(132 * scale), int(282 * scale), int(380 * scale), int(306 * scale)), fill=COLORS["accent"])
    draw.ellipse((int(154 * scale), int(300 * scale), int(206 * scale), int(352 * scale)), fill=COLORS["bg"])
    draw.ellipse((int(306 * scale), int(300 * scale), int(358 * scale), int(352 * scale)), fill=COLORS["bg"])
    draw.ellipse((int(170 * scale), int(316 * scale), int(190 * scale), int(336 * scale)), fill=COLORS["white"])
    draw.ellipse((int(322 * scale), int(316 * scale), int(342 * scale), int(336 * scale)), fill=COLORS["white"])

    # Route pin.
    draw.ellipse((int(356 * scale), int(116 * scale), int(438 * scale), int(198 * scale)), fill=COLORS["accent"])
    draw.polygon([(int(397 * scale), int(226 * scale)), (int(366 * scale), int(184 * scale)), (int(428 * scale), int(184 * scale))], fill=COLORS["accent"])
    draw.ellipse((int(383 * scale), int(143 * scale), int(411 * scale), int(171 * scale)), fill=COLORS["white"])

    # Initials for small recognisability.
    text = "CT"
    bbox = draw.textbbox((0, 0), text, font=FONT_SMALL)
    draw.text((size / 2 - (bbox[2] - bbox[0]) / 2, int(376 * scale)), text, fill=COLORS["white"], font=FONT_SMALL)
    return img


for filename, size, maskable in [
    ("icon-192.png", 192, False),
    ("icon-512.png", 512, False),
    ("maskable-192.png", 192, True),
    ("maskable-512.png", 512, True),
    ("apple-touch-icon.png", 180, False),
]:
    draw_mark(size, maskable).save(OUT / filename)

# Apple touch icon should live at the public root for iOS discovery too.
(draw_mark(180, False)).save(ROOT / "public" / "apple-touch-icon.png")
print("Generated PWA icons in", OUT)
