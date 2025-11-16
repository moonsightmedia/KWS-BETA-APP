import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Boulder } from '@/types/boulder';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, MapPin, Palette, FileText, ExternalLink, Video } from 'lucide-react';

interface BoulderDetailDialogProps {
  boulder: Boulder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const difficultyColors: Record<number | null, string> = {
  null: 'bg-gray-500',
  1: 'bg-green-500',
  2: 'bg-green-600',
  3: 'bg-yellow-500',
  4: 'bg-yellow-600',
  5: 'bg-orange-500',
  6: 'bg-orange-600',
  7: 'bg-red-500',
  8: 'bg-red-700',
};

const COLOR_MAP: Record<string, { bg: string; border: string }> = {
  'Grün': { bg: 'bg-green-500', border: 'border-green-600' },
  'Gelb': { bg: 'bg-yellow-400', border: 'border-yellow-500' },
  'Blau': { bg: 'bg-blue-500', border: 'border-blue-600' },
  'Orange': { bg: 'bg-orange-500', border: 'border-orange-600' },
  'Rot': { bg: 'bg-red-500', border: 'border-red-600' },
  'Schwarz': { bg: 'bg-gray-900', border: 'border-gray-950' },
  'Weiß': { bg: 'bg-white', border: 'border-gray-300' },
  'Lila': { bg: 'bg-purple-500', border: 'border-purple-600' },
};

const TEXT_ON_COLOR: Record<string, string> = {
  'Grün': 'text-white',
  'Gelb': 'text-black',
  'Blau': 'text-white',
  'Orange': 'text-black',
  'Rot': 'text-white',
  'Schwarz': 'text-white',
  'Weiß': 'text-black',
  'Lila': 'text-white',
};

// Helper function um zu erkennen, ob es eine YouTube/Vimeo URL ist
const isYouTubeUrl = (url: string): boolean => {
  return /youtube\.com|youtu\.be/.test(url);
};

const isVimeoUrl = (url: string): boolean => {
  return /vimeo\.com/.test(url);
};

const getYouTubeEmbedUrl = (url: string): string => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = (match && match[2].length === 11) ? match[2] : null;
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
};

const getVimeoEmbedUrl = (url: string): string => {
  const regExp = /vimeo\.com\/(\d+)/;
  const match = url.match(regExp);
  const videoId = match ? match[1] : null;
  return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
};

export const BoulderDetailDialog = ({ boulder, open, onOpenChange }: BoulderDetailDialogProps) => {
  if (!boulder) return null;

  const videoUrl = boulder.betaVideoUrl;
  const isYouTube = videoUrl ? isYouTubeUrl(videoUrl) : false;
  const isVimeo = videoUrl ? isVimeoUrl(videoUrl) : false;
  const isDirectVideo = videoUrl && !isYouTube && !isVimeo;

  // Get thumbnail URL for video poster
  const getThumbnailUrl = (boulder: Boulder): string | undefined => {
    if (boulder.thumbnailUrl) {
      // Fix old URLs that incorrectly include /videos/ in the path
      let url = boulder.thumbnailUrl;
      if (url.includes('cdn.kletterwelt-sauerland.de/uploads/videos/')) {
        url = url.replace('/uploads/videos/', '/uploads/');
      }
      return url;
    }
    return undefined;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-3 sm:p-4 md:p-5 w-[95vw] sm:w-full pb-4 sm:pb-6">
        <DialogHeader className="space-y-2 text-center !text-center">
          <DialogDescription className="sr-only">
            Details für Boulder {boulder.name} - {boulder.color} · Grad {boulder.difficulty === null ? '?' : boulder.difficulty} · {boulder.sector}
          </DialogDescription>
          <DialogTitle className="text-xl sm:text-2xl md:text-3xl font-teko tracking-wide leading-tight text-center">
            {boulder.name}
          </DialogTitle>
        </DialogHeader>

        {/* Compact meta chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-2 sm:mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs">
            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary flex-shrink-0" />
            <span className="truncate max-w-[8rem] sm:max-w-[10rem]">{boulder.sector}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs">
            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary flex-shrink-0" />
            <span>{formatDate(boulder.createdAt, 'dd. MMM yyyy', { locale: de })}</span>
          </span>
          <span
            className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 h-7 sm:h-8 px-2 sm:px-3 rounded-full border text-xs ${COLOR_MAP[boulder.color]?.bg || 'bg-gray-400'} ${TEXT_ON_COLOR[boulder.color] || 'text-white'}`}
            title={`${boulder.color} · Grad ${boulder.difficulty === null ? '?' : boulder.difficulty}`}
          >
            <span className="font-semibold text-[10px] sm:text-xs">{boulder.difficulty === null ? '?' : boulder.difficulty}</span>
            <span className="opacity-90 text-[10px] sm:text-xs hidden sm:inline">{boulder.color}</span>
          </span>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {/* Video Section */}
          {videoUrl && (
            <div className="aspect-[9/16] w-full max-w-[200px] sm:max-w-[280px] md:max-w-sm mx-auto overflow-hidden rounded-lg sm:rounded-xl border bg-card/80 backdrop-blur shadow-sm">
              {isYouTube && (
                <iframe
                  src={getYouTubeEmbedUrl(videoUrl)}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="YouTube video player"
                />
              )}
              {isVimeo && (
                <iframe
                  src={getVimeoEmbedUrl(videoUrl)}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title="Vimeo video player"
                />
              )}
              {isDirectVideo && (
                <video 
                  controls 
                  className="w-full h-full"
                  poster={getThumbnailUrl(boulder) || undefined}
                  preload="none"
                >
                  <source src={videoUrl} type="video/mp4" />
                  Dein Browser unterstützt keine Videos.
                  <p className="p-4">
                    Dein Browser unterstützt dieses Video-Format nicht.{' '}
                    <a 
                      href={videoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Video direkt öffnen
                    </a>
                  </p>
                </video>
              )}
              {!isYouTube && !isVimeo && !isDirectVideo && (
                <div className="w-full h-full flex items-center justify-center flex-col gap-4 p-4">
                  <Video className="w-12 h-12 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Video kann nicht direkt angezeigt werden
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(videoUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Video öffnen
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info tiles removed for compactness */}

          {/* Notes Section */}
          {boulder.note && (
            <div className="rounded-lg sm:rounded-xl border bg-card/80 backdrop-blur p-2.5 sm:p-3 shadow-sm">
              <div className="flex items-start gap-2 sm:gap-3">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg grid place-items-center bg-gradient-to-br from-primary/12 to-primary/5 text-primary flex-shrink-0">
                  <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium mb-1">Notizen</p>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">{boulder.note}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
