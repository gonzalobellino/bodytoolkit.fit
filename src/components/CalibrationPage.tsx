import React, { useState, useCallback } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Ruler } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle } from 'lucide-react';
import { CalibrationPrintStep } from './CalibrationPrintStep';
import { CalibrationPlaceStep } from './CalibrationPlaceStep';
import { CalibrationDetectStep } from './CalibrationDetectStep';
import { useArucoCalibration } from '../hooks/useArucoCalibration';

interface CalibrationPageProps {
  onBack: () => void;
  onCalibrated?: (factor: number) => void;
}

export function CalibrationPage({ onBack, onCalibrated }: CalibrationPageProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const { calibration } = useArucoCalibration({ marker1Id: 0, marker2Id: 1 });

  const handleNext = useCallback(() => {
    if (step < 3) {
      setStep((step + 1) as 1 | 2 | 3);
    }
  }, [step]);

  const handlePrevious = useCallback(() => {
    if (step > 1) {
      setStep((step - 1) as 1 | 2 | 3);
    }
  }, [step]);

  const handleCalibrated = useCallback((factor: number) => {
    if (onCalibrated) {
      onCalibrated(factor);
    }
  }, [onCalibrated]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Spatial Calibration</h1>
                <p className="text-xs text-slate-500">ArUco Marker Setup</p>
              </div>
            </div>
            {calibration.isCalibrated && (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Calibrated
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Intro Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="w-5 h-5 text-blue-500" />
              Enable Real-World Measurements
            </CardTitle>
            <CardDescription>
              Use printed ArUco markers (10x10, IDs 0 and 1, 100mm × 100mm each) to convert pixel
              measurements to real centimeters. This improves accuracy for step length, movement
              velocity, and distances.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Step Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((stepNum) => (
              <React.Fragment key={stepNum}>
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step > stepNum
                        ? 'bg-green-500 text-white'
                        : step === stepNum
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-300 text-slate-600'
                    }`}
                  >
                    {step > stepNum ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      stepNum
                    )}
                  </div>
                  <div className="ml-2 hidden sm:block">
                    <div className="text-xs font-medium text-slate-900">
                      {stepNum === 1 && 'Print'}
                      {stepNum === 2 && 'Place'}
                      {stepNum === 3 && 'Detect'}
                    </div>
                  </div>
                </div>
                {stepNum < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step > stepNum ? 'bg-green-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-6">
          {step === 1 && (
            <CalibrationPrintStep onNext={handleNext} />
          )}
          {step === 2 && (
            <CalibrationPlaceStep onNext={handleNext} />
          )}
          {step === 3 && (
            <CalibrationDetectStep
              onCalibrated={handleCalibrated}
              onBack={onBack}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center print:hidden">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={step === 1}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <div className="text-sm text-slate-500">
            Step {step} of 3
          </div>
          {step < 3 && (
            <Button
              onClick={handleNext}
              className="gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block,
          .print\\:block * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
