import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Download } from 'lucide-react';

interface VisualAssessmentProps {
  onBack: () => void;
}

interface Observation {
  timestamp: string;
  view: string;
  joint: string;
  side: string;
  observations: string[];
  painLevel: number;
  notes: string;
}

type AssessmentView = 'front' | 'back' | 'sagittal';
type JointPosition = { top: string; left: string };
type JointPositionMap = Record<string, JointPosition>;

const jointOptionsByView: Record<AssessmentView, Record<string, string[]>> = {
  front: {
    neck: ['Head tilt', 'Rotation'],
    shoulder: ['Elevated shoulder'],
    elbow: ['Elbow valgus', 'Elbow varus'],
    wrist: ['Ulnar deviation', 'Radial deviation'],
    thoracic: ['Rotation asymmetry'],
    lumbar: ['Rotation asymmetry'],
    hip: ['Hip drop'],
    knee: ['Knee valgus', 'Knee varus'],
    ankle: ['Overpronation', 'Supination']
  },
  back: {
    neck: ['Head tilt', 'Rotation'],
    shoulder: ['Scapular winging', 'Elevated shoulder'],
    elbow: ['Elbow valgus', 'Elbow varus'],
    wrist: ['Ulnar deviation', 'Radial deviation'],
    thoracic: ['Excessive kyphosis', 'Flat thoracic', 'Rotation asymmetry'],
    lumbar: ['Excessive lordosis', 'Flat lumbar', 'Rotation asymmetry'],
    hip: ['Hip drop'],
    knee: ['Knee valgus', 'Knee varus'],
    ankle: ['Overpronation', 'Supination']
  },
  sagittal: {
    neck: ['Forward head'],
    shoulder: ['Rounded shoulders'],
    elbow: ['Hyperextension', 'Flexion contracture'],
    wrist: ['Limited extension', 'Limited flexion'],
    thoracic: ['Excessive kyphosis', 'Flat thoracic'],
    lumbar: ['Excessive lordosis', 'Flat lumbar'],
    hip: ['Anterior pelvic tilt', 'Posterior pelvic tilt'],
    knee: ['Hyperextension'],
    ankle: ['Limited dorsiflexion']
  }
};

const jointPositions: Record<AssessmentView, JointPositionMap> = {
  front: {
    neck:             { top: '14%', left: '50%' },
    'shoulder-left':  { top: '22%', left: '28%' },
    'shoulder-right': { top: '22%', left: '72%' },
    'elbow-left':     { top: '32%', left: '20%' },
    'elbow-right':    { top: '32%', left: '80%' },
    'wrist-left':     { top: '42%', left: '15%' },
    'wrist-right':    { top: '42%', left: '85%' },
    thoracic:         { top: '30%', left: '50%' },
    lumbar:           { top: '44%', left: '50%' },
    'hip-left':       { top: '54%', left: '32%' },
    'hip-right':      { top: '54%', left: '68%' },
    'knee-left':      { top: '70%', left: '35%' },
    'knee-right':     { top: '70%', left: '65%' },
    'ankle-left':     { top: '88%', left: '35%' },
    'ankle-right':    { top: '88%', left: '65%' }
  },
  back: {
    neck:             { top: '14%', left: '50%' },
    'shoulder-left':  { top: '22%', left: '28%' },
    'shoulder-right': { top: '22%', left: '72%' },
    'elbow-left':     { top: '32%', left: '20%' },
    'elbow-right':    { top: '32%', left: '80%' },
    'wrist-left':     { top: '42%', left: '15%' },
    'wrist-right':    { top: '42%', left: '85%' },
    thoracic:         { top: '30%', left: '50%' },
    lumbar:           { top: '44%', left: '50%' },
    'hip-left':       { top: '54%', left: '32%' },
    'hip-right':      { top: '54%', left: '68%' },
    'knee-left':      { top: '70%', left: '35%' },
    'knee-right':     { top: '70%', left: '65%' },
    'ankle-left':     { top: '88%', left: '35%' },
    'ankle-right':    { top: '88%', left: '65%' }
  },
  sagittal: {
    neck:             { top: '14%', left: '50%' },
    'shoulder-right': { top: '23%', left: '50%' },
    thoracic:         { top: '32%', left: '50%' },
    'elbow-right':    { top: '40%', left: '50%' },
    lumbar:           { top: '48%', left: '50%' },
    'wrist-right':    { top: '55%', left: '50%' },
    'hip-right':      { top: '63%', left: '50%' },
    'knee-right':     { top: '77%', left: '50%' },
    'ankle-right':    { top: '91%', left: '50%' }
  }
};

function mapSideForView(side: string, view: string): string {
  if (side === 'midline') return 'midline';
  if (view === 'sagittal') return 'bilateral';
  if (view === 'front') {
    return side === 'left' ? 'right' : 'left';
  }
  return side;
}

function formatObsLabel(joint: string, side: string, view: string): string {
  const j = joint.charAt(0).toUpperCase() + joint.slice(1);
  const v = view.charAt(0).toUpperCase() + view.slice(1);
  if (side === 'bilateral' || side === 'midline') return `${j} — ${v}`;
  const s = side.charAt(0).toUpperCase() + side.slice(1);
  return `${s} ${j} — ${v}`;
}

export function VisualAssessment({ onBack }: VisualAssessmentProps) {
  const [view, setView] = useState<AssessmentView>('front');
  const [selectedJoint, setSelectedJoint] = useState<string | null>(null);
  const [side, setSide] = useState<string>('midline');
  const [selectedObservations, setSelectedObservations] = useState<string[]>([]);
  const [painLevel, setPainLevel] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [observations, setObservations] = useState<Observation[]>([]);
  const [hoveredJoint, setHoveredJoint] = useState<string | null>(null);
  const silhouetteRef = useRef<HTMLDivElement>(null);

  const viewOptions = jointOptionsByView[view] || {};
  const currentOptions = selectedJoint ? (viewOptions[selectedJoint] || []) : [];

  useEffect(() => {
    if (view === 'sagittal' && side === 'midline') {
      setSide('right');
    }
  }, [view]);

  const handleJointClick = (joint: string, jointSide: string) => {
    const rawSide = jointSide || 'midline';

    if (selectedJoint === joint && side === rawSide) {
      setSelectedJoint(null);
      setSelectedObservations([]);
      setPainLevel(0);
      setNotes('');
      return;
    }

    setSelectedJoint(joint);
    setSide(rawSide);
    setSelectedObservations([]);
    setPainLevel(0);
    setNotes('');
  };

  const handleObservationToggle = (option: string) => {
    setSelectedObservations(prev =>
      prev.includes(option)
        ? prev.filter(o => o !== option)
        : [...prev, option]
    );
  };

  const handleSave = () => {
    if (!selectedJoint) return;

    const record: Observation = {
      timestamp: new Date().toISOString(),
      view,
      joint: selectedJoint,
      side: mapSideForView(side, view),
      observations: selectedObservations,
      painLevel,
      notes: notes.trim()
    };

    setObservations(prev => [...prev, record]);
    setSelectedJoint(null);
    setSelectedObservations([]);
    setPainLevel(0);
    setNotes('');
  };

  const handleExportCSV = () => {
    const rows: string[][] = [
      ['timestamp', 'label', 'view', 'joint', 'side', 'observations', 'pain_level', 'notes']
    ];

    observations.forEach(item => {
      rows.push([
        item.timestamp,
        formatObsLabel(item.joint, item.side, item.view),
        item.view,
        item.joint,
        item.side,
        item.observations.join('|'),
        String(item.painLevel),
        item.notes.replace(/\n/g, ' ')
      ]);
    });

    const csv = rows.map(row =>
      row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'visual-assessment.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const getImageSrc = () => {
    if (view === 'back') return '/images/silueta_back.jpg';
    if (view === 'sagittal') return '/images/silueta_sagital.jpg';
    return '/images/silueta_front.jpg';
  };

  const getVisibleJoints = () => {
    const positions = jointPositions[view];
    return Object.keys(positions);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <div className="text-slate-900">Visual Assessment</div>
                <div className="text-xs text-slate-500">Body Mapping</div>
              </div>
            </div>
            {observations.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Silhouette Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-slate-900 mb-4">Silhouette</h3>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setView('front')}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    view === 'front'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Front
                </button>
                <button
                  onClick={() => setView('back')}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    view === 'back'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Back
                </button>
                <button
                  onClick={() => setView('sagittal')}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    view === 'sagittal'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Sagittal
                </button>
              </div>

              <div className="relative bg-slate-100 rounded-lg" ref={silhouetteRef}>
                <div className="text-center py-2 text-xs text-slate-600 bg-slate-200 rounded-t-lg">
                  {view.toUpperCase()}
                </div>
                <div
                  className={`relative${view === 'sagittal' ? ' flex justify-center' : ''}`}
                  style={view === 'sagittal' ? { height: '480px' } : undefined}
                >
                  <img
                    src={getImageSrc()}
                    alt={`${view} silhouette`}
                    className={view === 'sagittal' ? 'h-full w-auto rounded-b-lg' : 'w-full h-auto rounded-b-lg'}
                  />
                  {getVisibleJoints().map(jointKey => {
                    const positions = jointPositions[view];
                    const pos = positions[jointKey];
                    if (!pos) return null;
                    const [joint, jointSide] = jointKey.split('-');
                    const isActive = selectedJoint === joint && (side === jointSide || (jointSide === undefined && side === 'midline'));
                    const topPct = parseFloat(pos.top);
                    const leftPct = parseFloat(pos.left);
                    const showBelow = topPct < 28;
                    const tooltipAlign = leftPct < 35
                      ? 'left-0'
                      : leftPct > 65
                        ? 'right-0'
                        : 'left-1/2 -translate-x-1/2';
                    return (
                      <div
                        key={jointKey}
                        className="absolute"
                        style={{
                          top: pos.top,
                          left: pos.left,
                          transform: 'translate(-50%, -50%)',
                          zIndex: hoveredJoint === jointKey ? 20 : 10,
                        }}
                        onMouseEnter={() => setHoveredJoint(jointKey)}
                        onMouseLeave={() => setHoveredJoint(null)}
                      >
                        <button
                          onClick={() => handleJointClick(joint, jointSide || 'midline')}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${
                            isActive
                              ? 'bg-blue-600 border-white scale-125'
                              : 'bg-white border-blue-400 hover:scale-110'
                          }`}
                        />
                        {hoveredJoint === jointKey && (
                          <div className={`absolute ${tooltipAlign} pointer-events-none whitespace-nowrap ${showBelow ? 'top-full mt-2' : 'bottom-full mb-2'}`}>
                            <div className="bg-slate-800 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg">
                              {(() => {
                                const parts = jointKey.split('-');
                                const last = parts[parts.length - 1];
                                const jointName = (last === 'left' || last === 'right')
                                  ? parts.slice(0, -1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
                                  : parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
                                if (last !== 'left' && last !== 'right') return jointName;
                                if (view === 'sagittal') return jointName;
                                const anatomicalSide = mapSideForView(last, view);
                                return `${anatomicalSide.charAt(0).toUpperCase() + anatomicalSide.slice(1)} ${jointName}`;
                              })()}
                            </div>
                            <div className={`absolute ${leftPct < 35 ? 'left-3' : leftPct > 65 ? 'right-3' : 'left-1/2 -translate-x-1/2'} ${
                              showBelow
                                ? 'bottom-full border-b-slate-800 border-t-transparent'
                                : 'top-full border-t-slate-800 border-b-transparent'
                            } border-4 border-x-transparent`} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Observation Panel */}
          <div className="lg:col-span-2 space-y-6">
            {selectedJoint ? (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-slate-900 mb-4">
                  {formatObsLabel(selectedJoint, mapSideForView(side, view), view)}
                </h3>

                <div className="mb-4">
                  <div className="text-sm text-slate-700 mb-3">Observations</div>
                  <div className="space-y-2">
                    {currentOptions.map(option => (
                      <label
                        key={option}
                        className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedObservations.includes(option)}
                          onChange={() => handleObservationToggle(option)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-slate-700">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-slate-700 mb-2">Pain Level</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={painLevel}
                      onChange={(e) => setPainLevel(Number(e.target.value))}
                      className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${
                      painLevel === 0 ? 'bg-emerald-500' :
                      painLevel <= 3 ? 'bg-yellow-500' :
                      painLevel <= 6 ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}>
                      {painLevel}
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>No pain</span>
                    <span>Severe</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-slate-700 mb-2">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes..."
                  />
                </div>

                <button
                  onClick={handleSave}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Observation
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <p className="text-slate-600 text-center py-8">
                  Select a joint on the silhouette to record observations
                </p>
              </div>
            )}

            {/* Summary */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-slate-900 mb-4">Summary</h3>
              {observations.length === 0 ? (
                <p className="text-slate-500 text-sm">No observations yet.</p>
              ) : (
                <div className="space-y-2">
                  {observations.map((obs, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">
                            {formatObsLabel(obs.joint, obs.side, obs.view)}
                          </span>
                          {obs.painLevel > 0 && (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${
                              obs.painLevel <= 3 ? 'bg-yellow-500' :
                              obs.painLevel <= 6 ? 'bg-orange-500' :
                              'bg-red-500'
                            }`}>
                              Pain: {obs.painLevel}/10
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(obs.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {obs.observations.length > 0 && (
                        <div className="text-sm text-slate-600 mb-1">
                          {obs.observations.join(', ')}
                        </div>
                      )}
                      {obs.notes && (
                        <div className="text-sm text-slate-500 italic">{obs.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
