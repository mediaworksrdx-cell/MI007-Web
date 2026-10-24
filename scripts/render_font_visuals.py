import os
from PIL import Image, ImageDraw, ImageFont

ARTIFACT_DIR = r"C:\Users\daarv\.gemini\antigravity\brain\6c42eaa8-79ed-4404-bb9c-adb223055f13"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

# Font configurations
FONT_SPECS = [
    {
        "id": "1",
        "name": "Inter Tight",
        "tag": "SWISS INSTITUTIONAL PRECISION (RECOMMENDED)",
        "badge_color": (16, 185, 129), # Emerald
        "path": "fonts_cache/Inter_Tight.font",
        "pedigree": "Bloomberg · Stripe · Linear · Vercel",
        "desc": "Ultra-clean Neo-Grotesk, condensed tracking (-0.03em), zero fluff, pure financial authority.",
        "brand_size": 42,
        "sub_size": 14,
    },
    {
        "id": "2",
        "name": "Space Grotesk",
        "tag": "ALGORITHMIC QUANT DESK",
        "badge_color": (6, 182, 212), # Cyan
        "path": "fonts_cache/Space_Grotesk.font",
        "pedigree": "Jane Street · Paradigm · Jump Crypto",
        "desc": "Distinctive geometric ink-traps on 'M', 'R' and sharp numeric '007'. Modern algorithmic AI DNA.",
        "brand_size": 40,
        "sub_size": 14,
    },
    {
        "id": "3",
        "name": "Plus Jakarta Sans",
        "tag": "EXECUTIVE PRIME BROKERAGE",
        "badge_color": (245, 158, 11), # Amber
        "path": "fonts_cache/Plus_Jakarta_Sans.font",
        "pedigree": "BlackRock Aladdin · Citadel · Morgan Stanley",
        "desc": "High-contrast circular geometry, wide-stance letterforms, commanding executive prestige.",
        "brand_size": 40,
        "sub_size": 14,
    },
    {
        "id": "4",
        "name": "JetBrains Mono",
        "tag": "MICROSECOND TRADING TERMINAL",
        "badge_color": (168, 85, 247), # Purple
        "path": "fonts_cache/JetBrains_Mono.font",
        "pedigree": "Bloomberg CLI · UNIX Quant Workstations · FIX Protocol",
        "desc": "Authentic tabular monospace, slashed zero, uniform cadence. Pure engineering horsepower.",
        "brand_size": 33,
        "sub_size": 13,
    },
    {
        "id": "5",
        "name": "Archivo Black",
        "tag": "WALL STREET INDUSTRIAL HEAVYWEIGHT",
        "badge_color": (244, 63, 94), # Rose
        "path": "fonts_cache/Archivo.font",
        "pedigree": "Financial Times · WSJ Headline · Goldman Sachs Asset Mgmt",
        "desc": "Maximum optical weight, brutalist financial confidence, immovable solid ground.",
        "brand_size": 39,
        "sub_size": 14,
    },
]

# Helper to draw rounded rectangle
def draw_rounded_rect(draw, bbox, radius, fill, outline=None, width=1):
    x0, y0, x1, y1 = bbox
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill, outline=outline, width=width)

# Render Individual Option Cards (Width: 1200, Height: 520) - Both Light & Dark combined
def render_individual_cards():
    for spec in FONT_SPECS:
        W, H = 1240, 520
        img = Image.new("RGBA", (W, H), (11, 19, 43, 255)) # Dark navy background
        draw = ImageDraw.Draw(img)

        # Load fonts
        main_font = ImageFont.truetype(spec["path"], spec["brand_size"])
        tag_font = ImageFont.truetype("fonts_cache/Inter_Tight.font", 12)
        desc_font = ImageFont.truetype("fonts_cache/Inter_Tight.font", 14)
        bold_font = ImageFont.truetype("fonts_cache/Inter_Tight.font", 16)
        sub_font = ImageFont.truetype(spec["path"], spec["sub_size"])

        # Card Container
        draw_rounded_rect(draw, (24, 24, W - 24, H - 24), radius=16, fill=(28, 37, 65, 255), outline=(51, 65, 85, 255), width=2)

        # Header Badge
        badge_text = f"OPTION 0{spec['id']} · {spec['name'].upper()} — {spec['tag']}"
        badge_w = draw.textlength(badge_text, font=tag_font)
        draw_rounded_rect(draw, (44, 44, 44 + badge_w + 24, 76), radius=6, fill=(15, 23, 42, 255), outline=spec["badge_color"], width=1)
        draw.text((56, 52), badge_text, fill=spec["badge_color"], font=tag_font)

        # Pedigree / Used By
        draw.text((44, 94), f"Institutional Pedigree: {spec['pedigree']}", fill=(148, 163, 184), font=bold_font)
        draw.text((44, 118), spec["desc"], fill=(203, 213, 225), font=desc_font)

        # --- SECTION 1: LIGHT CANVAS PREVIEW (Matches User's Screenshot) ---
        light_box_y0 = 155
        light_box_h = 150
        draw_rounded_rect(draw, (44, light_box_y0, W - 44, light_box_y0 + light_box_h), radius=12, fill=(248, 250, 252, 255), outline=(226, 232, 240, 255), width=1)
        
        # Label
        draw.text((60, light_box_y0 + 12), "LIGHT CANVAS (IVORY / CREAM THEME)", fill=(100, 116, 139), font=tag_font)
        
        # Render Text in Light: "MARKET INTELLIGENCE" + " " + "MI-007"
        text_part1 = "MARKET INTELLIGENCE"
        text_part2 = "MI-007"
        w1 = draw.textlength(text_part1 + "  ", font=main_font)
        draw.text((60, light_box_y0 + 44), text_part1, fill=(30, 41, 59), font=main_font) # Slate-800
        draw.text((60 + w1, light_box_y0 + 44), text_part2, fill=(5, 150, 105), font=main_font) # Emerald-600
        
        # Subtitle
        draw.text((60, light_box_y0 + 104), "INTELLIGENCE BEYOND THE NOISE · INSTITUTIONAL DERIVATIVES DESK", fill=(100, 116, 139), font=sub_font)

        # --- SECTION 2: DARK CANVAS PREVIEW (Midnight Terminal) ---
        dark_box_y0 = 325
        dark_box_h = 150
        draw_rounded_rect(draw, (44, dark_box_y0, W - 44, dark_box_y0 + dark_box_h), radius=12, fill=(8, 14, 26, 255), outline=(30, 41, 59, 255), width=1)
        
        # Label
        draw.text((60, dark_box_y0 + 12), "DARK CANVAS (MIDNIGHT / ARCTIC THEME)", fill=(148, 163, 184), font=tag_font)
        
        # Render Text in Dark
        draw.text((60, dark_box_y0 + 44), text_part1, fill=(241, 245, 249), font=main_font) # Slate-100
        draw.text((60 + w1, dark_box_y0 + 44), text_part2, fill=(16, 185, 129), font=main_font) # Emerald-500
        
        # Subtitle
        draw.text((60, dark_box_y0 + 104), "INTELLIGENCE BEYOND THE NOISE · INSTITUTIONAL DERIVATIVES DESK", fill=(148, 163, 184), font=sub_font)

        out_path = os.path.join(ARTIFACT_DIR, f"sample_{spec['id']}_{spec['name'].lower().replace(' ', '_')}.png")
        img.save(out_path, "PNG")
        print(f"Saved: {out_path}")

# Render Master Comparison Poster (All 5 Stacked side by side)
def render_master_comparison():
    W, H = 1300, 1550
    img = Image.new("RGBA", (W, H), (11, 19, 43, 255))
    draw = ImageDraw.Draw(img)

    header_font = ImageFont.truetype("fonts_cache/Inter_Tight.font", 28)
    subhead_font = ImageFont.truetype("fonts_cache/Inter_Tight.font", 14)
    tag_font = ImageFont.truetype("fonts_cache/Inter_Tight.font", 12)

    # Master Header
    draw.text((50, 40), "MI-007 INSTITUTIONAL TYPOGRAPHY SPECIMEN SUITE", fill=(255, 255, 255), font=header_font)
    draw.text((50, 80), "Comparison of 5 Curated Font Directions for Header & Brand Title · Both Light and Dark Theme Visuals", fill=(148, 163, 184), font=subhead_font)
    draw.line([(50, 115), (W - 50, 115)], fill=(51, 65, 85), width=2)

    card_y = 135
    card_h = 260
    gap = 20

    for spec in FONT_SPECS:
        main_font = ImageFont.truetype(spec["path"], spec["brand_size"])
        sub_font = ImageFont.truetype(spec["path"], spec["sub_size"])

        # Card container
        draw_rounded_rect(draw, (50, card_y, W - 50, card_y + card_h), radius=14, fill=(28, 37, 65, 255), outline=(51, 65, 85, 255), width=1)

        # Header Badge
        badge_text = f"OPTION 0{spec['id']} · {spec['name'].upper()}  [{spec['tag']}]"
        draw.text((70, card_y + 16), badge_text, fill=spec["badge_color"], font=tag_font)
        draw.text((70, card_y + 36), f"Pedigree: {spec['pedigree']}", fill=(148, 163, 184), font=subhead_font)

        # 2 Columns inside card: Left = Light Canvas, Right = Dark Canvas
        col_w = (W - 100 - 40 - 20) // 2 # ~570px each
        col1_x = 70
        col2_x = 70 + col_w + 20
        box_y = card_y + 65
        box_h = 175

        # Light Box
        draw_rounded_rect(draw, (col1_x, box_y, col1_x + col_w, box_y + box_h), radius=10, fill=(248, 250, 252), outline=(203, 213, 225), width=1)
        draw.text((col1_x + 16, box_y + 12), "LIGHT CANVAS (IVORY/CREAM)", fill=(100, 116, 139), font=tag_font)
        
        # Fit text into column
        text_p1 = "MARKET INTELLIGENCE"
        text_p2 = "MI-007"
        w1 = draw.textlength(text_p1 + " ", font=main_font)
        draw.text((col1_x + 16, box_y + 44), text_p1, fill=(30, 41, 59), font=main_font)
        draw.text((col1_x + 16 + w1, box_y + 44), text_p2, fill=(5, 150, 105), font=main_font)
        draw.text((col1_x + 16, box_y + 104), "INTELLIGENCE BEYOND THE NOISE", fill=(71, 85, 105), font=sub_font)
        draw.text((col1_x + 16, box_y + 134), "NIFTY 24,853.80 · GEX +$14.2M · IV 13.8%", fill=(100, 116, 139), font=tag_font)

        # Dark Box
        draw_rounded_rect(draw, (col2_x, box_y, col2_x + col_w, box_y + box_h), radius=10, fill=(8, 14, 26), outline=(30, 41, 59), width=1)
        draw.text((col2_x + 16, box_y + 12), "DARK CANVAS (MIDNIGHT)", fill=(148, 163, 184), font=tag_font)
        draw.text((col2_x + 16, box_y + 44), text_p1, fill=(241, 245, 249), font=main_font)
        draw.text((col2_x + 16 + w1, box_y + 44), text_p2, fill=(16, 185, 129), font=main_font)
        draw.text((col2_x + 16, box_y + 104), "INTELLIGENCE BEYOND THE NOISE", fill=(148, 163, 184), font=sub_font)
        draw.text((col2_x + 16, box_y + 134), "NIFTY 24,853.80 · GEX +$14.2M · IV 13.8%", fill=(100, 116, 139), font=tag_font)

        card_y += card_h + gap

    out_path = os.path.join(ARTIFACT_DIR, "mi007_font_comparison_master.png")
    img.save(out_path, "PNG")
    print(f"Saved master poster: {out_path}")

if __name__ == "__main__":
    render_individual_cards()
    render_master_comparison()
