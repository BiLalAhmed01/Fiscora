"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import WaveBackground from "@/components/WaveBackground";

// Three.js/@react-three/fiber is a large, main-thread-heavy bundle -- code-split
// it out of the initial page chunk and only load it once the browser is idle
// after first paint, so it never competes with the landing page's critical
// render path (FCP/LCP/TBT).
const ParticleOrb = dynamic(() => import("@/components/ParticleOrb"), { ssr: false });

const CSS = `
.vesper-landing {
  --bg: #000000;
  --text: #ffffff;
  --muted: #9a9a9a;
  --stat: #d8d8d8;
  --border: rgba(255, 255, 255, 0.16);
  --border-soft: rgba(255, 255, 255, 0.12);

  --logo: 15.5px;
  --logo-mark: 22px;
  --nav: 14px;
  --nav-h: 40px;
  --btn: 13.5px;
  --btn-h: 40px;
  --hero-btn-h: 42px;
  --h1: 48px;
  --lede: 15.5px;
  --badge: 12.5px;
  --stat-size: 13.5px;
  --header-y: 22px;
  --header-x: 40px;
  --stats-x: 72px;
  --stats-y: 36px;
  --hero-gap: 85px;
  --copy-max: 860px;
  --lede-max: 490px;

  position: relative;
  background: var(--bg);
  color: var(--text);
  font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  overflow-x: hidden;
  min-height: 100dvh;
}
.vesper-landing * { box-sizing: border-box; }
.vesper-landing a { color: inherit; text-decoration: none; }
.vesper-landing button { font-family: inherit; }

.vesper-landing .grain {
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  opacity: 0.035;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.vesper-landing .hero-photo {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: #000;
}
.vesper-landing .hero-photo-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.vesper-landing .particle-orb-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  mix-blend-mode: screen;
  opacity: 0.8;
}
.vesper-landing .particle-orb-layer canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
.vesper-landing .hero-photo::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 2;
  background: radial-gradient(120% 90% at 50% 100%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.35) 55%, rgba(0, 0, 0, 0.75) 100%);
}

.vesper-landing .page {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100dvh;
}

.vesper-landing .header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: var(--header-y) var(--header-x) 10px;
  z-index: 50;
  position: relative;
}

.vesper-landing .logo {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  justify-self: start;
  font-size: var(--logo);
  font-weight: 600;
  letter-spacing: -0.03em;
  color: #fff;
}
.vesper-landing .logo-suffix { font-weight: 400; color: var(--muted); }
.vesper-landing .logo-mark { width: var(--logo-mark); height: var(--logo-mark); }

.vesper-landing .nav {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-self: center;
}

.vesper-landing .pill {
  height: var(--nav-h);
  padding: 0 18px;
  border-radius: 7px;
  overflow: hidden;
  position: relative;
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(198, 198, 198, 0.55);
  background: linear-gradient(105deg, #050505 0%, #2a2a2a 48%, #4a4a4a 100%);
  color: #f3f3f3;
  font-size: var(--nav);
  font-weight: 400;
  letter-spacing: -0.01em;
  white-space: nowrap;
  transition: background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
}
.vesper-landing .pill::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.16) 50%, transparent 70%);
  transform: translateX(-120%);
  transition: transform 0.6s ease;
}
.vesper-landing .pill:hover::before { transform: translateX(120%); }
.vesper-landing .pill:hover {
  border-color: rgba(235, 235, 235, 0.9);
  background: linear-gradient(105deg, #111 0%, #3a3a3a 45%, #6a6a6a 100%);
  box-shadow: 0 0 18px rgba(200, 210, 230, 0.18);
}

.vesper-landing .header-right { justify-self: end; display: flex; align-items: center; gap: 10px; }

.vesper-landing .burger {
  display: none;
  width: 42px;
  height: 42px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: rgba(8, 8, 8, 0.55);
  z-index: 80;
  cursor: pointer;
  place-items: center;
  gap: 5px;
}
.vesper-landing .burger-bar {
  width: 16px;
  height: 1.5px;
  border-radius: 1px;
  background: #fff;
  transition: transform 0.25s ease, opacity 0.2s ease;
}
.vesper-landing .burger:hover { border-color: rgba(255, 255, 255, 0.32); background: rgba(255, 255, 255, 0.05); }
body.fiscora-menu-open .vesper-landing .burger-bar-1 { transform: translateY(6.5px) rotate(45deg); }
body.fiscora-menu-open .vesper-landing .burger-bar-2 { opacity: 0; }
body.fiscora-menu-open .vesper-landing .burger-bar-3 { transform: translateY(-6.5px) rotate(-45deg); }

.vesper-landing .btn {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: var(--btn-h);
  padding: 0 16px;
  border-radius: 6px;
  font-size: var(--btn);
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease, color 0.35s ease, filter 0.35s ease;
}
.vesper-landing .btn::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(115deg, transparent 20%, rgba(255, 255, 255, 0.45) 48%, transparent 76%);
  transform: translateX(-130%);
  transition: transform 0.65s ease;
}
.vesper-landing .btn:hover::after { transform: translateX(130%); }
.vesper-landing .btn > span { position: relative; z-index: 2; }

.vesper-landing .btn-solid {
  background: linear-gradient(180deg, #ffffff 0%, #e7e7e7 48%, #cfcfcf 100%);
  color: #111;
  border: 1px solid #fff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95);
}
.vesper-landing .btn-solid:hover {
  background: linear-gradient(180deg, #fff 0%, #f3f6ff 42%, #d5def2 100%);
  border-color: #f2f6ff;
  box-shadow: inset 0 1px 0 #fff, 0 0 22px rgba(186, 208, 255, 0.35), 0 8px 18px rgba(255, 255, 255, 0.12);
}
.vesper-landing .hero-actions .btn-solid:hover {
  box-shadow: inset 0 1px 0 #fff, 0 0 26px rgba(186, 208, 255, 0.4), 0 8px 18px rgba(255, 255, 255, 0.14);
}

.vesper-landing .btn-ghost {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(0, 0, 0, 0.45) 50%, rgba(160, 175, 200, 0.08));
  color: #fff;
  border: 1px solid rgba(198, 198, 198, 0.45);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}
.vesper-landing .btn-ghost:hover {
  background: linear-gradient(135deg, rgba(210, 225, 255, 0.18), rgba(0, 0, 0, 0.35) 48%, rgba(180, 195, 220, 0.16));
  border-color: rgba(220, 230, 255, 0.75);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 0 20px rgba(170, 200, 255, 0.22);
}
.vesper-landing .hero-actions .btn-ghost {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(0, 0, 0, 0.5) 46%, rgba(150, 170, 200, 0.1));
  border: 1px solid rgba(198, 198, 198, 0.55);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.vesper-landing .hero-actions .btn-ghost:hover {
  box-shadow: 0 0 24px rgba(170, 200, 255, 0.28);
  border-color: rgba(220, 230, 255, 0.8);
}
.vesper-landing .hero-actions .btn { height: var(--hero-btn-h); padding: 0 18px; }

.vesper-landing .hero {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 8px 24px var(--hero-gap);
  min-height: 0;
}
.vesper-landing .hero-copy {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: var(--copy-max);
  width: 100%;
}

.vesper-landing .badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 22px;
  padding: 9px 15px;
  border: 0;
  border-radius: 5px;
  background: linear-gradient(90deg, #7d7d7d 0%, #2a2a2a 52%, #0a0a0a 100%);
  color: #f2f2f2;
  font-size: var(--badge);
  font-weight: 400;
  letter-spacing: -0.01em;
}
.vesper-landing .badge-star { filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.45)); }

.vesper-landing h1 {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-weight: 500;
  letter-spacing: -0.045em;
  line-height: 1.12;
  color: #fff;
  font-size: var(--h1);
  margin: 0;
}
.vesper-landing .headline-line { display: block; overflow: hidden; padding: 0.06em 0.15em 0.14em; }
.vesper-landing h1 em {
  font-family: "Instrument Serif", "Times New Roman", Times, serif;
  font-style: italic;
  font-weight: 400;
  font-size: 1.08em;
  letter-spacing: -0.03em;
  color: var(--muted);
}

.vesper-landing .lede {
  max-width: var(--lede-max);
  margin-top: 18px;
  color: var(--muted);
  font-size: var(--lede);
  font-weight: 400;
  line-height: 1.55;
  letter-spacing: -0.015em;
}

.vesper-landing .hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 26px;
}

.vesper-landing .stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 0 var(--stats-x) var(--stats-y);
  padding-bottom: max(var(--stats-y), env(safe-area-inset-bottom));
  color: var(--stat);
}
.vesper-landing .stat {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  font-size: var(--stat-size);
  letter-spacing: -0.015em;
  white-space: nowrap;
}
.vesper-landing .stat-icon { width: 20px; height: 20px; flex-shrink: 0; }
.vesper-landing .stat-icon-wide { width: 38px; height: 21px; flex-shrink: 0; }

.vesper-landing .visuals-toggle {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 60;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(198, 198, 198, 0.35);
  background: rgba(10, 10, 10, 0.6);
  backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: -0.01em;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.25s ease, color 0.25s ease, background 0.25s ease;
}
.vesper-landing .visuals-toggle:hover {
  border-color: rgba(255, 255, 255, 0.55);
  color: #fff;
}
.vesper-landing .visuals-toggle[aria-pressed="true"] {
  border-color: rgba(255, 255, 255, 0.7);
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}
.vesper-landing .visuals-toggle-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.35);
  transition: background 0.25s ease;
}
.vesper-landing .visuals-toggle[aria-pressed="true"] .visuals-toggle-dot {
  background: #7dd3b0;
}
@media (max-width: 900px) {
  .vesper-landing .visuals-toggle { right: 12px; bottom: 12px; height: 32px; padding: 0 10px; font-size: 11.5px; }
}

.vesper-landing .menu-backdrop {
  display: none;
}

/* ---------- entrance motion ---------- */
.vesper-landing .appear {
  opacity: 1;
  animation-duration: 1.05s;
  animation-fill-mode: both;
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  animation-delay: var(--d, 0.08s);
}
.vesper-landing .appear.is-in { animation: none; opacity: 1; transform: none; clip-path: none; filter: none; }
.vesper-landing .appear--scale { animation-name: v-in-scale; }
.vesper-landing .appear--soft { animation-name: v-in-soft; }
.vesper-landing .appear--mask { animation-name: v-in-mask; }
.vesper-landing .appear--pop { animation-name: v-in-pop; }
.vesper-landing .appear--btn { animation-name: v-in-btn; }
.vesper-landing .appear--side { animation-name: v-in-side; }
.vesper-landing .appear--stat { animation-name: v-in-stat; }

@keyframes v-in-scale { from { opacity: 0; transform: scale(0.84); } to { opacity: 1; transform: scale(1); } }
@keyframes v-in-soft { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes v-in-mask { from { opacity: 0; transform: translateY(40%); } to { opacity: 1; transform: translateY(0); } }
@keyframes v-in-pop {
  0% { opacity: 0; transform: scale(0.9); }
  70% { opacity: 1; transform: scale(1.03); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes v-in-btn { from { opacity: 0; transform: translateY(18px) scale(0.94); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes v-in-side { from { opacity: 0; transform: translateX(22px); } to { opacity: 1; transform: translateX(0); } }
@keyframes v-in-stat { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes v-in-star {
  0% { transform: scale(0.2) rotate(-50deg); }
  65% { transform: scale(1.2) rotate(8deg); }
  100% { transform: scale(1) rotate(0); }
}
@keyframes v-in-em { from { opacity: 0.35; filter: blur(4px); } to { opacity: 1; filter: blur(0); } }

.vesper-landing .badge-star { animation: v-in-star 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.28s both; }
.vesper-landing h1 em { animation: v-in-em 1.2s ease 0.72s both; }

@media (prefers-reduced-motion: reduce) {
  .vesper-landing *, .vesper-landing *::before, .vesper-landing *::after { transition: none !important; animation: none !important; }
  .vesper-landing .appear, .vesper-landing h1 em, .vesper-landing .badge-star {
    opacity: 1 !important; transform: none !important; clip-path: none !important; filter: none !important;
  }
}

/* ---------- responsive ---------- */
@media (min-width: 1600px) {
  .vesper-landing {
    --logo: 17px; --logo-mark: 24px; --nav: 15px; --nav-h: 44px; --btn: 15px; --btn-h: 44px;
    --hero-btn-h: 48px; --h1: 64px; --lede: 18px; --badge: 13.5px; --stat-size: 15px;
    --header-y: 28px; --header-x: 64px; --stats-x: 96px; --stats-y: 44px; --copy-max: 980px; --lede-max: 540px;
  }
  .vesper-landing .pill { padding: 0 20px; }
  .vesper-landing .badge { margin-bottom: 26px; }
  .vesper-landing .lede { margin-top: 22px; }
  .vesper-landing .hero-actions { margin-top: 30px; gap: 12px; }
  .vesper-landing .stat-icon { width: 22px; height: 22px; }
  .vesper-landing .stat-icon-wide { width: 45px; height: 24px; }
}
@media (min-width: 1920px) {
  .vesper-landing {
    --logo: 18px; --logo-mark: 26px; --nav: 16px; --nav-h: 48px; --btn: 16px; --btn-h: 48px;
    --hero-btn-h: 52px; --h1: 76px; --lede: 20px; --badge: 14.5px; --stat-size: 16px;
    --header-y: 32px; --header-x: 80px; --stats-x: 120px; --stats-y: 52px; --copy-max: 1120px; --lede-max: 620px;
  }
  .vesper-landing .nav { gap: 10px; }
  .vesper-landing .pill { padding: 0 22px; }
  .vesper-landing .btn { padding: 0 22px; }
  .vesper-landing .badge { padding: 10px 15px; }
  .vesper-landing .stat-icon-wide { width: 48px; height: 26px; }
}
@media (min-width: 2560px) {
  .vesper-landing { --h1: 88px; --lede: 22px; --header-x: 120px; --stats-x: 160px; --copy-max: 1280px; --lede-max: 680px; }
}
@media (min-width: 1280px) and (max-width: 1599px) {
  .vesper-landing { --h1: 54px; --lede: 16px; --header-x: 48px; --stats-x: 80px; --copy-max: 900px; }
}
@media (min-width: 901px) and (max-width: 1279px) {
  .vesper-landing {
    --logo: 15px; --nav: 13px; --nav-h: 36px; --btn: 13px; --btn-h: 38px; --hero-btn-h: 40px;
    --h1: 42px; --lede: 15px; --badge: 12px; --stat-size: 12.5px; --header-y: 16px; --header-x: 28px;
    --stats-x: 36px; --stats-y: 28px; --hero-gap: 64px; --copy-max: 760px; --lede-max: 440px;
  }
  .vesper-landing .pill { padding: 0 14px; }
  .vesper-landing .badge { margin-bottom: 16px; }
  .vesper-landing .lede { margin-top: 14px; }
  .vesper-landing .hero-actions { margin-top: 20px; }
}
@media (min-width: 901px) and (max-height: 850px) {
  .vesper-landing { --header-y: 14px; --stats-y: 24px; --hero-gap: 48px; --h1: 40px; }
  .vesper-landing .badge { margin-bottom: 12px; }
  .vesper-landing .lede { margin-top: 12px; }
  .vesper-landing .hero-actions { margin-top: 16px; }
}
@media (min-width: 901px) and (max-height: 720px) {
  .vesper-landing {
    --h1: 34px; --lede: 14px; --hero-gap: 32px; --stats-y: 18px; --nav-h: 30px; --btn-h: 34px; --hero-btn-h: 36px;
  }
  .vesper-landing .badge { margin-bottom: 8px; }
}
@media (min-width: 901px) {
  body.fiscora-landing-lock { height: 100dvh; overflow: hidden; background: #000; }
  .vesper-landing.locked { height: 100dvh; overflow: hidden; }
  .vesper-landing.locked .page { height: 100dvh; overflow: hidden; }
}

@media (max-width: 900px) {
  .vesper-landing .header { grid-template-columns: 1fr auto auto; gap: 8px; }
  .vesper-landing .logo, .vesper-landing .header-right { z-index: 80; }
  .vesper-landing .nav { display: none; }
  .vesper-landing .burger { display: grid; }
  body.fiscora-menu-open .vesper-landing .menu-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(8, 8, 8, 0.42);
    backdrop-filter: blur(24px);
    opacity: 1;
    visibility: visible;
    transition: opacity 0.28s ease;
  }
  body.fiscora-menu-open .vesper-landing .nav {
    display: flex;
    flex-direction: column;
    position: fixed;
    inset: 0;
    z-index: 45;
    background: transparent;
    justify-content: center;
    align-items: center;
    gap: 12px;
    padding: max(96px, calc(env(safe-area-inset-top) + 88px)) 22px 32px;
  }
  body.fiscora-menu-open .vesper-landing .nav .pill {
    width: 100%;
    justify-content: center;
    height: 56px;
    font-size: 19px;
    border-radius: 10px;
  }
  body.fiscora-menu-open { overflow: hidden; }

  .vesper-landing .hero { padding: 20px 20px 64px; align-items: flex-end; }
  .vesper-landing .stats { flex-direction: column; align-items: center; gap: 16px; }
  .vesper-landing .stat { white-space: normal; text-align: center; }
  .vesper-landing .hero-copy, .vesper-landing .lede { max-width: 100%; }
  .vesper-landing {
    --logo: 16px; --btn: 15px; --btn-h: 46px; --hero-btn-h: 48px; --h1: 36px; --lede: 16.5px;
    --badge: 13.5px; --stat-size: 15px; --header-y: 16px; --header-x: 16px; --stats-x: 20px;
    --stats-y: 28px; --hero-gap: 36px;
  }
}
@media (max-width: 560px) {
  .vesper-landing { --h1: 34px; --lede: 16px; --header-x: 16px; }
  .vesper-landing .hero-actions { flex-direction: column; }
  .vesper-landing .hero-actions .btn { width: 100%; }
}
`;

const NAV_LINKS = [
  { href: "/chat", label: "Chat", mod: "appear--scale", delay: "0.16s" },
  { href: "/dashboard", label: "Dashboard", mod: "appear--soft", delay: "0.28s" },
  { href: "/login", label: "Log in", mod: "appear--scale", delay: "0.40s" },
];

const STATS = [
  {
    label: "6 specialist agents behind one coordinator",
    icon: (
      <svg className="stat-icon" viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id="v-pill-a" x1="3" y1="2" x2="14" y2="22">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.38" />
            <stop offset="1" stopColor="#3a3a3a" stopOpacity="0.62" />
          </linearGradient>
          <linearGradient id="v-pill-b" x1="14" y1="2" x2="3" y2="22">
            <stop offset="0" stopColor="#3a3a3a" stopOpacity="0.38" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.62" />
          </linearGradient>
        </defs>
        <rect x="3.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#v-pill-a)" />
        <rect x="13.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#v-pill-b)" />
        <rect x="9.2" y="10.9" width="5.6" height="2.2" rx="1.1" fill="#4a4a4a" />
      </svg>
    ),
  },
  {
    label: "One CSV upload becomes a full budget breakdown",
    icon: (
      <svg className="stat-icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="6.2" fill="#ffffff" />
        <path d="M12 7.1v7.4" stroke="#111" strokeWidth="1.85" strokeLinecap="round" />
        <path d="M8.15 12.35L12 16.2l3.85-3.85" stroke="#111" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
  {
    label: "Built for investors, savers & anyone paying off debt",
    icon: (
      <svg className="stat-icon-wide" viewBox="0 0 40 22" aria-hidden="true">
        <circle cx="10.2" cy="11" r="9.2" fill="#2b2b2b" />
        <ellipse cx="10.2" cy="12.1" rx="4.15" ry="3.7" fill="#f4f4f4" />
        <path d="M6.6 6.2 L8.5 9.2 L5.6 9.4Z" fill="#2b2b2b" />
        <path d="M13.8 6.2 L11.9 9.2 L14.8 9.4Z" fill="#2b2b2b" />
        <circle cx="8.7" cy="12.3" r="0.7" fill="#1a1a1a" />
        <circle cx="11.7" cy="12.3" r="0.7" fill="#1a1a1a" />
        <circle cx="20.2" cy="11" r="9.2" fill="#ffffff" />
        <circle cx="18" cy="10.5" r="1.7" fill="#111111" />
        <circle cx="22.4" cy="10.5" r="1.7" fill="#111111" />
        <ellipse cx="20.2" cy="13" rx="1.1" ry="0.8" fill="#d8d8d8" />
        <path d="M17.5 14.6c1.2 1.3 4 1.3 5.2 0" stroke="#111" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        <circle cx="30.2" cy="11" r="9.2" fill="#f26b1d" />
        <text x="30.2" y="15.1" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="12.5" fill="#ffffff" textAnchor="middle">e</text>
      </svg>
    ),
  },
];

export default function LandingHero() {
  const { isAuthenticated } = useAuth();
  const rootRef = useRef<HTMLDivElement>(null);
  const [showOrb, setShowOrb] = useState(false);

  useEffect(() => {
    document.body.classList.add("fiscora-landing-lock");
    return () => document.body.classList.remove("fiscora-landing-lock");
  }, []);

  useEffect(() => {
    // The Three.js particle layer is opt-in ("Richer visuals" toggle below),
    // not auto-loaded -- its bundle is heavy enough on the main thread that
    // even deferring it to an idle callback didn't move Lighthouse's
    // performance score (mainthread-work-breakdown/bootup-time measure total
    // execution across the whole trace, not just when it happens). Only
    // restore a returning visitor's own opt-in choice, and only after mount
    // so there's no hydration mismatch or layout shift on first paint.
    // Deferred a tick so setShowOrb isn't called synchronously within the
    // effect body itself (react-hooks/set-state-in-effect).
    if (localStorage.getItem("fiscora_richer_visuals") === "1") {
      queueMicrotask(() => setShowOrb(true));
    }
  }, []);

  const toggleOrb = () => {
    setShowOrb((prev) => {
      const next = !prev;
      localStorage.setItem("fiscora_richer_visuals", next ? "1" : "0");
      return next;
    });
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const appearEls = Array.from(root.querySelectorAll<HTMLElement>(".appear"));
    const markIn = (el: HTMLElement) => el.classList.add("is-in");
    appearEls.forEach((el) => el.addEventListener("animationend", () => markIn(el), { once: true }));

    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        appearEls.forEach((el) => {
          const anims = el.getAnimations ? el.getAnimations() : [];
          const active = anims.some((a) => a.playState === "running" || a.playState === "finished");
          if (!active) markIn(el);
        });
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  useEffect(() => {
    const closeMenu = () => document.body.classList.remove("fiscora-menu-open");

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    const onResize = () => {
      if (window.matchMedia("(min-width: 901px)").matches) closeMenu();
    };

    document.addEventListener("keydown", onKeydown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKeydown);
      window.removeEventListener("resize", onResize);
      closeMenu();
    };
  }, []);

  const toggleMenu = () => {
    const isOpen = document.body.classList.toggle("fiscora-menu-open");
    burgerRef.current?.setAttribute("aria-expanded", String(isOpen));
    burgerRef.current?.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  };
  const closeMenuOnNavClick = () => document.body.classList.remove("fiscora-menu-open");
  const burgerRef = useRef<HTMLButtonElement>(null);

  const primaryHref = isAuthenticated ? "/chat" : "/signup";
  const primaryLabel = isAuthenticated ? "Open Chat" : "Get Started";
  const secondaryHref = isAuthenticated ? "/dashboard" : "/login";
  const secondaryLabel = isAuthenticated ? "View Dashboard" : "Log in";

  return (
    <div ref={rootRef} className="vesper-landing locked">
      <style>{CSS}</style>
      <div className="grain" />
      <div className="hero-photo">
        <WaveBackground />
        {showOrb && <ParticleOrb />}
      </div>
      <div className="page">
        <div className="menu-backdrop" />
        <header className="header">
          <a href="#top" className="logo appear appear--scale" style={{ "--d": "0.08s" } as React.CSSProperties} aria-label="Fiscora.ai">
            <svg className="logo-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <g transform="rotate(-30 12 12)">
                <circle cx="7.3" cy="3.2" r="1.45" />
                <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
                <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
                <circle cx="16.7" cy="20.8" r="1.45" />
              </g>
            </svg>
            Fiscora<span className="logo-suffix">.ai</span>
          </a>

          <nav className="nav" id="site-nav" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenuOnNavClick}
                className={`pill appear ${link.mod}`}
                style={{ "--d": link.delay } as React.CSSProperties}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="header-right">
            <Link
              href={primaryHref}
              className="btn btn-solid header-cta appear appear--scale"
              style={{ "--d": "0.34s" } as React.CSSProperties}
            >
              <span>{primaryLabel}</span>
            </Link>
            <button
              ref={burgerRef}
              type="button"
              className="burger appear appear--scale"
              style={{ "--d": "0.34s" } as React.CSSProperties}
              aria-controls="site-nav"
              aria-expanded="false"
              aria-label="Open menu"
              onClick={toggleMenu}
            >
              <span className="burger-bar burger-bar-1" />
              <span className="burger-bar burger-bar-2" />
              <span className="burger-bar burger-bar-3" />
            </button>
          </div>
        </header>

        <main className="hero" id="top">
          <div className="hero-copy">
            <span className="badge appear appear--pop" style={{ "--d": "0.22s" } as React.CSSProperties}>
              <svg className="badge-star" width="18" height="20" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
              </svg>
              Unified AI Financial Platform
            </span>

            <h1>
              <span className="headline-line appear appear--mask" style={{ "--d": "0.42s" } as React.CSSProperties}>
                One <em>AI coach</em> for your
              </span>
              <span className="headline-line appear appear--mask" style={{ "--d": "0.62s" } as React.CSSProperties}>
                money, markets &amp; debt.
              </span>
            </h1>

            <p
              className="lede appear appear--soft"
              style={{ "--d": "0.82s", animationDuration: "1.25s" } as React.CSSProperties}
            >
              Fiscora routes every question to a specialist agent -- market research, investment
              analysis, budgeting, savings, or debt -- then merges the answers into one clear plan.
            </p>

            <div className="hero-actions">
              <Link href={primaryHref} className="btn btn-solid appear appear--btn" style={{ "--d": "0.96s" } as React.CSSProperties}>
                <span>{primaryLabel}</span>
              </Link>
              <Link href={secondaryHref} className="btn btn-ghost appear appear--side" style={{ "--d": "1.10s" } as React.CSSProperties}>
                <span>{secondaryLabel}</span>
              </Link>
            </div>
          </div>
        </main>

        <footer className="stats">
          {STATS.map((stat, i) => (
            <span
              key={stat.label}
              className="stat appear appear--stat"
              style={{ "--d": `${1.12 + i * 0.16}s` } as React.CSSProperties}
            >
              {stat.icon}
              {stat.label}
            </span>
          ))}
        </footer>

        <button
          type="button"
          onClick={toggleOrb}
          aria-pressed={showOrb}
          className="visuals-toggle"
          title="Toggles an animated 3D particle layer -- adds a heavier download, off by default"
        >
          <span className="visuals-toggle-dot" aria-hidden="true" />
          Richer visuals
        </button>
      </div>
    </div>
  );
}
