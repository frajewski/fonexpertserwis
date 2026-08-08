import sharp from "sharp";
import path from "node:path";
import { existsSync } from "node:fs";

const input = path.resolve("public/logo.png");
const output = path.resolve("public");

if (!existsSync(input)) {
  console.error("Brak pliku public/logo.png");
  process.exit(1);
}

async function createIcon(size, filename) {
  await sharp(input)
    .resize(size, size, {
      fit: "contain",
      background: "#ffffff",
    })
    .flatten({ background: "#ffffff" })
    .png()
    .toFile(path.join(output, filename));

  console.log(`Utworzono public/${filename}`);
}

await createIcon(192, "pwa-192x192.png");
await createIcon(512, "pwa-512x512.png");
await createIcon(180, "apple-touch-icon.png");

console.log("Gotowe.");
