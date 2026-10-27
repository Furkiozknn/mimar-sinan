// Verifies every reference solution with the same simulation the game uses (run: node test-levels.js)
const S = require('./sim.js');
let bad = 0;
for (const L of S.LEVELS) {
  // place pieces one by one through the validator, like the bot does
  const placed = []; let placeErr = null;
  for (const p of L.ref) { const why = S.canPlace(L, placed, p); if (why) { placeErr = `${p.t}${p.s || ''}@${p.x},${p.z} ${why}`; break; } placed.push(p); }
  const ev = S.evaluate(L, placed);
  const g = ev.gravity, q = ev.quake;
  const fails = [...g.res.entries()].filter(([, r]) => r.status === 'fail').map(([p, r]) => `${p.t}${p.s || ''}@${p.x},${p.z}:${r.reason}`);
  const qfails = q ? [...q.res.entries()].filter(([, r]) => r.status === 'fail').map(([p, r]) => `${p.t}${p.s || ''}@${p.x},${p.z}:${r.reason}`) : [];
  const ok = !placeErr && ev.complete;
  if (!ok) bad++;
  const worstSup = [...g.res.entries()].filter(([p]) => S.PT[p.t].support).sort((a, b) => b[1].stress - a[1].stress).slice(0, 2).map(([p, r]) => `${p.t[0]}@${p.x},${p.z}=${r.stress.toFixed(2)}`).join(' ');
  console.log(`${ok ? 'PASS' : 'FAIL'} ${L.id.padEnd(12)} stars ${ev.stars.map(s => s ? '*' : '.').join('')} used ${ev.used}/${L.budget} left ${ev.left} worst g ${g.worst.toFixed(2)}${q ? ' q ' + q.worst.toFixed(2) : ''} [${worstSup}] unmet [${ev.req.unmet}] ${placeErr || ''} ${fails.join(' ')} ${qfails.length ? 'Q: ' + qfails.join(' ') : ''}`);
}
console.log(bad ? `${bad} level(s) failing` : 'all reference solutions pass');
process.exit(bad ? 1 : 0);
