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

const difficultyColors: Record<number, string> = {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-5">
        <DialogHeader>
          <DialogDescription className="sr-only">
            Details für Boulder {boulder.name} - {boulder.color} · Grad {boulder.difficulty} · {boulder.sector}
          </DialogDescription>
          <div className="flex items-start justify-between mb-1 pr-12">
            <DialogTitle className="text-2xl sm:text-3xl font-teko tracking-wide leading-none">
              {boulder.name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center justify-center gap-2 h-8 px-3 rounded-full border ${COLOR_MAP[boulder.color]?.bg || 'bg-gray-400'} ${TEXT_ON_COLOR[boulder.color] || 'text-white'}`}
                title={`${boulder.color} · Grad ${boulder.difficulty}`}
              >
                <span className="text-xs font-semibold">{boulder.difficulty}</span>
                <span className="text-xs opacity-90">{boulder.color}</span>
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Compact meta chips */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="truncate max-w-[10rem]">{boulder.sector}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>{formatDate(boulder.createdAt, 'dd. MMM yyyy', { locale: de })}</span>
          </span>
        </div>

        <div className="space-y-4">
          {/* Video Section */}
          {videoUrl && (
            <div className="aspect-video w-full overflow-hidden rounded-xl border bg-card/80 backdrop-blur shadow-sm">
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
                  poster="/placeholder.svg"
                  preload="none"
                  loading="lazy"
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
            <div className="rounded-xl border bg-card/80 backdrop-blur p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-lg grid place-items-center bg-gradient-to-br from-primary/12 to-primary/5 text-primary">
                  <FileText className="w-3.5 h-3.5" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Notizen</p>
                  <p className="text-sm text-muted-foreground">{boulder.note}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
