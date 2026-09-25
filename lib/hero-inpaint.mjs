import sharp from "sharp";

/**
 * Removes the generator watermark from a hero frame.
 *
 * The mark is a static grey sparkle sitting ~11% in from the right edge and
 * ~21% up from the bottom. It is inset from both edges, so cropping it away
 * would cost far too much of the composition.
 *
 * The rect is expressed as FRACTIONS of the frame, not pixels, so the same
 * numbers hold whether the source is 1280x720 or 3840x2160. Measured at both:
 * centre lands at (0.906, 0.833) of the frame in each case.
 *
 * Method: boundary-interpolation inpainting. Every pixel inside the rect is
 * rebuilt from the clean pixels on its four borders, so the mark itself is
 * never sampled; a short box-blur dissolves the streaking that pure
 * interpolation leaves behind, and the edges feather back into the original.
 */
const RECT_FRAC = { x: 0.8828, y: 0.7875, w: 0.0485, h: 0.0917 };
const FEATHER_FRAC = 0.0047;
const BLUR_PASSES = 3;

export async function inpaintWatermark(srcPath) {
  const img = sharp(srcPath);
  const meta = await img.metadata();
  const { width, height } = meta;

  if (!width || !height) return img;

  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const at = (buf, x, y, c) => buf[(y * width + x) * ch + c];
  const out = Buffer.from(data);

  const RECT = {
    x: Math.round(RECT_FRAC.x * width),
    y: Math.round(RECT_FRAC.y * height),
    w: Math.round(RECT_FRAC.w * width),
    h: Math.round(RECT_FRAC.h * height),
  };
  /* Scale the blur radius and feather with the frame, or a 4K mark is
     rebuilt with a kernel tuned for 720p and the patch shows. */
  const BLUR_RADIUS = Math.max(2, Math.round(width / 420));
  const FEATHER = Math.max(3, Math.round(FEATHER_FRAC * width));

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

  /*
   * 2. Smooth out the interpolation streaks.
   *
   * Separable box blur: a horizontal pass then a vertical pass gives the same
   * result as a square kernel for a fraction of the samples. At 4K the kernel
   * is 19px wide, so this is ~10x cheaper than the naive version -- which
   * matters when it runs over every frame of a 571-frame sequence.
   */
  const rw = RECT.w, rh = RECT.h;
  let band = new Float32Array(rw * rh * 3);
  for (let y = 0; y < rh; y++)
    for (let x = 0; x < rw; x++)
      for (let c = 0; c < 3; c++)
        band[(y * rw + x) * 3 + c] = at(out, x0 + x, y0 + y, c);

  const tmp = new Float32Array(band.length);
  for (let pass = 0; pass < BLUR_PASSES; pass++) {
    // horizontal
    for (let y = 0; y < rh; y++) {
      for (let x = 0; x < rw; x++) {
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
      }
    }
    // vertical
    for (let y = 0; y < rh; y++) {
      for (let x = 0; x < rw; x++) {
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

  for (let i = 0; i < out.length; i++) out[i] = Math.max(0, Math.min(255, Math.round(out[i])));
  return sharp(out, { raw: { width, height, channels: ch } });
}
