from pathlib import Path

from PIL import Image

source = Path(r"E:\xwechat_files\wxid_jb7j6z7weyf622_a6f2\msg\file\2026-07\32\32\32.png")
output = Path(r"D:\NextChat\iflytek_chat\public\favicon.ico")

if not source.exists():
    raise FileNotFoundError(f"找不到源图片：{source}")

image = Image.open(source).convert("RGBA")

if image.width != image.height:
    raise ValueError(
        f"图片必须是正方形，当前尺寸为 {image.width}×{image.height}"
    )

image.save(
    output,
    format="ICO",
    sizes=[(16, 16), (32, 32)],
)

print(f"已生成并替换：{output}")