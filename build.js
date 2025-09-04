const fs = require("fs");
const path = require("path");
const { minify: minifyHtml } = require("html-minifier-terser");
const CleanCSS = require("clean-css");
const chokidar = require("chokidar");
const esbuild = require("esbuild");

const args = process.argv.slice(2);
const watch = args.includes("--dev");
const minify = !watch;

const outArg = args.find(arg => arg.startsWith("--out="));
const outDir = outArg ? path.resolve(outArg.split("=")[1]) : path.join(__dirname, "dist");
const srcDir = path.join(__dirname, "src");
const appDir = path.join(srcDir, "app");
const globalCssFile = path.join(srcDir, "style.css");
const globalJsFile = path.join(srcDir, "main.js");
const publicDir = path.join(__dirname, "public");
const assetsDir = path.join(outDir, "assets");

// --- Clean output ---
if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(assetsDir, { recursive: true });

// --- Copy public assets ---
function copyPublic(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyPublic(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// --- Recursively get .vue files ---
function getVueFiles(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) results = results.concat(getVueFiles(fullPath));
    else if (file.endsWith(".vue")) results.push(fullPath);
  });
  return results;
}

// --- Find closest layout.html in parent directories ---
function findLayout(filePath) {
  let dir = path.dirname(filePath);
  while (dir.startsWith(appDir)) {
    const candidate = path.join(dir, "layout.html");
    if (fs.existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  return null;
}

// --- Extract <template>, <style>, <script> from .vue ---
function extractTag(content, tag) {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i");
  const match = content.match(regex);
  return match ? match[1] : "";
}

// --- Build global CSS and JS ---
async function buildGlobalAssets() {
  // CSS
  if (fs.existsSync(globalCssFile)) {
    let css = fs.readFileSync(globalCssFile, "utf-8");
    if (minify) css = new CleanCSS().minify(css).styles;
    fs.writeFileSync(path.join(assetsDir, "style.css"), css);
    console.log(`[${new Date().toLocaleTimeString()}] Built style.css`);
  }

  // JS
  if (fs.existsSync(globalJsFile)) {
    await esbuild.build({
      entryPoints: [globalJsFile],
      bundle: true,
      minify,
      platform: "browser",
      format: "iife",
      outfile: path.join(assetsDir, "main.js"),
      absWorkingDir: srcDir,
    });
    console.log(`[${new Date().toLocaleTimeString()}] Built main.js`);
  }
}

// --- Build a single page ---
async function buildPage(pageFile) {
  const filename = path.basename(pageFile, ".vue") + ".html"; // flattened
  const outPath = path.join(outDir, filename);

  const contentRaw = fs.readFileSync(pageFile, "utf-8");
  const template = extractTag(contentRaw, "template");
  const style = extractTag(contentRaw, "style");
  const script = extractTag(contentRaw, "script");

  const layoutPath = findLayout(pageFile);
  let layout = layoutPath ? fs.readFileSync(layoutPath, "utf-8") : "<body>{{content}}</body>";

  // Replace content
  let html = layout.replace("{{content}}", template || "");

  // Inject page-specific style
  if (style) {
    const minCss = minify ? new CleanCSS().minify(style).styles : style;
    html = html.replace("</head>", `<style>${minCss}</style>\n</head>`);
  }

  // Inject global CSS
  if (fs.existsSync(globalCssFile)) {
    html = html.replace("</head>", `<link rel="stylesheet" href="assets/style.css">\n</head>`);
  }

  // Bundle page-specific JS
  let pageJsCode = "";
  if (script) {
    const tmpJsFile = pageFile.replace(".vue", ".tmp.js"); // temp next to source
    fs.writeFileSync(tmpJsFile, script);

    await esbuild.build({
      entryPoints: [tmpJsFile],
      bundle: true,
      minify,
      platform: "browser",
      format: "iife",
      outfile: tmpJsFile,
      absWorkingDir: srcDir, // allows imports from src/lib
      allowOverwrite: true,
    });

    pageJsCode = fs.readFileSync(tmpJsFile, "utf-8");
    fs.unlinkSync(tmpJsFile);
  }

  // Inject page JS and global JS
  let scripts = [];
  if (pageJsCode) scripts.push(pageJsCode);
  if (fs.existsSync(path.join(assetsDir, "main.js")))
    scripts.push(fs.readFileSync(path.join(assetsDir, "main.js"), "utf-8"));
  if (scripts.length) html = html.replace("</body>", `<script>${scripts.join("\n")}</script>\n</body>`);

  // Minify HTML
  if (minify) {
    html = await minifyHtml(html, {
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeEmptyAttributes: true,
      minifyCSS: true,
      minifyJS: true,
    });
  }

  fs.writeFileSync(outPath, html);
  console.log(`[${new Date().toLocaleTimeString()}] Built ${pageFile} → ${outPath}`);
}

// --- Build all pages ---
async function buildAll() {
  await buildGlobalAssets();
  const pages = getVueFiles(appDir);
  for (const page of pages) await buildPage(page);
  copyPublic(publicDir, path.join(outDir, "public"));
}

// --- Initial build ---
buildAll();

// --- Watch mode ---
if (watch) {
  console.log("Watching for changes in src/ ...");
  const watcher = chokidar.watch(srcDir, { ignoreInitial: true });
  watcher.on("all", (event, pathChanged) => {
    console.log(`[${new Date().toLocaleTimeString()}] Detected ${event} on ${pathChanged}`);
    buildAll();
  });
}
