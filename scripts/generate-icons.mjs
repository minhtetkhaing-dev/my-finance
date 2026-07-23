import sharp from "sharp";

// ============================================================================
// My Finance app icon set
// Emblem: rising bar chart (growth/finance) + upward trend + sparkle (clarity)
// Palette matches the richer theme (violet primary, amber accent).
// ============================================================================

// Shared SVG for the emblem, drawn in a 100x100 box.
function emblem({ monochrome = false } = {}) {
  const fill = "#FFFFFF";
  const fillOpacity = monochrome ? 1 : 0.92;
  const arrowStroke = "#FFFFFF";
  const sparkleFill = monochrome ? "#FFFFFF" : "#FBBF24";
  return `
    <defs>
      <linearGradient id="bars" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="${fill}" stop-opacity="${fillOpacity}"/>
        <stop offset="1" stop-color="${fill}"/>
      </linearGradient>
    </defs>
    <!-- rising bars -->
    <rect x="30" y="50" width="10.5" height="22" rx="4.5" fill="url(#bars)"/>
    <rect x="44.75" y="38" width="10.5" height="34" rx="4.5" fill="url(#bars)"/>
    <rect x="59.5" y="25" width="10.5" height="47" rx="4.5" fill="url(#bars)"/>
    <!-- upward trend arrow -->
    <path d="M 26 46 L 40 33 L 52 40 L 70 21"
          fill="none" stroke="${arrowStroke}" stroke-width="5.2"
          stroke-linecap="round" stroke-linejoin="round"/>
    <!-- arrow head -->
    <path d="M 62 19 L 72 18.5 L 71 28.5"
          fill="none" stroke="${arrowStroke}" stroke-width="5.2"
          stroke-linecap="round" stroke-linejoin="round"/>
    <!-- clarity sparkle -->
    <path d="M 76 33 L 77.6 38 L 82.5 39.6 L 77.6 41.2 L 76 46 L 74.4 41.2 L 69.5 39.6 L 74.4 38 Z"
          fill="${sparkleFill}"/>
  `;
}

// Background gradient + ambient glow orb (matches app's orb aesthetic).
function bg(size) {
  return `
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7C3AED"/>
        <stop offset="0.55" stop-color="#6320D6"/>
        <stop offset="1" stop-color="#4516A0"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#C4A8FF" stop-opacity="0.55"/>
        <stop offset="1" stop-color="#C4A8FF" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#bg)"/>
    <circle cx="${size * 0.8}" cy="${size * 0.22}" r="${size * 0.42}" fill="url(#glow)"/>
    <circle cx="${size * 0.14}" cy="${size * 0.86}" r="${size * 0.3}" fill="url(#glow)" opacity="0.5"/>
  `;
}

// Full app icon: gradient background + emblem centered (~62% of canvas).
function fullIcon(size) {
  const box = size * 0.62;
  const off = (size - box) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg(size)}
    <g transform="translate(${off}, ${off}) scale(${box / 100})">${emblem()}</g>
  </svg>`;
}

// Emblem only on transparent background (for splash + android foreground).
function emblemOnly(size, fraction, monochrome = false) {
  const box = size * fraction;
  const off = (size - box) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <g transform="translate(${off}, ${off}) scale(${box / 100})">${emblem({ monochrome })}</g>
  </svg>`;
}

// Android adaptive background layer (gradient + glow, full-bleed).
function androidBg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg(size)}
  </svg>`;
}

const OUT = "assets";

const jobs = [
  ["icon.png", sharp(Buffer.from(fullIcon(1024))).png(), 1024],
  ["favicon.png", sharp(Buffer.from(fullIcon(256))).png().resize(48), 48],
  ["splash-icon.png", sharp(Buffer.from(emblemOnly(1024, 0.62))).png(), 1024],
  ["android-icon-foreground.png", sharp(Buffer.from(emblemOnly(512, 0.5))).png(), 512],
  ["android-icon-background.png", sharp(Buffer.from(androidBg(512))).png(), 512],
  ["android-icon-monochrome.png", sharp(Buffer.from(emblemOnly(432, 0.5, true))).png(), 432],
];

for (const [name, pipeline] of jobs) {
  await pipeline.toFile(`${OUT}/${name}`);
  console.log("wrote", name);
}
console.log("done");
