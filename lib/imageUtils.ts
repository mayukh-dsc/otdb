import type { ImageRef } from "./types";

const NON_IMAGE_EXTENSIONS = /\.(djvu|pdf|tiff?|svg|ogg|ogv|webm|mp[34])(\?|$)/i;

export function isRenderableImage(url: string): boolean {
  return !NON_IMAGE_EXTENSIONS.test(url);
}

export function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function cleanCaption(caption?: string): string | undefined {
  if (!caption) return undefined;
  const cleaned = stripHtml(caption);
  return cleaned || undefined;
}

export function filterImageRefs(refs: ImageRef[] | undefined): ImageRef[] {
  if (!refs) return [];
  return refs
    .filter((ref) => isRenderableImage(ref.url))
    .map((ref) => ({
      ...ref,
      caption: cleanCaption(ref.caption) ?? ref.caption,
    }));
}
