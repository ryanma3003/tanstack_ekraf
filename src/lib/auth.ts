import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { adapter } from "./db";

const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
	database: adapter,
	baseURL: process.env.BETTER_AUTH_URL,
	secret: process.env.BETTER_AUTH_SECRET,
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		minPasswordLength: 8,
		maxPasswordLength: 128,
	},
	session: {
		expiresIn: 60 * 60 * 24, // 1 day session timeout
		updateAge: 60 * 60, // refresh once per hour while active
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5,
		},
	},
	// Brute-force protection: throttle credential endpoints per IP. This is
	// enforced on the server for every request, not just in the browser.
	rateLimit: {
		enabled: true,
		window: 60,
		max: 300,
		customRules: {
			"/sign-in/email": { window: 60, max: 10 },
			"/sign-up/email": { window: 60, max: 10 },
		},
	},
	advanced: {
		// `httpOnly` + `sameSite=lax` keep the session cookie out of reach of
		// JavaScript and block cross-site request forgery by default. `secure`
		// (and the `__Secure-` prefix) is applied automatically in production.
		useSecureCookies: isProduction,
		cookiePrefix: "ekraf",
		defaultCookieAttributes: {
			httpOnly: true,
			sameSite: "lax",
			path: "/",
		},
		// Explicitly keep the built-in CSRF/origin protections enabled.
		disableCSRFCheck: false,
		disableOriginCheck: false,
	},
	trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000", "http://localhost:3000"],
	plugins: [tanstackStartCookies()],
});

export default auth;
