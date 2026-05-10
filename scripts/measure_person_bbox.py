#!/usr/bin/env python3
"""
测量透明 PNG 人物的边界框(bounding box) + 人物高度占画布比例。
帮助精准对齐三张不同构图的人像，让"脸中心"在屏幕上落在同一位置。

用法：
    python3 measure_person_bbox.py img1.png img2.png img3.png

输出：
    图文件名 | 画布 | 人物bbox(x_min,y_min,x_max,y_max) | 人物高度% | 头顶%（y_min/画布高）| 肩膀%（估算）
"""
import sys
from PIL import Image


def measure(path: str) -> None:
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()  # 返回 (x_min, y_min, x_max, y_max)，基于非透明像素

    if bbox is None:
        print(f"{path}: 全透明，无人物")
        return

    x_min, y_min, x_max, y_max = bbox
    person_h = y_max - y_min
    person_w = x_max - x_min
    head_top_pct = y_min / h * 100  # 头顶离画布顶部的百分比
    bottom_pct = y_max / h * 100    # 人物底部位置
    ph_ratio = person_h / h * 100   # 人物占画布高的百分比

    # 脸中心估算：人物顶部下方约 12-18% 的位置（头顶到下巴大约占人物总高 15%）
    # 这里取头顶 + 人物高度 * 0.12 作为脸中心估算
    face_center_y = y_min + person_h * 0.12
    face_center_pct = face_center_y / h * 100

    name = path.split("/")[-1]
    print(f"{name}")
    print(f"  画布: {w}x{h}")
    print(f"  人物bbox: ({x_min},{y_min}) - ({x_max},{y_max})")
    print(f"  人物尺寸: {person_w}x{person_h}")
    print(f"  人物占画布高: {ph_ratio:.1f}%")
    print(f"  头顶位置: y={y_min} ({head_top_pct:.1f}%)")
    print(f"  人物底部: y={y_max} ({bottom_pct:.1f}%)")
    print(f"  脸中心估算: y={face_center_y:.0f} ({face_center_pct:.1f}%)")
    print()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 measure_person_bbox.py img1.png [img2.png ...]")
        sys.exit(1)
    for p in sys.argv[1:]:
        measure(p)
