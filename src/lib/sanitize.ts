/**
 * Server-side text sanitising for user-supplied fields.
 *
 * The client is untrusted, so every product field is normalised on the server
 * before it is stored: control characters are stripped, angle brackets are
 * removed (defence in depth against stored XSS if a value is ever rendered as
 * HTML instead of text), and whitespace is collapsed/trimmed.
 */

/** Remove control characters and dangerous markup delimiters, then trim. */
export function sanitizeText(value: string): string {
	return (
		value
			// `\p{Cc}` matches Unicode control characters (C0, DEL and C1) without
			// writing the raw control code points into the source.
			.replace(/\p{Cc}/gu, " ")
			.replace(/[<>]/g, "")
			.replace(/\s{2,}/g, " ")
			.trim()
	);
}
