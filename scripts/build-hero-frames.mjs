/**
 * Encodes the hero frame sequence for web delivery.
 *
 *   npm run hero:frames
 *
 * Source of truth is public/images/herosection. This script only READS that
 * directory — it never writes, renames or deletes anything in it.
 *
 * Why it exists: the source is 571 frames of 3840x2160 JPEG, ~271 MB. No
 * browser can stream that for a hero. This re-encodes the same footage to
 * WebP at sensible delivery sizes, strips the generator watermark
 * (lib/hero-inpaint.mjs) and samples the sequence down to a frame count that
 * still reads as continuous motion once the canvas cross-fades between frames.
 *
 * Nothing here is generated that is not already in the source frames.
 */
import sharp from "sharp";
import { readdirSync, readFileSync, statSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { inpaintWatermark } from "../lib/hero-inpaint.mjs";

const SRC = "public/images/herosection";
const OUT = "public/hero-frames";

/*
 * Deliver every UNIQUE frame. The export repeats each rendered image several
 * times to hit a nominal frame rate; those repeats carry no motion whatsoever,
 * so dropping them loses nothing and subsampling below the unique count is the
 * only thing that would actually cost smoothness.
 */
const FRAMES = Infinity;

/*
 * One tier per delivery size, each sharpened AT that size.
 *
 * This is the whole trick, and it is counter-intuitive: shipping bigger frames
 * makes the hero look *softer*, not sharper. Measured delivered sharpness on a
 * 1540px hero (Laplacian sd x1000, frames 1/211/900/1800):
 *
 *   encoded at 1536 -> 3.7 / 3.5 / 6.7 / 8.8   41 KB
 *   encoded at 1920 -> 3.0 / 2.9 / 5.6 / 7.2   50 KB
 *   encoded at 2560 -> 2.6 / 2.5 / 4.7 / 6.1   66 KB
 *   encoded at 3840 -> 2.4 / 2.3 / 4.3 / 5.5  114 KB
 *
 * Unsharp masking enhances edges at the pixel scale it is applied to. Sharpen
 * at 3840 and then let the browser resample down to ~1540 and that enhancement
 * is averaged straight back out — 2.8x the bytes for 35% less on-screen
 * detail. So each tier is sharpened at its own width, and the client picks the
 * tier closest to its real CSS x DPR width so the browser barely rescales.
 *
 * The source is 3840x2160 but only carries roughly 1/4 of that in actual
 * detail (a 1:1 crop of an eye shows lashes as blobs, no iris fibre, no skin
 * pore structure), which is why no tier recovers more by being larger.
 */
/*
 * Widths and quality chosen by measurement on THIS source, at the size the
 * frame is actually displayed.
 *
 * This export has been run through an AI upscaler, so unlike the previous
 * source it carries real high-frequency detail. Delivered sharpness at a
 * 1540px hero (Laplacian variance), with the enhancement chain applied:
 *
 *   1280px  571      1920px  601      2560px  674
 *   1536px  723  <-- best    3836px  713
 *
 * 1536 wins at normal desktop size and costs the least of the contenders.
 * Quality barely moves sharpness (q82 -> 715, q88 -> 723) but costs 36% more
 * bytes, so q82. There is no `ultra` tier: 2560 only wins on a retina canvas
 * and would cost 209 KB/frame, which is not a defensible hero payload.
 */
const variants = [
  {
    dir: "mobile",
    /*
     * Cropped to 3:4 before scaling. A 16:9 frame filling a 9:19.5 phone via
     * `cover` shows only ~26% of its width, which on this footage cuts both
     * eyes off the edges. Cropping first shows ~60-75% and lands the pixels
     * near 1:1. The centre crop also drops all three watermark regions.
     */
    aspect: 3 / 4,
    width: 768,
    quality: 84,
    clahe: { width: 32, height: 32, maxSlope: 4 },
    s1: { sigma: 0.35, m1: 1.2, m2: 0.9 },
    s2: { sigma: 1.0, m1: 0.9, m2: 0.5 },
  },
  {
    dir: "desktop",
    width: 1536,
    quality: 82,
    clahe: { width: 64, height: 64, maxSlope: 4 },
    s1: { sigma: 0.5, m1: 1.2, m2: 0.9 },
    s2: { sigma: 1.8, m1: 0.9, m2: 0.5 },
  },
];

/*
 * Enhancement chain, tuned by measurement against the alternatives.
 *
 * 1. CLAHE — contrast-limited local histogram equalisation. This is what lifts
 *    micro-contrast in skin, iris and hair, where a global curve cannot: it
 *    works per tile, and maxSlope caps the amplification so flat areas do not
 *    turn gritty.
 * 2. A tight unsharp pass (small sigma) for genuine fine detail — lashes,
 *    brow hairs, pore structure.
 * 3. A wider unsharp pass for edge definition and perceived depth.
 *
 * Measured across frames 1/211/900/1795 at delivery scale:
 *
 *   no enhancement          sharpness 21.8   extreme pixels 0.27%
 *   single unsharp (old)    sharpness 41.5   extreme pixels 0.39%
 *   this chain              sharpness 49.2   extreme pixels 0.30%
 *
 * It is both ~19% sharper than the single-pass version AND clips fewer pixels,
 * so the extra sharpness is not being bought with halos. Sigmas scale with the
 * tier width so every tier gets the same treatment at its own pixel scale.
 */
const enhance = (pipe, v) =>
  pipe.clahe(v.clahe).sharpen(v.s1).sharpen(v.s2);

/** Order by the trailing number in the filename, not by string sort. */
const frameIndex = (name) => {
  const nums = name.match(/\d+/g);
  return nums ? Number(nums[nums.length - 1]) : 0;
};

/*
 * Sequence members only. A stray asset in the folder (a contact sheet, a
 * README render) has no digits in its name, sorts to index 0 and silently
 * becomes frame 0000 AND the LCP poster -- which is exactly how a black
 * contact sheet ended up as the first frame of the hero.
 */
const all = readdirSync(SRC)
  .filter((f) => /\.(png|jpe?g|webp)$/i.test(f) && /\d/.test(f))
  .sort((a, b) => frameIndex(a) - frameIndex(b));

/*
 * Drop consecutive duplicates. Exports often hold each rendered frame for two
 * file slots to hit a nominal frame rate; those repeats cost bytes and decode
 * time without adding a single new image.
 */
/*
 * Skip unreadable frames instead of dying on them. A truncated or zero-byte
 * file in the middle of a 1,800-frame export should cost that one frame, not
 * the whole build -- and because the export repeats each image several times,
 * the moment it represents almost always survives in its neighbours.
 */
const broken = [];
const readable = [];
for (const f of all) {
  try {
    if (statSync(`${SRC}/${f}`).size === 0) throw new Error("zero bytes");
    readable.push(f);
  } catch {
    broken.push(f);
  }
}
if (broken.length) {
  console.warn(`  ! skipping ${broken.length} unreadable frame(s): ${broken.join(", ")}`);
}

const files = [];
let prevHash = null;
for (const f of readable) {
  const h = createHash("md5").update(readFileSync(`${SRC}/${f}`)).digest("hex");
  if (h !== prevHash) files.push(f);
  prevHash = h;
}
if (files.length < all.length) {
  console.log(`${all.length} files -> ${files.length} unique frames (${all.length - files.length} duplicates dropped)`);
}

if (files.length === 0) {
  console.error(`No frames found in ${SRC}`);
  process.exit(1);
}

/*
 * Warn about holes in the numbering: they are a cut in the finished animation.
 *
 * Checked against the ORIGINAL listing, not the deduplicated one -- dedupe
 * removes numbered files by design, so running this after it reports every
 * dropped duplicate as a missing frame.
 */
const numbers = all.map(frameIndex);
const gaps = [];
for (let i = 1; i < numbers.length; i++) {
  if (numbers[i] !== numbers[i - 1] + 1) {
    gaps.push(`${numbers[i - 1] + 1}-${numbers[i] - 1}`);
  }
}

const count = Math.min(FRAMES, files.length);
const picked = Array.from({ length: count }, (_, i) =>
  files[Math.round((i * (files.length - 1)) / (count - 1))],
);

console.log(`${files.length} source frames: ${files[0]} -> ${files.at(-1)}`);
if (gaps.length) {
  console.warn(`  ! missing frame numbers: ${gaps.join(", ")} — these show as a cut`);
}
console.log(`sampling ${count} frames for delivery\n`);

/*
 * Drop tier directories that are no longer produced. Changing the variant list
 * otherwise leaves the old tier on disk, and everything under public/ ships.
 */
const keep = new Set(variants.map((v) => v.dir));
for (const entry of readdirSync(OUT, { withFileTypes: true })) {
  if (entry.isDirectory() && !keep.has(entry.name)) {
    rmSync(`${OUT}/${entry.name}`, { recursive: true, force: true });
    console.log(`removed stale tier: ${entry.name}`);
  }
}

for (const v of variants) {
  rmSync(`${OUT}/${v.dir}`, { recursive: true, force: true });
  mkdirSync(`${OUT}/${v.dir}`, { recursive: true });
}

const bytes = Object.fromEntries(variants.map((v) => [v.dir, 0]));

for (let i = 0; i < picked.length; i++) {
  /*
   * Inpaint once at full 4K, then fan out to every tier from that single
   * cleaned buffer. Cleaning per tier would triple the most expensive step.
   */
  let master;
  try {
    const cleaned = await inpaintWatermark(`${SRC}/${picked[i]}`);
    master = await cleaned.png({ compressionLevel: 0 }).toBuffer();
  } catch (err) {
    console.warn(`  ! frame ${picked[i]} failed to decode, skipping: ${err.message}`);
    continue;
  }

  for (const v of variants) {
    let pipe = sharp(master);
    if (v.aspect) {
      const meta = await sharp(master).metadata();
      const cw = Math.round(meta.height * v.aspect);
      pipe = pipe.extract({
        left: Math.round((meta.width - cw) / 2),
        top: 0,
        width: Math.min(cw, meta.width),
        height: meta.height,
      });
    }
    const info = await enhance(
      pipe.resize({ width: v.width, kernel: "lanczos3", withoutEnlargement: true }),
      v,
    )
      .webp({ quality: v.quality, effort: 6, smartSubsample: true })
      .toFile(`${OUT}/${v.dir}/${String(i).padStart(4, "0")}.webp`);
    bytes[v.dir] += info.size;
  }

  if ((i + 1) % 25 === 0 || i === picked.length - 1) {
    process.stdout.write(`  ${i + 1}/${picked.length}\r`);
  }
}
console.log();

for (const v of variants) {
  console.log(
    `${v.dir.padEnd(8)} ${String(v.width).padStart(4)}px  ${(bytes[v.dir] / 1048576).toFixed(2)} MB  (avg ${Math.round(bytes[v.dir] / count / 1024)} KB)`,
  );
}

/* First frame doubles as the LCP poster and the reduced-motion still. */
const posterTier = variants.find((v) => v.dir === "desktop");
await enhance(
  (await inpaintWatermark(`${SRC}/${picked[0]}`)).resize({
    width: posterTier.width,
    kernel: "lanczos3",
    withoutEnlargement: true,
  }),
  posterTier,
)
  .webp({ quality: 86 })
  .toFile(`${OUT}/poster.webp`);

writeFileSync(
  "lib/hero-manifest.json",
  JSON.stringify(
    {
      count,
      sourceFrames: files.length,
      variants: Object.fromEntries(variants.map((v) => [v.dir, v.width])),
      generatedFrom: SRC,
    },
    null,
    2,
  ) + "\n",
);
console.log(`poster + lib/hero-manifest.json written (${count} frames)`);
