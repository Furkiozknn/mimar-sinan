// @sim-begin
// ---------------------------------------------------------------------------
// Structural simulation: masonry pieces on a grid, thrust vectors, middle-third rule.
// Pure functions, no DOM, no Three.js, so the same code runs in the page, in the bot and in the Node test.
// Units: 1 cell = 3 m. Weights are in "stone units"; a pier weighs 6.
// ---------------------------------------------------------------------------
const PT = {
  pier:     { cost: 4, h: 2.0, weight: 6,  cap: 56, layer: 'ground', support: true },
  wall:     { cost: 2, h: 1.0, weight: 4,  cap: 32, layer: 'ground', support: true, helper: 0.3 },
  buttress: { cost: 3, h: 1.5, weight: 5,  cap: 0,  layer: 'ground', helper: 0.6 },
  minaret:  { cost: 6, h: 7.0, weight: 10, cap: 30, layer: 'ground', support: true, lone: true },
  tower:    { cost: 3, h: 0.9, weight: 6,  layer: 'top' },
  arch:     { cost: 3, weight: 4, layer: 'roof' },
  dome:     { layer: 'roof' },  // cost 3*s*s, weight 4*s*s
  half:     { layer: 'roof' },  // cost 2*s*s, weight 2*s*s
};
const ARCH_THRUST = 0.30;                       // horizontal thrust of a semicircular arch per end, as a share of its weight
const HALF_THRUST = 0.8;                        // a half-dome's outer thrust relative to a full dome's corner share (it is lower and spreads along its edge)
const HALF_TRANSFER = 0.15;                     // share of the main-dome thrust a half-dome absorbs that reaches each of its outer supports
const CHAIN_DECAY = 0.8;                        // stepped buttresses: each further helper in a line counts a little less
const domeK = s => 0.08 * s + 0.10;             // outward thrust share of a dome's weight: bigger domes are flatter and push harder
const halfDepth = s => Math.max(1, Math.floor(s / 2));
function pieceCost(p) { return p.t === 'dome' ? 3 * p.s * p.s : p.t === 'half' ? 2 * p.s * p.s : PT[p.t].cost; }
function pieceWeight(p) { return p.t === 'dome' ? 4 * p.s * p.s : p.t === 'half' ? 2 * p.s * p.s : PT[p.t].weight; }
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const key = (x, z) => x + ',' + z;

// Cells occupied by a piece: ground / top pieces take one cell, roof pieces cover several.
function footprint(p) {
  const out = [];
  if (p.t === 'dome') { for (let i = 0; i < p.s; i++) for (let j = 0; j < p.s; j++) out.push([p.x + i, p.z + j]); }
  else if (p.t === 'half') { const d = halfDepth(p.s), r = p.r & 3; const w = r & 1 ? d : p.s, h = r & 1 ? p.s : d; for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) out.push([p.x + i, p.z + j]); }
  else out.push([p.x, p.z]);
  return out;
}
// Support cells of a roof piece, in the order the sim expects.
function archEnds(p) { return (p.r & 1) ? [[p.x, p.z - 1], [p.x, p.z + 1]] : [[p.x - 1, p.z], [p.x + 1, p.z]]; }
// A half-dome's flat edge faces its "dome direction" (r: 0 -z, 1 -x, 2 +z, 3 +x); the flat supports sit one cell outside it.
function halfInfo(p) {
  const d = halfDepth(p.s), r = p.r & 3, s = p.s;
  const dir = [[0, -1], [-1, 0], [0, 1], [1, 0]][r];
  let flat, outer, centre; // flat supports (shared with the main dome), outer supports, centre of the flat edge
  if (r === 0) { flat = [[p.x, p.z - 1], [p.x + s - 1, p.z - 1]]; outer = [[p.x, p.z + d - 1], [p.x + s - 1, p.z + d - 1]]; centre = [p.x + (s - 1) / 2, p.z - 1]; }
  else if (r === 2) { flat = [[p.x, p.z + d], [p.x + s - 1, p.z + d]]; outer = [[p.x, p.z], [p.x + s - 1, p.z]]; centre = [p.x + (s - 1) / 2, p.z + d]; }
  else if (r === 1) { flat = [[p.x - 1, p.z], [p.x - 1, p.z + s - 1]]; outer = [[p.x + d - 1, p.z], [p.x + d - 1, p.z + s - 1]]; centre = [p.x - 1, p.z + (s - 1) / 2]; }
  else { flat = [[p.x + d, p.z], [p.x + d, p.z + s - 1]]; outer = [[p.x, p.z], [p.x, p.z + s - 1]]; centre = [p.x + d, p.z + (s - 1) / 2]; }
  return { flat, outer, centre, dir, depth: d };
}
function domeCorners(p) { const e = p.s - 1; return [[p.x, p.z], [p.x + e, p.z], [p.x, p.z + e], [p.x + e, p.z + e]]; }
function domePerimeter(p) { const e = p.s - 1, out = []; for (let i = 0; i < p.s; i++) for (let j = 0; j < p.s; j++) if (i === 0 || j === 0 || i === e || j === e) out.push([p.x + i, p.z + j]); return out; }

// Placement validation: returns null when the piece may be placed, else a reason key.
function canPlace(level, pieces, p) {
  const pt = PT[p.t]; if (!pt) return 'badPiece';
  const fp = footprint(p);
  for (const [x, z] of fp) if (x < 0 || z < 0 || x >= level.grid[0] || z >= level.grid[1]) return 'offGrid';
  const ground = new Map(), top = new Map(), roof = new Map();
  for (const q of pieces) { const l = PT[q.t].layer; for (const [x, z] of footprint(q)) (l === 'ground' ? ground : l === 'top' ? top : roof).set(key(x, z), q); }
  if (pt.layer === 'ground') {
    if (ground.has(key(p.x, p.z))) return 'occupied';
    if (level.windows && level.windows.some(([x, z]) => x === p.x && z === p.z)) return 'window';
    if (pt.lone && roof.has(key(p.x, p.z))) return 'occupied';
  } else if (pt.layer === 'top') {
    const g = ground.get(key(p.x, p.z)); if (!g || g.t !== 'pier') return 'needsPier';
    if (top.has(key(p.x, p.z))) return 'occupied';
  } else {
    for (const [x, z] of fp) { if (roof.has(key(x, z))) return 'occupied'; const g = ground.get(key(x, z)); if (g && g.t === 'minaret') return 'occupied'; }
  }
  let cost = pieceCost(p); for (const q of pieces) cost += pieceCost(q);
  if (cost > level.budget) return 'budget';
  return null;
}

// The simulation. quake: horizontal ground acceleration as a share of g (0 = none). Returns per-piece results and a summary.
function simulate(level, pieces, quake = 0) {
  const ground = new Map(), roofAt = new Map(), top = new Map();
  for (const q of pieces) { const l = PT[q.t].layer; for (const [x, z] of footprint(q)) (l === 'ground' ? ground : l === 'top' ? top : roofAt).set(key(x, z), q); }
  const res = new Map(); // piece -> { stress, status, reason, N, H:[x,z], e, limit, dir }
  const sup = new Map(); // support piece -> accumulator
  const supportAt = (x, z) => { const g = ground.get(key(x, z)); return g && PT[g.t].support ? g : null; };
  const acc = g => { let a = sup.get(g); if (!a) { a = { V: 0, Hx: 0, Hz: 0, loads: [] }; sup.set(g, a); } return a; };
  const addLoad = (g, V, tx, tz, from) => { const a = acc(g); a.V += V; a.Hx += tx; a.Hz += tz; a.loads.push({ from, V, tx, tz }); };
  const fail = (p, reason) => res.set(p, { stress: 1.5, status: 'fail', reason });
  for (const p of pieces) if (!res.has(p)) res.set(p, { stress: 0, status: 'ok' });

  // 1. roof pieces push on their supports
  const domeSupports = new Map();
  for (const p of pieces) {
    if (p.t === 'arch') {
      const ends = archEnds(p).map(([x, z]) => supportAt(x, z));
      if (!ends[0] || !ends[1]) { fail(p, 'unsupported'); continue; }
      if (PT[ends[0].t].h !== PT[ends[1].t].h) { fail(p, 'uneven'); continue; }
      const W = pieceWeight(p), ax = (p.r & 1) ? 0 : 1, az = (p.r & 1) ? 1 : 0;
      addLoad(ends[0], W / 2, -ax * ARCH_THRUST * W, -az * ARCH_THRUST * W, p);
      addLoad(ends[1], W / 2, ax * ARCH_THRUST * W, az * ARCH_THRUST * W, p);
    } else if (p.t === 'dome') {
      const corners = domeCorners(p).map(([x, z]) => supportAt(x, z));
      if (corners.some(c => !c)) { fail(p, 'unsupported'); continue; }
      const h = PT[corners[0].t].h;
      if (corners.some(c => PT[c.t].h !== h)) { fail(p, 'uneven'); continue; }
      if (p.s >= 3 && h < 2) { fail(p, 'needsPiers'); continue; }
      const sups = []; for (const [x, z] of domePerimeter(p)) { const g = supportAt(x, z); if (g && PT[g.t].h === h) sups.push(g); }
      domeSupports.set(p, sups);
      const W = pieceWeight(p), T = W * domeK(p.s), cx = p.x + (p.s - 1) / 2, cz = p.z + (p.s - 1) / 2;
      for (const g of sups) { let dx = g.x - cx, dz = g.z - cz; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; addLoad(g, W / sups.length, dx * T / sups.length, dz * T / sups.length, p); }
    } else if (p.t === 'half') {
      const hi = halfInfo(p);
      const flat = hi.flat.map(([x, z]) => supportAt(x, z)), outer = hi.outer.map(([x, z]) => supportAt(x, z));
      if (!flat[0] || !flat[1] || !outer[0] || !outer[1]) { fail(p, 'unsupported'); continue; }
      if (PT[flat[0].t].h !== PT[flat[1].t].h) { fail(p, 'uneven'); continue; }
      if (p.s >= 3 && PT[flat[0].t].h < 2) { fail(p, 'needsPiers'); continue; }
      const W = pieceWeight(p), T = HALF_THRUST * 2 * W * domeK(p.s) / 4; // each outer support takes most of what a full dome's corner would
      let axial = 0;
      for (let i = 0; i < 2; i++) { const g = outer[i]; let dx = g.x - hi.centre[0], dz = g.z - hi.centre[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; axial += T * (dx * -hi.dir[0] + dz * -hi.dir[1]); addLoad(g, W / 4, dx * T, dz * T, p); }
      // the flat edge pushes back into the main dome with the axial share of the outer thrusts
      for (let i = 0; i < 2; i++) addLoad(flat[i], W / 4, hi.dir[0] * axial / 2, hi.dir[1] * axial / 2, p);
      p._axial = axial / 2;
    }
  }
  // 1b. a half-dome relieves the main dome's piers; what it absorbs travels down through its shell to its outer supports
  for (const p of pieces) if (p.t === 'half' && res.get(p).status === 'ok') {
    const hi = halfInfo(p);
    let absorbed = 0;
    for (const [x, z] of hi.flat) { const g = supportAt(x, z); const a = sup.get(g); if (!a) continue;
      let push = 0; for (const l of a.loads) if (l.from.t === 'dome') push += -(l.tx * hi.dir[0] + l.tz * hi.dir[1]); // dome thrust pointing away from the half-dome's dome direction
      absorbed += Math.max(0, Math.min(push, p._axial)); }
    for (const [x, z] of hi.outer) { const g = supportAt(x, z); if (!g) continue; addLoad(g, 0, -hi.dir[0] * absorbed * HALF_TRANSFER, -hi.dir[1] * absorbed * HALF_TRANSFER, p); }
  }
  // 2. every support: weight, helpers, thrust, quake -> eccentricity against the middle third
  let worst = 0, failed = false, reasons = [];
  const quakeDirs = quake > 0 ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : [[0, 0]];
  for (const g of pieces) {
    if (PT[g.t].layer !== 'ground') continue;
    const pt = PT[g.t];
    if (!pt.support) { // buttresses carry nothing on their own
      const r = res.get(g); r.helper = true; continue;
    }
    const a = sup.get(g) || { V: 0, Hx: 0, Hz: 0, loads: [] };
    const tw = top.get(key(g.x, g.z)); const towerW = tw ? PT.tower.weight : 0;
    const helpers = []; let helperW = 0, helperM = 0;
    // attached walls and buttresses in each direction; a line of them acts as a stepped buttress
    if (g.t !== 'minaret') for (const [ux, uz] of DIRS) { let k = 0, f = 1; for (let i = 1; i <= 3; i++) { const n = ground.get(key(g.x + ux * i, g.z + uz * i)); if (!n || !PT[n.t].helper) break; k += PT[n.t].helper * f; helperW += PT[n.t].weight * f; helperM += PT[n.t].weight * PT[n.t].h / 2 * f; f *= CHAIN_DECAY; } if (k > 0) helpers.push({ u: [ux, uz], k }); }
    const N = pt.weight + a.V + towerW + helperW;
    let worstR = 0, worstDir = [0, 0], worstE = 0, worstLimit = pt.h / 6, Hq = [0, 0];
    for (const [qx, qz] of quakeDirs) {
      const Mq = g.t === 'minaret' ? 0 : quake * (a.V * pt.h + pt.weight * pt.h / 2 + towerW * (pt.h + 0.45) + helperM); // minarets are cramped with iron and sway instead
      const Mx = a.Hx * pt.h + qx * Mq, Mz = a.Hz * pt.h + qz * Mq;
      const M = Math.hypot(Mx, Mz); const dx = M > 1e-9 ? Mx / M : 0, dz = M > 1e-9 ? Mz / M : 0;
      // helpers on the side the thrust pushes toward widen the section (an attached wall or buttress takes the thrust);
      // helpers on the other side only add weight
      let plus = 0.5; const minus = 0.5;
      for (const hp of helpers) { const d = hp.u[0] * dx + hp.u[1] * dz; if (d > 0) plus += hp.k * d; }
      const limit = (plus + minus) / 6 + (plus - minus) / 2;
      const e = M / N, r = e / limit;
      if (r > worstR) { worstR = r; worstDir = [dx, dz]; worstE = e; worstLimit = limit; Hq = [qx, qz]; }
    }
    const crush = (N - helperW) / pt.cap; // attached helpers stand on their own footing
    const stress = Math.max(worstR, crush);
    const r = res.get(g);
    Object.assign(r, { stress, N, H: [a.Hx, a.Hz], e: worstE, limit: worstLimit, dir: worstDir, crush, ecc: worstR, quakeDir: Hq, loads: a.loads });
    if (worstR > 1) { r.status = 'fail'; r.reason = 'thrust'; } else if (crush > 1) { r.status = 'fail'; r.reason = 'crush'; }
    else if (stress > 0.8) r.status = 'warn';
    if (r.status === 'fail') { failed = true; reasons.push(r.reason); }
    if (stress > worst) worst = stress;
  }
  // 3. roof pieces and towers inherit the worst of their supports; anything on a failed support falls too
  for (const p of pieces) {
    const r = res.get(p); if (r.status === 'fail' && r.reason !== 'thrust' && r.reason !== 'crush') { failed = true; reasons.push(r.reason); continue; }
    let cells = null;
    if (p.t === 'arch') cells = archEnds(p); else if (p.t === 'dome') cells = domeSupports.get(p) ? domeSupports.get(p).map(g => [g.x, g.z]) : []; else if (p.t === 'half') { const hi = halfInfo(p); cells = hi.flat.concat(hi.outer); } else if (p.t === 'tower') cells = [[p.x, p.z]];
    if (!cells) continue;
    let s = 0, dead = false;
    for (const [x, z] of cells) { const g = supportAt(x, z); if (!g) continue; const gr = res.get(g); if (gr.status === 'fail') dead = true; if (gr.stress > s) s = gr.stress; }
    r.stress = Math.max(r.stress, s); if (dead) { r.status = 'fail'; r.reason = r.reason || 'support'; } else if (r.status !== 'fail' && s > 0.8) r.status = 'warn';
  }
  // helpers (buttresses) show the stress of the piece they help
  for (const p of pieces) if (p.t === 'buttress') { let s = 0, dead = false; for (const [ux, uz] of DIRS) { const n = ground.get(key(p.x + ux, p.z + uz)); if (n && PT[n.t].support) { const nr = res.get(n); if (nr.stress > s) s = nr.stress; if (nr.status === 'fail') dead = true; } } const r = res.get(p); r.stress = s; if (dead) { r.status = 'fail'; r.reason = 'support'; } }
  return { res, failed, worst, reasons };
}

// Commission requirements: covered hall, main dome size, minarets, open windows. Returns a list of unmet requirement keys.
function checkRequirements(level, pieces) {
  const unmet = [];
  const roof = new Map(); for (const q of pieces) if (PT[q.t].layer === 'roof') for (const [x, z] of footprint(q)) roof.set(key(x, z), q);
  let uncovered = 0;
  for (const [x, z] of hallCells(level)) if (!roof.has(key(x, z))) uncovered++;
  if (uncovered) unmet.push('cover');
  const best = Math.max(0, ...pieces.filter(p => p.t === 'dome').map(p => p.s));
  if (best < level.dome) unmet.push('dome');
  if ((level.minarets || 0) > pieces.filter(p => p.t === 'minaret').length) unmet.push('minarets');
  if (level.windows) { const g = new Set(pieces.filter(p => PT[p.t].layer === 'ground').map(p => key(p.x, p.z))); if (level.windows.some(([x, z]) => g.has(key(x, z)))) unmet.push('windows'); }
  return { unmet, uncovered, bestDome: best };
}
// every cell the commission wants roofed: rectangles [x, z, w, d] in level.halls plus explicit level.cells
function hallCells(level) {
  const seen = new Set(), out = [];
  const add = (x, z) => { const k = key(x, z); if (!seen.has(k)) { seen.add(k); out.push([x, z]); } };
  for (const H of level.halls || []) for (let x = H[0]; x < H[0] + H[2]; x++) for (let z = H[1]; z < H[1] + H[3]; z++) add(x, z);
  for (const [x, z] of level.cells || []) add(x, z);
  return out;
}
function stoneUsed(pieces) { let c = 0; for (const q of pieces) c += pieceCost(q); return c; }

// Full evaluation of a layout the way the test does it: gravity, then the earthquake if the commission has one.
function evaluate(level, pieces) {
  const req = checkRequirements(level, pieces);
  const g = simulate(level, pieces, 0);
  const q = level.quake ? simulate(level, pieces, level.quake) : null;
  const stands = !g.failed, quakeOk = q ? !q.failed : true;
  const used = stoneUsed(pieces), left = level.budget - used;
  const complete = stands && quakeOk && req.unmet.length === 0;
  const stars = complete ? [req.bestDome >= level.dome, left >= Math.round(level.budget * level.par), q ? Math.max(g.worst, q.worst) <= 0.9 : g.worst <= 0.8] : [false, false, false];
  return { req, gravity: g, quake: q, stands, quakeOk, used, left, complete, stars, starCount: stars.filter(Boolean).length };
}

// ---------------------------------------------------------------------------
// The 15 commissions. Each has a reference solution (ref) that the same simulation must pass; the hint shows its next piece.
// ---------------------------------------------------------------------------
const P = (t, x, z, r = 0, s = 0) => ({ t, x, z, r, s });
const many = (t, cells) => cells.map(([x, z]) => P(t, x, z));
const sq = (x, z, s) => [[x, z], [x + s - 1, z], [x, z + s - 1], [x + s - 1, z + s - 1]];   // the four corners of an s x s square
// buttresses outside the corners of a square: 'x' = on the x sides, 'z' = on the z sides, 'xz' = both; n = chain length
const corner = (x, z, s, sides, n = 1) => { const e = s - 1, o = []; for (const [cx, cz, ux, uz] of [[x, z, -1, -1], [x + e, z, 1, -1], [x, z + e, -1, 1], [x + e, z + e, 1, 1]]) for (let i = 1; i <= n; i++) { if (sides.includes('x')) o.push([cx + ux * i, cz]); if (sides.includes('z')) o.push([cx, cz + uz * i]); } return o; };
const LEVELS = [
  // ---- Apprentice (çırak) ----
  { id: 'mescit', period: 0, grid: [5, 5], halls: [[1, 1, 2, 2]], dome: 2, budget: 26, par: 0.1, tray: ['wall', 'pier', 'dome2'],
    ref: [...many('wall', sq(1, 1, 2)), P('dome', 1, 1, 0, 2)] },
  { id: 'revak', period: 0, grid: [9, 3], halls: [], cells: [[2, 1], [4, 1], [6, 1]], dome: 0, budget: 34, par: 0.08, tray: ['pier', 'arch', 'buttress'],
    ref: [P('pier', 1, 1), P('pier', 3, 1), P('pier', 5, 1), P('pier', 7, 1), P('arch', 2, 1), P('arch', 4, 1), P('arch', 6, 1), P('buttress', 0, 1), P('buttress', 8, 1)] },
  { id: 'mahalle', period: 0, grid: [7, 7], halls: [[2, 2, 3, 3]], dome: 3, budget: 62, par: 0.1, tray: ['pier', 'wall', 'buttress', 'dome2', 'dome3'],
    ref: [...many('pier', sq(2, 2, 3)), ...many('buttress', corner(2, 2, 3, 'x')), P('dome', 2, 2, 0, 3)] },
  { id: 'yuksek', period: 0, grid: [6, 6], halls: [[2, 2, 2, 2]], dome: 2, budget: 44, par: 0.08, tray: ['pier', 'buttress', 'tower', 'dome2'],
    windows: [[1, 2], [1, 3], [4, 2], [4, 3], [2, 1], [3, 1], [2, 4], [3, 4]],
    ref: [...many('pier', sq(2, 2, 2)), ...many('tower', sq(2, 2, 2)), P('dome', 2, 2, 0, 2)] },
  { id: 'bayezid', period: 0, grid: [7, 9], halls: [[2, 2, 3, 5]], dome: 3, budget: 122, par: 0.08, tray: ['pier', 'wall', 'buttress', 'tower', 'dome3', 'half3'],
    ref: [...many('pier', sq(2, 3, 3)), P('dome', 2, 3, 0, 3), P('half', 2, 2, 2, 3), P('half', 2, 6, 0, 3),
          ...many('wall', [[2, 2], [4, 2], [2, 6], [4, 6]]), ...many('buttress', [[2, 1], [4, 1], [2, 7], [4, 7]]), ...many('buttress', corner(2, 3, 3, 'x'))] },
  // ---- Journeyman (kalfa) ----
  { id: 'carsi', period: 1, grid: [9, 10], halls: [[2, 2, 4, 4]], cells: [[3, 7], [5, 7]], dome: 4, budget: 114, par: 0.08, tray: ['pier', 'wall', 'buttress', 'tower', 'arch', 'dome3', 'dome4'],
    ref: [...many('pier', sq(2, 2, 4)), ...many('buttress', corner(2, 2, 4, 'xz')), P('dome', 2, 2, 0, 4),
          ...many('wall', [[2, 7], [4, 7], [6, 7], [1, 7], [7, 7]]), P('arch', 3, 7), P('arch', 5, 7)] },
  { id: 'minareli', period: 1, grid: [8, 8], halls: [[2, 2, 3, 3]], dome: 3, minarets: 2, budget: 74, par: 0.08, tray: ['pier', 'wall', 'buttress', 'tower', 'dome3', 'minaret'],
    windows: [[2, 1], [4, 1], [2, 5], [4, 5]],
    ref: [...many('pier', sq(2, 2, 3)), ...many('buttress', corner(2, 2, 3, 'x')), P('dome', 2, 2, 0, 3), P('minaret', 0, 7), P('minaret', 7, 7)] },
  { id: 'deprem', period: 1, grid: [7, 7], halls: [[2, 2, 3, 3]], dome: 3, quake: 0.15, budget: 72, par: 0.06, tray: ['pier', 'wall', 'buttress', 'tower', 'dome3'],
    ref: [...many('pier', sq(2, 2, 3)), ...many('buttress', corner(2, 2, 3, 'xz')), P('dome', 2, 2, 0, 3)] },
  { id: 'galeri', period: 1, grid: [10, 10], halls: [[3, 1, 4, 8]], cells: [[2, 3], [2, 6], [7, 3], [7, 6]], dome: 4, quake: 0.1, budget: 215, par: 0.06,
    tray: ['pier', 'wall', 'buttress', 'tower', 'arch', 'dome4', 'half4'],
    ref: [...many('pier', sq(3, 3, 4)), P('dome', 3, 3, 0, 4), P('half', 3, 1, 2, 4), P('half', 3, 7, 0, 4),
          ...many('wall', [[3, 1], [6, 1], [3, 8], [6, 8]]), ...many('buttress', [[3, 0], [6, 0], [3, 9], [6, 9]]),
          ...many('pier', [[1, 3], [1, 6], [8, 3], [8, 6]]), ...many('buttress', [[2, 3], [2, 6], [7, 3], [7, 6], [0, 3], [0, 6], [9, 3], [9, 6]]),
          P('arch', 2, 3), P('arch', 2, 6), P('arch', 7, 3), P('arch', 7, 6)] },
  { id: 'sekizayak', period: 1, grid: [9, 9], halls: [[2, 2, 4, 4]], dome: 4, quake: 0.1, budget: 124, par: 0.06, tray: ['pier', 'wall', 'buttress', 'tower', 'dome4'],
    windows: [[1, 2], [1, 5], [6, 2], [6, 5]],
    ref: [...many('pier', sq(2, 2, 4)), ...many('pier', [[3, 2], [4, 5], [2, 4], [5, 3]]), ...many('buttress', corner(2, 2, 4, 'z', 2)), ...many('buttress', [[3, 1], [4, 6], [1, 4], [6, 3]]), P('dome', 2, 2, 0, 4)] },
  // ---- Master (usta) ----
  { id: 'rustem', period: 2, grid: [7, 7], halls: [[2, 2, 3, 3]], dome: 3, quake: 0.16, budget: 102, par: 0.06, tray: ['pier', 'wall', 'buttress', 'tower', 'dome3'],
    windows: [[1, 2], [5, 2], [1, 4], [5, 4]],
    ref: [...many('pier', sq(2, 2, 3)), ...many('pier', [[3, 2], [2, 3], [4, 3], [3, 4]]), ...many('buttress', corner(2, 2, 3, 'z', 2)), ...many('buttress', [[3, 1], [1, 3], [5, 3], [3, 5]]), P('dome', 2, 2, 0, 3)] },
  { id: 'sehzade', period: 2, grid: [10, 10], halls: [[3, 1, 4, 8], [1, 3, 8, 4]], dome: 4, quake: 0.12, budget: 286, par: 0.06, tray: ['pier', 'wall', 'buttress', 'tower', 'arch', 'dome4', 'half4', 'minaret'],
    minarets: 2,
    ref: [...many('pier', sq(3, 3, 4)), P('dome', 3, 3, 0, 4), P('half', 3, 1, 2, 4), P('half', 3, 7, 0, 4), P('half', 1, 3, 3, 4), P('half', 7, 3, 1, 4),
          ...many('wall', [[3, 1], [6, 1], [3, 8], [6, 8], [1, 3], [1, 6], [8, 3], [8, 6]]), ...many('buttress', [[3, 0], [6, 0], [3, 9], [6, 9], [0, 3], [0, 6], [9, 3], [9, 6]]),
          ...many('buttress', corner(3, 3, 4, 'xz')), // hidden inside the half-domes: the piers flare out under the exedrae
          P('minaret', 0, 9), P('minaret', 9, 9)] },
  { id: 'mihrimah', period: 2, grid: [10, 10], halls: [[3, 3, 4, 6], [1, 3, 8, 4]], dome: 4, quake: 0.12, minarets: 1, budget: 250, par: 0.06, tray: ['pier', 'wall', 'buttress', 'tower', 'arch', 'dome4', 'half4', 'minaret'],
    ref: [...many('pier', sq(3, 3, 4)), P('dome', 3, 3, 0, 4), P('half', 3, 7, 0, 4), P('half', 1, 3, 3, 4), P('half', 7, 3, 1, 4),
          ...many('wall', [[3, 8], [6, 8], [1, 3], [1, 6], [8, 3], [8, 6]]), ...many('buttress', [[3, 9], [6, 9], [0, 3], [0, 6], [9, 3], [9, 6]]),
          ...many('buttress', corner(3, 3, 4, 'xz')), ...many('tower', [[3, 3], [6, 3]]), P('minaret', 0, 1)] },
  { id: 'suleymaniye', period: 2, grid: [11, 11], halls: [[3, 1, 5, 9]], dome: 5, quake: 0.1, minarets: 4, budget: 300, par: 0.06, tray: ['pier', 'wall', 'buttress', 'tower', 'arch', 'dome4', 'dome5', 'half4', 'half5', 'minaret'],
    ref: [...many('pier', sq(3, 3, 5)), P('dome', 3, 3, 0, 5), P('half', 3, 1, 2, 5), P('half', 3, 8, 0, 5),
          ...many('buttress', corner(3, 3, 5, 'x', 2)),
          ...many('wall', [[3, 1], [7, 1], [3, 9], [7, 9]]), ...many('buttress', [[3, 0], [7, 0], [3, 10], [7, 10], [2, 1], [8, 1], [2, 9], [8, 9]]),
          P('minaret', 0, 0), P('minaret', 10, 0), P('minaret', 0, 10), P('minaret', 10, 10)] },
  { id: 'selimiye', period: 2, grid: [11, 11], halls: [[3, 3, 5, 5]], dome: 5, quake: 0.14, minarets: 4, budget: 210, par: 0.06, tray: ['pier', 'wall', 'buttress', 'tower', 'arch', 'dome4', 'dome5', 'half4', 'minaret'],
    windows: [[2, 3], [2, 7], [8, 3], [8, 7]],
    ref: [...many('pier', sq(3, 3, 5)), ...many('pier', [[5, 3], [5, 7], [3, 5], [7, 5]]), ...many('buttress', corner(3, 3, 5, 'z', 3)),
          ...many('buttress', [[5, 2], [5, 1], [5, 8], [5, 9], [2, 5], [1, 5], [8, 5], [9, 5]]), P('dome', 3, 3, 0, 5),
          P('minaret', 0, 0), P('minaret', 10, 0), P('minaret', 0, 10), P('minaret', 10, 10)] },
];
// @sim-end
if (typeof module !== 'undefined') module.exports = { PT, LEVELS, hallCells, simulate, evaluate, canPlace, footprint, pieceCost, checkRequirements, halfInfo, archEnds, P, many, sq, corner };
