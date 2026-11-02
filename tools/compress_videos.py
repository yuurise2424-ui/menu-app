"""接客マニュアル動画をハンディ向けに圧縮して videos/ に置く。

使い方:
  1. 元の動画を menu-app/videos_src/ に入れる（このフォルダは GitHub に上げない）
     または python tools/compress_videos.py 元の動画のフォルダ でそのフォルダから直接読む
  2. python tools/compress_videos.py
  3. videos/ にできた mp4 のファイル名を、スプレッドシートの動画欄に書く

ファイル名の先頭の「【３】　」「心得３　」のような番号と、絵文字は取る（「【３】　ご注文の伺い方.mp4」→「ご注文の伺い方.mp4」）。

短い辺を720に縮め（縦長の動画もハンディの画面に十分な大きさ）、H.264・AAC にそろえ、途中から再生しても速いように faststart を付ける。
2分の動画でおおよそ 10〜15MB になる。videos/ にすでにある名前は飛ばす。
"""
import pathlib
import re
import subprocess
import sys

import imageio_ffmpeg

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "videos_src"
DST = ROOT / "videos"
EXTS = {".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv"}


def clean_name(stem):
    """「【３】　ご注文の伺い方」「心得３　トイレチェック 🆕」→「ご注文の伺い方」「トイレチェック」"""
    stem = re.sub(r"^(【[^】]*】|心得[0-9０-９]+)[\s　]*", "", stem)
    stem = "".join(c for c in stem if ord(c) < 0x2600 or 0x3000 <= ord(c) < 0xF000 or 0xFF00 <= ord(c) < 0xFFF0)
    return stem.strip(" 　")


def main():
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    src_dir = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else SRC
    DST.mkdir(exist_ok=True)
    files = sorted(p for p in src_dir.glob("*") if p.suffix.lower() in EXTS)
    if not files:
        sys.exit(f"{src_dir} に動画がありません")

    for src in files:
        out = DST / (clean_name(src.stem) + ".mp4")
        if out.exists():
            print(f"skip  {out.name}（もうあります）")
            continue
        subprocess.run([
            ffmpeg, "-loglevel", "error", "-y", "-i", str(src),
            # 短い辺を最大720に（横長なら720p、縦長なら幅720）
            "-vf", "scale='if(gt(iw,ih),-2,min(720,iw))':'if(gt(iw,ih),min(720,ih),-2)'",
            "-c:v", "libx264", "-preset", "slow", "-crf", "28",
            "-pix_fmt", "yuv420p", "-profile:v", "main",
            "-c:a", "aac", "-b:a", "64k", "-ac", "1",
            "-movflags", "+faststart",
            str(out),
        ], check=True)
        mb = out.stat().st_size / 1024 / 1024
        print(f"done  {out.name}  {mb:.1f}MB")
    print(f"videos/ の合計 {sum(p.stat().st_size for p in DST.glob('*.mp4')) / 1024 / 1024:.1f}MB")


if __name__ == "__main__":
    main()
