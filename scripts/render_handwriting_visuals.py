import os
from PIL import Image, ImageDraw, ImageFont

ARTIFACT_DIR = r"C:\Users\daarv\.gemini\antigravity\brain\6c42eaa8-79ed-4404-bb9c-adb223055f13"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

HW_SPECS = [
    {
        "id": "1",
        "name": "Caveat",
        "tag": "CONFIDENT NATURAL HANDWRITING (RECOMMENDED)",
        "badge_color": (16, 185, 129), # Emerald
        "path": "fonts_cache_handwriting/Caveat.font",
        "style_desc": "Natural brush pen cursive, lively rhythm, high legibility. Looks bespoke & authentic.",
        "brand_size_caps": 38,
        "brand_size_title": 44,
        "sub_size": 22,
    },
    {
        "id": "2",
        "name": "Kalam",
        "tag": "ARCHITECTURAL DRAFTING HANDWRITING",
        "badge_color": (6, 182, 212), # Cyan
        "path": "fonts_cache_handwriting/Kalam.font",
        "style_desc": "Architectural technical pen lettering, very clean & structured. Balances human feel with precision.",
        "brand_size_caps": 35,
        "brand_size_title": 38,
        "sub_size": 18,
    },
    {
        "id": "3",
        "name": "Permanent Marker",
        "tag": "BOLD STREET MARKER & CONVICTION",
        "badge_color": (245, 158, 11), # Amber
        "path": "fonts_cache_handwriting/Permanent_Marker.font",
        "style_desc": "Thick felt-tip marker strokes, raw energy and unstoppable confidence. High visual punch.",
        "brand_size_caps": 32,
        "brand_size_title": 34,
        "sub_size": 16,
    },
    {
        "id": "4",
        "name": "Dancing Script",
        "tag": "EXECUTIVE SIGNATURE SCRIPT",
        "badge_color": (168, 85, 247), # Purple
        "path": "fonts_cache_handwriting/Dancing_Script.font",
        "style_desc": "Fluid signature calligraphy with graceful ascenders. Conveys luxury, bespoke leadership signature.",
        "brand_size_caps": 34,
        "brand_size_title": 42,
        "sub_size": 20,
    },
    {
        "id": "5",
        "name": "Shadows Into Light",
        "tag": "MINIMALIST CLEAN HAND-DRAWN",
        "badge_color": (244, 63, 94), # Rose
        "path": "fonts_cache_handwriting/Shadows_Into_Light.font",
        "style_desc": "Neat, modern fine-point pen script with rounded corners. Warm, personal, and approachable.",
        "brand_size_caps": 36,
        "brand_size_title": 40,
        "sub_size": 20,
    },
]

def draw_rounded_rect(draw, bbox, radius, fill, outline=None, width=1):
    x0, y0, x1, y1 = bbox
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill, outline=outline, width=width)

def render_individual_cards():
    tag_font = ImageFont.truetype("fonts_cache/Inter_Tight.font", 12)
    desc_font = ImageFont.truetype("fonts_cache/Inter_Tight.font", 14)
    bold_font = ImageFont.truetype("fonts_cache/Inter_Tight.font", 16)

    for spec in HW_SPECS:
        W, H = 1260, 560
        img = Image.new("RGBA", (W, H), (11, 19, 43, 255))
        draw = ImageDraw.Draw(img)

        # Card container
        draw_rounded_rect(draw, (24, 24, W - 24, H - 24), radius=16, fill=(28, 37, 65, 255), outline=(51, 65, 85, 255), width=2)

        # Header Badge
        badge_text = f"HANDWRITING OPTION 0{spec['id']} · {spec['name'].upper()} — {spec['tag']}"
        badge_w = draw.textlength(badge_text, font=tag_font)
        draw_rounded_rect(draw, (44, 44, 44 + badge_w + 24, 76), radius=6, fill=(15, 23, 42, 255), outline=spec["badge_color"], width=1)
        draw.text((56, 52), badge_text, fill=spec["badge_color"], font=tag_font)

        draw.text((44, 94), f"Style Profile: {spec['style_desc']}", fill=(203, 213, 225), font=bold_font)

        # Load specific handwriting fonts
        font_caps = ImageFont.truetype(spec["path"], spec["brand_size_caps"])
        font_title = ImageFont.truetype(spec["path"], spec["brand_size_title"])
        font_sub = ImageFont.truetype(spec["path"], spec["sub_size"])

        # Light Canvas Box
        l_y0 = 135
        l_h = 185
        draw_rounded_rect(draw, (44, l_y0, W - 44, l_y0 + l_h), radius=12, fill=(248, 250, 252, 255), outline=(226, 232, 240, 255), width=1)
        draw.text((60, l_y0 + 10), "LIGHT CANVAS (IVORY/CREAM) — ALL CAPS & TITLE CASE", fill=(100, 116, 139), font=tag_font)

        # Line 1: ALL CAPS
        t1_c = "MARKET INTELLIGENCE"
        t2_c = "MI-007"
        w1_c = draw.textlength(t1_c + "   ", font=font_caps)
        draw.text((60, l_y0 + 36), t1_c, fill=(30, 41, 59), font=font_caps)
        draw.text((60 + w1_c, l_y0 + 36), t2_c, fill=(5, 150, 105), font=font_caps)

        # Line 2: Title Case
        t1_t = "Market Intelligence"
        t2_t = "MI-007"
        w1_t = draw.textlength(t1_t + "   ", font=font_title)
        draw.text((60, l_y0 + 88), t1_t, fill=(30, 41, 59), font=font_title)
        draw.text((60 + w1_t, l_y0 + 88), t2_t, fill=(5, 150, 105), font=font_title)

        draw.text((60, l_y0 + 148), "Intelligence Beyond the Noise · Derivatives Desk", fill=(100, 116, 139), font=font_sub)

        # Dark Canvas Box
        d_y0 = 340
        d_h = 185
        draw_rounded_rect(draw, (44, d_y0, W - 44, d_y0 + d_h), radius=12, fill=(8, 14, 26, 255), outline=(30, 41, 59, 255), width=1)
        draw.text((60, d_y0 + 10), "DARK CANVAS (MIDNIGHT) — ALL CAPS & TITLE CASE", fill=(148, 163, 184), font=tag_font)

        # Line 1: ALL CAPS
        draw.text((60, d_y0 + 36), t1_c, fill=(241, 245, 249), font=font_caps)
        draw.text((60 + w1_c, d_y0 + 36), t2_c, fill=(16, 185, 129), font=font_caps)

        # Line 2: Title Case
        draw.text((60, d_y0 + 88), t1_t, fill=(241, 245, 249), font=font_title)
        draw.text((60 + w1_t, d_y0 + 88), t2_t, fill=(16, 185, 129), font=font_title)

        draw.text((60, d_y0 + 148), "Intelligence Beyond the Noise · Derivatives Desk", fill=(148, 163, 184), font=font_sub)

        out_path = os.path.join(ARTIFACT_DIR, f"handwriting_sample_{spec['id']}_{spec['name'].lower().replace(' ', '_')}.png")
        img.save(out_path, "PNG")
        print(f"Saved: {out_path}")

def render_master_comparison():
    W, H = 1320, 1650
    img = Image.new("RGBA", (W, H), (11, 19, 43, 255))
    draw = ImageDraw.Draw(img)

    header_font = ImageFont.truetype("fonts_cache/Inter_Tight.font", 28)
    subhead_font = ImageFont.truetype("fonts_cache/Inter_Tight.font", 14)
    tag_font = ImageFont.truetype("fonts_cache/Inter_Tight.font", 12)

    draw.text((50, 40), "MI-007 HANDWRITING TYPOGRAPHY SHOWCASE", fill=(255, 255, 255), font=header_font)
    draw.text((50, 80), "5 Curated Handwritten & Script Typography Styles · Light Canvas vs Dark Canvas Comparison", fill=(148, 163, 184), font=subhead_font)
    draw.line([(50, 115), (W - 50, 115)], fill=(51, 65, 85), width=2)

    card_y = 135
    card_h = 280
    gap = 20

    for spec in HW_SPECS:
        font_caps = ImageFont.truetype(spec["path"], spec["brand_size_caps"])
        font_title = ImageFont.truetype(spec["path"], spec["brand_size_title"])
        font_sub = ImageFont.truetype(spec["path"], spec["sub_size"])

        # Card container
        draw_rounded_rect(draw, (50, card_y, W - 50, card_y + card_h), radius=14, fill=(28, 37, 65, 255), outline=(51, 65, 85, 255), width=1)

        # Header Badge
        badge_text = f"OPTION 0{spec['id']} · {spec['name'].upper()}  [{spec['tag']}]"
        draw.text((70, card_y + 16), badge_text, fill=spec["badge_color"], font=tag_font)
        draw.text((70, card_y + 36), f"Character: {spec['style_desc']}", fill=(148, 163, 184), font=subhead_font)

        col_w = (W - 100 - 40 - 20) // 2
        col1_x = 70
        col2_x = 70 + col_w + 20
        box_y = card_y + 65
        box_h = 195

        # Light Box
        draw_rounded_rect(draw, (col1_x, box_y, col1_x + col_w, box_y + box_h), radius=10, fill=(248, 250, 252), outline=(203, 213, 225), width=1)
        draw.text((col1_x + 16, box_y + 10), "LIGHT CANVAS (IVORY/CREAM)", fill=(100, 116, 139), font=tag_font)

        # CAPS line
        t1_c = "MARKET INTELLIGENCE"
        t2_c = "MI-007"
        w1_c = draw.textlength(t1_c + "  ", font=font_caps)
        draw.text((col1_x + 16, box_y + 32), t1_c, fill=(30, 41, 59), font=font_caps)
        draw.text((col1_x + 16 + w1_c, box_y + 32), t2_c, fill=(5, 150, 105), font=font_caps)

        # Title Case line
        t1_t = "Market Intelligence"
        t2_t = "MI-007"
        w1_t = draw.textlength(t1_t + "  ", font=font_title)
        draw.text((col1_x + 16, box_y + 80), t1_t, fill=(30, 41, 59), font=font_title)
        draw.text((col1_x + 16 + w1_t, box_y + 80), t2_t, fill=(5, 150, 105), font=font_title)

        draw.text((col1_x + 16, box_y + 138), "Intelligence Beyond the Noise", fill=(71, 85, 105), font=font_sub)
        draw.text((col1_x + 16, box_y + 168), "NIFTY 24,853.80 · GEX +$14.2M", fill=(100, 116, 139), font=tag_font)

        # Dark Box
        draw_rounded_rect(draw, (col2_x, box_y, col2_x + col_w, box_y + box_h), radius=10, fill=(8, 14, 26), outline=(30, 41, 59), width=1)
        draw.text((col2_x + 16, box_y + 10), "DARK CANVAS (MIDNIGHT)", fill=(148, 163, 184), font=tag_font)

        draw.text((col2_x + 16, box_y + 32), t1_c, fill=(241, 245, 249), font=font_caps)
        draw.text((col2_x + 16 + w1_c, box_y + 32), t2_c, fill=(16, 185, 129), font=font_caps)

        draw.text((col2_x + 16, box_y + 80), t1_t, fill=(241, 245, 249), font=font_title)
        draw.text((col2_x + 16 + w1_t, box_y + 80), t2_t, fill=(16, 185, 129), font=font_title)

        draw.text((col2_x + 16, box_y + 138), "Intelligence Beyond the Noise", fill=(148, 163, 184), font=font_sub)
        draw.text((col2_x + 16, box_y + 168), "NIFTY 24,853.80 · GEX +$14.2M", fill=(100, 116, 139), font=tag_font)

        card_y += card_h + gap

    out_path = os.path.join(ARTIFACT_DIR, "mi007_handwriting_comparison_master.png")
    img.save(out_path, "PNG")
    print(f"Saved master poster: {out_path}")

if __name__ == "__main__":
    render_individual_cards()
    render_master_comparison()
