/**
 * Image helpers shared by the product form (client) and the product server
 * functions (server). Nothing here touches the DOM, so it is safe to import on
 * both sides.
 *
 * The rule is intentionally strict: an image may only ever be an `http(s)`
 * URL or an inline `data:` URL using a raster image type. SVG data URLs are
 * rejected because they can carry script payloads, and inline images are
 * capped by both byte size and pixel dimensions.
 */

export const MAX_IMAGE_DIMENSION = 512;
export const MAX_IMAGE_BYTES = 512 * 1024; // 512 KiB
/** Rough char budget for a base64 data URL (base64 inflates bytes by ~4/3). */
export const MAX_IMAGE_CHARS = 700_000;
export const ALLOWED_IMAGE_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export type ImageValidation = { ok: true } | { ok: false; error: string };

export function parseDataUrl(value: string): { mime: string; base64: string } | null {
	const match = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i.exec(value.trim());
	if (!match) return null;
	return { mime: match[1].toLowerCase(), base64: match[2] };
}

export function base64ToBytes(base64: string): Uint8Array {
	const binary = atob(base64.replace(/\s/g, ""));
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

function readUint16BE(bytes: Uint8Array, offset: number): number {
	return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
	return (
		((bytes[offset] << 24) |
			(bytes[offset + 1] << 16) |
			(bytes[offset + 2] << 8) |
			bytes[offset + 3]) >>>
		0
	);
}

/** Parse intrinsic dimensions for the raster formats we accept. */
export function getImageDimensions(
	bytes: Uint8Array,
	mime: string,
): { width: number; height: number } | null {
	if (mime === "image/png") {
		const isPng =
			bytes[0] === 0x89 &&
			bytes[1] === 0x50 &&
			bytes[2] === 0x4e &&
			bytes[3] === 0x47 &&
			bytes.length >= 24;
		if (!isPng) return null;
		return { width: readUint32BE(bytes, 16), height: readUint32BE(bytes, 20) };
	}

	if (mime === "image/jpeg") {
		if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
		let offset = 2;
		while (offset + 9 < bytes.length) {
			if (bytes[offset] !== 0xff) {
				offset++;
				continue;
			}
			const marker = bytes[offset + 1];
			// SOF0..SOF15 carry the frame dimensions (skip DHT/JPG/DAC).
			if (
				marker >= 0xc0 &&
				marker <= 0xcf &&
				marker !== 0xc4 &&
				marker !== 0xc8 &&
				marker !== 0xcc
			) {
				return { height: readUint16BE(bytes, offset + 5), width: readUint16BE(bytes, offset + 7) };
			}
			const length = readUint16BE(bytes, offset + 2);
			if (length < 2) return null;
			offset += 2 + length;
		}
		return null;
	}

	if (mime === "image/webp") {
		const isWebp =
			bytes.length >= 30 &&
			bytes[0] === 0x52 &&
			bytes[1] === 0x49 &&
			bytes[2] === 0x46 &&
			bytes[3] === 0x46 &&
			bytes[8] === 0x57 &&
			bytes[9] === 0x45 &&
			bytes[10] === 0x42 &&
			bytes[11] === 0x50;
		if (!isWebp) return null;
		// VP8X (extended) stores canvas size minus one as 24-bit values.
		if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x58) {
			const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
			const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
			return { width, height };
		}
		return null;
	}

	return null;
}

/**
 * Validate an image value coming from the client. Used both in the form (fast
 * feedback) and in `createProduct`/`updateProduct` (the authoritative check).
 */
export function validateImageValue(value: string): ImageValidation {
	const trimmed = value.trim();
	if (trimmed === "") return { ok: true };

	if (trimmed.length > MAX_IMAGE_CHARS) {
		return { ok: false, error: "Image is too large to store inline (max 512 KB)." };
	}

	const dataUrl = parseDataUrl(trimmed);
	if (dataUrl) {
		if (!ALLOWED_IMAGE_MIME.includes(dataUrl.mime as (typeof ALLOWED_IMAGE_MIME)[number])) {
			return { ok: false, error: "Inline image must be a PNG, JPEG, WebP or GIF." };
		}
		let bytes: Uint8Array;
		try {
			bytes = base64ToBytes(dataUrl.base64);
		} catch {
			return { ok: false, error: "Inline image is not valid base64." };
		}
		if (bytes.byteLength > MAX_IMAGE_BYTES) {
			return { ok: false, error: "Image exceeds the 512 KB limit." };
		}
		const dims = getImageDimensions(bytes, dataUrl.mime);
		if (dims && (dims.width > MAX_IMAGE_DIMENSION || dims.height > MAX_IMAGE_DIMENSION)) {
			return {
				ok: false,
				error: `Image is ${dims.width}×${dims.height}px; the maximum is ${MAX_IMAGE_DIMENSION}×${MAX_IMAGE_DIMENSION}px.`,
			};
		}
		return { ok: true };
	}

	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		return { ok: false, error: "Image must be an http(s) URL or an uploaded image." };
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		return { ok: false, error: "Image URL must use http or https." };
	}
	return { ok: true };
}
