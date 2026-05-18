from __future__ import annotations

import math
import os
from pathlib import Path
from typing import Iterable, Tuple

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "readme"
OUT.mkdir(parents=True, exist_ok=True)

Color = Tuple[int, int, int]

NAVY: Color = (8, 15, 38)
INK: Color = (18, 25, 49)
MUTED: Color = (98, 112, 140)
BLUE: Color = (64, 111, 255)
CYAN: Color = (33, 214, 255)
PURPLE: Color = (141, 82, 255)
GREEN: Color = (51, 214, 159)
ORANGE: Color = (255, 184, 77)
WHITE: Color = (255, 255, 255)
OFFWHITE: Color = (246, 249, 255)
BORDER: Color = (218, 226, 245)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def round_rect(draw: ImageDraw.ImageDraw, box, radius: int, fill, outline=None, width: int = 1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def gradient_background(width: int, height: int, c1=NAVY, c2=(28, 40, 89)) -> Image.Image:
    img = Image.new("RGB", (width, height), c1)
    px = img.load()
    for y in range(height):
        for x in range(width):
            dx = x / max(width - 1, 1)
            dy = y / max(height - 1, 1)
            t = min(1, 0.72 * dx + 0.48 * dy)
            glow = 0.18 * math.sin((x + y) / 90) + 0.12 * math.cos(x / 65)
            t = max(0, min(1, t + glow))
            px[x, y] = tuple(int(c1[i] * (1 - t) + c2[i] * t) for i in range(3))
    return img


def text_center(draw: ImageDraw.ImageDraw, center, text: str, fnt, fill):
    bbox = draw.textbbox((0, 0), text, font=fnt)
    draw.text((center[0] - (bbox[2] - bbox[0]) / 2, center[1] - (bbox[3] - bbox[1]) / 2), text, font=fnt, fill=fill)


def draw_soft_shadow(base: Image.Image, box, radius: int = 24, shadow=(0, 0, 0, 80), offset=(0, 14), blur=24):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle((box[0] + offset[0], box[1] + offset[1], box[2] + offset[0], box[3] + offset[1]), radius=radius, fill=shadow)
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(layer)


def save_png(img: Image.Image, name: str):
    img.save(OUT / name, optimize=True)


def hero():
    w, h = 1600, 620
    img = gradient_background(w, h).convert("RGBA")
    d = ImageDraw.Draw(img)

    for i, (cx, cy, r, col) in enumerate([
        (1280, 120, 210, BLUE), (1430, 410, 270, PURPLE), (180, 480, 240, CYAN), (780, 80, 140, GREEN)
    ]):
        glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.ellipse((cx-r, cy-r, cx+r, cy+r), fill=(*col, 48 if i != 3 else 28))
        img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(54)))

    # top nav strip
    round_rect(d, (90, 58, 1510, 118), 28, (28, 42, 86, 255), (88, 118, 184, 255), 1)
    d.text((126, 75), "MIRO WORKFLOWS", font=font(22, True), fill=WHITE)
    for x, label in [(1120, "React"), (1218, "Node.js"), (1338, "SQLite"), (1450, "MCP")]:
        round_rect(d, (x, 70, x + 82, 106), 18, (46, 65, 118, 255), (111, 144, 212, 255), 1)
        text_center(d, (x + 41, 88), label, font(16, True), WHITE)

    d.text((112, 175), "Enterprise Workflow", font=font(64, True), fill=WHITE)
    d.text((112, 246), "Operations for Miro", font=font(64, True), fill=(204, 225, 255))
    subtitle = "A production-ready command center for template-driven board execution, audit trails, live sync boundaries, and MCP automation."
    d.text((116, 336), subtitle, font=font(28), fill=(214, 226, 249))

    chips = ["Demo-first", "Token-ready", "Observable", "Strict TypeScript", "Agent-compatible"]
    x = 116
    for chip in chips:
        tw = d.textbbox((0, 0), chip, font=font(17, True))[2]
        round_rect(d, (x, 424, x + tw + 38, 466), 21, (35, 53, 99, 255), (103, 136, 207, 255), 1)
        d.text((x + 19, 435), chip, font=font(17, True), fill=WHITE)
        x += tw + 54

    # dashboard card
    card = (990, 160, 1480, 520)
    draw_soft_shadow(img, card, radius=36, shadow=(0, 0, 0, 120), blur=36)
    round_rect(d, card, 36, (250, 253, 255, 242), (255, 255, 255, 170), 2)
    d.text((1030, 196), "Workflow Command Center", font=font(24, True), fill=INK)
    d.text((1030, 230), "Board sync · Runs · Audits", font=font(16), fill=MUTED)
    for idx, (label, value, color) in enumerate([("Templates", "3", BLUE), ("Boards", "3", PURPLE), ("Success", "99%", GREEN)]):
        x0 = 1030 + idx * 145
        round_rect(d, (x0, 272, x0 + 122, 352), 22, (245, 248, 255, 255), BORDER, 1)
        d.text((x0 + 18, 290), value, font=font(28, True), fill=color)
        d.text((x0 + 18, 324), label, font=font(13, True), fill=MUTED)
    for i, (name, pct, color) in enumerate([("Sprint Planning", .88, BLUE), ("Discovery Canvas", .74, PURPLE), ("Incident Review", .64, GREEN)]):
        y = 384 + i * 38
        d.text((1030, y), name, font=font(15, True), fill=INK)
        round_rect(d, (1190, y + 5, 1432, y + 17), 8, (225, 232, 247, 255), None, 1)
        round_rect(d, (1190, y + 5, 1190 + int(242 * pct), y + 17), 8, color, None, 1)

    save_png(img.convert("RGB"), "hero.png")


def dashboard_preview():
    w, h = 1500, 940
    img = Image.new("RGBA", (w, h), (244, 247, 252, 255))
    d = ImageDraw.Draw(img)
    # browser frame
    draw_soft_shadow(img, (70, 60, 1430, 880), radius=34, shadow=(20, 35, 80, 70), blur=34)
    round_rect(d, (70, 60, 1430, 880), 34, WHITE, BORDER, 2)
    round_rect(d, (70, 60, 1430, 128), 34, (17, 26, 55, 255), None, 1)
    d.rectangle((70, 100, 1430, 128), fill=(17, 26, 55, 255))
    for i, col in enumerate([(255, 95, 87), (255, 189, 46), (40, 201, 64)]):
        d.ellipse((102 + i * 34, 84, 120 + i * 34, 102), fill=col)
    d.text((235, 82), "localhost:5173 · Miro Workflows", font=font(18, True), fill=(210, 222, 248))

    # sidebar
    round_rect(d, (100, 160, 355, 830), 28, (13, 22, 50, 255), None, 1)
    d.text((132, 196), "Miro Workflows", font=font(24, True), fill=WHITE)
    d.text((132, 232), "Operations cockpit", font=font(15), fill=(164, 181, 216))
    for i, (label, active) in enumerate([("Overview", True), ("Templates", False), ("Runs", False), ("Audit Events", False), ("Provider", False)]):
        y = 292 + i * 58
        fill = (65, 111, 255, 255) if active else (255, 255, 255, 18)
        round_rect(d, (126, y, 330, y + 42), 15, fill, None, 1)
        d.text((150, y + 11), label, font=font(16, True), fill=WHITE if active else (201, 213, 239))
    round_rect(d, (126, 710, 330, 790), 20, (255, 255, 255, 20), (255, 255, 255, 30), 1)
    d.text((150, 730), "Provider", font=font(14, True), fill=(174, 190, 224))
    d.text((150, 755), "Demo mode ready", font=font(17, True), fill=GREEN)

    # content
    d.text((395, 174), "Workflow Command Center", font=font(36, True), fill=INK)
    d.text((397, 220), "Execute templates, sync boards, inspect artifacts, and preserve audit state.", font=font(18), fill=MUTED)

    for idx, (label, value, color) in enumerate([("Active boards", "3", BLUE), ("Templates", "3", PURPLE), ("Runs", "18", GREEN), ("Audit events", "42", ORANGE)]):
        x0 = 395 + idx * 245
        round_rect(d, (x0, 270, x0 + 215, 390), 24, WHITE, BORDER, 1)
        d.text((x0 + 24, 296), label, font=font(15, True), fill=MUTED)
        d.text((x0 + 24, 326), value, font=font(38, True), fill=color)

    # template cards
    for idx, (title, desc, color) in enumerate([
        ("Sprint Planning Accelerator", "Prioritize work, expose risks, and lock commitments.", BLUE),
        ("Product Discovery Canvas", "Convert insights into evidence-backed next steps.", PURPLE),
        ("Incident Review Retro", "Create timelines, RCA notes, and prevention plans.", GREEN),
    ]):
        y = 430 + idx * 122
        round_rect(d, (395, y, 910, y + 96), 24, WHITE, BORDER, 1)
        d.ellipse((425, y + 28, 465, y + 68), fill=color)
        d.text((485, y + 23), title, font=font(20, True), fill=INK)
        d.text((485, y + 54), desc, font=font(15), fill=MUTED)
        round_rect(d, (795, y + 29, 878, y + 65), 18, (244, 248, 255, 255), BORDER, 1)
        text_center(d, (836, y + 47), "Run", font(14, True), color)

    # right panel
    round_rect(d, (950, 430, 1390, 796), 28, (14, 24, 55, 255), None, 1)
    d.text((990, 466), "Latest run telemetry", font=font(24, True), fill=WHITE)
    d.text((990, 500), "Artifacts, confidence, and audit events", font=font(15), fill=(170, 186, 220))
    center = (1168, 620)
    for r, col, alpha in [(118, BLUE, 55), (92, PURPLE, 65), (62, GREEN, 90)]:
        d.ellipse((center[0]-r, center[1]-r, center[0]+r, center[1]+r), outline=(*col, alpha), width=14)
    text_center(d, center, "99%", font(44, True), WHITE)
    text_center(d, (center[0], center[1] + 44), "ready", font(15, True), (188, 204, 235))
    for i, label in enumerate(["Schema seeded", "Smoke run passed", "MCP build green"]):
        y = 718 + i * 28
        d.ellipse((1000, y + 2, 1012, y + 14), fill=GREEN)
        d.text((1026, y), label, font=font(15, True), fill=(222, 232, 250))

    save_png(img.convert("RGB"), "dashboard-preview.png")


def architecture():
    w, h = 1500, 820
    img = Image.new("RGBA", (w, h), (249, 251, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((70, 58), "Production Architecture", font=font(40, True), fill=INK)
    d.text((70, 108), "A separated React, Node.js, SQLite, provider, and MCP model built for operational safety.", font=font(19), fill=MUTED)

    lanes = [
        ("Operator Experience", "React dashboard · Vite · TypeScript", BLUE),
        ("Application API", "Node.js routes · workflow service · smoke checks", PURPLE),
        ("Persistence Layer", "SQL schema · sql.js file persistence · audit trail", GREEN),
        ("Integration Boundary", "Demo provider · Miro REST provider · MCP tools", ORANGE),
    ]
    x_positions = [80, 425, 770, 1115]
    for i, (title, subtitle, col) in enumerate(lanes):
        x = x_positions[i]
        draw_soft_shadow(img, (x, 190, x + 300, 612), radius=32, shadow=(40, 55, 90, 42), blur=20)
        round_rect(d, (x, 190, x + 300, 612), 32, WHITE, BORDER, 2)
        d.ellipse((x + 30, 228, x + 86, 284), fill=col)
        d.text((x + 30, 314), title, font=font(23, True), fill=INK)
        lines = subtitle.split(" · ")
        for j, line in enumerate(lines):
            d.text((x + 30, 362 + j * 34), line, font=font(17), fill=MUTED)
        round_rect(d, (x + 30, 532, x + 270, 572), 20, (*col, 255), None, 1)
        text_center(d, (x + 150, 552), ["Client", "Service", "Data", "Miro"][i], font(15, True), WHITE)

    for i in range(3):
        x1 = x_positions[i] + 300
        x2 = x_positions[i + 1]
        y = 402
        d.line((x1 + 20, y, x2 - 20, y), fill=(112, 130, 170), width=4)
        d.polygon([(x2 - 20, y), (x2 - 38, y - 10), (x2 - 38, y + 10)], fill=(112, 130, 170))

    round_rect(d, (245, 690, 1255, 760), 26, (236, 242, 255, 255), (205, 217, 246), 1)
    d.text((285, 714), "Security posture: environment-based secrets, provider isolation, credential metadata, build validation, and auditable workflow runs.", font=font(20, True), fill=INK)
    save_png(img.convert("RGB"), "architecture.png")


def api_contract():
    w, h = 1500, 760
    img = Image.new("RGBA", (w, h), WHITE)
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, w, 120), fill=(12, 21, 49))
    d.text((70, 42), "API Surface & Operating Model", font=font(34, True), fill=WHITE)
    d.text((70, 88), "Health, summary, boards, templates, runs, audit events, and sync endpoints for production workflow operations.", font=font(17), fill=(197, 211, 242))

    rows = [
        ("GET", "/api/health", "Runtime health, provider mode, database path, timestamp"),
        ("GET", "/api/summary", "Dashboard totals, integration status, boards, templates, runs"),
        ("GET", "/api/templates", "Reusable workflow definitions and categories"),
        ("POST", "/api/runs", "Execute a template against a board with audit events"),
        ("GET", "/api/runs/:id", "Run detail with generated artifacts and event history"),
        ("POST", "/api/sync/boards", "Sync configured boards through demo or Miro provider"),
    ]
    y = 170
    for method, route, desc in rows:
        col = BLUE if method == "GET" else PURPLE
        round_rect(d, (70, y, 1430, y + 74), 20, (248, 250, 255), BORDER, 1)
        round_rect(d, (100, y + 18, 176, y + 56), 18, col, None, 1)
        text_center(d, (138, y + 37), method, font(14, True), WHITE)
        d.text((215, y + 18), route, font=font(21, True), fill=INK)
        d.text((215, y + 45), desc, font=font(15), fill=MUTED)
        y += 88
    save_png(img.convert("RGB"), "api-contract.png")


def workflow_motion():
    w, h = 1200, 360
    stages = [("Template", BLUE), ("Execute", PURPLE), ("Persist", GREEN), ("Sync", CYAN), ("Audit", ORANGE)]
    frames = []
    for step in range(30):
        img = gradient_background(w, h, (11, 19, 44), (27, 43, 95)).convert("RGBA")
        d = ImageDraw.Draw(img)
        d.text((54, 42), "Workflow motion: template → run → artifacts → board sync → audit trail", font=font(26, True), fill=WHITE)
        y = 200
        xs = [130, 365, 600, 835, 1070]
        for i in range(len(xs) - 1):
            d.line((xs[i] + 58, y, xs[i + 1] - 58, y), fill=(106, 130, 190), width=6)
            d.polygon([(xs[i + 1] - 58, y), (xs[i + 1] - 78, y - 12), (xs[i + 1] - 78, y + 12)], fill=(106, 130, 190))
        active = step / 29 * (len(stages) - 1)
        for i, (label, col) in enumerate(stages):
            pulse = max(0, 1 - abs(active - i))
            r = int(46 + 14 * pulse)
            x = xs[i]
            glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            gd = ImageDraw.Draw(glow)
            gd.ellipse((x - r - 24, y - r - 24, x + r + 24, y + r + 24), fill=(*col, int(40 + 80 * pulse)))
            img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(18)))
            d.ellipse((x - r, y - r, x + r, y + r), fill=(*col, 255), outline=(255, 255, 255, 150), width=3)
            text_center(d, (x, y), str(i + 1), font(26, True), WHITE)
            text_center(d, (x, y + 82), label, font(17, True), (228, 237, 255))
        frames.append(img.convert("P", palette=Image.Palette.ADAPTIVE))
    frames[0].save(OUT / "workflow-motion.gif", save_all=True, append_images=frames[1:], duration=80, loop=0, optimize=True)


def badges_svg():
    # Lightweight inline-style SVG badge strip for crisp rendering in GitHub README.
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="98" viewBox="0 0 1080 98" role="img" aria-label="Miro Workflows capability badges">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#406fff"/><stop offset="0.52" stop-color="#8d52ff"/><stop offset="1" stop-color="#21d6ff"/></linearGradient>
    <filter id="s" x="-10%" y="-20%" width="120%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#1b2a55" flood-opacity="0.16"/></filter>
  </defs>
  <rect width="1080" height="98" rx="28" fill="#f6f9ff"/>
  <g filter="url(#s)" font-family="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="16" font-weight="700">
    <rect x="24" y="24" width="168" height="50" rx="25" fill="url(#g)"/><text x="108" y="55" text-anchor="middle" fill="white">React Dashboard</text>
    <rect x="210" y="24" width="142" height="50" rx="25" fill="#ffffff"/><text x="281" y="55" text-anchor="middle" fill="#182139">Node API</text>
    <rect x="370" y="24" width="156" height="50" rx="25" fill="#ffffff"/><text x="448" y="55" text-anchor="middle" fill="#182139">SQLite Schema</text>
    <rect x="544" y="24" width="146" height="50" rx="25" fill="#ffffff"/><text x="617" y="55" text-anchor="middle" fill="#182139">Miro Sync</text>
    <rect x="708" y="24" width="132" height="50" rx="25" fill="#ffffff"/><text x="774" y="55" text-anchor="middle" fill="#182139">MCP Tools</text>
    <rect x="858" y="24" width="198" height="50" rx="25" fill="#ffffff"/><text x="957" y="55" text-anchor="middle" fill="#182139">Production Checks</text>
  </g>
</svg>'''
    (OUT / "capability-badges.svg").write_text(svg, encoding="utf-8")


def main():
    hero()
    dashboard_preview()
    architecture()
    api_contract()
    workflow_motion()
    badges_svg()
    print(f"Generated README assets in {OUT}")


if __name__ == "__main__":
    main()
