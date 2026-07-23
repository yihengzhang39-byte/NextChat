from base64 import b64encode
from pathlib import Path
from PIL import Image

source = Path(r"E:\xwechat_files\wxid_jb7j6z7weyf622_a6f2\msg\file\2026-07\未命名文件夹(1)\未命名文件夹\30.png")
output = Path(
    r"D:\NextChat\iflytek_chat\app\icons\llm-icons\default.svg"
)

if not source.exists():
    raise FileNotFoundError(f"找不到 PNG 文件：{source}")

with Image.open(source) as image:
    width, height = image.size

if width != height:
    raise ValueError(
        f"图片必须是正方形，当前尺寸为：{width}×{height}"
    )

png_base64 = b64encode(source.read_bytes()).decode("ascii")

svg = f"""<svg
  width="30"
  height="30"
  viewBox="0 0 {width} {height}"
  xmlns="http://www.w3.org/2000/svg"
>
  <image
    href="data:image/png;base64,{png_base64}"
    width="{width}"
    height="{height}"
    preserveAspectRatio="xMidYMid meet"
  />
</svg>
"""

output.write_text(svg, encoding="utf-8")

print(f"已生成：{output}")
print(f"原始 PNG 尺寸：{width}×{height}")
print("页面显示尺寸：30×30")