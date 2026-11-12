// Escanea public/media y genera public/manifest.json con la lista de archivos.
import { readdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";

const ROOT = new URL("../public/", import.meta.url).pathname;
const TYPES = {
  images: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"],
  videos: [".mp4", ".webm", ".mov", ".m4v"],
  music: [".mp3", ".m4a", ".aac", ".ogg", ".wav", ".flac"],
};

async function walk(dir) {
  let out = [];
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) out = out.concat(await walk(full));
    else out.push(full);
  }
  return out;
}

const manifest = {};
for (const [type, exts] of Object.entries(TYPES)) {
  const files = await walk(join(ROOT, "media", type));
  manifest[type] = files
    .filter((f) => exts.includes(extname(f).toLowerCase()))
    .map((f) => "/" + f.slice(ROOT.length).split("\\").join("/"))
    .map((p) => p.split("/").map(encodeURIComponent).join("/"))
    .sort();
}

await writeFile(join(ROOT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(
  `manifest.json: ${manifest.images.length} imagenes, ${manifest.videos.length} videos, ${manifest.music.length} canciones`
);
