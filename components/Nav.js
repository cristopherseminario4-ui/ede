"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ZONES, currentPrice } from "@/lib/config";

const LINKS = [
  { href: "/ponentes", label: "Ponentes" },
  { href: "/experiencia", label: "Experiencia" },
  { href: "/entradas", label: "Entradas" },
  { href: "/stands", label: "Stands" },
  { href: "/faq", label: "Preguntas" },
];

export default function Nav() {
  const path = usePathname();
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [past, setPast] = useState(false);

  useEffect(() => {
    let last = 0;
    const onScroll = () => {
      const y = window.scrollY;
      setSolid(y > 40);
      setHidden(y > last && y > 240);
      setPast(y > 700);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; }, [open]);

  const from = currentPrice(ZONES[0]);
  const showCta = past && path !== "/entradas" && !path.startsWith("/admin") && !path.startsWith("/gracias");

  return (
    <>
      <nav className={`site-nav ${solid ? "solid" : ""} ${hidden && !open ? "hide" : ""}`}>
        <Link className="brand" href="/" aria-label="EDE 2.0 · inicio">
          <img src="/img/escudo.png" alt="" width="34" height="42" /><span>EDE<b>·</b>2.0</span>
        </Link>
        <div className="nav-links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={path === l.href ? "active" : ""}>{l.label}</Link>
          ))}
          <Link className="cta-mini" href="/entradas" data-magnetic>Comprar</Link>
        </div>
        <button className={`burger ${open ? "open" : ""}`} onClick={() => setOpen(!open)} aria-label="Menú" aria-expanded={open}><i /><i /></button>
      </nav>

      <div className={`menu ${open ? "open" : ""}`} aria-hidden={!open}>
        {[{ href: "/", label: "Inicio" }, ...LINKS].map((l, i) => (
          <Link key={l.href} href={l.href} style={{ "--i": i }}>{l.label}</Link>
        ))}
        <Link className="btn" href="/entradas" style={{ "--i": 6 }}>Comprar entrada <span aria-hidden>→</span></Link>
      </div>

      {showCta && (
        <Link className="float-cta" href="/entradas" data-magnetic>
          <span>Entradas desde</span><b>S/ {from}</b><i aria-hidden>→</i>
        </Link>
      )}
    </>
  );
}
