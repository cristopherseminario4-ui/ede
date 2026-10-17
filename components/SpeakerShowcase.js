"use client";
import { useState } from "react";
import { SPEAKER_DETAILS } from "@/lib/speakers";

const W = 1920, H = 1080;

// Recorte cuadrado del afiche centrado en el rostro (sin archivos extra)
function portrait({ face: [cx, cy], crop }) {
  const x = Math.min(1, Math.max(0, (cx - crop / 2) / (W - crop))) * 100;
  const y = Math.min(1, Math.max(0, (cy - crop / 2) / (H - crop))) * 100;
  return { backgroundImage: "url(/img/ponentes.jpg)", backgroundSize: `${(W / crop) * 100}% auto`, backgroundPosition: `${x}% ${y}%` };
}

export default function SpeakerShowcase() {
  const [i, setI] = useState(0);
  const s = SPEAKER_DETAILS[i];
  return (
    <div className="showcase">
      <div className="sc-stage" key={s.slug}>
        <div className="sc-photo" style={portrait(s)} role="img" aria-label={`Retrato de ${s.name}`}>
          <span className="sc-num">{String(i + 1).padStart(2, "0")}</span>
        </div>
        <div className="sc-info">
          <p className="eyebrow">{s.role}</p>
          <h2 className="sc-name">{s.name}</h2>
          <p className="sc-bio">{s.bio}</p>
          <ul className="sc-tags">{s.tags.map((t) => <li key={t}>{t}</li>)}</ul>
          <div className="sc-nav">
            <button onClick={() => setI((i + SPEAKER_DETAILS.length - 1) % SPEAKER_DETAILS.length)} aria-label="Ponente anterior">←</button>
            <span>{i + 1} / {SPEAKER_DETAILS.length}</span>
            <button onClick={() => setI((i + 1) % SPEAKER_DETAILS.length)} aria-label="Ponente siguiente">→</button>
          </div>
        </div>
      </div>
      <ul className="sc-rail" role="tablist" aria-label="Ponentes">
        {SPEAKER_DETAILS.map((p, n) => (
          <li key={p.slug}>
            <button role="tab" aria-selected={n === i} className={n === i ? "on" : ""} onClick={() => setI(n)} onMouseEnter={() => setI(n)}>
              <span className="sc-thumb" style={portrait({ ...p, crop: p.crop + 40 })} />
              <span className="sc-label">{p.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
