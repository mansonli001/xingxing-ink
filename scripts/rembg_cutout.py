#!/usr/bin/env python3
"""
专业级 AI 抠图（基于 rembg / U²-Net）。
解决亮度抠图法的天敌：深色头发/深色衣服被错判为背景。
v2：开启 alpha_matting 消除边缘灰色 halo（黑底残留）。

用法：
    python3 rembg_cutout.py input.png output.png [model] [alpha_matting]

model 可选：
- u2net          : 通用模型，平衡（默认）
- u2net_human_seg: 人物专用，对发丝细节最强 ← 推荐用这个
- isnet-general-use: 高精度通用

alpha_matting 可选：
- 1（默认）：开启 alpha matting 后处理，消除边缘 halo
- 0：关闭
"""
import sys
from rembg import remove, new_session
from PIL import Image


def cutout(input_path: str, output_path: str,
           model: str = "u2net_human_seg",
           alpha_matting: bool = True) -> None:
    print(f"[INFO] Loading model: {model} | alpha_matting={alpha_matting}")
    session = new_session(model)

    print(f"[INFO] Reading: {input_path}")
    with open(input_path, "rb") as f:
        input_data = f.read()

    print(f"[INFO] Removing background...")
    if alpha_matting:
        # alpha_matting 关键参数：
        # - foreground_threshold=240：≥240 亮度的像素直接判主体（保留高光）
        # - background_threshold=10：≤10 亮度直接判背景（吃掉纯黑）
        # - erode_size=10：边界腐蚀核大小，越大越激进抠掉边缘 halo
        output_data = remove(
            input_data,
            session=session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=10,
        )
    else:
        output_data = remove(input_data, session=session)

    with open(output_path, "wb") as f:
        f.write(output_data)

    img = Image.open(output_path).convert("RGBA")
    alphas = img.getchannel("A")
    n_total = img.width * img.height
    n_transparent = sum(1 for px in alphas.getdata() if px == 0)
    pct = n_transparent / n_total * 100
    print(f"[OK] {output_path} | size={img.size} | transparent={pct:.1f}%")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 rembg_cutout.py input.png output.png "
              "[model=u2net_human_seg] [alpha_matting=1]")
        sys.exit(1)

    inp = sys.argv[1]
    out = sys.argv[2]
    model = sys.argv[3] if len(sys.argv) > 3 else "u2net_human_seg"
    am = bool(int(sys.argv[4])) if len(sys.argv) > 4 else True

    cutout(inp, out, model, am)
