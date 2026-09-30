"""Count luminance flashes per second in an MP4 (WCAG 2.3.1 style heuristic: <=3 flashes/sec)."""
import subprocess, sys, re
f = sys.argv[1]
subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-vf", "signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=/tmp/_yavg.txt", "-f", "null", "-"], check=True)
out = open("/tmp/_yavg.txt").read()
y = [float(v) for v in re.findall(r"YAVG=([\d.]+)", out)]
# a "flash" = a rise of >= 20 luma levels (~10% of full range) followed by a fall within 0.33s
flashes = []
for i in range(1, len(y)):
    if y[i] - y[i - 1] >= 20:
        if any(y[i] - y[j] >= 20 for j in range(i + 1, min(len(y), i + 11))):
            flashes.append(i / 30)
worst = max((sum(1 for t in flashes if s <= t < s + 1) for s in [x / 30 for x in range(len(y))]), default=0)
print(f"{f}: frames={len(y)} meanY={sum(y)/len(y):.1f} flashes={len(flashes)} at {[round(t,2) for t in flashes]} worst_per_sec={worst}")
