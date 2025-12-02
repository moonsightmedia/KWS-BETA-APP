import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { submitFeedback, captureScreenshot, FeedbackType, FeedbackPriority } from '@/utils/feedbackUtils';
import { toast } from 'sonner';
import { Loader2, Camera } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

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
        toast.error(result.error || 'Fehler beim Senden des Feedbacks.');
      }
    } catch (error: any) {
      console.error('[FeedbackDialog] Error submitting feedback:', error);
      toast.error('Fehler beim Senden des Feedbacks.');
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Feedback senden</DialogTitle>
          <DialogDescription>
            Teile uns dein Feedback, Probleme oder Verbesserungsvorschläge mit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="feedback-type">Art des Feedbacks *</Label>
            <Select value={type} onValueChange={(value) => setType(value as FeedbackType)}>
              <SelectTrigger id="feedback-type">
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

          <div className="space-y-2">
            <Label htmlFor="feedback-title">Titel *</Label>
            <Input
              id="feedback-title"
              placeholder="Kurze Beschreibung des Problems..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-description">Beschreibung *</Label>
            <Textarea
              id="feedback-description"
              placeholder="Beschreibe das Problem oder dein Feedback im Detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={6}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">
              {description.length} / 2000 Zeichen
            </p>
          </div>

          {type === 'bug' || type === 'error' ? (
            <div className="space-y-2">
              <Label htmlFor="feedback-priority">Priorität</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as FeedbackPriority)}>
                <SelectTrigger id="feedback-priority">
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
          ) : null}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-screenshot"
              checked={includeScreenshot}
              onCheckedChange={(checked) => setIncludeScreenshot(checked === true)}
            />
            <Label htmlFor="include-screenshot" className="cursor-pointer">
              Screenshot hinzufügen
            </Label>
          </div>

          {includeScreenshot && isCapturingScreenshot && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Screenshot wird erstellt...
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting || isCapturingScreenshot}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird gesendet...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Feedback senden
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

