// Deterministic frame-by-frame render of docs/video/motion-short.html.
// Usage: NODE_PATH=$(npm root -g) FFMPEG=/path/to/ffmpeg [FPS=30] [WORKERS=4] node docs/video/render-short.js
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const path = require("path"), fs = require("fs");
const dir = __dirname, FPS = +(process.env.FPS || 30), WORKERS = +(process.env.WORKERS || 4);
const out = path.join(dir, "content-intelligence-agent-short.mp4");
const frames = path.join(dir, ".frames");
(async () => {
  fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames, { recursive: true });
  const browser = await chromium.launch();
  const open = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto("file://" + path.join(dir, "motion-short.html"));
    await page.waitForFunction(() => window.__ready === true && [...document.images].every((i) => i.complete));
    return page;
  };
  const probe = await open(); const total = await probe.evaluate(() => window.__total); await probe.context().close();
  const n = Math.round(total * FPS); let next = 0; const t0 = Date.now();
  await Promise.all(Array.from({ length: WORKERS }, async () => {
    const page = await open();
    for (;;) {
      const i = next++; if (i >= n) break;
      await page.evaluate((t) => window.__seek(t), i / FPS);
      await page.screenshot({ path: path.join(frames, String(i).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 92 });
      if (i % 120 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    await page.context().close();
  }));
  await browser.close();
  execFileSync(process.env.FFMPEG || "ffmpeg", ["-y", "-framerate", String(FPS), "-i", path.join(frames, "%05d.jpg"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", "-movflags", "+faststart", "-an", out], { stdio: "ignore" });
  fs.rmSync(frames, { recursive: true, force: true });
  console.log("wrote", out, (fs.statSync(out).size / 1e6).toFixed(1) + " MB", `${n} frames`);
})();
