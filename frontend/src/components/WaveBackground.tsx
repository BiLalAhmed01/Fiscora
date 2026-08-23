"use client";

import { useEffect, useRef } from "react";

/**
 * Original Canvas2D "silk ribbon" hero background -- fully generative, no
 * external image/video asset. Approximates the flowing smoke/fabric look of
 * the reference site using fractal (multi-octave) sine motion plus layered
 * glow-core + halo strokes for a soft volumetric feel, instead of a single
 * flat stroke. No video/WebGL/Three.js/Lottie.
 */
export default function WaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Each octave adds a finer wobble on top of the base curve so the path
    // reads as organic drift rather than a mechanical sine wave.
    const octaves = [
      { freqMul: 1, ampMul: 1, speedMul: 1 },
      { freqMul: 2.3, ampMul: 0.32, speedMul: -1.7 },
      { freqMul: 4.1, ampMul: 0.14, speedMul: 2.6 },
    ];

    const fractalY = (nx: number, t: number, r: Ribbon) => {
      let y = 0;
      for (const o of octaves) {
        y +=
          Math.sin(nx * Math.PI * r.freq * o.freqMul + t * r.speed * o.speedMul + r.phase) *
          r.amp *
          o.ampMul;
      }
      return y;
    };

    interface Ribbon {
      amp: number;
      freq: number;
      speed: number;
      phase: number;
      widthPx: number;
      opacity: number;
      yBase: number;
      tint: string;
    }

    const ribbons: Ribbon[] = [
      { amp: 0.19, freq: 1.5, speed: 0.00016, phase: 0, widthPx: 190, opacity: 0.9, yBase: 0.4, tint: "255,255,255" },
      { amp: 0.15, freq: 1.8, speed: -0.00013, phase: 2.1, widthPx: 130, opacity: 0.6, yBase: 0.47, tint: "225,232,255" },
      { amp: 0.12, freq: 2.2, speed: 0.0002, phase: 4.3, widthPx: 90, opacity: 0.45, yBase: 0.55, tint: "255,255,255" },
      { amp: 0.08, freq: 2.7, speed: -0.00024, phase: 1.2, widthPx: 55, opacity: 0.3, yBase: 0.61, tint: "210,220,255" },
    ];

    const pathFor = (r: Ribbon, t: number) => {
      const steps = 56;
      const points: [number, number][] = [];
      for (let i = 0; i <= steps; i++) {
        const nx = i / steps;
        const x = nx * width;
        const y = height * r.yBase + fractalY(nx, t, r) * height;
        points.push([x, y]);
      }
      return points;
    };

    const strokePath = (points: [number, number][]) => {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length - 1; i++) {
        const [cx, cy] = points[i];
        const [nx, ny] = points[i + 1];
        ctx.quadraticCurveTo(cx, cy, (cx + nx) / 2, (cy + ny) / 2);
      }
      ctx.stroke();
    };

    const drawRibbon = (r: Ribbon, t: number) => {
      const points = pathFor(r, t);
      const edgeGradient = ctx.createLinearGradient(0, 0, width, 0);
      edgeGradient.addColorStop(0, `rgba(${r.tint},0)`);
      edgeGradient.addColorStop(0.5, `rgba(${r.tint},${r.opacity})`);
      edgeGradient.addColorStop(1, `rgba(${r.tint},0)`);

      // Soft outer halo (wide, low opacity, heavy blur).
      ctx.save();
      ctx.filter = "blur(40px)";
      ctx.strokeStyle = edgeGradient;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = r.widthPx * 1.8;
      ctx.lineCap = "round";
      strokePath(points);
      ctx.restore();

      // Mid body.
      ctx.save();
      ctx.filter = "blur(20px)";
      ctx.strokeStyle = edgeGradient;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = r.widthPx;
      ctx.lineCap = "round";
      strokePath(points);
      ctx.restore();

      // Bright inner core for a hint of specular highlight.
      ctx.save();
      ctx.filter = "blur(8px)";
      ctx.strokeStyle = edgeGradient;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = r.widthPx * 0.28;
      ctx.lineCap = "round";
      strokePath(points);
      ctx.restore();
    };

    let raf = 0;
    const render = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      for (const r of ribbons) drawRibbon(r, t);
      if (!reduceMotion) raf = requestAnimationFrame(render);
    };

    if (reduceMotion) {
      render(0);
    } else {
      raf = requestAnimationFrame(render);
    }

    return () => {
      window.removeEventListener("resize", resize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-photo-canvas" aria-hidden="true" />;
}
