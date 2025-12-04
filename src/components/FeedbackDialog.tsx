import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { submitFeedback, captureScreenshot, FeedbackType, FeedbackPriority } from '@/utils/feedbackUtils';
import { toast } from 'sonner';
import { Loader2, Camera, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: FeedbackType;
  initialTitle?: string;
  initialDescription?: string;
}

export function FeedbackDialog({
  open,
  onOpenChange,
  initialType = 'general',
  initialTitle = '',
  initialDescription = '',
}: FeedbackDialogProps) {
  const { user } = useAuth();
  const [type, setType] = useState<FeedbackType>(initialType);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [priority, setPriority] = useState<FeedbackPriority>('medium');
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      toast.error('Bitte fülle alle Pflichtfelder aus.');
      return;
    }

    setIsSubmitting(true);

    try {
      let screenshotUrl: string | undefined;
      
      if (includeScreenshot) {
        setIsCapturingScreenshot(true);
        const screenshot = await captureScreenshot();
        if (screenshot) {
          screenshotUrl = screenshot;
        }
        setIsCapturingScreenshot(false);
      }

      const result = await submitFeedback({
        type,
        title: title.trim(),
        description: description.trim(),
        priority,
        user_email: user?.email || undefined,
        screenshot_url: screenshotUrl,
      });

      if (result.success) {
        toast.success('Feedback wurde erfolgreich gesendet. Vielen Dank!');
        // Reset form
        setTitle('');
        setDescription('');
        setType('general');
        setPriority('medium');
        setIncludeScreenshot(false);
        onOpenChange(false);
      } else {
        console.error('[FeedbackDialog] Submit failed:', result.error);
        toast.error(result.error || 'Fehler beim Senden des Feedbacks.');
      }
    } catch (error: any) {
      console.error('[FeedbackDialog] Error submitting feedback:', error);
      toast.error(error?.message || 'Fehler beim Senden des Feedbacks. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
      setIsCapturingScreenshot(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <DialogHeader className="sticky top-0 z-10 bg-white border-b border-[#E7F7E9] px-4 sm:px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl font-heading font-bold text-[#13112B]">Feedback senden</DialogTitle>
              <DialogDescription className="text-sm text-[#13112B]/60 mt-1">
                Teile uns dein Feedback, Probleme oder Verbesserungsvorschläge mit.
              </DialogDescription>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-8 h-8 rounded-full bg-[#F9FAF9] text-[#13112B]/70 hover:bg-[#E7F7E9] hover:text-[#13112B] transition-colors flex items-center justify-center disabled:opacity-50 ml-4"
              aria-label="Schließen"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="px-4 sm:px-6 py-4 space-y-5">

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Feedback Type */}
            <div className="space-y-2">
              <Label htmlFor="feedback-type" className="text-sm font-medium text-[#13112B]">
                Art des Feedbacks *
              </Label>
              <Select value={type} onValueChange={(value) => setType(value as FeedbackType)}>
                <SelectTrigger 
                  id="feedback-type" 
                  className="h-11 border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Bug / Fehler</SelectItem>
                  <SelectItem value="feature">Feature-Wunsch</SelectItem>
                  <SelectItem value="error">Fehlerbericht</SelectItem>
                  <SelectItem value="general">Allgemeines Feedback</SelectItem>
                  <SelectItem value="other">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="feedback-title" className="text-sm font-medium text-[#13112B]">
                Titel *
              </Label>
              <Input
                id="feedback-title"
                placeholder="Kurze Beschreibung des Problems..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                className="h-11 border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="feedback-description" className="text-sm font-medium text-[#13112B]">
                Beschreibung *
              </Label>
              <Textarea
                id="feedback-description"
                placeholder="Beschreibe das Problem oder dein Feedback im Detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={6}
                maxLength={2000}
                className="border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531] resize-none"
              />
              <p className="text-xs text-[#13112B]/60">
                {description.length} / 2000 Zeichen
              </p>
            </div>

            {/* Priority (only for bugs/errors) */}
            {(type === 'bug' || type === 'error') && (
              <div className="space-y-2">
                <Label htmlFor="feedback-priority" className="text-sm font-medium text-[#13112B]">
                  Priorität
                </Label>
                <Select value={priority} onValueChange={(value) => setPriority(value as FeedbackPriority)}>
                  <SelectTrigger 
                    id="feedback-priority"
                    className="h-11 border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Niedrig</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                    <SelectItem value="critical">Kritisch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Screenshot Checkbox */}
            <div className="flex items-center space-x-3 py-2">
              <Checkbox
                id="include-screenshot"
                checked={includeScreenshot}
                onCheckedChange={(checked) => setIncludeScreenshot(checked === true)}
                className="h-5 w-5 border-[#E7F7E9] data-[state=checked]:bg-[#36B531] data-[state=checked]:border-[#36B531]"
              />
              <Label 
                htmlFor="include-screenshot" 
                className="text-sm text-[#13112B] cursor-pointer font-normal"
              >
                Screenshot hinzufügen
              </Label>
            </div>

            {/* Screenshot Loading State */}
            {includeScreenshot && isCapturingScreenshot && (
              <div className="flex items-center gap-2 text-sm text-[#13112B]/60 bg-[#F9FAF9] px-3 py-2 rounded-md border border-[#E7F7E9]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Screenshot wird erstellt...
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2 pb-4 sm:pb-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose} 
                disabled={isSubmitting}
                className="h-11 rounded-xl border-[#E7F7E9] bg-white text-[#13112B] hover:bg-[#F9FAF9] disabled:opacity-50"
              >
                Abbrechen
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || isCapturingScreenshot}
                className="h-11 rounded-xl bg-[#36B531] hover:bg-[#2da029] text-white flex-1 sm:flex-initial disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    Feedback senden
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

