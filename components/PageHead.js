export default function PageHead({ eyebrow, title, children }) {
  return (
    <header className="page-head">
      <div className="wrap">
        <p className="eyebrow" data-reveal>{eyebrow}</p>
        <h1 className="huge" data-split>{title}</h1>
        {children && <p className="lead" data-reveal>{children}</p>}
      </div>
    </header>
  );
}
