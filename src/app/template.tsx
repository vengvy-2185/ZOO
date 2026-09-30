// A new instance for every page: the page fades in on each navigation
// (the animation itself is on <main> in globals.css).
export default function Template({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
