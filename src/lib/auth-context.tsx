import type { Role } from "@/lib/db";
import { createContext, useContext } from "react";

export interface SessionUser {
	id: string;
	name?: string | null;
	email: string;
}

interface AuthContextValue {
	user: SessionUser;
	role: Role;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
	value,
	children,
}: {
	value: AuthContextValue;
	children: React.ReactNode;
}) {
	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access the signed-in user + role from inside the admin shell. */
export function useAuth(): AuthContextValue {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used inside the admin area");
	}
	return context;
}
