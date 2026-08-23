"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Particle "glass orb" background, adapted from a Siri-style iridescent
 * particle-swarm sketch into Fiscora's monochrome theme: hue is pinned to a
 * faint cool-white tint (matching the button/hero glow color used elsewhere
 * in the app) instead of the original cyan/violet/magenta sweep. Purely
 * decorative -- user rotate/zoom/pan are disabled so it never intercepts
 * clicks on the hero content sitting above it.
 *
 * Base sphere geometry (frac/y0/r0/th/x/y/z) is precomputed once instead of
 * recomputed every frame -- the original per-frame version recomputed a
 * sqrt + several trig calls per particle per frame, which was heavy enough
 * to stall the main thread. Only the time-dependent turbulence runs in the
 * render loop now.
 */
const COUNT = 900;

function ParticleSwarm() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const pColor = useMemo(() => new THREE.Color(), []);

  const base = useMemo(() => {
    const golden = 2.399963229728653;
    const frac = new Float32Array(COUNT);
    const y0 = new Float32Array(COUNT);
    const x = new Float32Array(COUNT);
    const y = new Float32Array(COUNT);
    const z = new Float32Array(COUNT);
    const th = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const f = (i + 0.5) / COUNT;
      const yy = 1.0 - 2.0 * f;
      const r0 = Math.sqrt(Math.max(0.0, 1.0 - yy * yy));
      const t = golden * i;
      frac[i] = f;
      y0[i] = yy;
      x[i] = r0 * Math.cos(t);
      y[i] = yy;
      z[i] = r0 * Math.sin(t);
      th[i] = t;
    }
    return { frac, y0, x, y, z, th };
  }, []);

  // Mutated in place every frame in useFrame below -- this is genuinely
  // mutable per-frame animation state, not a derived value, so it belongs in
  // a ref rather than useMemo (mutating a memoized value is unsafe).
  // Deterministic pseudo-random scatter (not Math.random()) so this stays a
  // pure function of `i` -- calling Math.random during render is flagged as
  // impure even when guarded by the ref-null check.
  const positionsRef = useRef<THREE.Vector3[] | null>(null);
  if (positionsRef.current === null) {
    const pos: THREE.Vector3[] = [];
    for (let i = 0; i < COUNT; i++) {
      const rx = Math.sin(i * 12.9898) * 43758.5453 % 1;
      const ry = Math.sin(i * 78.233) * 43758.5453 % 1;
      const rz = Math.sin(i * 39.425) * 43758.5453 % 1;
      pos.push(new THREE.Vector3((rx - 0.5) * 100, (ry - 0.5) * 100, (rz - 0.5) * 100));
    }
    positionsRef.current = pos;
  }

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );
  const geometry = useMemo(() => new THREE.TetrahedronGeometry(0.24), []);

  const PARAMS = { radius: 46, flow: 0.5, turb: 0.4, shell: 0.3, hueShift: 0.35 };

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    const { radius, flow, turb, shell, hueShift } = PARAMS;
    const t = time * flow;

    const rotA = t * 0.2;
    const cA = Math.cos(rotA);
    const sA = Math.sin(rotA);
    const breath = 1.0 + 0.06 * Math.sin(t * 1.2) + 0.03 * Math.sin(t * 2.7 + 1.3);
    const dist = turb * 0.22;

    const { frac, y0, x: bx, y: by, z: bz, th } = base;
    const positions = positionsRef.current!;

    for (let i = 0; i < COUNT; i++) {
      const x = bx[i];
      const y = by[i];
      const z = bz[i];

      const w1 = Math.sin(3.0 * x + t * 1.7 + Math.cos(2.0 * z - t)) * Math.cos(2.0 * y - t * 1.3);
      const w2 = Math.sin(4.0 * z - t * 1.1 + Math.cos(3.0 * x + t * 0.7)) * Math.cos(3.0 * y + t);
      const w3 = Math.sin(2.0 * y + t * 2.1 + Math.cos(4.0 * x - t * 0.5)) * Math.cos(2.0 * z + t * 0.9);

      const band = 0.5 + 0.5 * Math.sin(frac[i] * 6.28318 * 3.0 + t * 0.6);
      const shellMix = band * shell;
      const rMod = breath * (1.0 - shellMix * (0.55 + 0.35 * Math.sin(th[i] * 0.5 + t)));

      const xr = x * cA - z * sA;
      const zr = x * sA + z * cA;

      const px = (xr + w1 * dist) * radius * rMod;
      const py = (y + w2 * dist * 1.15) * radius * rMod;
      const pz = (zr + w3 * dist) * radius * rMod;

      positions[i].x += (px - positions[i].x) * 0.1;
      positions[i].y += (py - positions[i].y) * 0.1;
      positions[i].z += (pz - positions[i].z) * 0.1;
      dummy.position.copy(positions[i]);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      const swirl = 0.5 + 0.5 * Math.sin(y * 2.0 + xr * 1.5 + t * 1.4 + w1 * 2.0);
      const edge = Math.abs(y0[i]);
      const light = 0.72 + 0.18 * w2 * turb + 0.1 * edge;
      const sat = 0.06 + 0.05 * swirl * hueShift;
      pColor.setHSL(0.61, Math.min(0.4, Math.max(0.0, sat)), Math.min(0.98, Math.max(0.45, light)));
      meshRef.current.setColorAt(i, pColor);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[geometry, material, COUNT]} />;
}

export default function ParticleOrb() {
  // Lazy initializer instead of an effect+setState -- this component is only
  // ever mounted client-side (dynamic import with ssr:false), so `window` is
  // always available here, and this avoids an extra render pass.
  const [reducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  if (reducedMotion) return null;

  return (
    <div className="particle-orb-layer" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 100], fov: 60 }} dpr={[1, 1.25]} gl={{ antialias: false, alpha: true, powerPreference: "low-power" }} frameloop="always">
        <fog attach="fog" args={["#000000", 0.01, 260]} />
        <ParticleSwarm />
      </Canvas>
    </div>
  );
}
