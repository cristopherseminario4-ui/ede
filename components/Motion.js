"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = () => window.matchMedia("(pointer: fine)").matches;

// Divide el texto en palabras con máscara (conserva etiquetas internas como <em>)
function splitWords(el) {
  if (el.dataset.splitDone) return;
  el.dataset.splitDone = "1";
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
          const w = document.createElement("span"); w.className = "w";
          const i = document.createElement("span"); i.className = "wi"; i.textContent = part;
          w.appendChild(i); frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
    });
  };
  walk(el);
}

export default function Motion() {
  const path = usePathname();

  // Scroll suave global (una sola vez)
  useEffect(() => {
    if (reduced()) return;
    const lenis = new Lenis({ lerp: 0.1, anchors: true });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (t) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
    return () => { gsap.ticker.remove(tick); lenis.destroy(); delete window.__lenis; };
  }, []);

  // Animaciones de cada página
  useEffect(() => {
    if (reduced()) return;
    let ctx;
    const cleanups = [];
    const t = setTimeout(() => {
      window.__lenis?.scrollTo(0, { immediate: true });
      ctx = gsap.context(() => {
        // barra de progreso
        gsap.to(".progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

        // texto palabra por palabra
        document.querySelectorAll("[data-split]").forEach((el) => {
          splitWords(el);
          gsap.from(el.querySelectorAll(".wi"), {
            yPercent: 118, duration: 1.05, ease: "power4.out", stagger: 0.035,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });

        // aparición de bloques (los hijos entran en cascada con data-reveal="stagger")
        document.querySelectorAll("[data-reveal]").forEach((el) => {
          const targets = el.dataset.reveal === "stagger" ? el.children : el;
          gsap.from(targets, {
            y: 46, autoAlpha: 0, duration: 0.95, ease: "power3.out", stagger: 0.12,
            clearProps: "opacity,visibility,transform",
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          });
        });

        // parallax de imágenes
        document.querySelectorAll("[data-parallax]").forEach((el) => {
          gsap.fromTo(el, { yPercent: -9 }, { yPercent: 9, ease: "none",
            scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
        });

        // contadores
        document.querySelectorAll("[data-count]").forEach((el) => {
          const end = Number(el.dataset.count); const o = { v: 0 };
          gsap.to(o, { v: end, duration: 1.8, ease: "power2.out",
            onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString("es-PE"); },
            scrollTrigger: { trigger: el, start: "top 92%", once: true } });
        });

        // barra de horas (9:00 → 21:00)
        document.querySelectorAll("[data-fill]").forEach((el) => {
          gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, ease: "none", transformOrigin: "left center",
            scrollTrigger: { trigger: el.parentElement, start: "top 85%", end: "bottom 45%", scrub: 0.6 } });
        });

        // palabras fijas que cambian al hacer scroll
        document.querySelectorAll("[data-words]").forEach((sec) => {
          const items = sec.querySelectorAll(".word");
          const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: "top top", end: "+=240%", scrub: 0.6, pin: true } });
          items.forEach((w, i) => {
            tl.fromTo(w, { autoAlpha: 0, yPercent: 28, filter: "blur(16px)" }, { autoAlpha: 1, yPercent: 0, filter: "blur(0px)", duration: 1 });
            if (i < items.length - 1) tl.to(w, { autoAlpha: 0, yPercent: -28, filter: "blur(16px)", duration: 1 }, "+=0.5");
          });
        });

        // portada
        const hero = document.querySelector(".hero");
        if (hero) {
          const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
          tl.from(".nav", { y: -24, autoAlpha: 0, duration: 0.9 }, 0.1)
            .from(".hero-logo", { scale: 0.82, autoAlpha: 0, filter: "blur(18px)", duration: 1.5 }, 0.2)
            .from(".num", { yPercent: 108, duration: 1.4 }, 0.45)
            .from(".hero .eyebrow", { autoAlpha: 0, y: 14, duration: 0.8 }, 1)
            .from(".hero-title", { autoAlpha: 0, y: 24, duration: 1 }, 1.1)
            .from(".hero-foot", { autoAlpha: 0, y: 24, duration: 1 }, 1.3);
          gsap.to(".hero-video", { yPercent: 14, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
          gsap.to(".hero-mid", { yPercent: -10, autoAlpha: 0.2, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
        }

        if (finePointer()) {
          // inclinación 3D en tarjetas
          document.querySelectorAll("[data-tilt]").forEach((el) => {
            const rx = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3.out" });
            const ry = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3.out" });
            const enter = () => gsap.set(el, { transformPerspective: 1000 });
            const move = (e) => {
              const r = el.getBoundingClientRect();
              ry(((e.clientX - r.left) / r.width - 0.5) * 7);
              rx(-((e.clientY - r.top) / r.height - 0.5) * 7);
            };
            const leave = () => { rx(0); ry(0); };
            el.addEventListener("pointerenter", enter); el.addEventListener("pointermove", move); el.addEventListener("pointerleave", leave);
            cleanups.push(() => { el.removeEventListener("pointerenter", enter); el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); });
          });
          // botones magnéticos
          document.querySelectorAll("[data-magnetic]").forEach((el) => {
            const x = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
            const y = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
            const move = (e) => { const r = el.getBoundingClientRect(); x((e.clientX - (r.left + r.width / 2)) * 0.25); y((e.clientY - (r.top + r.height / 2)) * 0.35); };
            const leave = () => { x(0); y(0); };
            el.addEventListener("pointermove", move); el.addEventListener("pointerleave", leave);
            cleanups.push(() => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); });
          });
        }
      });
      ScrollTrigger.refresh();
    }, 60);
    return () => { clearTimeout(t); cleanups.forEach((f) => f()); ctx && ctx.revert(); };
  }, [path]);

  return null;
}
