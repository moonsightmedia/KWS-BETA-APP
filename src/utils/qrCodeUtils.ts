import QRCode from 'qrcode';

/**
 * Generates a QR code as a data URL (PNG image)
 * @param text - The text/URL to encode in the QR code
 * @param options - Optional QR code generation options
 * @returns Promise<string> - Data URL of the QR code image
 */
export async function generateQRCodeDataURL(
  text: string,
  options?: {
    width?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }
): Promise<string> {
  const defaultOptions = {
    width: 400,
    margin: 2,
    color: {
      dark: '#13112B', // Dark text color from design system
      light: '#FFFFFF', // White background
    },
    ...options,
  };

  try {
    const dataURL = await QRCode.toDataURL(text, defaultOptions);
    return dataURL;
  } catch (error) {
    console.error('[QRCode] Error generating QR code:', error);
    throw new Error('Fehler beim Generieren des QR-Codes');
  }
}

/**
 * Downloads a QR code as a PNG file
 * @param sectorName - Name of the sector (used for filename)
 * @param qrDataUrl - Data URL of the QR code image
 */
export function downloadQRCode(sectorName: string, qrDataUrl: string): void {
  try {
    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR-Code-${sectorName.replace(/[^a-z0-9]/gi, '-')}.png`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('[QRCode] Error downloading QR code:', error);
    throw new Error('Fehler beim Herunterladen des QR-Codes');
  }
}

/**
 * Generates the URL that should be encoded in the QR code for a sector
 * @param sectorName - Name of the sector
 * @returns The URL to encode
 */
export function getSectorQRCodeURL(sectorName: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/guest?sector=${encodeURIComponent(sectorName)}`;
}

