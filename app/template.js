// Transición entre páginas: solo opacidad (un transform rompería los elementos fixed del checkout).
export default function Template({ children }) {
  return <div className="page-in">{children}</div>;
}
