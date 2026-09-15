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
          dark: '#192436',
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
    <div className="flex min-w-0 flex-col items-center gap-4 pt-3">
      <p className="max-w-full break-words text-center text-sm font-semibold text-foreground">{sectorName}</p>

      <div className="w-fit max-w-full rounded-kws-control bg-white p-3 shadow-soft">
        <QRCodeSVG
          value={qrUrl}
          size={220}
          level="H" // High error correction
          bgColor="#FFFFFF"
          fgColor="#192436"
          includeMargin={true}
        />
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[220px]">
        <Button
          onClick={handleDownload}
          disabled={isGenerating}
          className="h-11 rounded-kws-control bg-primary hover:bg-primary text-primary-foreground"
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
        {onClose && <Button type="button" onClick={onClose} variant="outline" className="h-11 rounded-kws-control border-border text-foreground hover:bg-primary/10">Schließen</Button>}
      </div>

      <div className="max-w-full text-center text-xs text-muted-foreground">
        <p className="break-all">Ziel: {qrUrl}</p>
      </div>
    </div>
  );
}

