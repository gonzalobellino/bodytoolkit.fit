import React, { useState, useEffect, useCallback } from 'react';
import {
  FileVideo,
  FileImage,
  ClipboardList,
  Calendar,
  Lock,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { loadAssessmentByShareId, Assessment } from '../utils/assessmentStorage';

interface AssessmentViewerProps {
  shareId: string;
}

type ViewState = 'loading' | 'pin_required' | 'expired' | 'not_found' | 'ready';

export function AssessmentViewer({ shareId }: AssessmentViewerProps) {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  const formatDate = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const getAssessmentIcon = useCallback((type: string) => {
    switch (type) {
      case 'video': return FileVideo;
      case 'photo': return FileImage;
      default: return ClipboardList;
    }
  }, []);

  const loadAssessment = useCallback(async (enteredPin?: string) => {
    try {
      const result = await loadAssessmentByShareId(shareId, enteredPin);
      
      if (result.status === 'pin_required') {
        setViewState('pin_required');
        return;
      }
      
      if (result.status === 'invalid_pin') {
        setPinError(true);
        return;
      }
      
      if (result.status === 'expired') {
        setExpiresAt(result.expiresAt ?? null);
        setViewState('expired');
        return;
      }
      
      if (result.status === 'not_found') {
        setViewState('not_found');
        return;
      }
      
      if (result.status === 'success' && result.assessment) {
        setAssessment(result.assessment);
        setExpiresAt(result.expiresAt ?? null);
        setViewState('ready');
      }
    } catch (error) {
      setViewState('not_found');
    }
  }, [shareId]);

  useEffect(() => {
    void loadAssessment();
  }, [loadAssessment]);

  const handlePinSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setPinError(false);
    void loadAssessment(pin);
  }, [loadAssessment, pin]);

  // Loading State
  if (viewState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  // PIN Required State
  if (viewState === 'pin_required') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle>Protected Assessment</CardTitle>
            <CardDescription>
              This assessment requires a PIN to view
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Enter PIN"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setPinError(false);
                  }}
                  maxLength={6}
                  className={`text-center text-2xl tracking-widest ${
                    pinError ? 'border-red-500' : ''
                  }`}
                  autoFocus
                />
                {pinError && (
                  <p className="text-red-500 text-sm mt-2 text-center">
                    Incorrect PIN. Please try again.
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={pin.length < 4}>
                View Assessment
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired State
  if (viewState === 'expired') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
            <CardTitle>Link Expired</CardTitle>
            <CardDescription>
              This assessment link is no longer valid
              {expiresAt && (
                <span className="block mt-2">
                  Expired on {formatDate(expiresAt)}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-slate-600 mb-4">
              Please contact your practitioner for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not Found State
  if (viewState === 'not_found') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle>Assessment Not Found</CardTitle>
            <CardDescription>
              We couldn&apos;t find this assessment. The link may be invalid or the assessment may have been deleted.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Ready State - Show Assessment
  if (viewState === 'ready' && assessment) {
    const Icon = getAssessmentIcon(assessment.type);

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                assessment.type === 'video' ? 'bg-blue-100' :
                assessment.type === 'photo' ? 'bg-violet-100' : 'bg-emerald-100'
              }`}>
                <Icon className={`w-6 h-6 ${
                  assessment.type === 'video' ? 'text-blue-600' :
                  assessment.type === 'photo' ? 'text-violet-600' : 'text-emerald-600'
                }`} />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-semibold text-slate-900">
                  {assessment.name}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(assessment.date)}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {assessment.type}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1 text-emerald-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Verified</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* Media Content */}
            {assessment.videoUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recording</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center overflow-hidden bg-black rounded-lg max-h-[70vh]">
                  <video
                    src={assessment.videoUrl}
                    controls
                    className="max-w-full max-h-full object-contain rounded-lg"
                    playsInline
                  />
                </CardContent>
              </Card>
            )}

            {assessment.thumbnail && !assessment.videoUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Image</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center overflow-hidden bg-black rounded-lg max-h-[70vh]">
                  <img
                    src={assessment.thumbnail}
                    alt="Assessment"
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {assessment.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 whitespace-pre-wrap">
                    {assessment.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Assessment Data */}
            {assessment.data && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Assessment Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg overflow-auto">
                    {JSON.stringify(assessment.data, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Expiration Notice */}
            {expiresAt && (
              <div className="text-center text-sm text-slate-500">
                <Clock className="w-4 h-4 inline-block mr-1" />
                This link expires on {formatDate(expiresAt)}
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-4">
          <div className="max-w-4xl mx-auto px-4 text-center text-sm text-slate-500">
            Shared via Corrective Exercise Toolkit
          </div>
        </footer>
      </div>
    );
  }

  return null;
}
