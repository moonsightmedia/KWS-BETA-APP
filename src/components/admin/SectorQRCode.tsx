import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { generateQRCodeDataURL, downloadQRCode, getSectorQRCodeURL } from '@/utils/qrCodeUtils';
import { toast } from 'sonner';

interface SectorQRCodeProps {
  sectorName: string;
  onClose?: () => void;
}

export function SectorQRCode({ sectorName, onClose }: SectorQRCodeProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const qrUrl = getSectorQRCodeURL(sectorName);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const dataURL = await generateQRCodeDataURL(qrUrl, {
        width: 800, // Higher resolution for download
        margin: 2,
        color: {
          dark: '#13112B',
          light: '#FFFFFF',
        },
      });
      downloadQRCode(sectorName, dataURL);
      toast.success('QR-Code wurde heruntergeladen');
    } catch (error) {
      console.error('[SectorQRCode] Error downloading:', error);
      toast.error('Fehler beim Herunterladen des QR-Codes');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4 sm:p-6">
      <div className="text-center">
        <h3 className="text-lg font-heading font-bold text-[#13112B] mb-2">
          QR-Code für {sectorName}
        </h3>
        <p className="text-sm text-[#13112B]/60">
          Scannen Sie diesen Code, um direkt zu den Bouldern dieses Sektors zu gelangen
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-[#E7F7E9] shadow-sm">
        <QRCodeSVG
          value={qrUrl}
          size={256}
          level="H" // High error correction
          bgColor="#FFFFFF"
          fgColor="#13112B"
          includeMargin={true}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <Button
          onClick={handleDownload}
          disabled={isGenerating}
          className="h-11 rounded-xl bg-[#36B531] hover:bg-[#2DA029] text-white flex-1 sm:flex-initial min-w-[200px]"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Wird generiert...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              QR-Code herunterladen
            </>
          )}
        </Button>
        {onClose && (
          <Button
            onClick={onClose}
            variant="outline"
            className="h-11 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9] flex-1 sm:flex-initial"
          >
            Schließen
          </Button>
        )}
      </div>

      <div className="text-xs text-[#13112B]/40 text-center max-w-md">
        <p>URL: {qrUrl}</p>
      </div>
    </div>
  );
}

