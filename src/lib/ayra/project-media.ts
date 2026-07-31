export const APPLICATION_MEDIA_ACCEPT = "image/jpeg,image/png,image/webp";
export const MAX_PROJECT_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_GALLERY_IMAGES = 8;
export const MAX_PROJECT_MEDIA_BYTES = 60 * 1024 * 1024;
export const MAIN_IMAGE_MIN_WIDTH = 2000;
export const MAIN_IMAGE_MIN_HEIGHT = 1125;
export const GALLERY_IMAGE_MIN_LONG_SIDE = 1200;
export const GALLERY_IMAGE_MIN_SHORT_SIDE = 800;

export type ProjectMediaRole = "main" | "gallery";
export type ProjectMediaFocalPosition = "center" | "top" | "bottom" | "left" | "right";
export type ProjectMediaMetadata = {
  key: string;
  role: ProjectMediaRole;
  alt: string;
  credit?: string;
  sortOrder: number;
  focalPosition: ProjectMediaFocalPosition;
};

export type ValidatedProjectImage = {
  bytes: Uint8Array;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
  width: number;
  height: number;
};

export type ProjectMediaErrorCode =
  | "missing"
  | "unsupported"
  | "too-large"
  | "too-many"
  | "total-too-large"
  | "dimensions"
  | "metadata";

export class ProjectMediaError extends Error {
  constructor(public readonly code: ProjectMediaErrorCode, message: string) {
    super(message);
    this.name = "ProjectMediaError";
  }
}

function u24le(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function pngDimensions(bytes: Uint8Array) {
  if (bytes.length < 24 || bytes[0] !== 0x89 || String.fromCharCode(...bytes.slice(1, 4)) !== "PNG") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function jpegDimensions(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {
        height: (bytes[offset + 5] << 8) | bytes[offset + 6],
        width: (bytes[offset + 7] << 8) | bytes[offset + 8],
      };
    }
    offset += 2 + length;
  }
  return null;
}

function webpDimensions(bytes: Uint8Array) {
  if (bytes.length < 30 || String.fromCharCode(...bytes.slice(0, 4)) !== "RIFF" || String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP") return null;
  const type = String.fromCharCode(...bytes.slice(12, 16));
  if (type === "VP8X") return { width: 1 + u24le(bytes, 24), height: 1 + u24le(bytes, 27) };
  if (type === "VP8L" && bytes[20] === 0x2f) {
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (type === "VP8 " && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return { width: (bytes[26] | (bytes[27] << 8)) & 0x3fff, height: (bytes[28] | (bytes[29] << 8)) & 0x3fff };
  }
  return null;
}

export async function validateProjectImage(file: File, role: ProjectMediaRole): Promise<ValidatedProjectImage> {
  if (!file || file.size === 0) throw new ProjectMediaError("missing", "A project image is required.");
  if (file.size > MAX_PROJECT_IMAGE_BYTES) throw new ProjectMediaError("too-large", "Each image must be 10 MB or smaller.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = pngDimensions(bytes)
    ? { mimeType: "image/png" as const, extension: "png" as const, dimensions: pngDimensions(bytes)! }
    : jpegDimensions(bytes)
      ? { mimeType: "image/jpeg" as const, extension: "jpg" as const, dimensions: jpegDimensions(bytes)! }
      : webpDimensions(bytes)
        ? { mimeType: "image/webp" as const, extension: "webp" as const, dimensions: webpDimensions(bytes)! }
        : null;
  if (!detected || file.type !== detected.mimeType) throw new ProjectMediaError("unsupported", "Use a genuine JPEG, PNG, or WebP image.");
  const { width, height } = detected.dimensions;
  if (role === "main" && (width < MAIN_IMAGE_MIN_WIDTH || height < MAIN_IMAGE_MIN_HEIGHT || width <= height)) {
    throw new ProjectMediaError("dimensions", "The main image must be landscape and at least 2000 × 1125 pixels.");
  }
  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);
  if (role === "gallery" && (longSide < GALLERY_IMAGE_MIN_LONG_SIDE || shortSide < GALLERY_IMAGE_MIN_SHORT_SIDE)) {
    throw new ProjectMediaError("dimensions", "Gallery photos must be at least 1200 pixels on the long side and 800 on the short side.");
  }
  return { bytes, mimeType: detected.mimeType, extension: detected.extension, width, height };
}

export function validateProjectMediaFiles(main: File | null, gallery: File[]) {
  if (!main || main.size === 0) throw new ProjectMediaError("missing", "Choose a main project image.");
  if (gallery.length > MAX_GALLERY_IMAGES) throw new ProjectMediaError("too-many", "Choose no more than eight gallery photos.");
  if ([main, ...gallery].reduce((sum, file) => sum + file.size, 0) > MAX_PROJECT_MEDIA_BYTES) {
    throw new ProjectMediaError("total-too-large", "The complete photo set must be 60 MB or smaller.");
  }
}

export function privateProjectMediaPath(applicationId: string, mediaId: string, extension: string) {
  return `${applicationId}/${mediaId}.${extension}`;
}

export function publicProjectMediaPath(initiativeId: string, mediaId: string, extension: string) {
  return `${initiativeId}/${mediaId}.${extension}`;
}

export function publicProjectMediaUrl(storagePath: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  return base ? `${base}/storage/v1/object/public/ayra-public-initiative-media/${storagePath}` : storagePath;
}
