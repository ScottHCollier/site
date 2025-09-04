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

// Clean output dir
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

// --- Recursively get HTML files (exclude layout.html) ---
function getHtmlFiles(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) results = results.concat(getHtmlFiles(fullPath));
    else if (file.endsWith(".html") && file !== "layout.html") results.push(fullPath);
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

// --- Write global assets (CSS + bundled JS) ---
async function buildGlobalAssets() {
  // CSS
  if (fs.existsSync(globalCssFile)) {
    let css = fs.readFileSync(globalCssFile, "utf-8");
    if (minify) css = new CleanCSS().minify(css).styles;
    fs.writeFileSync(path.join(assetsDir, "style.css"), css);
    console.log(`[${new Date().toLocaleTimeString()}] Built style.css`);
  }

  // JS (bundle with esbuild)
  if (fs.existsSync(globalJsFile)) {
    await esbuild.build({
      entryPoints: [globalJsFile],
      bundle: true,
      minify,
      platform: "browser",
      format: "iife",
      outfile: path.join(assetsDir, "main.js"),
    });
    console.log(`[${new Date().toLocaleTimeString()}] Built main.js`);
  }
}

// --- Build a single page ---
async function buildPage(pageHtmlPath) {
  const filename = path.basename(pageHtmlPath); // flattened output
  const outPath = path.join(outDir, filename);

  let pageContent = fs.readFileSync(pageHtmlPath, "utf-8");

  // Layout support
  const layoutPath = findLayout(pageHtmlPath);
  if (layoutPath) {
    const layout = fs.readFileSync(layoutPath, "utf-8");
    const titleMatch = pageContent.match(/<!--\s*title:\s*(.*?)\s*-->/);
    const pageTitle = titleMatch ? titleMatch[1] : filename.replace(".html", "");
    pageContent = pageContent.replace(/<!--\s*title:.*?-->\s*/, "");
    pageContent = layout.replace("{{content}}", pageContent).replace("{{title}}", pageTitle);
  }

  let html = pageContent;

  // Inject global CSS + JS
  if (fs.existsSync(globalCssFile)) {
    html = html.replace("</head>", `<link rel="stylesheet" href="assets/style.css">\n</head>`);
  }
  if (fs.existsSync(globalJsFile)) {
    html = html.replace("</body>", `<script src="assets/main.js"></script>\n</body>`);
  }

  // Per-page CSS
  const pageCssFile = pageHtmlPath.replace(/\.html$/, ".css");
  if (fs.existsSync(pageCssFile)) {
    const cssName = path.basename(pageCssFile);
    let css = fs.readFileSync(pageCssFile, "utf-8");
    if (minify) css = new CleanCSS().minify(css).styles;
    fs.writeFileSync(path.join(assetsDir, cssName), css);
    html = html.replace("</head>", `<link rel="stylesheet" href="assets/${cssName}">\n</head>`);
  }

  // Per-page JS (bundle with esbuild)
  const pageJsFile = pageHtmlPath.replace(/\.html$/, ".js");
  if (fs.existsSync(pageJsFile)) {
    const jsName = path.basename(pageJsFile);
    await esbuild.build({
      entryPoints: [pageJsFile],
      bundle: true,
      minify,
      platform: "browser",
      format: "iife",
      outfile: path.join(assetsDir, jsName),
    });
    html = html.replace("</body>", `<script src="assets/${jsName}"></script>\n</body>`);
    console.log(`[${new Date().toLocaleTimeString()}] Built ${jsName}`);
  }

  // Minify HTML
  const finalHtml = minify
    ? await minifyHtml(html, {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeEmptyAttributes: true,
        minifyCSS: true,
        minifyJS: true,
      })
    : html;

  fs.writeFileSync(outPath, finalHtml);
  console.log(`[${new Date().toLocaleTimeString()}] Built ${pageHtmlPath} → ${outPath}`);
}

// --- Build all pages + assets ---
async function buildAll() {
  await buildGlobalAssets();
  const pages = getHtmlFiles(appDir);
  for (const page of pages) {
    await buildPage(page);
  }
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
