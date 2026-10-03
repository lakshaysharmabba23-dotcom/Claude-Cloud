// Records docs/video/motion.html to a video. Needs Playwright and an ffmpeg with libx264.
// Usage: NODE_PATH=$(npm root -g) FFMPEG=/path/to/ffmpeg node docs/video/render.js
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const path = require("path"), fs = require("fs");
const dir = __dirname, out = path.join(dir, "content-intelligence-agent.mp4");
const tmp = path.join(dir, ".rec");
(async () => {
  fs.rmSync(tmp, { recursive: true, force: true });
  const browser = await chromium.launch();
  const ctxStart = Date.now();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: tmp, size: { width: 1920, height: 1080 } } });
  const page = await ctx.newPage();
  await page.goto("file://" + path.join(dir, "motion.html"));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  await page.waitForTimeout(400);
  const startedAt = Date.now();
  await page.evaluate(() => window.__start());
  await page.waitForFunction(() => window.__finished, null, { timeout: 120000 });
  await page.waitForTimeout(400);
  await ctx.close(); await browser.close();
  const webm = path.join(tmp, fs.readdirSync(tmp).find((f) => f.endsWith(".webm")));
  const lead = ((startedAt - ctxStart) / 1000 - 0.05).toFixed(2);
  execFileSync(process.env.FFMPEG || "ffmpeg", ["-y", "-ss", lead, "-i", webm, "-t", "63.3", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "medium", "-r", "30", "-movflags", "+faststart", "-an", out], { stdio: "inherit" });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log("wrote", out, (fs.statSync(out).size / 1e6).toFixed(1) + " MB");
})();
