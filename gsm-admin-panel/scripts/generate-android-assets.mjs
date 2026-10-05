// ============================================================
//  generate-android-assets.mjs – ikona aplikacji i splash dla Androida
//
//  Źródło: znak marki z panelu (kafelek z literą „F” na gradiencie akcentu –
//  ten sam co w sidebarze, .sidebar-brand-mark). Litera to kontur glifu
//  „F” z fontu Space Grotesk Bold (font nagłówków panelu), zapisany jako
//  ścieżka – skrypt nie potrzebuje zainstalowanych fontów.
//
//  Generuje:
//   • adaptive icon (Android 8+): tło (gradient) + pierwszy plan (F) jako
//     wektory + warstwa monochrome (ikony tematyczne Android 13+),
//   • PNG ic_launcher / ic_launcher_round / ic_launcher_foreground (mdpi…xxxhdpi),
//   • splash.png (pion/poziom, wszystkie gęstości) – fallback dla starego API,
//   • resources/android-icon-preview.png – podgląd do sprawdzenia.
//
//  Uruchomienie (z folderu gsm-admin-panel):  node scripts/generate-android-assets.mjs
//  Zmiana logo: podmień FG_PATH / kolory poniżej i uruchom ponownie.
// ============================================================

import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const RES = path.resolve('android/app/src/main/res');

// Kolory z src/styles/tokens.css
const GRAD_FROM = '#7B7CFF';   // --accent-gradient (start)
const GRAD_TO = '#5253E8';     // --accent-gradient (koniec) = --accent-deep
const ACCENT = '#6465FF';      // --accent
const SPLASH_BG = '#11172B';   // --navy-deep (tło sidebara / górnego paska)

// Glif „F” (Space Grotesk 700, jednostki fontu 1000/em, oś Y w górę)
const F_POINTS = [[66, 0], [66, 700], [506, 700], [506, 580], [198, 580], [198, 411], [482, 411], [482, 291], [198, 291], [198, 0]];
const F_W = 506 - 66;
const F_H = 700;

/** Ścieżka F przeskalowana do wysokości `capH`, wyśrodkowana w kwadracie `box`. */
function fPath(box, capH) {
  const s = capH / F_H;
  const w = F_W * s;
  // optycznie: F jest „cięższe” z lewej, przesuwamy lekko w prawo
  const x0 = (box - w) / 2 + capH * 0.03;
  const y0 = (box - capH) / 2;
  const pts = F_POINTS.map(([x, y]) => [x0 + (x - 66) * s, y0 + (F_H - y) * s]);
  return 'M' + pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join('L') + 'Z';
}

// ---------- Adaptive icon: wektory (108×108 dp, strefa bezpieczna 66 dp) ----------
const ADAPTIVE_CAP = 30; // wysokość litery w dp – mieści się w kole maski

const vectorHeader = `<?xml version="1.0" encoding="utf-8"?>
<!-- Wygenerowano: scripts/generate-android-assets.mjs – nie edytuj ręcznie -->`;

const backgroundXml = `${vectorHeader}
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:aapt="http://schemas.android.com/aapt"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:pathData="M0,0h108v108h-108z">
        <aapt:attr name="android:fillColor">
            <gradient
                android:type="linear"
                android:startX="0" android:startY="0"
                android:endX="108" android:endY="108"
                android:startColor="${GRAD_FROM}"
                android:endColor="${GRAD_TO}" />
        </aapt:attr>
    </path>
</vector>
`;

const glyphXml = (color) => `${vectorHeader}
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="${color}"
        android:pathData="${fPath(108, ADAPTIVE_CAP)}" />
</vector>
`;

const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>
</adaptive-icon>
`;

const write = (rel, content) => {
  const file = path.join(RES, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  console.log('  ' + rel);
};

console.log('Wektory:');
write('drawable/ic_launcher_background.xml', backgroundXml);
write('drawable-v24/ic_launcher_foreground.xml', glyphXml('#FFFFFF'));
write('drawable/ic_launcher_monochrome.xml', glyphXml('#FFFFFF'));
write('mipmap-anydpi-v26/ic_launcher.xml', adaptiveXml);
write('mipmap-anydpi-v26/ic_launcher_round.xml', adaptiveXml);

// ---------- PNG (SVG → sharp) ----------
const gradientDef = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="${GRAD_FROM}"/><stop offset="1" stop-color="${GRAD_TO}"/></linearGradient></defs>`;

// Kafelek jak w sidebarze: zaokrąglony kwadrat (promień 30%) albo koło
const tileSvg = (size, shape) => {
  const r = shape === 'round' ? size / 2 : size * 0.3;
  const bg = shape === 'round'
    ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#g)"/>`
    : `<rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#g)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${gradientDef}${bg}
<path fill="#FFFFFF" d="${fPath(size, size * 0.42)}"/></svg>`;
};

const foregroundSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 108 108">
<path fill="#FFFFFF" d="${fPath(108, ADAPTIVE_CAP)}"/></svg>`;

const png = async (svg, rel, w = null, h = null) => {
  const file = path.join(RES, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  let img = sharp(Buffer.from(svg));
  if (w && h) img = img.resize(w, h);
  await img.png().toFile(file);
  console.log('  ' + rel);
};

// Starsze launchery (bez adaptive) – 48 dp; foreground PNG – 108 dp
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

console.log('Ikony PNG:');
for (const [d, k] of Object.entries(DENSITIES)) {
  const legacy = Math.round(48 * k);
  // Ikona legacy: kafelek z marginesem ~8% (jak w szablonie Material)
  const pad = Math.round(legacy * 0.08);
  const inner = legacy - pad * 2;
  const wrap = (shape) => `<svg xmlns="http://www.w3.org/2000/svg" width="${legacy}" height="${legacy}">
<g transform="translate(${pad},${pad})">${tileSvg(inner, shape).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g></svg>`;
  await png(wrap('square'), `mipmap-${d}/ic_launcher.png`);
  await png(wrap('round'), `mipmap-${d}/ic_launcher_round.png`);
  await png(foregroundSvg(Math.round(108 * k)), `mipmap-${d}/ic_launcher_foreground.png`);
}

// ---------- Splash (fallback dla starego API; Android 12+ używa motywu) ----------
const splashSvg = (w, h) => {
  const tile = Math.round(Math.min(w, h) * 0.22);
  const inner = tileSvg(tile, 'square').replace(/^<svg[^>]*>|<\/svg>$/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
<rect width="${w}" height="${h}" fill="${SPLASH_BG}"/>
<g transform="translate(${Math.round((w - tile) / 2)},${Math.round((h - tile) / 2)})">${inner}</g></svg>`;
};

const SPLASH = {
  'drawable': [480, 320],
  'drawable-port-mdpi': [320, 480], 'drawable-port-hdpi': [480, 800], 'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600], 'drawable-port-xxxhdpi': [1280, 1920],
  'drawable-land-mdpi': [480, 320], 'drawable-land-hdpi': [800, 480], 'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960], 'drawable-land-xxxhdpi': [1920, 1280],
};
console.log('Splash:');
for (const [dir, [w, h]] of Object.entries(SPLASH)) await png(splashSvg(w, h), `${dir}/splash.png`);

// ---------- Podgląd: legacy kwadrat, legacy koło, adaptive (squircle, widoczne 72 z 108 dp),
//            monochrome (ikony tematyczne), splash ----------
const P = 220;
const previewParts = [
  tileSvg(P, 'square'),
  tileSvg(P, 'round'),
  `<svg xmlns="http://www.w3.org/2000/svg" width="${P}" height="${P}" viewBox="18 18 72 72">${gradientDef}
   <path d="M54,18C77,18 90,31 90,54C90,77 77,90 54,90C31,90 18,77 18,54C18,31 31,18 54,18Z" fill="url(#g)"/>
   <path fill="#FFFFFF" d="${fPath(108, ADAPTIVE_CAP)}"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="${P}" height="${P}" viewBox="18 18 72 72">
   <circle cx="54" cy="54" r="36" fill="#DDE3EA"/><path fill="#3B4252" d="${fPath(108, ADAPTIVE_CAP)}"/></svg>`,
];
const composites = [];
for (let i = 0; i < previewParts.length; i++) {
  composites.push({ input: await sharp(Buffer.from(previewParts[i])).png().toBuffer(), left: 20 + i * (P + 20), top: 20 });
}
composites.push({ input: await sharp(Buffer.from(splashSvg(147, 220))).png().toBuffer(), left: 20 + 4 * (P + 20), top: 20 });
mkdirSync('resources', { recursive: true });
await sharp({ create: { width: 20 + 4 * (P + 20) + 167, height: P + 40, channels: 4, background: '#F4F5F7' } })
  .composite(composites).png().toFile('resources/android-icon-preview.png');
console.log('Podgląd: resources/android-icon-preview.png');

// Kolory używane przez motyw splash (styles.xml)
write('values/fonexpert_colors.xml', `<?xml version="1.0" encoding="utf-8"?>
<!-- Wygenerowano: scripts/generate-android-assets.mjs – kolory marki (tokens.css) -->
<resources>
    <color name="fx_splash_background">${SPLASH_BG}</color>
    <color name="fx_brand_accent">${ACCENT}</color>
</resources>
`);
write('values/ic_launcher_background.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${ACCENT}</color>
</resources>
`);
console.log('Gotowe.');
