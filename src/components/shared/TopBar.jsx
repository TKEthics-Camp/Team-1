// `className` lets a screen opt into a different bar treatment — Home passes
// "home-bar" for the Figma's bare, un-ruled header. Omitting it keeps the
// glass bar every other screen uses.
export default function TopBar({ children, className = "" }) {
  return <div className={"topbar " + className}>{children}</div>;
}
