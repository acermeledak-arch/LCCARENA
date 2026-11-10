// SVG Figural Renderer for Simulasi CPNS (TIU Figural: Analogi, Ketidaksamaan, Serial)
// Converts semantic shape descriptors into crisp, scalable <svg> graphics (never raw text symbols).

function regularPolygonPoints(sides, cx, cy, r, startAngleDeg = -90) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const rad = ((startAngleDeg + (360 * i) / sides) * Math.PI) / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

function renderSingleToken(token, cx, cy, size) {
  const r = size * 0.38;
  const stroke = 'currentColor';
  const fillSolid = 'currentColor';
  const sw = 3.2;

  switch (token) {
    case 'circle-open':
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${sw}" />`;
    case 'circle-fill':
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fillSolid}" stroke="${stroke}" stroke-width="${sw}" />`;
    case 'circle-double':
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${sw}" /><circle cx="${cx}" cy="${cy}" r="${(r * 0.62).toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="${sw * 0.85}" />`;

    case 'half-circle-left': {
      const id = `hl-${cx}-${cy}`;
      return `<path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z" fill="${fillSolid}" data-id="${id}" /><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${sw}" /><line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="${stroke}" stroke-width="${sw * 0.8}" />`;
    }
    case 'half-circle-right':
      return `<path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z" fill="${fillSolid}" /><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${sw}" /><line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="${stroke}" stroke-width="${sw * 0.8}" />`;
    case 'half-circle-bottom':
      return `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy} Z" fill="${fillSolid}" /><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${sw}" /><line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${stroke}" stroke-width="${sw * 0.8}" />`;
    case 'half-circle-top':
      return `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z" fill="${fillSolid}" /><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${sw}" /><line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${stroke}" stroke-width="${sw * 0.8}" />`;

    case 'square-open':
      return `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
    case 'square-fill':
      return `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" fill="${fillSolid}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
    case 'square-rounded':
      return `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" rx="${(r * 0.35).toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="${sw}" />`;
    case 'square-double': {
      const r2 = r * 0.62;
      return `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" fill="none" stroke="${stroke}" stroke-width="${sw}" /><rect x="${cx - r2}" y="${cy - r2}" width="${r2 * 2}" height="${r2 * 2}" fill="none" stroke="${stroke}" stroke-width="${sw * 0.8}" />`;
    }
    case 'square-nested': {
      const r2 = r * 0.52;
      return `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" fill="none" stroke="${stroke}" stroke-width="${sw}" /><rect x="${cx - r2}" y="${cy - r2}" width="${r2 * 2}" height="${r2 * 2}" fill="${fillSolid}" />`;
    }

    case 'diamond-open':
      return `<polygon points="${regularPolygonPoints(4, cx, cy, r * 1.12, -90)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
    case 'diamond-fill':
      return `<polygon points="${regularPolygonPoints(4, cx, cy, r * 1.12, -90)}" fill="${fillSolid}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;

    case 'tri-open':
      return `<polygon points="${regularPolygonPoints(3, cx, cy + r * 0.12, r * 1.12, -90)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
    case 'tri-fill':
      return `<polygon points="${regularPolygonPoints(3, cx, cy + r * 0.12, r * 1.12, -90)}" fill="${fillSolid}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
    case 'tri-down-open':
      return `<polygon points="${regularPolygonPoints(3, cx, cy - r * 0.12, r * 1.12, 90)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
    case 'tri-down-fill':
      return `<polygon points="${regularPolygonPoints(3, cx, cy - r * 0.12, r * 1.12, 90)}" fill="${fillSolid}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
    case 'tri-right-fill':
      return `<polygon points="${regularPolygonPoints(3, cx - r * 0.12, cy, r * 1.12, 0)}" fill="${fillSolid}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
    case 'tri-left-fill':
      return `<polygon points="${regularPolygonPoints(3, cx + r * 0.12, cy, r * 1.12, 180)}" fill="${fillSolid}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;

    case 'rtri-br':
      return `<polygon points="${cx + r},${cy - r} ${cx + r},${cy + r} ${cx - r},${cy + r}" fill="${fillSolid}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
    case 'rtri-bl':
      return `<polygon points="${cx - r},${cy - r} ${cx + r},${cy + r} ${cx - r},${cy + r}" fill="${fillSolid}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
    case 'rtri-tl':
      return `<polygon points="${cx - r},${cy - r} ${cx + r},${cy - r} ${cx - r},${cy + r}" fill="${fillSolid}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
    case 'rtri-tr':
      return `<polygon points="${cx - r},${cy - r} ${cx + r},${cy - r} ${cx + r},${cy + r}" fill="${fillSolid}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;

    case 'poly-3':
      return `<polygon points="${regularPolygonPoints(3, cx, cy + r * 0.1, r * 1.12, -90)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
    case 'poly-4':
      return `<rect x="${cx - r * 0.9}" y="${cy - r * 0.9}" width="${r * 1.8}" height="${r * 1.8}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
    case 'poly-5':
      return `<polygon points="${regularPolygonPoints(5, cx, cy + r * 0.05, r * 1.08, -90)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
    case 'poly-6':
      return `<polygon points="${regularPolygonPoints(6, cx, cy, r * 1.08, -90)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
    case 'poly-7':
      return `<polygon points="${regularPolygonPoints(7, cx, cy, r * 1.08, -90)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
    case 'poly-8':
      return `<polygon points="${regularPolygonPoints(8, cx, cy, r * 1.08, -90)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;

    case 'arrow-up':
    case 'arrow-right':
    case 'arrow-down':
    case 'arrow-left':
    case 'arrow-up-right':
    case 'arrow-down-right':
    case 'arrow-down-left':
    case 'arrow-up-left': {
      const degMap = {
        'arrow-up': 0,
        'arrow-up-right': 45,
        'arrow-right': 90,
        'arrow-down-right': 135,
        'arrow-down': 180,
        'arrow-down-left': 225,
        'arrow-left': 270,
        'arrow-up-left': 315,
      };
      const deg = degMap[token] ?? 0;
      const len = r * 1.05;
      const head = r * 0.52;
      return `<g transform="rotate(${deg} ${cx} ${cy})">
        <line x1="${cx}" y1="${cy + len}" x2="${cx}" y2="${cy - len * 0.85}" stroke="${stroke}" stroke-width="${sw * 1.15}" stroke-linecap="round" />
        <polyline points="${cx - head},${cy - len * 0.25} ${cx},${cy - len} ${cx + head},${cy - len * 0.25}" fill="none" stroke="${stroke}" stroke-width="${sw * 1.15}" stroke-linecap="round" stroke-linejoin="round" />
      </g>`;
    }

    case 'bold-arrow-up':
    case 'bold-arrow-down':
    case 'bold-arrow-left':
    case 'bold-arrow-right': {
      const degMap = {
        'bold-arrow-up': 0,
        'bold-arrow-right': 90,
        'bold-arrow-down': 180,
        'bold-arrow-left': 270,
      };
      const deg = degMap[token] ?? 0;
      const s = r * 1.05;
      return `<g transform="rotate(${deg} ${cx} ${cy})">
        <polygon points="${cx},${cy - s} ${cx + s * 0.85},${cy - s * 0.05} ${cx + s * 0.36},${cy - s * 0.05} ${cx + s * 0.36},${cy + s} ${cx - s * 0.36},${cy + s} ${cx - s * 0.36},${cy - s * 0.05} ${cx - s * 0.85},${cy - s * 0.05}" fill="${fillSolid}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round" />
      </g>`;
    }

    default:
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${sw}" />`;
  }
}

export function renderFiguralBoxSvg(tokens, { width = 128, height = 76 } = {}) {
  const list = Array.isArray(tokens) ? tokens : [tokens];
  const n = list.length;
  const cellW = width / Math.max(1, n);
  const itemSize = Math.min(height * 0.82, cellW * 0.88);

  const shapes = list
    .map((tok, idx) => {
      const cx = cellW * idx + cellW / 2;
      const cy = height / 2;
      return renderSingleToken(tok, cx, cy, itemSize);
    })
    .join('');

  return `<svg class="figural-svg-box" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Gambar Figural">${shapes}</svg>`;
}

function renderQuestionMarkBox({ width = 110, height = 76 } = {}) {
  return `<svg class="figural-svg-box figural-qbox" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Tanda Tanya">
    <rect x="6" y="6" width="${width - 12}" height="${height - 12}" rx="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="6 5" opacity="0.7" />
    <text x="${width / 2}" y="${height / 2 + 9}" text-anchor="middle" font-size="28" font-weight="900" fill="currentColor">?</text>
  </svg>`;
}

export function renderFiguralStemHtml(input) {
  const figural = input?.figural || input;
  if (!figural || !Array.isArray(figural.stem) || figural.stem.length === 0) {
    return '';
  }

  if (figural.kind === 'analogy' && figural.stem.length === 3) {
    const [b1, b2, b3] = figural.stem;
    return `
      <div class="figural-stem-stage" aria-label="Diagram Analogi Figural">
        <div class="figural-pair">
          <div class="figural-cell">${renderFiguralBoxSvg(b1, { width: 120, height: 74 })}</div>
          <div class="figural-arrow">→</div>
          <div class="figural-cell">${renderFiguralBoxSvg(b2, { width: 120, height: 74 })}</div>
        </div>
        <div class="figural-sep">::</div>
        <div class="figural-pair">
          <div class="figural-cell">${renderFiguralBoxSvg(b3, { width: 120, height: 74 })}</div>
          <div class="figural-arrow">→</div>
          <div class="figural-cell figural-target">${renderQuestionMarkBox({ width: 110, height: 74 })}</div>
        </div>
      </div>
    `;
  }

  // Serial Figural
  const boxes = figural.stem
    .map(
      (b, idx) => `
      <div class="figural-cell">
        <div class="figural-step-num">${idx + 1}</div>
        ${renderFiguralBoxSvg(b, { width: 114, height: 72 })}
      </div>
      <div class="figural-arrow">→</div>
    `,
    )
    .join('');

  return `
    <div class="figural-stem-stage" aria-label="Deret Gambar Figural">
      ${boxes}
      <div class="figural-cell figural-target">
        <div class="figural-step-num">${figural.stem.length + 1}</div>
        ${renderQuestionMarkBox({ width: 104, height: 72 })}
      </div>
    </div>
  `;
}

export function renderFiguralOptionHtml(input, optionKey, optionText) {
  const figural = input?.figural || input;
  const tokens = figural?.options?.[optionKey];
  if (!tokens || !Array.isArray(tokens)) {
    return `<span>${optionText}</span>`;
  }
  const hasVerbalLabel = /[a-zA-Z]{3,}/.test(optionText || '');
  return `
    <div class="figural-opt-wrap">
      ${renderFiguralBoxSvg(tokens, { width: 124, height: 66 })}
      ${hasVerbalLabel ? `<span class="figural-opt-caption">${optionText}</span>` : ''}
    </div>
  `;
}
