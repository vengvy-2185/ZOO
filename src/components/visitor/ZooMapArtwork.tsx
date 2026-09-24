// Illustrated base map of the zoo grounds, drawn in the same 100 x 75
// coordinate space ZooMap uses for markers (x and y as % of the 4:3 box,
// with y scaled by 0.75). Pure SVG: crisp at every zoom level and no image
// upload needed. An admin can still replace it with a real map image
// (Admin → Settings → Branding → Map Image URL).

// Deterministic pseudo-random numbers, so server and client render the
// exact same trees (no hydration mismatch).
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

type Tree = { x: number; y: number; r: number; tone: number };

function buildTrees(): Tree[] {
  const rand = seeded(42);
  const trees: Tree[] = [];
  // Dense forest ring just inside the fence.
  for (let i = 0; i < 150; i++) {
    const side = i % 4;
    const t = rand();
    const depth = 1.5 + rand() * 4.5;
    const x = side === 0 ? 4 + t * 92 : side === 1 ? 96 - depth : side === 2 ? 4 + t * 92 : 4 + depth;
    const y = side === 0 ? 3 + depth * 0.75 : side === 2 ? 72 - depth * 0.75 : 3 + t * 66;
    // Keep the entrance at the bottom centre clear.
    if (side === 2 && x > 40 && x < 60) continue;
    trees.push({ x, y, r: 1.1 + rand() * 1.1, tone: rand() });
  }
  // Scattered groves between the zones.
  const groves = [
    [22, 29], [78, 27], [64, 44], [24, 58], [80, 58], [40, 13], [60, 12], [14, 42], [88, 42], [35, 52],
  ];
  for (const [gx, gy] of groves) {
    for (let i = 0; i < 7; i++) {
      trees.push({ x: gx + (rand() - 0.5) * 8, y: gy + (rand() - 0.5) * 5, r: 0.9 + rand() * 0.9, tone: rand() });
    }
  }
  return trees.sort((a, b) => a.y - b.y); // back-to-front so lower trees overlap upper ones
}

const TREES = buildTrees();
const TREE_TONES = ["#4F8F3A", "#5FA046", "#6BAE4E", "#3F7F32"];

// Main visitor loop + branches (cream path with a darker kerb underneath).
const ROADS = [
  "M50,74 C50,68 50,64 50,61",
  "M50,61 C38,60 24,58 18,50 C12,42 14,28 24,20 C34,12 50,11 62,12 C74,13 84,18 87,28 C90,38 86,50 78,56 C70,60 60,61 50,61",
  "M24,20 C30,24 34,26 37,28",
  "M87,28 C78,30 70,34 64,40",
  "M18,50 C26,48 32,46 38,44",
  "M78,56 C72,52 66,50 60,48",
  "M62,12 C60,18 57,22 56,26",
];

export function ZooMapArtwork() {
  return (
    <g>
      <defs>
        <linearGradient id="zm-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#CFE7B4" />
          <stop offset="100%" stopColor="#BFDDA0" />
        </linearGradient>
        <pattern id="zm-grass" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#D8ECBF" />
          <path d="M1 3l.3-.9M2.6 1.6l.25-.8" stroke="#BCDC9E" strokeWidth="0.25" strokeLinecap="round" />
        </pattern>
        <radialGradient id="zm-water" cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#B9E9F4" />
          <stop offset="70%" stopColor="#7CCFE2" />
          <stop offset="100%" stopColor="#5BB8D0" />
        </radialGradient>
        <filter id="zm-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0.35" stdDeviation="0.35" floodColor="#1F4D24" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Outside the fence */}
      <rect x="0" y="0" width="100" height="75" fill="url(#zm-ground)" />

      {/* Park grounds + hedge/fence */}
      <rect x="2.5" y="2" width="95" height="71" rx="7" fill="#6E9F4F" />
      <rect x="3.3" y="2.6" width="93.4" height="69.8" rx="6.4" fill="url(#zm-grass)" />
      <rect x="3.3" y="2.6" width="93.4" height="69.8" rx="6.4" fill="none" stroke="#A67C52" strokeWidth="0.25" strokeDasharray="0.8 0.5" />

      {/* Meadows (lighter patches) */}
      <ellipse cx="30" cy="22" rx="12" ry="7" fill="#E3F2CF" opacity="0.8" />
      <ellipse cx="74" cy="44" rx="11" ry="7" fill="#E3F2CF" opacity="0.8" />
      <ellipse cx="68" cy="20" rx="9" ry="5" fill="#E8D9A8" opacity="0.55" />

      {/* River from the lake to the east edge */}
      <path d="M52,35 C60,36 64,31 70,30 C78,29 84,34 97,32" fill="none" stroke="#5BB8D0" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M52,35 C60,36 64,31 70,30 C78,29 84,34 97,32" fill="none" stroke="#9EDDEB" strokeWidth="1.8" strokeLinecap="round" />

      {/* Lake */}
      <path
        d="M31,33 C33,27 42,25 49,27 C56,29 58,35 55,40 C52,45 43,47 36,45 C30,43 29,37 31,33Z"
        fill="url(#zm-water)"
        stroke="#4FA9C2"
        strokeWidth="0.35"
      />
      <path d="M36,32 q2,-0.8 4,0 M44,38 q2,-0.8 4,0 M38,41 q1.6,-0.7 3.2,0" stroke="#fff" strokeWidth="0.3" fill="none" opacity="0.7" strokeLinecap="round" />
      {/* Island */}
      <ellipse cx="46" cy="34" rx="2.6" ry="1.6" fill="#8FC06C" stroke="#E6D3A0" strokeWidth="0.3" />
      <circle cx="45.4" cy="33.4" r="0.9" fill="#4F8F3A" />

      {/* Roads: kerb, then surface */}
      {ROADS.map((d, i) => (
        <path key={`k${i}`} d={d} fill="none" stroke="#C7AB7A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {ROADS.map((d, i) => (
        <path key={`r${i}`} d={d} fill="none" stroke="#F6EBCF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      ))}

      {/* Bridge where the east branch path crosses the river */}
      <g transform="translate(80 30.6) rotate(-27.5)" filter="url(#zm-soft)">
        <rect x="-2.4" y="-1.25" width="4.8" height="2.5" rx="0.4" fill="#B98B5B" />
        <path d="M-1.6,-1.25v2.5M-0.5,-1.25v2.5M0.6,-1.25v2.5M1.7,-1.25v2.5" stroke="#8C6239" strokeWidth="0.18" />
        <path d="M-2.4,-1.25h4.8M-2.4,1.25h4.8" stroke="#6E4A2A" strokeWidth="0.3" />
      </g>

      {/* Entrance plaza + gate */}
      <circle cx="50" cy="62" r="4" fill="#F6EBCF" stroke="#C7AB7A" strokeWidth="0.35" />
      <circle cx="50" cy="62" r="1.4" fill="#7CCFE2" stroke="#4FA9C2" strokeWidth="0.2" />
      <g filter="url(#zm-soft)">
        <rect x="45.5" y="70.2" width="9" height="1.6" rx="0.4" fill="#8C6239" />
        <rect x="45.3" y="68.6" width="1.4" height="3.8" rx="0.3" fill="#6E4A2A" />
        <rect x="53.3" y="68.6" width="1.4" height="3.8" rx="0.3" fill="#6E4A2A" />
        <rect x="45" y="67.8" width="10" height="1.4" rx="0.5" fill="#176B3A" />
      </g>

      {/* Little buildings (café, shop, clinic) */}
      {[
        [58, 64, "#E76F51"],
        [41, 64.5, "#F4A261"],
        [30, 60, "#2A9D8F"],
        [70, 60, "#E9C46A"],
      ].map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`} filter="url(#zm-soft)">
          <rect x="-1.9" y="-1" width="3.8" height="2.4" rx="0.3" fill="#FFF8EA" />
          <path d="M-2.3,-0.9 L0,-2.5 L2.3,-0.9Z" fill={c as string} />
        </g>
      ))}

      {/* Rocks */}
      {[
        [72, 22], [26, 46], [83, 50], [18, 30],
      ].map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx="1.4" ry="0.9" fill="#A8A29A" />
          <ellipse cx={x - 0.3} cy={y - 0.25} rx="0.8" ry="0.45" fill="#C9C3BA" />
        </g>
      ))}

      {/* Trees */}
      {TREES.map((t, i) => (
        <g key={i} transform={`translate(${t.x.toFixed(2)} ${t.y.toFixed(2)})`}>
          <ellipse cx="0.25" cy={t.r * 0.55} rx={t.r * 0.95} ry={t.r * 0.4} fill="#1F4D24" opacity="0.18" />
          <circle r={t.r} fill={TREE_TONES[Math.floor(t.tone * TREE_TONES.length)]} />
          <circle cx={-t.r * 0.3} cy={-t.r * 0.3} r={t.r * 0.45} fill="#8CCB63" opacity="0.7" />
        </g>
      ))}

      {/* Flowers */}
      {[
        [48, 57, "#F28AB2"], [52.5, 57.5, "#F9D65C"], [35, 56, "#F28AB2"], [65, 55, "#F9D65C"],
        [28, 36, "#F9D65C"], [73, 38, "#F28AB2"], [58, 24, "#F28AB2"],
      ].map(([x, y, c], i) => (
        <circle key={i} cx={x as number} cy={y as number} r="0.45" fill={c as string} />
      ))}
    </g>
  );
}
