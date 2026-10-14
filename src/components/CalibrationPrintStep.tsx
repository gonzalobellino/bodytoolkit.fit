import React from 'react';
import { Printer, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface CalibrationPrintStepProps {
  onNext: () => void;
}

export function CalibrationPrintStep({ onNext }: CalibrationPrintStepProps) {
  const pdfUrl = '/data/aruco_ids_0_1_100mm.pdf';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold bg-blue-500 text-white">
            1
          </div>
          Print the Markers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* PDF Preview/Download */}
          <div className="bg-white border-2 border-dashed border-slate-300 rounded-lg p-6">
            <div className="flex flex-col items-center gap-4">
              <FileText className="w-12 h-12 text-slate-400" />
              <div className="text-center">
                <h3 className="font-medium text-slate-900 mb-1">ArUco Markers (IDs 0 & 1)</h3>
                <p className="text-sm text-slate-600">100mm × 100mm each</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(pdfUrl, '_blank')}
                  className="gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Open PDF
                </Button>
                <Button
                  onClick={() => {
                    const printWindow = window.open(pdfUrl, '_blank');
                    if (printWindow) {
                      printWindow.onload = () => {
                        setTimeout(() => {
                          printWindow.print();
                        }, 250);
                      };
                    }
                  }}
                  className="gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
              </div>
            </div>
          </div>

          {/* Printing Instructions */}
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900">Printing Instructions</AlertTitle>
            <AlertDescription className="text-blue-800 text-sm space-y-2 mt-2">
              <div className="space-y-1">
                <p className="font-medium">Before printing:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Open the PDF</li>
                </ol>
              </div>
              <div className="space-y-1">
                <p className="font-medium">In print dialog:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    <strong>Scale:</strong> 100% / Actual size
                  </li>
                  <li>
                    <strong className="text-red-600">DO NOT</strong> use "Fit to page"
                  </li>
                </ul>
              </div>
              <div className="space-y-1">
                <p className="font-medium">After printing - Measure with ruler:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>At least 2 consecutive sides must measure 40mm each</li>
                  <li>If measurements don't match, adjust print settings and try again</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* Verification Checklist */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h4 className="font-medium text-sm mb-3 text-slate-900">Verification Checklist</h4>
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>PDF opened successfully</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Print scale set to 100% / Actual size</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Markers printed and measured (40mm per side)</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-end">
            <Button onClick={onNext} variant="outline" className="gap-2">
              I've printed them
              <CheckCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
