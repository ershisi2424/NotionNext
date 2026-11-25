"""重新生成联系人卡片纹理，并更新本地互动模块的标签和动作。

从 localize.js 读取联系区邮箱。四张卡保留原有贴图尺寸、页签坐标和翻页事件。
运行 python update_rolodex.py 后刷新预览。需要 Pillow 和 Windows 微软雅黑字体。
"""
import json
import re
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from mirror import CACHE, atomic_write

ROOT = Path(__file__).resolve().parent
EMAIL = re.search(r"const contactEmail = '([^']+)';", (ROOT / "localize.js").read_text(encoding="utf-8-sig"))[1]
WECHAT = re.search(r"const contactWechat = '([^']+)';", (ROOT / "localize.js").read_text(encoding="utf-8-sig"))[1]
LABELS = ("邮箱", "微信", "GitHub", "简历")
FONT = Path(r"C:\Windows\Fonts\msyh.ttc")
BOLD = Path(r"C:\Windows\Fonts\msyhbd.ttc")


def write_asset(metadata, data):
    """沿用路径缓存键，刷新时由镜像读到新字节。"""
    record = json.loads(metadata.read_text(encoding="utf-8"))
    atomic_write(metadata.with_name(record.get("body", "body")), data)


def make_cards():
    image = Image.new("RGBA", (1024, 2560))
    draw = ImageDraw.Draw(image)
    ink, teal, paper = "#181b1a", "#007070", "#f4efe1"

    def label(x, y, value, size, color=ink, bold=False):
        draw.text((x, y), value, font=ImageFont.truetype(str(BOLD if bold else FONT), size), fill=color)

    for index, name in enumerate(LABELS):
        y = index * 640
        tab = 40 + 240 * index
        draw.rounded_rectangle((tab, y, tab + 219, y + 99), radius=12, fill=teal)
        draw.rectangle((0, y + 80, 1023, y + 639), fill=paper)
        for offset in (102, 160, 194, 256, 314, 372, 430, 488, 546, 604):
            draw.line((0, y + offset, 1023, y + offset), fill="#d49e92" if offset == 194 else "#b9cbd0", width=3)
        label(tab + 110 - draw.textlength(name, font=ImageFont.truetype(str(BOLD), 36)) / 2, y + 14, name, 36, paper, True)
        label(44, y + 108, "二十四调试", 40, bold=True)
        label(870, y + 117, f"{index + 1} / 4", 27)
        label(44, y + 208, name, 38, teal, True)
        if index == 0:
            label(44, y + 271, "最快的联系方式", 35)
            label(44, y + 335, EMAIL, 55, bold=True)
            draw.rectangle((44, y + 480, 286, y + 570), fill=teal, outline=ink, width=4)
            label(76, y + 491, "写邮件 ↗", 37, paper, True)
        elif index == 1:
            label(44, y + 271, "微信号", 35)
            label(44, y + 335, WECHAT, 55, bold=True)
            qr = Image.open(ROOT / 'contacts' / 'wechat-qr.png').convert('RGBA')
            qr = qr.resize((320, 320), Image.Resampling.NEAREST)
            image.alpha_composite(qr, (650, y + 250))
        else:
            label(44, y + 333, "暂未添加", 55, bold=True)
    stream = BytesIO()
    image.save(stream, "WEBP", lossless=True)
    return stream.getvalue()


def localize_chunk(source):
    # 只改动作数据和光标提示；原来的卡片状态、点击检测与动画保留。
    start = source.index('["email","linkedin","github","resume"]')
    pattern = r'\["email","linkedin","github","resume"\]\.map\(e=>\{.*?\}\}\)|\[\{"href":"mailto:[^\]]+\]'
    actions = [
        {"href": f"mailto:{EMAIL}" if i == 0 else "", "external": False,
         "name": name, "action": "写邮件" if i == 0 else ""}
        for i, name in enumerate(LABELS)
    ]
    prefix, tail = source[:start], source[start:]
    tail, count = re.subn(pattern, json.dumps(actions, ensure_ascii=False, separators=(",", ":")), tail, count=1)
    if count != 1:
        raise ValueError("联系卡动作模块与预期版本不同")
    return (prefix + tail).replace('t?globalThis.window.open(e', 'e&&(t?globalThis.window.open(e').replace(
        'globalThis.window.location.href=e}', 'globalThis.window.location.href=e)}'
    ).replace('Back to ${', '返回：${').replace('Go to ${', '切换到：${')


def main():
    for metadata in CACHE.rglob("response.json"):
        record = json.loads(metadata.read_text(encoding="utf-8"))
        url = record["url"]
        if url == "/textures/rolodex-cards.webp":
            write_asset(metadata, make_cards())
        elif url.rsplit("/", 1)[-1] in {"c9dd50b2837f200e.js", "775e92e0a7b5b6a9.js"}:
            path = metadata.with_name(record.get("body", "body"))
            source = path.read_text(encoding="utf-8")
            if '["email","linkedin","github","resume"]' in source:
                source = localize_chunk(source)
            else:
                source = re.sub(r'(?<="href":"mailto:)[^"]+', EMAIL, source, count=1)
                source = source.replace('"name":"领英"', '"name":"微信"', 1)
            write_asset(metadata, source.encode("utf-8"))


if __name__ == "__main__":
    main()
