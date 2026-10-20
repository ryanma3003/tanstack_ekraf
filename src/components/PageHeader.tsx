import type { ReactNode } from "react";

export default function PageHeader({
	kicker,
	title,
	description,
	actions,
}: {
	kicker: string;
	title: string;
	description?: string;
	actions?: ReactNode;
}) {
	return (
		<div className="mb-6 flex flex-wrap items-start justify-between gap-4">
			<div className="min-w-0">
				<p className="island-kicker mb-1.5">{kicker}</p>
				<h1 className="display-title text-2xl font-bold text-[var(--sea-ink)] sm:text-3xl">
					{title}
				</h1>
				{description && (
					<p className="mt-1 max-w-2xl text-sm text-[var(--sea-ink-soft)]">{description}</p>
				)}
			</div>
			{actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
		</div>
	);
}
