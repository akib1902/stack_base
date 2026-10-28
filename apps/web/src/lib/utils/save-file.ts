/** Joins decrypted chunks and hands them to the browser as a file download. */
export function saveDecryptedBlob(parts: readonly Uint8Array[], fileName: string): void {
  const url = URL.createObjectURL(new Blob([...parts] as BlobPart[]));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
