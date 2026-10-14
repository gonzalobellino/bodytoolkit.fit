import React, { useState, useEffect, useCallback } from 'react';
import {
  Share2,
  Copy,
  Check,
  Clock,
  Lock,
  Mail,
  Download,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import {
  generateShareLink,
  generateQRCode,
  ShareableAssessment,
  Assessment,
} from '../utils/assessmentStorage';
import { usePremium } from '../contexts/PremiumContext';

interface ShareAssessmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: Assessment | null;
}

export function ShareAssessment({ open, onOpenChange, assessment }: ShareAssessmentProps) {
  const { hasFeature } = usePremium();
  const [shareData, setShareData] = useState<ShareableAssessment | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Share options
  const [expirationDays, setExpirationDays] = useState(7);
  const [requirePin, setRequirePin] = useState(false);
  const [pin, setPin] = useState('');
  
  const generateLink = useCallback(async () => {
    if (!assessment) return;
    
    setIsGenerating(true);
    try {
      const expiresAt = Date.now() + (expirationDays * 24 * 60 * 60 * 1000);
      const shareableAssessment = await generateShareLink(
        assessment,
        expiresAt,
        requirePin ? pin : undefined
      );
      setShareData(shareableAssessment);
      
      // Generate QR code
      const qr = await generateQRCode(shareableAssessment.url);
      setQrCodeUrl(qr);
    } catch (error) {
      console.error('Failed to generate share link:', error);
    }
    setIsGenerating(false);
  }, [assessment, expirationDays, pin, requirePin]);
  
  useEffect(() => {
    if (open && assessment && !shareData) {
      void generateLink();
    }
  }, [open, assessment, shareData, generateLink]);
  
  const copyToClipboard = async () => {
    if (!shareData?.url) return;
    
    try {
      await navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };
  
  const shareViaEmail = () => {
    if (!shareData?.url || !assessment) return;
    
    const subject = encodeURIComponent(`Assessment: ${assessment.name}`);
    const body = encodeURIComponent(
      `You can view your assessment here:\n\n${shareData.url}\n\n` +
      (shareData.pin ? `PIN: ${shareData.pin}\n\n` : '') +
      `This link expires on ${new Date(shareData.expiresAt ?? 0).toLocaleDateString()}`
    );
    
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };
  
  const shareViaWebShare = async () => {
    if (!shareData?.url || !assessment) return;
    
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `Assessment: ${assessment.name}`,
          text: 'View your movement assessment',
          url: shareData.url,
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    }
  };
  
  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `assessment-qr-${assessment?.id ?? 'code'}.png`;
    link.click();
  };
  
  const handleClose = () => {
    setShareData(null);
    setQrCodeUrl(null);
    setCopied(false);
    onOpenChange(false);
  };

  if (!hasFeature('assessmentSharing')) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-500" />
              Assessment Sharing
            </DialogTitle>
            <DialogDescription>
              Upgrade to Premium to share assessments with clients
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center">
            <Share2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">
              Premium members can generate shareable links and QR codes for assessments.
            </p>
            <Button>Upgrade to Premium</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-500" />
            Share Assessment
          </DialogTitle>
          <DialogDescription>
            {assessment?.name ?? 'Assessment'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Share Options */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Link Expiration</Label>
              <div className="flex items-center gap-4 mt-2">
                <Slider
                  value={[expirationDays]}
                  onValueChange={([value]) => setExpirationDays(value)}
                  min={1}
                  max={30}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm text-slate-600 w-20 text-right">
                  {expirationDays} day{expirationDays > 1 ? 's' : ''}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500" />
                <Label htmlFor="require-pin" className="text-sm cursor-pointer">
                  Require PIN
                </Label>
              </div>
              <Switch
                id="require-pin"
                checked={requirePin}
                onCheckedChange={setRequirePin}
              />
            </div>
            
            {requirePin && (
              <div>
                <Label htmlFor="pin" className="text-sm">PIN Code</Label>
                <Input
                  id="pin"
                  type="text"
                  placeholder="Enter 4-6 digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="mt-1"
                />
              </div>
            )}
            
            <Button 
              onClick={generateLink} 
              disabled={isGenerating || (requirePin && pin.length < 4)}
              className="w-full"
            >
              {isGenerating ? 'Generating...' : 'Generate Link'}
            </Button>
          </div>

          {shareData && (
            <>
              <Separator />
              
              {/* Generated Link */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm">Share Link</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={shareData.url}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyToClipboard}
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Metadata */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Clock className="w-3 h-3" />
                    Expires {new Date(shareData.expiresAt ?? 0).toLocaleDateString()}
                  </Badge>
                  {shareData.pin && (
                    <Badge variant="outline" className="gap-1">
                      <Lock className="w-3 h-3" />
                      PIN: {shareData.pin}
                    </Badge>
                  )}
                </div>
                
                {/* QR Code */}
                {qrCodeUrl && (
                  <div className="flex flex-col items-center p-4 bg-white rounded-lg border">
                    <img
                      src={qrCodeUrl}
                      alt="QR Code"
                      className="w-48 h-48"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={downloadQRCode}
                      className="mt-2 gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download QR
                    </Button>
                  </div>
                )}
                
                {/* Share Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={shareViaEmail}
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </Button>
                  {typeof navigator.share === 'function' && (
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={shareViaWebShare}
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
