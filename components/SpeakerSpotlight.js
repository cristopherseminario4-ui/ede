"use client";
import { useState } from "react";
import { SPEAKERS } from "@/lib/config";

// Posición aproximada (% del afiche) del rostro de cada ponente, para el foco de luz.
const POS = {
  "Vitmer Hilario": [38, 33],
  "Sandro Meléndez": [27, 24],
  "Jair Arango": [51, 22],
  "César Mormontoy": [58, 40],
  "Javier Cubas": [20, 37],
  "Augusto Peñaloza": [12, 51],
  "Yudis Lonzoy": [66, 56],
};

export default function SpeakerSpotlight() {
  const [who, setWho] = useState(null);
  const [x, y] = who ? POS[who] : [50, 50];
  return (
    <div className="spot">
      <figure className="poster" style={{ "--sx": `${x}%`, "--sy": `${y}%` }} data-reveal>
        <img src="/img/ponentes.jpg" alt="Ponentes: Vitmer Hilario, Sandro Meléndez, Jair Arango, César Mormontoy, Javier Cubas, Augusto Peñaloza y Yudis Lonzoy" />
        <span className={`spot-mask ${who ? "on" : ""}`} aria-hidden />
      </figure>
      <ol className="spk" onMouseLeave={() => setWho(null)}>
        {SPEAKERS.map((s, i) => (
          <li key={s} onMouseEnter={() => setWho(s)} onFocus={() => setWho(s)} tabIndex={0} data-hover>
            <span>{s}</span><small>{String(i + 1).padStart(2, "0")}</small>
          </li>
        ))}
      </ol>
    </div>
  );
}
