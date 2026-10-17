export default function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="mt-20 border-t border-[var(--line)] px-4 pb-14 pt-10 text-[var(--sea-ink-soft)]">
			<div className="page-wrap flex flex-col items-center justify-between gap-2 text-center text-sm sm:flex-row sm:text-left">
				<p className="m-0">&copy; {year} Ekraf Admin. All rights reserved.</p>
				<p className="m-0">Built with TanStack Start, TanStack Query &amp; Better Auth.</p>
			</div>
		</footer>
	);
}
