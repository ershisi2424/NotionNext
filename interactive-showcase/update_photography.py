"""用项目目录的素材重建作品封面和软盘贴图。"""
import argparse
import json
from io import BytesIO
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from PIL import Image, ImageDraw, ImageFont, ImageOps
from mirror import CACHE, atomic_write

ROOT = Path(__file__).resolve().parent
PROJECTS = {
    "solsta": ("调试案例02", "debug-case-02.png", "/projects/solsta/mission-control.webp", "/textures/floppies/solsta.webp", "Solsta", 2, "https://solsta.io"),
    "iconly-pro": ("调试案例01", "debug-case-01.png", "/projects/iconly/landing.webp", "/textures/floppies/iconly.webp", "Iconly Pro", 6, "https://iconly.pro/"),
    "giftbede": ("摄影作品集", "a7m5素材.png", "/projects/giftbede/app-icon.webp", "/textures/floppies/giftbede.webp", "Giftbede", 1, "https://giftbe.de"),
    "campaign-lark": ("调试案例", "obs-2.png", "/projects/campaign-lark/cover.png", "/textures/floppies/lark.webp", "Campaign Lark", 0, "https://campaignlark.com/"),
}


def cover(size, source, title, floppy=False, white_background=False):
    """把原图按比例放入封面，给软盘贴图保留边距与中文标题。"""
    w, h = size
    canvas = Image.new("RGBA", size, "#eeeae2" if floppy else "#ffffff" if white_background else "#222423")
    subject = ImageOps.contain(source, (round(w * .91), round(h * (.79 if floppy else .91))), Image.Resampling.LANCZOS)
    canvas.alpha_composite(subject, ((w - subject.width) // 2, (round(h * .80) - subject.height) // 2 if floppy else (h - subject.height) // 2))
    if floppy:
        font = ImageFont.truetype(r"C:\Windows\Fonts\msyhbd.ttc", 37)
        ImageDraw.Draw(canvas).text((w // 2, h - 55), title, font=font, fill="#202526", anchor="mt")
    return canvas.convert("RGB")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", choices=PROJECTS, nargs="?", default="giftbede")
    slug = parser.parse_args().project
    title, filename, cover_path, floppy_path, old_title, slot, old_url = PROJECTS[slug]
    disk_id = {'campaign-lark': 'lark', 'iconly-pro': 'iconly'}.get(slug, slug)
    with Image.open(ROOT / filename) as image:
        source_image = image.convert("RGBA")
    changed = 0
    for meta in CACHE.rglob("response.json"):
        entry = json.loads(meta.read_text(encoding="utf-8"))
        url = urlsplit(entry["url"])
        payload = meta.with_name(entry.get("body", "body"))
        source = parse_qs(url.query).get("url", [""])[0] if url.path == "/_next/image" else url.path
        if source in {cover_path, floppy_path}:
            with Image.open(BytesIO(payload.read_bytes())) as previous:
                output = BytesIO()
                cover(previous.size, source_image, title, source == floppy_path,
                      white_background=slug == "campaign-lark").save(output, format=previous.format)
            atomic_write(payload, output.getvalue())
            changed += 1
        elif url.path.rsplit("/", 1)[-1] in {"a4fda578f356bb65.js", "7ebf9cd4d407135f.js"}:
            # 3D 光标标签由场景脚本生成。原槽位、点击和动画沿用原参数。
            text = payload.read_text(encoding="utf-8")
            localized = text.replace(f'id:"{disk_id}",title:"{old_title}"', f'id:"{disk_id}",title:"{title}"').replace(
                f'slot:{slot},url:"{old_url}"', f'slot:{slot},url:"/works/{slug}"'
            )
            if localized != text:
                atomic_write(payload, localized.encode("utf-8"))
    print(f"Updated {changed} cached image variants")


if __name__ == "__main__":
    main()
