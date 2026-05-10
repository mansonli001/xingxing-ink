#!/usr/bin/env python3
"""
把 PNG 的纯黑背景转为 alpha 透明通道。
原理：取每个像素的亮度（max(r,g,b)），亮度越低 → 越透明。
- 纯黑 #000000 → alpha 0（完全透明）
- 浅色 #cccccc → alpha 255（完全不透明）
- 中间色（头发/阴影）→ 平滑过渡（不会出现锯齿/光环）

用法：
    python3 black_bg_to_alpha.py input.png output.png [threshold_low] [threshold_high]

threshold_low：低于此亮度强制全透明（默认 8，去掉极黑像素）
threshold_high：高于此亮度强制全不透明（默认 60，保留人物）

默认参数对暗发/暗衣很友好（黑发/黑衣不会被错杀）。
"""
import sys
from PIL import Image


def black_bg_to_alpha(input_path: str, output_path: str,
                      th_low: int = 8, th_high: int = 60) -> None:
    img = Image.open(input_path).convert("RGBA")
    pixels = img.load()
    w, h = img.size

    span = th_high - th_low
    for y in range(h):
        for x in range(w):
            r, g, b, _ = pixels[x, y]
            # 用 max 作为亮度（更适合彩色发/肤）
            brightness = max(r, g, b)

            if brightness <= th_low:
                alpha = 0
            elif brightness >= th_high:
                alpha = 255
            else:
                # 平滑过渡，避免锯齿
                alpha = int((brightness - th_low) / span * 255)

            pixels[x, y] = (r, g, b, alpha)

    img.save(output_path, "PNG", optimize=True)
    print(f"[OK] {input_path} -> {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 black_bg_to_alpha.py input.png output.png "
              "[th_low=8] [th_high=60]")
        sys.exit(1)

    inp = sys.argv[1]
    out = sys.argv[2]
    th_low = int(sys.argv[3]) if len(sys.argv) > 3 else 8
    th_high = int(sys.argv[4]) if len(sys.argv) > 4 else 60

    black_bg_to_alpha(inp, out, th_low, th_high)
