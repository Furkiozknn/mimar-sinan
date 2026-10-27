# Arena round 6, game 2: Mimar Sinan (structural dome-building puzzle) — built by Claude Fable 5.1

```text
Build a single-file browser game (one index.html with inline CSS and JS) using Three.js r170 loaded as an ES
module from https://cdn.jsdelivr.net/npm/three@0.170.0/ (import map; addons from examples/jsm/).
A 3D construction-physics puzzle called "Mimar Sinan" about building Ottoman mosques. Do not ask questions,
build it end to end.

WORLD: a building site on a hill above a city: scaffolding, cranes with treadwheels, stone blocks, workers as
simple figures, the city and the sea below in warm afternoon light. The finished mosques stand on the hill as you
progress (a growing skyline). Warm limestone, lead-grey domes, one accent colour (#2F6E9E İznik blue).

CORE MECHANIC: a real structural simulation written by you (no physics library): a 2.5D or 3D model of masonry
pieces (piers, arches, half-domes, buttresses, weight towers, domes) connected at joints. Compute the load path
and the outward thrust of every arch and dome; a piece fails (cracks, then falls with a rigid-body collapse) when
the thrust line leaves its middle third or the support is too weak. Show stress as a colour overlay (green →
yellow → red) and the thrust lines when the player holds a key. Classic Sinan lessons appear as real solutions:
half-domes take the thrust of the main dome, weight towers on the piers, buttresses hidden in the walls,
an octagon or hexagon of piers instead of four.

PUZZLE: each commission gives a footprint, a budget of stone and a target dome size (and sometimes windows that
must stay open, or a minaret height). Place pieces on a grid, then "remove the scaffolding" to test. Late levels
add an earthquake test (the ground shakes for a few seconds; the structure must survive). Stars for stone left,
dome size and earthquake survival. 15 commissions in 3 periods (apprentice, journeyman, master: Şehzade,
Süleymaniye and Selimiye-like at the end). Every level must have a reference solution in the data that passes
the same simulation; the hint shows the next piece of it.

INTERACTION: mouse / touch to pick a piece from the tray and place it, R / two-finger twist rotate, Del remove,
Space remove the scaffolding (test), T toggle stress view, Z undo, orbit with right-drag or one-finger drag on
empty space, zoom wheel or pinch.

HUD: top bar (logo, commission, stone budget, stars, hint, pause, sound, language), piece tray, stress legend,
toasts, title, period map with commission stars, result with a slow camera move around the finished mosque,
ending with the whole skyline at sunset.

EXTRAS: chisel taps, crane creak, stone thud and crack sounds, a calm ney-and-kudüm music loop, all synthesised
(CC0 one-shots from asset-forge allowed).
```

The shared rules in `_sablonlar/arena-round6-common.md` are appended to this prompt.
