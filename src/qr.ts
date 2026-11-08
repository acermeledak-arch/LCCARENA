// Zero-dependency ISO/IEC 18004 QR Code SVG generator (Versions 1-6, ECC Level L, Byte mode).
// ponytail: Supports up to 134 UTF-8 bytes (covers all LAN URLs + tokens); returns '' above 134 bytes so UI falls back to copyable link.

const V_SPECS: Record<number, { dataBytes: number; ecPerBlock: number; blocks: number }> = {
  1: { dataBytes: 19, ecPerBlock: 7, blocks: 1 },
  2: { dataBytes: 34, ecPerBlock: 10, blocks: 1 },
  3: { dataBytes: 55, ecPerBlock: 15, blocks: 1 },
  4: { dataBytes: 80, ecPerBlock: 20, blocks: 1 },
  5: { dataBytes: 108, ecPerBlock: 26, blocks: 1 },
  6: { dataBytes: 136, ecPerBlock: 18, blocks: 2 },
};

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_EXP[i + 255] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
})();

function gfMul(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsRemainder(data: Uint8Array, ecLen: number): Uint8Array {
  let gen = [1];
  for (let i = 0; i < ecLen; i++) {
    const next = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j];
      next[j + 1] ^= gfMul(gen[j], GF_EXP[i]);
    }
    gen = next;
  }
  const rem = new Uint8Array(ecLen);
  for (const byte of data) {
    const factor = byte ^ rem[0];
    rem.copyWithin(0, 1);
    rem[ecLen - 1] = 0;
    for (let j = 0; j < ecLen; j++) rem[j] ^= gfMul(gen[j + 1], factor);
  }
  return rem;
}

export function encodeQrMatrix(text: string): boolean[][] | null {
  const payload = new TextEncoder().encode(text);
  let version = 0;
  for (let v = 1; v <= 6; v++) {
    if (payload.length + 2 <= V_SPECS[v].dataBytes) {
      version = v;
      break;
    }
  }
  if (!version) return null;

  const spec = V_SPECS[version];
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };
  pushBits(0b0100, 4); // Byte mode
  pushBits(payload.length, 8);
  for (const b of payload) pushBits(b, 8);
  const maxBits = spec.dataBytes * 8;
  for (let i = 0; i < 4 && bits.length < maxBits; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const dataWords = new Uint8Array(spec.dataBytes);
  for (let i = 0; i < bits.length / 8; i++) {
    let w = 0;
    for (let b = 0; b < 8; b++) w = (w << 1) | bits[i * 8 + b];
    dataWords[i] = w;
  }
  const pads = [0xec, 0x11];
  for (let i = bits.length / 8, p = 0; i < spec.dataBytes; i++, p ^= 1) dataWords[i] = pads[p];

  const blockLen = spec.dataBytes / spec.blocks;
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  for (let b = 0; b < spec.blocks; b++) {
    const slice = dataWords.subarray(b * blockLen, (b + 1) * blockLen);
    dataBlocks.push(slice);
    ecBlocks.push(rsRemainder(slice, spec.ecPerBlock));
  }
  const finalBytes: number[] = [];
  for (let i = 0; i < blockLen; i++) for (let b = 0; b < spec.blocks; b++) finalBytes.push(dataBlocks[b][i]);
  for (let i = 0; i < spec.ecPerBlock; i++) for (let b = 0; b < spec.blocks; b++) finalBytes.push(ecBlocks[b][i]);

  const size = 17 + version * 4;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setFn = (r: number, c: number, dark: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      grid[r][c] = dark;
      reserved[r][c] = true;
    }
  };

  const placeFinder = (top: number, left: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const onRing = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFn(top + dr, left + dc, inOuter && (onRing || inCore));
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  if (version >= 2) {
    const ar = size - 7;
    const ac = size - 7;
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        setFn(ar + dr, ac + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
      }
    }
  }

  for (let i = 8; i < size - 8; i++) {
    if (!reserved[6][i]) setFn(6, i, i % 2 === 0);
    if (!reserved[i][6]) setFn(i, 6, i % 2 === 0);
  }
  setFn(size - 8, 8, true); // Dark module

  for (let i = 0; i <= 8; i++) {
    if (!reserved[8][i]) reserved[8][i] = true;
    if (!reserved[i][8]) reserved[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][size - 1 - i] = true;
    if (i < 7) reserved[size - 1 - i][8] = true;
  }

  let bitIdx = 0;
  const totalBits = finalBytes.length * 8;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (const c of [right, right - 1]) {
        if (!reserved[r][c]) {
          const dark = bitIdx < totalBits ? ((finalBytes[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1) === 1 : false;
          grid[r][c] = dark;
          bitIdx++;
        }
      }
    }
    upward = !upward;
  }

  const maskFn = (m: number, r: number, c: number): boolean => {
    switch (m) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return ((((r * c) % 2) + ((r * c) % 3)) % 2) === 0;
      default: return ((((r + c) % 2) + ((r * c) % 3)) % 2) === 0;
    }
  };

  const applyFormat = (target: boolean[][], mask: number) => {
    const data = (0b01 << 3) | mask;
    let rem = data << 10;
    for (let i = 14; i >= 10; i--) if ((rem >> i) & 1) rem ^= 0x537 << (i - 10);
    const fmt = ((data << 10) | rem) ^ 0x5412;
    const bit = (n: number) => ((fmt >> n) & 1) === 1;

    const tlCols = [0, 1, 2, 3, 4, 5, 7, 8];
    for (let i = 0; i < 8; i++) target[8][tlCols[i]] = bit(14 - i);
    const tlRows = [7, 5, 4, 3, 2, 1, 0];
    for (let i = 0; i < 7; i++) target[tlRows[i]][8] = bit(6 - i);

    for (let i = 0; i < 7; i++) target[size - 1 - i][8] = bit(14 - i);
    for (let i = 0; i < 8; i++) target[8][size - 8 + i] = bit(7 - i);
  };

  let bestScore = Infinity;
  let bestGrid = grid;

  for (let m = 0; m < 8; m++) {
    const cand = grid.map((row, r) => row.map((v, c) => (reserved[r][c] ? v : v !== maskFn(m, r, c))));
    applyFormat(cand, m);
    let penalty = 0;
    for (let r = 0; r < size; r++) {
      let runR = 1;
      let runC = 1;
      for (let c = 1; c < size; c++) {
        runR = cand[r][c] === cand[r][c - 1] ? runR + 1 : 1;
        if (runR === 5) penalty += 3; else if (runR > 5) penalty += 1;
        runC = cand[c][r] === cand[c - 1][r] ? runC + 1 : 1;
        if (runC === 5) penalty += 3; else if (runC > 5) penalty += 1;
      }
    }
    if (penalty < bestScore) {
      bestScore = penalty;
      bestGrid = cand;
    }
  }
  return bestGrid;
}

export function renderQrSvg(text: string): string {
  const matrix = encodeQrMatrix(text);
  if (!matrix) return '';
  const n = matrix.length;
  const quiet = 4;
  const view = n + quiet * 2;
  let path = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) path += `M${c + quiet},${r + quiet}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${view} ${view}" shape-rendering="crispEdges" role="img" aria-label="QR Code"><rect width="${view}" height="${view}" fill="#ffffff"/><path d="${path}" fill="#090d16"/></svg>`;
}