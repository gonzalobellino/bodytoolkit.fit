import React from 'react';
import { CheckCircle, Ruler } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface CalibrationPlaceStepProps {
  onNext: () => void;
}

export function CalibrationPlaceStep({ onNext }: CalibrationPlaceStepProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold bg-blue-500 text-white">
            2
          </div>
          Place the Markers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* SVG Illustration */}
          <div className="bg-white border-2 border-dashed border-slate-300 rounded-lg p-6">
            <svg
              viewBox="0 0 400 300"
              className="w-full h-auto"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Floor/Background */}
              <rect x="0" y="0" width="400" height="300" fill="#f8fafc" />
              
              {/* Grid lines for floor */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="400" height="300" fill="url(#grid)" />
              
              {/* Marker 1 (ID 0) */}
              <g transform="translate(100, 150)">
                <rect
                  x="-20"
                  y="-20"
                  width="40"
                  height="40"
                  fill="#1e293b"
                  stroke="#0f172a"
                  strokeWidth="2"
                  rx="2"
                />
                <text
                  x="0"
                  y="5"
                  textAnchor="middle"
                  fill="white"
                  fontSize="10"
                  fontWeight="bold"
                >
                  ID: 0
                </text>
              </g>
              
              {/* Marker 2 (ID 1) */}
              <g transform="translate(300, 150)">
                <rect
                  x="-20"
                  y="-20"
                  width="40"
                  height="40"
                  fill="#1e293b"
                  stroke="#0f172a"
                  strokeWidth="2"
                  rx="2"
                />
                <text
                  x="0"
                  y="5"
                  textAnchor="middle"
                  fill="white"
                  fontSize="10"
                  fontWeight="bold"
                >
                  ID: 1
                </text>
              </g>
              
              {/* Distance line */}
              <line
                x1="120"
                y1="150"
                x2="280"
                y2="150"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              
              {/* Distance label */}
              <g transform="translate(200, 130)">
                <rect
                  x="-30"
                  y="-12"
                  width="60"
                  height="20"
                  fill="#3b82f6"
                  rx="4"
                />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight="bold"
                >
                  30 cm
                </text>
              </g>
              
              {/* Arrows indicating distance */}
              <path
                d="M 120 140 L 115 150 L 120 160"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
              />
              <path
                d="M 280 140 L 285 150 L 280 160"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
              />
              
              {/* Instructions text */}
              <text
                x="200"
                y="250"
                textAnchor="middle"
                fill="#475569"
                fontSize="14"
                fontWeight="500"
              >
                Place markers 30cm apart (center to center)
              </text>
            </svg>
          </div>

          {/* Setup Guide */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Ruler className="w-4 h-4 text-blue-600" />
                Setup Guide
              </h4>
              <ul className="text-sm text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Place markers on the floor, 30cm apart (center to center)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Position near where client will be recorded</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Ensure markers are flat and visible</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Good lighting improves detection</span>
                </li>
              </ul>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-sm mb-2 text-blue-900">Why 30cm?</h4>
              <p className="text-sm text-blue-800">
                30cm is the standard calibration distance. It's easy to measure and provides
                good accuracy for typical movement analysis recordings.
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-end">
            <Button onClick={onNext} variant="outline" className="gap-2">
              Markers are placed
              <CheckCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
