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
const tmpDir = path.join(srcDir, ".tmp");

// --- Clean output ---
if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(assetsDir, { recursive: true });
fs.mkdirSync(tmpDir, { recursive: true });

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

// --- Build a single .vue page ---
async function buildPage(pageFile) {
  const name = path.basename(pageFile, ".vue");
  const htmlOutPath = path.join(outDir, name + ".html"); // flattened

  const contentRaw = fs.readFileSync(pageFile, "utf-8");
  const template = extractTag(contentRaw, "template");
  const style = extractTag(contentRaw, "style");
  const script = extractTag(contentRaw, "script");

  const layoutPath = findLayout(pageFile);
  let layout = layoutPath ? fs.readFileSync(layoutPath, "utf-8") : "<body>{{content}}</body>";

  // Replace {{content}}
  let html = layout.replace("{{content}}", template || "");

  // --- Page CSS ---
  if (style) {
    const cssFileName = `${name}.css`;
    const cssOutPath = path.join(assetsDir, cssFileName);
    const cssContent = minify ? new CleanCSS().minify(style).styles : style;
    fs.writeFileSync(cssOutPath, cssContent);
    html = html.replace("</head>", `<link rel="stylesheet" href="assets/${cssFileName}">\n</head>`);
  }

  // --- Global CSS ---
  if (fs.existsSync(globalCssFile)) {
    html = html.replace("</head>", `<link rel="stylesheet" href="assets/style.css">\n</head>`);
  }

  // --- Page JS ---
  if (script) {
    const tmpJsFile = path.join(tmpDir, `${name}.js`);
    fs.writeFileSync(tmpJsFile, script);

    const jsOutFile = path.join(assetsDir, `${name}.js`);
    await esbuild.build({
      entryPoints: [tmpJsFile],
      bundle: true,
      minify,
      platform: "browser",
      format: "iife",
      outfile: jsOutFile,
      absWorkingDir: srcDir, // resolve ../lib correctly
      allowOverwrite: true,
    });

    fs.unlinkSync(tmpJsFile); // clean temp file
    html = html.replace("</body>", `<script src="assets/${name}.js"></script>\n</body>`);
  }

  // --- Global JS ---
  if (fs.existsSync(path.join(assetsDir, "main.js"))) {
    html = html.replace("</body>", `<script src="assets/main.js"></script>\n</body>`);
  }

  // --- Minify HTML ---
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

  fs.writeFileSync(htmlOutPath, html);
  console.log(`[${new Date().toLocaleTimeString()}] Built ${pageFile} → ${htmlOutPath}`);
}

// --- Build root index.html ---
async function buildRootIndex() {
  const srcIndex = path.join(srcDir, "index.html");
  if (!fs.existsSync(srcIndex)) return;

  let html = fs.readFileSync(srcIndex, "utf-8");

  // Global CSS
  if (fs.existsSync(globalCssFile)) {
    html = html.replace("</head>", `<link rel="stylesheet" href="assets/style.css">\n</head>`);
  }

  // index.css
  const indexCss = path.join(srcDir, "index.css");
  if (fs.existsSync(indexCss)) {
    let css = fs.readFileSync(indexCss, "utf-8");
    if (minify) css = new CleanCSS().minify(css).styles;
    fs.writeFileSync(path.join(assetsDir, "index.css"), css);
    html = html.replace("</head>", `<link rel="stylesheet" href="assets/index.css">\n</head>`);
  }

  // Global JS
  if (fs.existsSync(path.join(assetsDir, "main.js"))) {
    html = html.replace("</body>", `<script src="assets/main.js"></script>\n</body>`);
  }

  // index.js
  const indexJs = path.join(srcDir, "index.js");
  if (fs.existsSync(indexJs)) {
    await esbuild.build({
      entryPoints: [indexJs],
      bundle: true,
      minify,
      platform: "browser",
      format: "iife",
      outfile: path.join(assetsDir, "index.js"),
      absWorkingDir: srcDir,
    });
    html = html.replace("</body>", `<script src="assets/index.js"></script>\n</body>`);
  }

  fs.writeFileSync(path.join(outDir, "index.html"), html);
  console.log(`[${new Date().toLocaleTimeString()}] Built index.html`);
}

// --- Build all ---
async function buildAll() {
  await buildGlobalAssets();
  await buildRootIndex();
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
