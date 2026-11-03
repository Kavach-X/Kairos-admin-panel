"use client";

import * as React from "react";

/**
 * A tunnel made of nested rings that fly toward the centre while each ring continuously morphs
 * circle -> rounded square -> hexagon -> triangle -> circle. The morph is offset by depth, so the shape change
 * ripples down the tunnel, and every ring twists a little more than the one in front of it.
 *
 * Perf: no React state per frame. A single requestAnimationFrame loop writes `d`/stroke attributes straight to
 * the path elements. Sample counts are tiny (9 rings x 72 points), so a frame costs well under a millisecond.
 * With `active=false`, or when the user prefers reduced motion, one static frame is drawn and nothing runs.
 */

const RINGS = 9;
const SAMPLES = 72;
const MAX_R = 92;
const MIN_R = 6;
const SPEED = 0.16; // tunnel travel, in full ring-spacings per second
const MORPH_SPEED = 0.28; // shapes per second
const MORPH_DEPTH = 1.7; // how many shapes apart the first and last ring are
const TWIST = 1.4; // extra rotation (rad) between the nearest and the farthest ring

const TAU = Math.PI * 2;

// Radial profile r(theta) of each shape, normalised so the farthest point is 1.
const SHAPES: ((theta: number) => number)[] = [
  () => 1,
  (t) => {
    // superellipse n=4 ("squircle")
    const c = Math.abs(Math.cos(t));
    const s = Math.abs(Math.sin(t));
    return (c ** 4 + s ** 4) ** -0.25 / 2 ** 0.25;
  },
  (t) => {
    // regular hexagon, circumradius 1
    const sector = TAU / 6;
    return Math.cos(Math.PI / 6) / Math.cos((((t % sector) + sector) % sector) - sector / 2);
  },
  (t) => {
    // triangle, circumradius 1
    const sector = TAU / 3;
    return 0.5 / Math.cos((((t % sector) + sector) % sector) - sector / 2);
  },
];

const ANGLES = Array.from({ length: SAMPLES }, (_, i) => (i / SAMPLES) * TAU);
const COS = ANGLES.map(Math.cos);
const SIN = ANGLES.map(Math.sin);
const PROFILE = SHAPES.map((fn) => ANGLES.map((a) => fn(a)));

const smooth = (x: number) => x * x * (3 - 2 * x);

function ringPath(morph: number, rotation: number, radius: number): string {
  const count = PROFILE.length;
  const wrapped = ((morph % count) + count) % count;
  const from = Math.floor(wrapped);
  const to = (from + 1) % count;
  const k = smooth(wrapped - from);
  const a = PROFILE[from];
  const b = PROFILE[to];
  const cr = Math.cos(rotation);
  const sr = Math.sin(rotation);

  let d = "";
  for (let i = 0; i < SAMPLES; i++) {
    const r = (a[i] + (b[i] - a[i]) * k) * radius;
    const x = r * (COS[i] * cr - SIN[i] * sr);
    const y = r * (SIN[i] * cr + COS[i] * sr);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d + "Z";
}

export function TunnelMorph({
  active,
  className = "",
  "aria-label": ariaLabel = "Tunnel animation",
}: {
  active: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const uid = React.useId();
  const glowId = `${uid}-glow`;
  const paths = React.useRef<(SVGPathElement | null)[]>([]);

  React.useEffect(() => {
    const draw = (t: number) => {
      for (let i = 0; i < RINGS; i++) {
        const el = paths.current[i];
        if (!el) continue;
        // depth 0 = right in front of you, 1 = far end of the tunnel. Rings drift 0 -> 1, then reappear in front.
        const depth = (((t * SPEED + i / RINGS) % 1) + 1) % 1;
        const radius = MIN_R + (MAX_R - MIN_R) * (1 - depth) ** 1.7;
        const morph = t * MORPH_SPEED + depth * MORPH_DEPTH;
        const rotation = t * 0.22 + depth * TWIST;
        const fade = Math.sin(Math.PI * depth) ** 0.7; // fade in at the front, out at the far end

        el.setAttribute("d", ringPath(morph, rotation, radius));
        el.setAttribute("stroke", `hsl(${(205 + 70 * depth).toFixed(0)} 90% ${(62 - 8 * depth).toFixed(0)}%)`);
        el.setAttribute("stroke-opacity", (0.9 * fade).toFixed(2));
        el.setAttribute("stroke-width", (2.4 - 1.7 * depth).toFixed(2));
      }
    };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    draw(1.3); // a nice static frame
    if (!active || reduceMotion) return;

    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      draw(1.3 + (now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return (
    <svg
      viewBox="-100 -100 200 200"
      role="img"
      aria-label={ariaLabel}
      className={`${active ? "" : "opacity-40 grayscale"} transition-[opacity,filter] duration-500 ${className}`}
    >
      <defs>
        <radialGradient id={glowId}>
          <stop offset="0%" stopColor="hsl(215 95% 70%)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="hsl(215 95% 70%)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r="34" fill={`url(#${glowId})`} className={active ? "animate-pulse motion-reduce:animate-none" : ""} />
      {Array.from({ length: RINGS }, (_, i) => (
        <path
          key={i}
          ref={(el) => {
            paths.current[i] = el;
          }}
          fill="none"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
