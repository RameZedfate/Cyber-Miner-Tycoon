# -*- coding: utf-8 -*-
"""
世足激勵破冰影片拼接腳本
輸入: scene1..7.mp4 (Seedance 15s 720p 含音訊), vo1..7.mp3 (旁白), card1..7.png (字卡)
輸出: worldcup_kickoff_final.mp4 (16:9, 約1分42秒)

流程:
  Pass1: 每段 -> 統一 24fps/1280x720/48kHz + 疊字卡 + 混入旁白(sidechain ducking)
  Pass2: 7 段以 0.6s 交叉淡化串接, 頭尾淡入淡出, 響度正規化
"""
import subprocess, json, sys, os

FF = subprocess.check_output(
    [sys.executable, "-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"]
).decode().strip()

N = 7
XFADE = 0.6

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-3000:])
        sys.exit(f"FAILED: {' '.join(cmd[:8])}...")

def probe_dur(path):
    r = subprocess.run(
        [FF, "-hide_banner", "-i", path, "-f", "null", "-"],
        capture_output=True, text=True)
    # 從 stderr 解析 time=
    import re
    times = re.findall(r"time=(\d+):(\d+):(\d+\.?\d*)", r.stderr)
    if not times:
        sys.exit(f"cannot probe {path}")
    h, m, s = times[-1]
    return int(h) * 3600 + int(m) * 60 + float(s)

# ---- Pass 1 ----
for i in range(1, N + 1):
    scene, vo, card, out = f"scene{i}.mp4", f"vo{i}.mp3", f"card{i}.png", f"seg{i}.mp4"
    # 字卡顯示區間: 一般段 1.2~13.8s; 最終段置中大字 7.5s 到結尾
    show = "between(t,7.5,15.2)" if i == N else "between(t,1.2,13.8)"
    fc = (
        "[0:v]scale=1280:720:force_original_aspect_ratio=increase,"
        "crop=1280:720,fps=24,setsar=1,format=yuv420p[v0];"
        f"[v0][1:v]overlay=0:0:enable='{show}'[v];"
        "[0:a]aresample=48000,aformat=channel_layouts=stereo,volume=0.62[amb];"
        "[2:a]adelay=700|700,aresample=48000,aformat=channel_layouts=stereo,"
        "volume=2.1,asplit=2[vo1][vo2];"
        "[amb][vo1]sidechaincompress=threshold=0.05:ratio=6:attack=30:release=500[duck];"
        "[duck][vo2]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]"
    )
    run([FF, "-y", "-hide_banner", "-i", scene, "-i", card, "-i", vo,
         "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
         "-c:v", "libx264", "-crf", "16", "-preset", "medium",
         "-c:a", "aac", "-b:a", "256k", out])
    print(f"seg{i}.mp4 OK ({probe_dur(out):.2f}s)")

# ---- Pass 2 ----
durs = [probe_dur(f"seg{i}.mp4") for i in range(1, N + 1)]
inputs = []
for i in range(1, N + 1):
    inputs += ["-i", f"seg{i}.mp4"]

v_parts, a_parts = [], []
cur_v, cur_a = "[0:v]", "[0:a]"
cur_len = durs[0]
for i in range(1, N):
    off = cur_len - XFADE
    nv, na = f"[vx{i}]", f"[ax{i}]"
    v_parts.append(f"{cur_v}[{i}:v]xfade=transition=fade:duration={XFADE}:offset={off:.3f}{nv}")
    a_parts.append(f"{cur_a}[{i}:a]acrossfade=d={XFADE}{na}")
    cur_v, cur_a = nv, na
    cur_len = off + durs[i]

total = cur_len
fc2 = (";".join(v_parts) + ";" + ";".join(a_parts) + ";" +
       f"{cur_v}fade=t=in:st=0:d=0.8,fade=t=out:st={total-1.2:.3f}:d=1.2[vout];" +
       f"{cur_a}afade=t=in:st=0:d=0.8,afade=t=out:st={total-1.5:.3f}:d=1.5," +
       "loudnorm=I=-14:TP=-1.5:LRA=11[aout]")

run([FF, "-y", "-hide_banner"] + inputs +
    ["-filter_complex", fc2, "-map", "[vout]", "-map", "[aout]",
     "-c:v", "libx264", "-crf", "18", "-preset", "medium",
     "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
     "worldcup_kickoff_final.mp4"])

print(f"FINAL OK: worldcup_kickoff_final.mp4  total={probe_dur('worldcup_kickoff_final.mp4'):.2f}s")
