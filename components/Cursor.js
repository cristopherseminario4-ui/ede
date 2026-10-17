"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

// Cursor propio (solo con mouse): punto + aro que crece sobre enlaces y botones.
export default function Cursor() {
  const dot = useRef(null);
  const ring = useRef(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.documentElement.classList.add("has-cursor");
    const dx = gsap.quickTo(dot.current, "x", { duration: 0.12, ease: "power3.out" });
    const dy = gsap.quickTo(dot.current, "y", { duration: 0.12, ease: "power3.out" });
    const rx = gsap.quickTo(ring.current, "x", { duration: 0.5, ease: "power3.out" });
    const ry = gsap.quickTo(ring.current, "y", { duration: 0.5, ease: "power3.out" });
    const move = (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); document.documentElement.classList.add("cursor-on"); };
    const over = (e) => ring.current?.classList.toggle("big", !!e.target.closest?.("a, button, summary, label, input, select, [data-hover]"));
    const out = () => document.documentElement.classList.remove("cursor-on");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerover", over);
    document.addEventListener("pointerleave", out);
    return () => {
      document.documentElement.classList.remove("has-cursor", "cursor-on");
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerover", over); document.removeEventListener("pointerleave", out);
    };
  }, []);

  return (<><div className="cursor-ring" ref={ring} aria-hidden /><div className="cursor-dot" ref={dot} aria-hidden /></>);
}
