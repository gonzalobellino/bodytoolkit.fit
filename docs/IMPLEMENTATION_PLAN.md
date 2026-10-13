# Implementation Plan - Movement Analysis Features

## Overview

This document outlines the implementation plan for enhancing the movement analysis capabilities of the Corrective Exercise Toolkit. The focus is on adding value to keypoint detection without backend processing.

---

## Priority 1: Joint Angles Overlay ✅ COMPLETED

**Location**: Video Analysis

**Description**: Display real-time joint angles overlaid on the video during playback/recording.

**Features**:
- Toggle to show/hide angle overlays
- Selector for which joints to display
- Angles calculated: shoulder, elbow, hip, knee, ankle
- Visual: arc with degree label at each joint

**Implementation**:
- Added `JointAngleType` and `JOINT_ANGLES` definitions in `PoseOverlay.tsx`
- Added `showAngles`, `angleTypes`, `angleColor` props to PoseOverlay
- Renders filled arc with 25% opacity + stroke outline at vertex
- Displays degree value in rounded box near the arc
- Toggle added in VideoAnalysis UI under AI panel

**Files modified**:
- `src/components/PoseOverlay.tsx` - Added angle rendering logic
- `src/components/VideoAnalysis.tsx` - Added showJointAngles state and UI toggle

---

## Priority 2: Gait Patterns Detection ✅ COMPLETED

**Location**: Gait Analysis

**Description**: Expand gait analysis to detect 8 common gait patterns/compensations.

**Detectable patterns** (with current keypoint detection):

| Pattern | Detection Method | Status |
|---------|-----------------|--------|
| Hip drop (Trendelenburg) | Compare Y of left_hip vs right_hip | ✅ |
| Symmetric heel strike/toe off | Ankle Y velocity + timing intervals | ✅ |
| Hip levelness | Compare Y of left_hip vs right_hip | ✅ |
| Shoulder levelness | Compare Y of left_shoulder vs right_shoulder | ✅ |
| Trunk side tilt | Angle of shoulder-hip midline vs vertical | ✅ |
| Arm swing symmetry | Wrist X amplitude over 2-second window | ✅ |
| Head/neck position | Nose X relative to shoulder midpoint X | ✅ |
| Gait phases | Stance vs swing per leg based on ankle comparison | ✅ |

**NOT detectable** (require 3D or markers):
- Leg rotation
- Hip rotation
- Trunk rotation

**Implementation**:
- Expanded `useGaitAnalysis.ts` with `GaitPatternStatus` interface
- Added `THRESHOLDS` constants for severity levels
- Tracks wrist history and heel strikes over time windows
- Added real-time `patternStatus` to hook return
- Updated `GaitAnalysis.tsx` with Real-time Pattern Status card
- Added new compensation labels for all pattern types

**Files modified**:
- `src/hooks/useGaitAnalysis.ts` - Complete rewrite with 7 new patterns
- `src/components/GaitAnalysis.tsx` - Added patternStatus, Eye icon, real-time status card

---

## Priority 3: Compensation Alerts ✅ COMPLETED

**Location**: Movement Analysis (unified screen), VideoAnalysis

**Description**: Real-time alerts for common movement compensations during exercises.

**Compensations detected**:

| Compensation | Exercise Context | Detection Method | Status |
|--------------|-----------------|------------------|--------|
| Knee valgus | Squat, lunge | Knee X inside ankle-hip midline | ✅ |
| Trunk forward lean | Squat | Shoulder midX - hip midX distance | ✅ |
| Hip shift | Squat | Hip midX vs shoulder midX asymmetry | ✅ |
| Shoulder elevation | Overhead press | Shoulder Y vs baseline | ✅ |
| Cervical protraction | Any | Ear/nose X vs shoulder midX | ✅ |
| Lateral trunk lean | Single leg | Shoulder-hip midline angle vs vertical | ✅ |

**Implementation**:
- Created `useCompensationDetection.ts` hook with:
  - Configurable sensitivity (low/medium/high)
  - Per-compensation severity thresholds (mild/moderate/severe)
  - Baseline tracking for shoulder elevation
  - Alert throttling (500ms per type)
- Created `CompensationAlerts.tsx` component with:
  - `CompensationAlerts` - Full list view with severity badges
  - `CompensationAlertOverlay` - Floating overlay for video

**Files created**:
- `src/hooks/useCompensationDetection.ts` (280 lines)
- `src/components/CompensationAlerts.tsx` (160 lines)

**Integration**: Ready to integrate into VideoAnalysis and future Movement Analysis screen.

---

## Priority 4: Unify Analysis Screens ✅ COMPLETED

**Previous state**:
- SymmetryAnalysis.tsx - Basic bilateral comparison (oversimplified)
- MovementComparison.tsx - Normative data comparison

**New structure**: Single "Movement Analysis" screen with tabs:

1. **Symmetry Tab**: Left vs right bilateral comparison ✅
2. **Normative Tab**: Compare to population data (with disclaimer) ✅
3. **Compensations Tab**: Real-time compensation detection ✅

**Implementation**:
- Created unified `MovementAnalysis.tsx` with 3 tabs
- Added precision disclaimer in amber alert at top
- Integrated `useCompensationDetection` hook for real-time alerts
- Added `CompensationAlertOverlay` for video overlay
- Updated `FieldToolsSection.tsx` to use new unified screen
- Removed SymmetryAnalysis and MovementComparison from navigation

**Files created**:
- `src/components/MovementAnalysis.tsx` (580 lines)

**Files modified**:
- `src/components/FieldToolsSection.tsx` - Updated imports, tools array, and navigation

**Note**: Old `SymmetryAnalysis.tsx` and `MovementComparison.tsx` remain for backward compatibility but are no longer in navigation.

---

## Priority 5: ArUco Calibration System ✅ COMPLETED

**Description**: Enable real-world measurements (cm) using printed ArUco markers.

### Implementation

**Files created**:
- `src/hooks/useArucoCalibration.ts` - ArUco detection hook with js-aruco2
- `src/components/CalibrationPage.tsx` - Step-by-step calibration UI

**Features implemented**:
1. **Calibration Page with 3 steps**:
   - Step 1: Print markers (#42 and #43) with print button
   - Step 2: Placement instructions
   - Step 3: Capture and detect with visual feedback

2. **Detection Hook**:
   - Dynamic import of js-aruco2 (lazy loading)
   - Marker center calculation from corners
   - Calibration factor computation (cm/px)
   - `pixelsToCm()` and `pixelsToVelocity()` conversion functions
   - Error handling and detection state

3. **UI Features**:
   - SVG marker rendering for printing
   - Visual marker position indicators on captured image
   - Success/error alerts with details
   - "Learn more" link to OpenCV ArUco docs

**Dependency added**: `js-aruco2` (npm package)

### What benefits from calibration

| Feature | Without calibration | With calibration |
|---------|--------------------|--------------------|
| Joint angles | ✅ Works (relative) | ✅ Same |
| Compensations | ✅ Works (proportions) | ✅ Same |
| Step length | ❌ Pixels only | ✅ Real cm |
| Movement velocity | ❌ px/frame | ✅ m/s or cm/s |
| Trail distances | ❌ Relative | ✅ Real distances |

**Integration**: 
- CalibrationPage accessible from FieldToolsSection > Best Practices > Calibration
- Auto-detection of ArUco markers in VideoAnalysis, GaitAnalysis, and MovementAnalysis
- Blue "Calibrated" badge appears in top corner when markers detected in video
- Calibration factor stored for use in spatial measurements

---

## Technical Notes

### Accuracy Disclaimer

All screens using pose estimation should display:
- Precision limitations of 2D video analysis
- Recommendation for clinical validation
- Note about ArUco calibration for improved spatial accuracy

### What we explicitly do NOT support

- Rotation measurements (leg, hip, trunk) - require 3D
- Clinical-grade ROM for diagnosis - require calibrated instruments
- Direct comparison to normative data without disclaimer

---

## Implementation Order

1. **Joint Angles Overlay** - Low complexity, high visible value
2. **Gait Patterns** - Medium complexity, high clinical value  
3. **Compensation Alerts** - Medium complexity, high training value
4. **Unify Screens** - Medium complexity, better UX
5. **ArUco Calibration** - Medium-high complexity, enables spatial metrics

---

## Files to Create/Modify

### Priority 1 - Joint Angles
- [ ] `src/components/AngleOverlay.tsx` - New component
- [ ] `src/components/VideoAnalysis.tsx` - Add toggle + integration

### Priority 2 - Gait Patterns
- [ ] `src/hooks/useGaitAnalysis.ts` - Expand detection logic
- [ ] `src/components/GaitAnalysis.tsx` - Add pattern UI

### Priority 3 - Compensation Alerts
- [ ] `src/hooks/useCompensationDetection.ts` - New hook
- [ ] `src/components/CompensationAlerts.tsx` - New component

### Priority 4 - Unify Screens
- [ ] `src/components/MovementAnalysis.tsx` - New unified component
- [ ] Delete or deprecate `SymmetryAnalysis.tsx`
- [ ] Update routing

### Priority 5 - ArUco
- [ ] `src/components/CalibrationPage.tsx` - New page
- [ ] `src/hooks/useArucoCalibration.ts` - Detection hook
- [ ] `src/utils/arucoDetection.ts` - ArUco utilities
