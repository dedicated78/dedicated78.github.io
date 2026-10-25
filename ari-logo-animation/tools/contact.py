"""contact sheet of rendered frames: contact.py out.png dir f1 f2 ..."""
import sys, os
from PIL import Image, ImageDraw
out, d, fr = sys.argv[1], sys.argv[2], [int(x) for x in sys.argv[3:]]
ims = [Image.open(os.path.join(d, f"f{f:04d}.png")).convert("RGB") for f in fr]
w, h = ims[0].size; cols = 3 if len(ims) > 4 else len(ims); rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (w * cols, h * rows), "white")
for i, (im, f) in enumerate(zip(ims, fr)):
    x, y = (i % cols) * w, (i // cols) * h
    sheet.paste(im, (x, y)); ImageDraw.Draw(sheet).text((x + 6, y + 4), f"f{f} t={(f-1)/30:.2f}", fill=(255, 0, 0))
if sheet.width > 2400:
    sheet = sheet.resize((2400, sheet.height * 2400 // sheet.width), Image.LANCZOS)
sheet.save(out, quality=90)
