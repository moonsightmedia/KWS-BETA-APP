export async function uploadSectorImage(_file: File, sectorId: string, onProgress?: (progress: number) => void) {
  window.sectorQA.writes.push({ operation: 'upload', sectorId });
  await new Promise<void>((resolve) => setTimeout(resolve, window.sectorQA.delay));
  if (window.sectorQA.failures.includes('upload')) throw new Error('Fixturefehler: upload');
  onProgress?.(100);
  return `https://fixture.test/${sectorId}/replacement.jpg`;
}

export async function deleteSectorImage(imageUrl: string) {
  window.sectorQA.writes.push({ operation: 'image-delete', imageUrl });
  await new Promise<void>((resolve) => setTimeout(resolve, window.sectorQA.delay));
  if (window.sectorQA.failures.includes('image-delete')) throw new Error('Fixturefehler: image-delete');
}
