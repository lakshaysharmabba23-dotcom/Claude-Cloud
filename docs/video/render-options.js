// Frame-accurate render of docs/video/motion-options.html (1080x1350, 4:5).
// Usage: NODE_PATH=$(npm root -g) FFMPEG=/path/to/ffmpeg node docs/video/render-options.js 3 [outfile]   (3 = final cut; 1 and 2 are alternate styles)
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const path = require("path"), fs = require("fs");
const dir = __dirname, V = process.argv[2] || "1", FPS = 30, WORKERS = +(process.env.WORKERS || 4);
// Variant 3 ("Paper": cream and charcoal, serif type, slide transitions) is the chosen final cut.
const names = { 1: "alt-daybreak", 2: "alt-aurora", 3: "content-intelligence-agent" };
const out = path.join(dir, process.argv[3] || (names[V] + ".mp4"));
const frames = path.join(dir, ".frames-" + V);
(async () => {
  fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames, { recursive: true });
  const browser = await chromium.launch();
  const open = async () => {
    const page = await (await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 })).newPage();
    await page.goto("file://" + path.join(dir, "motion-options.html") + "?v=" + V);
    await page.waitForFunction(() => window.__ready === true && [...document.images].every((i) => i.complete));
    return page;
  };
  const probe = await open(); const total = await probe.evaluate(() => window.__total); await probe.context().close();
  const n = Math.round(total * FPS); let next = 0; const t0 = Date.now();
  await Promise.all(Array.from({ length: WORKERS }, async () => {
    const page = await open();
    for (;;) { const i = next++; if (i >= n) break;
      await page.evaluate((t) => { window.__seek(t); }, i / FPS);
      await page.screenshot({ path: path.join(frames, String(i).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 93 });
      if (i % 200 === 0) console.log(`v${V} frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
    await page.context().close();
  }));
  await browser.close();
  execFileSync(process.env.FFMPEG || "ffmpeg", ["-y", "-framerate", String(FPS), "-i", path.join(frames, "%05d.jpg"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "medium", "-movflags", "+faststart", "-an", out], { stdio: "ignore" });
  fs.rmSync(frames, { recursive: true, force: true });
  console.log("wrote", out, (fs.statSync(out).size / 1e6).toFixed(1) + " MB", n + " frames");
})();
