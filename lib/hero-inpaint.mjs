import sharp from "sharp";

/**
 * Removes the generator/upscaler watermarks from a hero frame.
 *
 * The current source carries three static overlays, added by the AI upscaler
 * the footage was run through:
 *
 *   - "Wink"        top-left
 *   - "PixVerse.ai" top-right
 *   - a sparkle     bottom-right
 *
 * All three sit in the same place on every frame (verified across the
 * sequence) and are opaque, so they are always in those pixels even on frames
 * where a bright background makes them hard to see.
 *
 * Rects are expressed as FRACTIONS of the frame, so the same numbers hold
 * whatever resolution the export happens to be — this source is 3836x2162,
 * not the 3840x2160 it is usually assumed to be.
 *
 * Method: boundary-interpolation inpainting. Every pixel inside a rect is
 * rebuilt from the clean pixels on its four borders, so the mark itself is
 * never sampled; a separable box blur dissolves the streaking that pure
 * interpolation leaves, and the edges feather back into the original. All
 * three regions sit over sky or defocused background, which is exactly the
 * case this reconstructs well.
 */
/*
 * Snug to the glyphs plus a small margin, deliberately. A generous rect is
 * safer for coverage but reconstructs a much larger area from its borders,
 * and over varied content (a hair edge crossing sky) that reads as a smear
 * far more obvious than the mark it replaced.
 */
const RECTS = [
  { x: 0.0203, y: 0.0167, w: 0.0832, h: 0.0671 }, // Wink, top-left
  { x: 0.8556, y: 0.0435, w: 0.1246, h: 0.0472 }, // PixVerse.ai, top-right
  { x: 0.8863, y: 0.7831, w: 0.0422, h: 0.0749 }, // sparkle, bottom-right
];
const FEATHER_FRAC = 0.0047;
const BLUR_PASSES = 3;

export async function inpaintWatermark(srcPath) {
  const img = sharp(srcPath);
  const { width, height } = await img.metadata();
  if (!width || !height) return img;

  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const at = (buf, x, y, c) => buf[(y * width + x) * ch + c];
  const out = Buffer.from(data);

  const BLUR_RADIUS = Math.max(2, Math.round(width / 420));
  const FEATHER = Math.max(3, Math.round(FEATHER_FRAC * width));

  for (const frac of RECTS) {
    const RECT = {
      x: Math.max(1, Math.round(frac.x * width)),
      y: Math.max(1, Math.round(frac.y * height)),
      w: Math.round(frac.w * width),
      h: Math.round(frac.h * height),
    };
    const x0 = RECT.x;
    const y0 = RECT.y;
    const x1 = Math.min(width - 2, RECT.x + RECT.w - 1);
    const y1 = Math.min(height - 2, RECT.y + RECT.h - 1);
    const rw = x1 - x0 + 1;
    const rh = y1 - y0 + 1;
    if (rw <= 0 || rh <= 0) continue;

    /* 1. Rebuild the rect from its borders only. */
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const fx = (x - x0 + 1) / (rw + 1);
        const fy = (y - y0 + 1) / (rh + 1);
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

    /* 2. Separable box blur to dissolve the interpolation streaks. */
    const band = new Float32Array(rw * rh * 3);
    for (let y = 0; y < rh; y++)
      for (let x = 0; x < rw; x++)
        for (let c = 0; c < 3; c++)
          band[(y * rw + x) * 3 + c] = at(out, x0 + x, y0 + y, c);

    const tmp = new Float32Array(band.length);
    for (let pass = 0; pass < BLUR_PASSES; pass++) {
      for (let y = 0; y < rh; y++)
        for (let x = 0; x < rw; x++)
          for (let c = 0; c < 3; c++) {
            let sum = 0, n = 0;
            for (let d = -BLUR_RADIUS; d <= BLUR_RADIUS; d++) {
              const nx = x + d;
              if (nx < 0 || nx >= rw) continue;
              sum += band[(y * rw + nx) * 3 + c];
              n++;
            }
            tmp[(y * rw + x) * 3 + c] = sum / n;
          }
      for (let y = 0; y < rh; y++)
        for (let x = 0; x < rw; x++)
          for (let c = 0; c < 3; c++) {
            let sum = 0, n = 0;
            for (let d = -BLUR_RADIUS; d <= BLUR_RADIUS; d++) {
              const ny = y + d;
              if (ny < 0 || ny >= rh) continue;
              sum += tmp[(ny * rw + x) * 3 + c];
              n++;
            }
            band[(y * rw + x) * 3 + c] = sum / n;
          }
    }
    for (let y = 0; y < rh; y++)
      for (let x = 0; x < rw; x++)
        for (let c = 0; c < 3; c++)
          out[((y0 + y) * width + (x0 + x)) * ch + c] = band[(y * rw + x) * 3 + c];

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
  }

  for (let i = 0; i < out.length; i++)
    out[i] = Math.max(0, Math.min(255, Math.round(out[i])));
  return sharp(out, { raw: { width, height, channels: ch } });
}
