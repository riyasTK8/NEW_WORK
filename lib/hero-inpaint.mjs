import sharp from "sharp";

/**
 * Removes the generator watermark from a hero frame.
 *
 * The mark is a static ~41x45 grey sparkle measured at x1140-1180, y577-621 in
 * the 1280x720 source. It sits ~100px in from both the right and bottom edges,
 * so cropping it away would cost far too much of the composition.
 *
 * Instead: boundary-interpolation inpainting. Every pixel inside the rect is
 * rebuilt from the clean pixels on its four borders, so the mark itself is
 * never sampled, then a short box-blur dissolves the streaking that pure
 * interpolation leaves behind, and the edges feather back into the original.
 */
const RECT = { x: 1130, y: 567, w: 62, h: 66 };
const FEATHER = 6;
const BLUR_PASSES = 3;
const BLUR_RADIUS = 3;

export async function inpaintWatermark(srcPath) {
  const img = sharp(srcPath);
  const meta = await img.metadata();
  const { width, height } = meta;

  // Frames smaller than expected: leave them alone rather than corrupt them.
  if (width < RECT.x + RECT.w + 2 || height < RECT.y + RECT.h + 2) {
    return img;
  }

  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const at = (buf, x, y, c) => buf[(y * width + x) * ch + c];
  const out = Buffer.from(data);

  const x0 = RECT.x, y0 = RECT.y;
  const x1 = RECT.x + RECT.w - 1, y1 = RECT.y + RECT.h - 1;

  /* 1. Rebuild the rect from its borders only. */
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const fx = (x - x0 + 1) / (RECT.w + 1);
      const fy = (y - y0 + 1) / (RECT.h + 1);
      const wx = 1 - Math.abs(0.5 - fx) * 2;
      const wy = 1 - Math.abs(0.5 - fy) * 2;
      const sw = wx + wy || 1;
      for (let c = 0; c < 3; c++) {
        const h = at(data, x0 - 1, y, c) * (1 - fx) + at(data, x1 + 1, y, c) * fx;
        const v = at(data, x, y0 - 1, c) * (1 - fy) + at(data, x, y1 + 1, c) * fy;
        out[(y * width + x) * ch + c] = (h * wy + v * wx) / sw;
      }
    }
  }

  /* 2. Smooth out the interpolation streaks. */
  for (let pass = 0; pass < BLUR_PASSES; pass++) {
    const snap = Buffer.from(out);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0, n = 0;
          for (let dy = -BLUR_RADIUS; dy <= BLUR_RADIUS; dy++) {
            for (let dx = -BLUR_RADIUS; dx <= BLUR_RADIUS; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
              sum += at(snap, nx, ny, c);
              n++;
            }
          }
          out[(y * width + x) * ch + c] = sum / n;
        }
      }
    }
  }

  /* 3. Feather the border back into the untouched original. */
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.min(x - x0, x1 - x, y - y0, y1 - y);
      if (d >= FEATHER) continue;
      const t = (d + 1) / (FEATHER + 1);
      for (let c = 0; c < 3; c++) {
        const i = (y * width + x) * ch + c;
        out[i] = out[i] * t + data[i] * (1 - t);
      }
    }
  }

  for (let i = 0; i < out.length; i++) out[i] = Math.max(0, Math.min(255, Math.round(out[i])));
  return sharp(out, { raw: { width, height, channels: ch } });
}
