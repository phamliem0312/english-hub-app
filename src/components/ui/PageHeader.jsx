export default function PageHeader({ kicker, title, children, actions }) {
  return (
    <header className="page-head">
      {kicker && <div className="kicker">{kicker}</div>}
      <h1 className="title">{title}</h1>
      {children && <p className="lede">{children}</p>}
      {actions && <div className="row">{actions}</div>}
    </header>
  );
}
