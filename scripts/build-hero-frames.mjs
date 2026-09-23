/**
 * Encodes the hero frame sequence for web delivery.
 *
 *   node scripts/build-hero-frames.mjs      (or: npm run hero:frames)
 *
 * Source of truth is public/images/herosection. This script only READS that
 * directory -- it never writes, renames or deletes anything in it.
 *
 * Why it exists: the source frames are PNG, which is a lossless archival
 * format. 150 of them is ~143 MB, which no browser can stream for a hero.
 * Re-encoding the same pixels to WebP at the same 1280x720 costs ~5.8 MB.
 * Nothing is generated here that is not already in the source frames.
 *
 * It also strips the generator watermark -- see lib/hero-inpaint.mjs.
 *
 * Re-run it whenever the frames in public/images/herosection change.
 */
import sharp from "sharp";
import { readdirSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { inpaintWatermark } from "../lib/hero-inpaint.mjs";

const SRC = "public/images/herosection";
const OUT = "public/hero-frames";

/** Order by the trailing number in the filename, not by string sort. */
const frameIndex = (name) => {
  const nums = name.match(/\d+/g);
  return nums ? Number(nums[nums.length - 1]) : 0;
};

const files = readdirSync(SRC)
  .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
  .sort((a, b) => frameIndex(a) - frameIndex(b));

if (files.length === 0) {
  console.error(`No frames found in ${SRC}`);
  process.exit(1);
}
console.log(`${files.length} source frames: ${files[0]} -> ${files[files.length - 1]}`);

const variants = [
  { dir: "desktop", width: 1280, quality: 72 },
  { dir: "mobile", width: 768, quality: 62 },
];

const report = {};
for (const v of variants) {
  rmSync(`${OUT}/${v.dir}`, { recursive: true, force: true });
  mkdirSync(`${OUT}/${v.dir}`, { recursive: true });

  let bytes = 0;
  for (let i = 0; i < files.length; i++) {
    /* Watermark is removed at full source resolution, before downscaling. */
    const cleaned = await inpaintWatermark(`${SRC}/${files[i]}`);
    const info = await cleaned
      .resize({ width: v.width, kernel: "lanczos3", withoutEnlargement: true })
      .webp({ quality: v.quality, effort: 6, smartSubsample: true })
      .toFile(`${OUT}/${v.dir}/${String(i).padStart(4, "0")}.webp`);
    bytes += info.size;
  }
  report[v.dir] = bytes;
  console.log(
    `${v.dir.padEnd(8)} ${v.width}px  ${(bytes / 1048576).toFixed(2)} MB  (avg ${Math.round(bytes / files.length / 1024)} KB)`,
  );
}

/* First frame doubles as the LCP poster and the reduced-motion still. */
await (await inpaintWatermark(`${SRC}/${files[0]}`))
  .resize({ width: 1600, kernel: "lanczos3", withoutEnlargement: true })
  .webp({ quality: 80 })
  .toFile(`${OUT}/poster.webp`);

/*
 * The manifest lives in lib/ so the page can `import` it statically. Reading
 * the directory at build time instead makes Turbopack warn about a dynamic
 * fs path, and a static import costs nothing at runtime.
 */
const manifest = {
  count: files.length,
  variants: { desktop: 1280, mobile: 768 },
  generatedFrom: SRC,
};
writeFileSync("lib/hero-manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`poster + lib/hero-manifest.json written (${files.length} frames)`);
