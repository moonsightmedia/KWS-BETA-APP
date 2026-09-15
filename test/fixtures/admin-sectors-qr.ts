export function getSectorQRCodeURL(sectorName: string) {
  return `${window.location.origin}/guest?sector=${encodeURIComponent(sectorName)}`;
}

export async function generateQRCodeDataURL() {
  return 'data:image/png;base64,fixture';
}

export function downloadQRCode(sectorName: string, dataURL: string) {
  window.sectorQA.writes.push({ operation: 'qr-download', sectorName, dataURL });
}
