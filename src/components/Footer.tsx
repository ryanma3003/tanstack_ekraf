import { Package2 } from "lucide-react";
export default function Footer() {
  return <footer className="mt-16 border-t border-[var(--line)] px-4 py-7 text-[var(--sea-ink-soft)]"><div className="page-wrap flex flex-col items-start justify-between gap-3 text-sm sm:flex-row sm:items-center"><div className="flex items-center gap-2"><Package2 size={17} /><span>EKRAF Commerce Studio</span></div><p className="m-0 text-xs">Product and user management, made simpler.</p></div></footer>;
}
