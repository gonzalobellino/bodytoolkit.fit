import React, { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Link2, Copy, Check, Download, Share2 } from 'lucide-react';
import type { FormLang } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface SendFormToClientProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  formType: 'questionnaire' | 'scale';
  formName: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SendFormToClient({ open, onOpenChange, formId, formType, formName }: SendFormToClientProps): React.JSX.Element {
  const [coachEmail, setCoachEmail] = useState('');
  const [coachName, setCoachName] = useState('');
  const [clientFirstName, setClientFirstName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [language, setLanguage] = useState<FormLang>('en');
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const isValidEmail = EMAIL_RE.test(coachEmail);

  const generateUrl = (): void => {
    if (!isValidEmail) return;
    const payload: { e: string; n: string; fn?: string; ln?: string; em?: string } = {
      e: coachEmail,
      n: (coachName || '').trim(),
    };
    const fn = clientFirstName.trim();
    const ln = clientLastName.trim();
    const em = clientEmail.trim();
    if (fn) payload.fn = fn;
    if (ln) payload.ln = ln;
    if (em) payload.em = em;
    const token = btoa(encodeURIComponent(JSON.stringify(payload)));
    const url = `${window.location.origin}/#/form/${formId}?t=${formType}&c=${token}&lang=${language}`;
    setGeneratedUrl(url);
  };

  const copyLink = async (): Promise<void> => {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const shareLink = async (): Promise<void> => {
    if (!generatedUrl || !navigator.share) return;
    const shareTitle = formName;
    const shareText =
      language === 'es'
        ? `Por favor completa esta evaluación: ${formName}`
        : `Please complete this assessment: ${formName}`;
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: generatedUrl,
      });
    } catch {
      // ignore (user cancelled)
    }
  };

  const downloadQR = (): void => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${formId}-qr.png`;
    link.click();
  };

  const handleClose = (): void => {
    setCoachEmail('');
    setCoachName('');
    setClientFirstName('');
    setClientLastName('');
    setClientEmail('');
    setLanguage('en');
    setGeneratedUrl(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto sm:max-h-none sm:overflow-visible">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-500 shrink-0" />
            Send to Client
          </DialogTitle>
          <DialogDescription>{formName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!generatedUrl ? (
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Form language</Label>
                <p className="text-xs text-slate-400 mt-0.5 mb-1">Client will see the form in this language</p>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors touch-manipulation ${language === 'en' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100'}`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('es')}
                    className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors touch-manipulation ${language === 'es' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100'}`}
                  >
                    Español
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="coach-email" className="text-sm">Your email address</Label>
                  <p className="text-xs text-slate-400 mt-0.5 mb-1">Results will be sent here</p>
                  <Input
                    id="coach-email"
                    type="email"
                    placeholder="coach@example.com"
                    value={coachEmail}
                    onChange={e => setCoachEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && generateUrl()}
                    className="min-h-[44px]"
                  />
                </div>
                <div>
                  <Label htmlFor="coach-name" className="text-sm">Your name (optional)</Label>
                  <p className="text-xs text-slate-400 mt-0.5 mb-1">Trainer name on form</p>
                  <Input
                    id="coach-name"
                    type="text"
                    placeholder="e.g. Jane Smith"
                    value={coachName}
                    onChange={e => setCoachName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && generateUrl()}
                    className="min-h-[44px]"
                  />
                </div>
              </div>
              <div className="border-t border-slate-200 pt-3 mt-1">
                <p className="text-xs text-slate-500 mb-2">Optional: pre-fill client details so they don’t have to enter them again if you send several forms.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    type="text"
                    placeholder="Client first name"
                    value={clientFirstName}
                    onChange={e => setClientFirstName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && generateUrl()}
                    className="text-sm min-h-[44px]"
                  />
                  <Input
                    type="text"
                    placeholder="Client last name"
                    value={clientLastName}
                    onChange={e => setClientLastName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && generateUrl()}
                    className="text-sm min-h-[44px]"
                  />
                  <Input
                    type="email"
                    placeholder="Client email"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && generateUrl()}
                    className="text-sm min-h-[44px] sm:col-span-2"
                  />
                </div>
              </div>
              <Button
                onClick={generateUrl}
                disabled={!isValidEmail}
                className="w-full min-h-[44px] touch-manipulation"
              >
                Generate Link & QR
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* QR Code — slightly smaller on narrow viewports */}
              <div className="flex flex-col items-center p-4 bg-white rounded-lg border border-slate-200">
                <QRCodeCanvas ref={qrRef} value={generatedUrl} size={200} />
                <button
                  type="button"
                  onClick={downloadQR}
                  className="mt-2 min-h-[44px] px-3 text-xs text-slate-400 hover:text-slate-600 active:text-slate-700 flex items-center gap-1 transition-colors touch-manipulation"
                >
                  <Download className="w-3 h-3" />
                  Download QR
                </button>
              </div>

              {/* Link + copy — stack on narrow screens so link is tappable/selectable */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input value={generatedUrl} readOnly className="font-mono text-xs min-h-[44px] flex-1 break-all" />
                <Button variant="outline" size="icon" onClick={copyLink} title="Copy link" className="shrink-0 min-w-[44px] min-h-[44px] touch-manipulation">
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Web Share — visible on any device that supports it */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <Button variant="outline" className="w-full min-h-[44px] gap-2 touch-manipulation" onClick={shareLink}>
                  <Share2 className="w-4 h-4 shrink-0" />
                  Share via WhatsApp / Email / SMS…
                </Button>
              )}

              <button
                type="button"
                onClick={() => setGeneratedUrl(null)}
                className="min-h-[44px] w-full py-2 text-xs text-slate-400 hover:text-slate-600 active:text-slate-700 text-center transition-colors touch-manipulation"
              >
                ← Change email
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
