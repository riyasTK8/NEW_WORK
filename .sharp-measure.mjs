import sharp from "sharp";
import { inpaintWatermark } from "./lib/hero-inpaint.mjs";

const SRC = "public/images/herosection/Developers_building_holographic___20260922160318_050.png";
const DISPLAY = 1540; // a typical desktop window width

/** Variance of the Laplacian: the standard objective sharpness measure. */
async function sharpness(buf) {
  const { data, info } = await sharp(buf)
    .resize({ width: DISPLAY, kernel: "lanczos3" })
    .greyscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  let sum = 0, sum2 = 0, n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = -4 * data[i] + data[i - 1] + data[i + 1] + data[i - w] + data[i + w];
      sum += lap; sum2 += lap * lap; n++;
    }
  }
  const mean = sum / n;
  return sum2 / n - mean * mean;
}

const clean = await inpaintWatermark(SRC);
const source = await clean.clone().png().toBuffer();

const variants = {
  "SOURCE png (ceiling)":        source,
  "current: 1280 q72 no sharpen": await sharp(source).resize({width:1280,kernel:"lanczos3"}).webp({quality:72,effort:6}).toBuffer(),
  "1280 q86 + sharpen":           await sharp(source).resize({width:1280,kernel:"lanczos3"}).sharpen({sigma:0.9,m1:0.5,m2:0.3}).webp({quality:86,effort:6}).toBuffer(),
  "1920 q80 supersample+sharpen": await sharp(source).resize({width:1920,kernel:"lanczos3"}).sharpen({sigma:1.1,m1:0.6,m2:0.35}).webp({quality:80,effort:6}).toBuffer(),
  "1920 q86 supersample+sharpen": await sharp(source).resize({width:1920,kernel:"lanczos3"}).sharpen({sigma:1.1,m1:0.6,m2:0.35}).webp({quality:86,effort:6}).toBuffer(),
};

console.log(`Sharpness at ${DISPLAY}px display width (variance of Laplacian, higher = crisper)\n`);
const base = await sharpness(variants["current: 1280 q72 no sharpen"]);
for (const [label, buf] of Object.entries(variants)) {
  const s = await sharpness(buf);
  const kb = Math.round(buf.length / 1024);
  const delta = label.startsWith("SOURCE") ? "" : `  ${((s / base - 1) * 100).toFixed(0).padStart(4)}% vs current`;
  console.log(`  ${label.padEnd(32)} ${s.toFixed(1).padStart(7)}   ${String(kb).padStart(4)} KB/frame  x150 = ${(buf.length*150/1048576).toFixed(1)} MB${delta}`);
}
