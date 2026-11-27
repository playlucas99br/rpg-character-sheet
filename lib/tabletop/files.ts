import { uid, type LibraryFile, type PlacedItem, type Point } from "./model";

/** Images remain visible on the board regardless of how they were classified in the library. */
export function placedLibraryFile(file: LibraryFile, point: Point): PlacedItem {
  const ratio = (file.width ?? 128) / (file.height ?? 160);
  const height = Math.min(256, 256 / ratio);
  return { id: uid(), asset: file.asset, name: file.name, kind: file.mime.startsWith("image/") ? "image" : "document", ...point, width: Math.max(8, height * ratio), height: Math.max(8, height), rotation: 0, locked: false, flipX: false, flipY: false, hidden: false, showName: false };
}
