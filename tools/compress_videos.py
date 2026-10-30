"""接客マニュアル動画をハンディ向けに圧縮して videos/ に置く。

使い方:
  1. 元の動画を menu-app/videos_src/ に入れる（このフォルダは GitHub に上げない）
  2. python tools/compress_videos.py
  3. videos/ にできた mp4 のファイル名を、スプレッドシートの動画欄に書く

720p・H.264・AAC にそろえ、途中から再生しても速いように faststart を付ける。
2分の動画でおおよそ 10〜15MB になる。videos/ にすでにある名前は飛ばす。
"""
import pathlib
import subprocess
import sys

import imageio_ffmpeg

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "videos_src"
DST = ROOT / "videos"
EXTS = {".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv"}


def main():
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    DST.mkdir(exist_ok=True)
    files = sorted(p for p in SRC.glob("*") if p.suffix.lower() in EXTS)
    if not files:
        sys.exit(f"{SRC} に動画がありません")

    for src in files:
        out = DST / (src.stem + ".mp4")
        if out.exists():
            print(f"skip  {out.name}（もうあります）")
            continue
        subprocess.run([
            ffmpeg, "-loglevel", "error", "-y", "-i", str(src),
            "-vf", "scale='min(1280,iw)':-2",
            "-c:v", "libx264", "-preset", "slow", "-crf", "28",
            "-pix_fmt", "yuv420p", "-profile:v", "main",
            "-c:a", "aac", "-b:a", "64k", "-ac", "1",
            "-movflags", "+faststart",
            str(out),
        ], check=True)
        mb = out.stat().st_size / 1024 / 1024
        print(f"done  {out.name}  {mb:.1f}MB")


if __name__ == "__main__":
    main()
