"use client";
import { useEffect } from "react";

// Guarda el código del asesor del link (?a=codigo) para atribuirle la venta, durante 30 días.
export default function AdvisorRef() {
  useEffect(() => {
    try {
      const a = new URLSearchParams(window.location.search).get("a");
      if (a && /^[a-z0-9_-]{3,30}$/i.test(a)) localStorage.setItem("ede_asesor", a.toLowerCase());
    } catch {}
  }, []);
  return null;
}
