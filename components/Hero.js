"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EVENT } from "@/lib/config";

function diff() {
  const ms = Math.max(0, new Date(EVENT.start) - new Date());
  return {
    d: Math.floor(ms / 864e5),
    h: Math.floor(ms / 36e5) % 24,
    m: Math.floor(ms / 6e4) % 60,
    s: Math.floor(ms / 1e3) % 60,
  };
}

export default function Hero() {
  const root = useRef(null);
  const numRef = useRef(null);
  const [t, setT] = useState(null);

  useEffect(() => {
    setT(diff());
    const id = setInterval(() => setT(diff()), 1000);
    return () => clearInterval(id);
  }, []);

  // La luz violeta sigue al cursor sobre los números (en celular se pasea sola)
  useEffect(() => {
    const el = root.current;
    const num = numRef.current;
    if (!el || !num) return;
    let raf = 0;
    const auto = () => {
      const k = performance.now() / 2600;
      const w = num.offsetWidth, h = num.offsetHeight;
      num.style.setProperty("--nx", `${w * (0.5 + 0.38 * Math.sin(k))}px`);
      num.style.setProperty("--ny", `${h * (0.5 + 0.3 * Math.cos(k * 0.8))}px`);
      raf = requestAnimationFrame(auto);
    };
    const move = (e) => {
      cancelAnimationFrame(raf);
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
      const n = num.getBoundingClientRect();
      num.style.setProperty("--nx", `${e.clientX - n.left}px`);
      num.style.setProperty("--ny", `${e.clientY - n.top}px`);
    };
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) raf = requestAnimationFrame(auto);
    el.addEventListener("pointermove", move);
    return () => { cancelAnimationFrame(raf); el.removeEventListener("pointermove", move); };
  }, []);

  const pad = (n) => String(n).padStart(2, "0");
  return (
    <header className="hero" ref={root}>
      <div className="hero-video" style={{ backgroundImage: "url(/img/hero-poster.jpg)" }}>
        <video autoPlay muted loop playsInline preload="auto" poster="/img/hero-poster.jpg">
          <source src="/video/hero.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="hero-shade" />
      <div className="hero-glow" />

      <div className="hero-mid">
        <img className="hero-logo" src="/img/logo-ede-2026.png" alt="El Despertar del Emprendedor 2026" />
        <div className="num-mask">
          <h1 className="num" ref={numRef} aria-label="14 y 15 de noviembre">14<span className="dot">·</span>15</h1>
        </div>
        <p className="eyebrow">Noviembre 2026 · {EVENT.city}</p>
        <p className="hero-title">Dos días para <em className="serif">despertar</em> al emprendedor que llevas dentro.</p>
      </div>

      <div className="hero-foot">
        <div className="count" aria-label="Cuenta regresiva">
          {t && (
            <>
              <div><b>{pad(t.d)}</b><span>días</span></div>
              <div><b>{pad(t.h)}</b><span>horas</span></div>
              <div><b>{pad(t.m)}</b><span>min</span></div>
              <div><b>{pad(t.s)}</b><span>seg</span></div>
            </>
          )}
        </div>
        <Link className="btn" href="/entradas" data-magnetic>Asegurar mi entrada <span aria-hidden>→</span></Link>
      </div>
    </header>
  );
}
