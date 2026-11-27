export default function Tag({ tone = '', children }) {
  return <span className={`tag ${tone}`}>{children}</span>;
}
