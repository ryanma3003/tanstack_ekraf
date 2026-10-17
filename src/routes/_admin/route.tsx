import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import DashboardShell from "@/components/DashboardShell";
import { AuthProvider } from "@/lib/auth-context";
import { getServerSession } from "@/lib/server/auth";

export const Route = createFileRoute("/_admin")({
	beforeLoad: async () => {
		const { session, user, role } = await getServerSession();
		if (!session || !user) {
			// Authentication is enforced here (server-side) as well as in every
			// mutating server function; navigation guards are only UX.
			throw redirect({ to: "/login" });
		}
		return { user, role: role ?? "user" };
	},
	component: AdminLayout,
});

function AdminLayout() {
	const { user, role } = Route.useRouteContext();

	return (
		<AuthProvider value={{ user, role }}>
			<DashboardShell>
				<Outlet />
			</DashboardShell>
		</AuthProvider>
	);
}
