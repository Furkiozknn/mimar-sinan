// Calibration harness: prints stress ratios for canonical layouts (run: node calib.js)
const S = require('./sim.js');
const { P, simulate } = S;
const lvl = { grid: [12, 12], budget: 999, hall: [0, 0, 1, 1], dome: 2, par: 0.1 };
function show(name, pieces, quake = 0) {
  const r = simulate(lvl, pieces, quake);
  const sup = pieces.filter(p => S.PT[p.t].support).map(p => { const x = r.res.get(p); return `${p.t[0]}(${p.x},${p.z}) ${x.stress.toFixed(2)}${x.status === 'fail' ? '!' + x.reason : ''} e=${(x.e || 0).toFixed(2)}/${(x.limit || 0).toFixed(2)} N=${(x.N || 0).toFixed(0)}`; });
  const roofs = pieces.filter(p => !S.PT[p.t].support && S.PT[p.t].layer !== 'ground').map(p => { const x = r.res.get(p); return `${p.t}${p.s || ''} ${x.status}${x.reason ? ':' + x.reason : ''}`; });
  console.log(`${r.failed ? 'FAIL' : 'ok  '} worst ${r.worst.toFixed(2)}  ${name}\n     ${sup.join(' | ')}\n     ${roofs.join(' | ')}`);
}
const piers = (x, z, s) => [P('pier', x, z), P('pier', x + s - 1, z), P('pier', x, z + s - 1), P('pier', x + s - 1, z + s - 1)];
const walls = (x, z, s) => [P('wall', x, z), P('wall', x + s - 1, z), P('wall', x, z + s - 1), P('wall', x + s - 1, z + s - 1)];
const towers = (x, z, s) => [P('tower', x, z), P('tower', x + s - 1, z), P('tower', x, z + s - 1), P('tower', x + s - 1, z + s - 1)];
// buttresses outside the corners, n per corner (1 = one on the x side, 2 = both)
const butt = (x, z, s, n) => { const e = s - 1, o = []; for (const [cx, cz, ux, uz] of [[x, z, -1, -1], [x + e, z, 1, -1], [x, z + e, -1, 1], [x + e, z + e, 1, 1]]) { o.push(P('buttress', cx + ux, cz)); if (n > 1) o.push(P('buttress', cx, cz + uz)); } return o; };
const wallsOut = (x, z, s) => { const e = s - 1, o = []; for (const [cx, cz, ux, uz] of [[x, z, -1, -1], [x + e, z, 1, -1], [x, z + e, -1, 1], [x + e, z + e, 1, 1]]) { o.push(P('wall', cx + ux, cz)); o.push(P('wall', cx, cz + uz)); } return o; };

show('2x2 on walls', [...walls(2, 2, 2), P('dome', 2, 2, 0, 2)]);
show('2x2 on piers', [...piers(2, 2, 2), P('dome', 2, 2, 0, 2)]);
show('2x2 on piers + towers', [...piers(2, 2, 2), ...towers(2, 2, 2), P('dome', 2, 2, 0, 2)]);
show('2x2 on piers + 1 buttress', [...piers(2, 2, 2), ...butt(2, 2, 2, 1), P('dome', 2, 2, 0, 2)]);
show('3x3 bare', [...piers(2, 2, 3), P('dome', 2, 2, 0, 3)]);
show('3x3 + towers', [...piers(2, 2, 3), ...towers(2, 2, 3), P('dome', 2, 2, 0, 3)]);
show('3x3 + 1 buttress', [...piers(2, 2, 3), ...butt(2, 2, 3, 1), P('dome', 2, 2, 0, 3)]);
show('3x3 + 1 buttress + tower', [...piers(2, 2, 3), ...butt(2, 2, 3, 1), ...towers(2, 2, 3), P('dome', 2, 2, 0, 3)]);
show('3x3 + 2 walls', [...piers(2, 2, 3), ...wallsOut(2, 2, 3), P('dome', 2, 2, 0, 3)]);
show('3x3 + 2 walls + towers', [...piers(2, 2, 3), ...wallsOut(2, 2, 3), ...towers(2, 2, 3), P('dome', 2, 2, 0, 3)]);
show('3x3 + 2 buttress', [...piers(2, 2, 3), ...butt(2, 2, 3, 2), P('dome', 2, 2, 0, 3)]);
show('3x3 + 2 buttress quake .2', [...piers(2, 2, 3), ...butt(2, 2, 3, 2), P('dome', 2, 2, 0, 3)], 0.2);
show('3x3 + 1 buttress + tower quake .2', [...piers(2, 2, 3), ...butt(2, 2, 3, 1), ...towers(2, 2, 3), P('dome', 2, 2, 0, 3)], 0.2);
show('4x4 bare', [...piers(2, 2, 4), P('dome', 2, 2, 0, 4)]);
show('4x4 + 1 buttress', [...piers(2, 2, 4), ...butt(2, 2, 4, 1), P('dome', 2, 2, 0, 4)]);
show('4x4 + 2 buttress', [...piers(2, 2, 4), ...butt(2, 2, 4, 2), P('dome', 2, 2, 0, 4)]);
show('4x4 + 2 buttress + towers', [...piers(2, 2, 4), ...butt(2, 2, 4, 2), ...towers(2, 2, 4), P('dome', 2, 2, 0, 4)]);
show('4x4 + 2 buttress + towers quake .2', [...piers(2, 2, 4), ...butt(2, 2, 4, 2), ...towers(2, 2, 4), P('dome', 2, 2, 0, 4)], 0.2);
// 4x4 with two half-domes (front/back), half-dome outer supports = piers with buttresses
show('4x4 + 2 halfdomes (outer piers bare)', [...piers(2, 2, 4), P('dome', 2, 2, 0, 4), P('half', 2, 0, 2, 4), P('pier', 2, 0), P('pier', 5, 0), P('half', 2, 6, 0, 4), P('pier', 2, 7), P('pier', 5, 7)]);
show('4x4 + 2 halfdomes + outer buttress', [...piers(2, 2, 4), P('dome', 2, 2, 0, 4), P('half', 2, 0, 2, 4), P('pier', 2, 0), P('pier', 5, 0), P('buttress', 1, 0), P('buttress', 6, 0), P('half', 2, 6, 0, 4), P('pier', 2, 7), P('pier', 5, 7), P('buttress', 1, 7), P('buttress', 6, 7), P('buttress', 1, 2), P('buttress', 6, 2), P('buttress', 1, 5), P('buttress', 6, 5)]);
show('4x4 + 4 halfdomes', [...piers(2, 2, 4), P('dome', 2, 2, 0, 4), P('half', 2, 0, 2, 4), P('pier', 2, 0), P('pier', 5, 0), P('half', 2, 6, 0, 4), P('pier', 2, 7), P('pier', 5, 7), P('half', 0, 2, 3, 4), P('pier', 0, 2), P('pier', 0, 5), P('half', 6, 2, 1, 4), P('pier', 7, 2), P('pier', 7, 5),
  P('buttress', 2, 8), P('buttress', 5, 8), P('buttress', 2, -1 + 1 - 1 + 0), P('buttress', 5, -1 + 1 - 1 + 0)].filter(p => p.z >= 0));
show('5x5 on 4 piers + 2 buttress + towers', [...piers(2, 2, 5), ...butt(2, 2, 5, 2), ...towers(2, 2, 5), P('dome', 2, 2, 0, 5)]);
show('5x5 on 8 piers bare', [...piers(2, 2, 5), P('pier', 4, 2), P('pier', 4, 6), P('pier', 2, 4), P('pier', 6, 4), P('dome', 2, 2, 0, 5)]);
show('5x5 on 8 piers + 1 buttress each', [...piers(2, 2, 5), P('pier', 4, 2), P('pier', 4, 6), P('pier', 2, 4), P('pier', 6, 4), P('buttress', 4, 1), P('buttress', 4, 7), P('buttress', 1, 4), P('buttress', 7, 4), ...butt(2, 2, 5, 1), P('dome', 2, 2, 0, 5)]);
show('5x5 on 8 piers + 2 buttress corners, 1 mid, towers', [...piers(2, 2, 5), P('pier', 4, 2), P('pier', 4, 6), P('pier', 2, 4), P('pier', 6, 4), P('buttress', 4, 1), P('buttress', 4, 7), P('buttress', 1, 4), P('buttress', 7, 4), ...butt(2, 2, 5, 2), ...towers(2, 2, 5), P('dome', 2, 2, 0, 5)]);
show('5x5 on 8 piers + 2 buttress corners, 1 mid, towers quake .2', [...piers(2, 2, 5), P('pier', 4, 2), P('pier', 4, 6), P('pier', 2, 4), P('pier', 6, 4), P('buttress', 4, 1), P('buttress', 4, 7), P('buttress', 1, 4), P('buttress', 7, 4), ...butt(2, 2, 5, 2), ...towers(2, 2, 5), P('dome', 2, 2, 0, 5)], 0.2);
show('arch row 3 on 4 piers', [P('pier', 1, 1), P('pier', 3, 1), P('pier', 5, 1), P('pier', 7, 1), P('arch', 2, 1), P('arch', 4, 1), P('arch', 6, 1)]);
show('arch row 3 on 4 piers + end buttress', [P('pier', 1, 1), P('pier', 3, 1), P('pier', 5, 1), P('pier', 7, 1), P('arch', 2, 1), P('arch', 4, 1), P('arch', 6, 1), P('buttress', 0, 1), P('buttress', 8, 1)]);
show('arch row 3 on 4 walls', [P('wall', 1, 1), P('wall', 3, 1), P('wall', 5, 1), P('wall', 7, 1), P('arch', 2, 1), P('arch', 4, 1), P('arch', 6, 1)]);
show('arch row 3 on 4 walls + end walls', [P('wall', 1, 1), P('wall', 3, 1), P('wall', 5, 1), P('wall', 7, 1), P('arch', 2, 1), P('arch', 4, 1), P('arch', 6, 1), P('wall', 0, 1), P('wall', 8, 1)]);
show('single arch on 2 walls', [P('wall', 1, 1), P('wall', 3, 1), P('arch', 2, 1)]);
show('single arch on 2 walls+ outer walls', [P('wall', 1, 1), P('wall', 3, 1), P('arch', 2, 1), P('wall', 0, 1), P('wall', 4, 1)]);
show('2x2 walls quake .2', [...walls(2, 2, 2), P('dome', 2, 2, 0, 2)], 0.2);
show('3x3 dome + 3-wide half on 2 sides, outer walls', [...piers(2, 2, 3), P('dome', 2, 2, 0, 3), P('half', 2, 1, 2, 3), P('wall', 2, 1), P('wall', 4, 1), P('half', 2, 5, 0, 3), P('wall', 2, 5), P('wall', 4, 5), P('buttress', 1, 2), P('buttress', 5, 2), P('buttress', 1, 4), P('buttress', 5, 4)]);
show('3x3 dome + 3-wide half on 2 sides, outer walls, no side buttress', [...piers(2, 2, 3), P('dome', 2, 2, 0, 3), P('half', 2, 1, 2, 3), P('wall', 2, 1), P('wall', 4, 1), P('half', 2, 5, 0, 3), P('wall', 2, 5), P('wall', 4, 5)]);
