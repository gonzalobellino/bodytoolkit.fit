import React, { useEffect, useRef, useState } from 'react';
import type { Keypoint } from '../utils/poseAnalysis';
import type { TrailHistory } from '../hooks/usePoseTrails';

// Joint angle definitions: [point1Index, vertexIndex, point3Index, label]
// Angle is calculated at the vertex point
export type JointAngleType = 'left_shoulder' | 'right_shoulder' | 'left_elbow' | 'right_elbow' | 'left_hip' | 'right_hip' | 'left_knee' | 'right_knee';

export const JOINT_ANGLES: Record<JointAngleType, [number, number, number, string]> = {
  // Shoulder angles: hip -> shoulder -> elbow
  left_shoulder: [11, 5, 7, 'L Shoulder'],
  right_shoulder: [12, 6, 8, 'R Shoulder'],
  // Elbow angles: shoulder -> elbow -> wrist
  left_elbow: [5, 7, 9, 'L Elbow'],
  right_elbow: [6, 8, 10, 'R Elbow'],
  // Hip angles: shoulder -> hip -> knee
  left_hip: [5, 11, 13, 'L Hip'],
  right_hip: [6, 12, 14, 'R Hip'],
  // Knee angles: hip -> knee -> ankle
  left_knee: [11, 13, 15, 'L Knee'],
  right_knee: [12, 14, 16, 'R Knee'],
};

export const ALL_JOINT_ANGLES: JointAngleType[] = Object.keys(JOINT_ANGLES) as JointAngleType[];

interface PoseOverlayProps {
  keypoints: Keypoint[];
  videoWidth: number;
  videoHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  drawWidth?: number;
  drawHeight?: number;
  offsetX?: number;
  offsetY?: number;
  flipX?: boolean;
  modelType?: 'movenet' | 'blazepose';
  showKeypoints?: boolean;
  showSkeleton?: boolean;
  keypointColor?: string;
  skeletonColor?: string;
  threshold?: number;
  trailHistory?: TrailHistory;
  trailConfigs?: Record<number, { enabled: boolean; color: string }>;
  trailOpacity?: number;
  currentTime?: number;
  onKeypointClick?: (index: number, x: number, y: number) => void;
  onKeypointDrag?: (index: number, newX: number, newY: number, originalX: number, originalY: number) => void;
  selectedKeypoint?: number | null;
  containerTransform?: { x: number; y: number; scale: number };
  dragModeEnabled?: boolean;
  allowInteraction?: boolean; // If false, don't capture pointer events (allows drawing tools to work)
  onHoverKeypoint?: (index: number | null) => void; // Callback to notify parent about hover state
  hoveredKeypointIndex?: number | null; // External hover state (from parent)
  onClickOutside?: () => void; // Callback when user clicks outside any keypoint (for deselection)
  // Joint angles overlay
  showAngles?: boolean;
  angleTypes?: JointAngleType[]; // Which angles to show, defaults to all
  angleColor?: string;
}

// Skeleton connections for MoveNet (17 keypoints)
const SKELETON_CONNECTIONS = [
  // Head
  [0, 1], // nose - left_eye
  [0, 2], // nose - right_eye
  [1, 3], // left_eye - left_ear
  [2, 4], // right_eye - right_ear
  
  // Torso
  [5, 6], // left_shoulder - right_shoulder
  [5, 11], // left_shoulder - left_hip
  [6, 12], // right_shoulder - right_hip
  [11, 12], // left_hip - right_hip
  
  // Left arm
  [5, 7], // left_shoulder - left_elbow
  [7, 9], // left_elbow - left_wrist
  
  // Right arm
  [6, 8], // right_shoulder - right_elbow
  [8, 10], // right_elbow - right_wrist
  
  // Left leg
  [11, 13], // left_hip - left_knee
  [13, 15], // left_knee - left_ankle
  
  // Right leg
  [12, 14], // right_hip - right_knee
  [14, 16], // right_knee - right_ankle
];

const FACE_KEYPOINTS = new Set(['nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear']);

export function PoseOverlay({
  keypoints,
  videoWidth,
  videoHeight,
  canvasWidth,
  canvasHeight,
  drawWidth,
  drawHeight,
  offsetX = 0,
  offsetY = 0,
  flipX = false,
  modelType = 'movenet',
  showKeypoints = true,
  showSkeleton = true,
  keypointColor = '#00ff00',
  skeletonColor = '#ff00ff',
  threshold = 0.3,
  trailHistory,
  trailConfigs = {},
  trailOpacity = 0.5,
  currentTime,
  onKeypointClick,
  onKeypointDrag,
  selectedKeypoint,
  containerTransform,
  dragModeEnabled = false,
  allowInteraction = true,
  onHoverKeypoint,
  hoveredKeypointIndex: externalHoveredIndex,
  onClickOutside,
  showAngles = false,
  angleTypes = ALL_JOINT_ANGLES,
  angleColor = '#00ffff',
}: PoseOverlayProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredKeypoint, setHoveredKeypoint] = useState<number | null>(null);
  const dragStateRef = useRef<{
    draggedKeypoint: number | null;
    startX: number;
    startY: number;
    originalKp: Keypoint | null;
    isDragging: boolean;
    clickStartTime: number;
    clickStartPos: { x: number; y: number } | null;
    lastDragX: number;
    lastDragY: number;
  }>({
    draggedKeypoint: null,
    startX: 0,
    startY: 0,
    originalKp: null,
    isDragging: false,
    clickStartTime: 0,
    clickStartPos: null,
    lastDragX: 0,
    lastDragY: 0,
  });
  // Track if we're in passthrough mode (forwarding events to elements below)
  const passthroughRef = useRef<{ active: boolean; targetElement: Element | null }>({
    active: false,
    targetElement: null,
  });
  const effectiveThreshold = modelType === 'blazepose' ? Math.min(0.05, threshold) : threshold;
  const shouldCollapseFace = modelType === 'blazepose';
  const isFaceKeypoint = (kp: Keypoint, index: number): boolean => {
    if (kp.name && FACE_KEYPOINTS.has(kp.name)) {
      return true;
    }
    return index <= 4;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (!keypoints || keypoints.length === 0) return;
    if (!videoWidth || !videoHeight) return;

    // Scale factor from video to canvas
    const effectiveDrawWidth = drawWidth ?? canvasWidth;
    const effectiveDrawHeight = drawHeight ?? canvasHeight;
    const scaleX = effectiveDrawWidth / videoWidth;
    const scaleY = effectiveDrawHeight / videoHeight;
    const mapX = (x: number): number => {
      const scaled = x * scaleX;
      return offsetX + (flipX ? effectiveDrawWidth - scaled : scaled);
    };
    const mapY = (y: number): number => offsetY + y * scaleY;

    // Draw trails before skeleton and keypoints (so they appear behind)
    if (trailHistory && typeof trailHistory === 'object' && Object.keys(trailHistory).length > 0) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2;

      Object.keys(trailHistory).forEach((keyStr) => {
        const keypointIndex = parseInt(keyStr, 10);
        if (isNaN(keypointIndex)) return;
        
        // Check if trail is enabled for this keypoint
        const config = trailConfigs[keypointIndex];
        if (!config || !config.enabled) {
          return;
        }
        
        const trail = trailHistory[keypointIndex];
        
        if (!trail || !Array.isArray(trail) || trail.length === 0) return;
        
        // Skip face keypoints if using blazepose
        if (shouldCollapseFace) {
          const kp = keypoints[keypointIndex];
          if (kp && isFaceKeypoint(kp, keypointIndex)) return;
        }

        // Draw trail as a trail of individual points (estela de puntos)
        // Filter trail points to only include those up to current time (in case of scrubbing)
        const filteredTrail = currentTime !== undefined 
          ? trail.filter((point) => point.time <= currentTime)
          : trail;
        
        if (filteredTrail.length === 0) return;

        // Convert hex color to rgb for opacity control
        const baseColor = config.color || '#ffff00';
        const r = parseInt(baseColor.slice(1, 3), 16);
        const g = parseInt(baseColor.slice(3, 5), 16);
        const b = parseInt(baseColor.slice(5, 7), 16);

        // Draw each point individually with decreasing opacity (oldest: 20%, newest: 100%)
        filteredTrail.forEach((point, index) => {
          // Calculate age ratio (0 = oldest, 1 = newest)
          const ageRatio = filteredTrail.length > 1 ? index / (filteredTrail.length - 1) : 1;
          
          // Opacity increases from old to new (oldest: 20% of max, newest: 100% of max)
          const pointOpacity = trailOpacity * (0.2 + 0.8 * ageRatio);
          
          const x = mapX(point.x);
          const y = mapY(point.y);
          
          // Draw point as a filled circle (increased by 2px: from 2 to 4)
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${pointOpacity})`;
          ctx.fill();
        });
      });
      
      ctx.globalAlpha = 1.0; // Reset opacity
    }

    if (shouldCollapseFace) {
      const faceKeypoints = keypoints.filter((kp, index) => isFaceKeypoint(kp, index) && kp.score >= effectiveThreshold);
      if (faceKeypoints.length >= 2) {
        const center = faceKeypoints.reduce(
          (acc, kp) => ({ x: acc.x + kp.x, y: acc.y + kp.y }),
          { x: 0, y: 0 }
        );
        const centerX = center.x / faceKeypoints.length;
        const centerY = center.y / faceKeypoints.length;
        const maxDistance = Math.max(
          ...faceKeypoints.map((kp) => Math.hypot(kp.x - centerX, kp.y - centerY))
        );
        const radius = Math.max(maxDistance * 1.8, 6);
        const scaledRadius = radius * (scaleX + scaleY) * 0.5;

        ctx.beginPath();
        ctx.arc(mapX(centerX), mapY(centerY), scaledRadius, 0, 2 * Math.PI);
        ctx.strokeStyle = keypointColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Draw skeleton connections
    if (showSkeleton) {
      ctx.strokeStyle = skeletonColor;
      ctx.lineWidth = 2;

      SKELETON_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const start = keypoints[startIdx];
        const end = keypoints[endIdx];

        if (!start || !end) return;
        if (shouldCollapseFace && isFaceKeypoint(start, startIdx) && isFaceKeypoint(end, endIdx)) {
          return;
        }
        if (start.score < effectiveThreshold || end.score < effectiveThreshold) return;

        const x1 = mapX(start.x);
        const y1 = mapY(start.y);
        const x2 = mapX(end.x);
        const y2 = mapY(end.y);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });
    }

    // Draw keypoints
    if (showKeypoints) {
      keypoints.forEach((kp, index) => {
        if (kp.score < effectiveThreshold) return;
        if (shouldCollapseFace && isFaceKeypoint(kp, index)) return;

        const x = mapX(kp.x);
        const y = mapY(kp.y);

        // Highlight selected keypoint
        const isSelected = selectedKeypoint === index;
        const isHovered = hoveredKeypoint === index;
        const trailConfig = trailConfigs[index];
        const hasTrail = trailConfig?.enabled;

        // Draw keypoint circle with larger radius if selected, hovered, or has trail
        const baseRadius = 4;
        const radius = isSelected ? 7 : isHovered ? 6 : hasTrail ? 5 : baseRadius;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        
        // Use hover color (cyan/blue) if hovered, trail color if enabled, otherwise default
        let fillColor = keypointColor;
        if (isHovered) {
          fillColor = '#00ffff'; // Cyan for hover
        } else if (hasTrail) {
          fillColor = trailConfig.color;
        }
        ctx.fillStyle = fillColor;
        ctx.fill();
        
        // Border: white default, yellow if hovered, red if selected
        if (isSelected) {
          ctx.strokeStyle = '#ff0000'; // Red for selected
          ctx.lineWidth = 3;
        } else if (isHovered) {
          ctx.strokeStyle = '#ffff00'; // Yellow for hover
          ctx.lineWidth = 2.5;
        } else {
          ctx.strokeStyle = '#ffffff'; // White default
          ctx.lineWidth = 2;
        }
        ctx.stroke();

        // Draw keypoint name (optional, for debugging)
        // if (kp.name) {
        //   ctx.fillStyle = '#ffffff';
        //   ctx.font = '10px sans-serif';
        //   ctx.fillText(kp.name, x + 6, y - 6);
        // }
      });
    }

    // Draw joint angles
    if (showAngles && angleTypes.length > 0) {
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      angleTypes.forEach((angleType) => {
        const [idx1, idxVertex, idx2, label] = JOINT_ANGLES[angleType];
        const p1 = keypoints[idx1];
        const vertex = keypoints[idxVertex];
        const p2 = keypoints[idx2];

        if (!p1 || !vertex || !p2) return;
        if (p1.score < effectiveThreshold || vertex.score < effectiveThreshold || p2.score < effectiveThreshold) return;

        // Map to canvas coordinates
        const vx = mapX(vertex.x);
        const vy = mapY(vertex.y);
        const x1 = mapX(p1.x);
        const y1 = mapY(p1.y);
        const x2 = mapX(p2.x);
        const y2 = mapY(p2.y);

        // Calculate angle using vectors from vertex to each point
        const v1x = x1 - vx;
        const v1y = y1 - vy;
        const v2x = x2 - vx;
        const v2y = y2 - vy;

        // Angle between vectors using atan2
        const angle1 = Math.atan2(v1y, v1x);
        const angle2 = Math.atan2(v2y, v2x);

        // Calculate the actual angle in degrees (0-180)
        const dot = v1x * v2x + v1y * v2y;
        const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
        const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
        const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
        const angleDegrees = Math.round(Math.acos(cosAngle) * (180 / Math.PI));

        // Draw arc at vertex
        const arcRadius = 20;
        
        // Determine start and end angles for the arc (draw the smaller arc)
        let startAngle = angle1;
        let endAngle = angle2;
        
        // Normalize angles to ensure we draw the arc on the correct side
        let diff = endAngle - startAngle;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        
        if (diff < 0) {
          [startAngle, endAngle] = [endAngle, startAngle];
          diff = -diff;
        }

        // Draw filled arc
        ctx.beginPath();
        ctx.moveTo(vx, vy);
        ctx.arc(vx, vy, arcRadius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = angleColor + '40'; // 25% opacity
        ctx.fill();

        // Draw arc outline
        ctx.beginPath();
        ctx.arc(vx, vy, arcRadius, startAngle, endAngle);
        ctx.strokeStyle = angleColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw angle text
        const midAngle = startAngle + diff / 2;
        const textRadius = arcRadius + 14;
        const textX = vx + Math.cos(midAngle) * textRadius;
        const textY = vy + Math.sin(midAngle) * textRadius;

        // Background for text
        const text = `${angleDegrees}°`;
        const textMetrics = ctx.measureText(text);
        const padding = 3;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(
          textX - textMetrics.width / 2 - padding,
          textY - 7 - padding,
          textMetrics.width + padding * 2,
          14 + padding * 2
        );

        // Draw text
        ctx.fillStyle = angleColor;
        ctx.fillText(text, textX, textY);
      });
    }
  }, [
    keypoints,
    videoWidth,
    videoHeight,
    canvasWidth,
    canvasHeight,
    drawWidth,
    drawHeight,
    offsetX,
    offsetY,
    flipX,
    modelType,
    showKeypoints,
    showSkeleton,
    keypointColor,
    skeletonColor,
    threshold,
    effectiveThreshold,
    trailHistory,
    trailConfigs,
    trailOpacity,
    selectedKeypoint,
    hoveredKeypoint,
    showAngles,
    angleTypes,
    angleColor,
  ]);

  // Handle hover, clicks and drags on keypoints
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Ensure canvas can receive events only if interaction is allowed
    // This prevents blocking drawing tools when they are selected
    const shouldCaptureEvents = allowInteraction && (onKeypointClick || onKeypointDrag);
    // Enable pointer events when interaction is allowed - we need to receive events to detect hover
    // The handlePointerDown only stops propagation when clicking on an actual keypoint
    canvas.style.pointerEvents = shouldCaptureEvents ? 'auto' : 'none';
    canvas.style.cursor = dragModeEnabled ? 'grab' : (shouldCaptureEvents ? 'pointer' : 'default');

    const dragState = dragStateRef.current;

    // Helper functions for coordinate mapping
    const getMapFunctions = (): { mapX: (x: number) => number; mapY: (y: number) => number; unmapX: (canvasX: number) => number; unmapY: (canvasY: number) => number; } => {
      const effectiveDrawWidth = drawWidth ?? canvasWidth;
      const effectiveDrawHeight = drawHeight ?? canvasHeight;
      const scaleX = effectiveDrawWidth / videoWidth;
      const scaleY = effectiveDrawHeight / videoHeight;
      const mapX = (x: number): number => {
        const scaled = x * scaleX;
        return offsetX + (flipX ? effectiveDrawWidth - scaled : scaled);
      };
      const mapY = (y: number): number => offsetY + y * scaleY;
      const unmapX = (canvasX: number): number => {
        const adjustedX = flipX ? effectiveDrawWidth - (canvasX - offsetX) : canvasX - offsetX;
        return adjustedX / scaleX;
      };
      const unmapY = (canvasY: number): number => {
        return (canvasY - offsetY) / scaleY;
      };
      return { mapX, mapY, unmapX, unmapY };
    };

    const findKeypointAtPosition = (x: number, y: number): number | null => {
      const { mapX, mapY } = getMapFunctions();
      const clickRadius = 15; // Increased radius for easier clicking

      // Coordinates passed to this function are already adjusted for container transform
      // (they come from handlePointerDown/Move which already reverse the transform)
      // So we can use them directly
      let adjustedX = x;
      let adjustedY = y;

      let closestIndex: number | null = null;
      let closestDistance = Infinity;

      for (let i = 0; i < keypoints.length; i++) {
        const kp = keypoints[i];
        if (!kp || kp.score < effectiveThreshold) continue;
        if (shouldCollapseFace && isFaceKeypoint(kp, i)) continue;

        const kpX = mapX(kp.x);
        const kpY = mapY(kp.y);
        const distance = Math.hypot(adjustedX - kpX, adjustedY - kpY);

        if (distance <= clickRadius && distance < closestDistance) {
          closestDistance = distance;
          closestIndex = i;
        }
      }
      return closestIndex;
    };

    const handlePointerDown = (e: PointerEvent): void => {
      const rect = canvas.getBoundingClientRect();
      // Get coordinates relative to canvas (already accounts for container transform via getBoundingClientRect)
      let clickX = e.clientX - rect.left;
      let clickY = e.clientY - rect.top;

      // The canvas is inside a container with transform (translate + scale)
      // getBoundingClientRect() already accounts for the transform, so we need to reverse it
      // Transform order: translate then scale, so reverse: unscale then untranslate
      if (containerTransform) {
        // Get canvas center for transform origin
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        // Reverse scale first (around center), then reverse translate
        clickX = ((clickX - centerX) / containerTransform.scale) + centerX - containerTransform.x;
        clickY = ((clickY - centerY) / containerTransform.scale) + centerY - containerTransform.y;
      }

      const keypointIndex = findKeypointAtPosition(clickX, clickY);
      
      if (keypointIndex !== null) {
        e.stopPropagation();
        // Store original keypoint position at the moment of click
        const originalKp = keypoints[keypointIndex];
        dragState.draggedKeypoint = keypointIndex;
        dragState.originalKp = { ...originalKp }; // Deep copy to avoid reference issues
        dragState.startX = clickX;
        dragState.startY = clickY;
        dragState.lastDragX = clickX;
        dragState.lastDragY = clickY;
        dragState.isDragging = false; // Don't start dragging immediately, wait for movement
        // Only capture pointer if drag mode is enabled
        if (dragModeEnabled && onKeypointDrag) {
          canvas.setPointerCapture(e.pointerId);
        }
        e.preventDefault();
        return;
      }
      
      // Notify parent that user clicked outside any keypoint (for deselection)
      if (onClickOutside) {
        onClickOutside();
      }
      
      // If no keypoint was clicked, forward the event to elements underneath
      // Temporarily disable pointer events on this canvas to find the element below
      canvas.style.pointerEvents = 'none';
      const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
      canvas.style.pointerEvents = 'auto';
      
      if (elementBelow && elementBelow !== canvas) {
        // Activate passthrough mode to forward all subsequent events until pointerup
        passthroughRef.current = { active: true, targetElement: elementBelow };
        
        // Create and dispatch a new pointer event to the element below
        const newEvent = new PointerEvent(e.type, {
          bubbles: true,
          cancelable: true,
          pointerId: e.pointerId,
          width: e.width,
          height: e.height,
          pressure: e.pressure,
          tangentialPressure: e.tangentialPressure,
          tiltX: e.tiltX,
          tiltY: e.tiltY,
          twist: e.twist,
          pointerType: e.pointerType,
          isPrimary: e.isPrimary,
          clientX: e.clientX,
          clientY: e.clientY,
          screenX: e.screenX,
          screenY: e.screenY,
          button: e.button,
          buttons: e.buttons,
        });
        elementBelow.dispatchEvent(newEvent);
      }
    };

    const handlePointerMove = (e: PointerEvent): void => {
      // If in passthrough mode, forward events to the target element
      if (passthroughRef.current.active && passthroughRef.current.targetElement) {
        const newEvent = new PointerEvent(e.type, {
          bubbles: true,
          cancelable: true,
          pointerId: e.pointerId,
          width: e.width,
          height: e.height,
          pressure: e.pressure,
          tangentialPressure: e.tangentialPressure,
          tiltX: e.tiltX,
          tiltY: e.tiltY,
          twist: e.twist,
          pointerType: e.pointerType,
          isPrimary: e.isPrimary,
          clientX: e.clientX,
          clientY: e.clientY,
          screenX: e.screenX,
          screenY: e.screenY,
          button: e.button,
          buttons: e.buttons,
        });
        passthroughRef.current.targetElement.dispatchEvent(newEvent);
        return;
      }
      
      const rect = canvas.getBoundingClientRect();
      let currentX = e.clientX - rect.left;
      let currentY = e.clientY - rect.top;

      // Apply container transform for hover detection
      if (containerTransform) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        currentX = ((currentX - centerX) / containerTransform.scale) + centerX - containerTransform.x;
        currentY = ((currentY - centerY) / containerTransform.scale) + centerY - containerTransform.y;
      }

      // Check for hover (only if not dragging)
      if (dragState.draggedKeypoint === null) {
        const hoveredIndex = findKeypointAtPosition(currentX, currentY);
        setHoveredKeypoint(hoveredIndex);
        // Notify parent about hover state so it can enable/disable pointer events
        if (onHoverKeypoint) {
          onHoverKeypoint(hoveredIndex);
        }
      }

      // Handle drag (only if drag mode is enabled and we have a keypoint selected)
      if (dragModeEnabled && dragState.draggedKeypoint !== null && dragState.originalKp && onKeypointDrag) {
        // Check if user has moved the mouse (start dragging)
        const moveDelta = Math.hypot(
          currentX - dragState.startX,
          currentY - dragState.startY
        );

        if (moveDelta > 2) { // Small threshold just to avoid accidental drags
          dragState.isDragging = true;
        }

        // Only update if we're actually dragging
        if (dragState.isDragging) {
          const updateDelta = Math.hypot(
            currentX - dragState.lastDragX,
            currentY - dragState.lastDragY
          );

          if (updateDelta > 1) {
            const { unmapX, unmapY } = getMapFunctions();
            
            // Apply container transform to drag coordinates
            let adjustedX = currentX;
            let adjustedY = currentY;
            if (containerTransform) {
              const centerX = rect.width / 2;
              const centerY = rect.height / 2;
              adjustedX = ((currentX - centerX) / containerTransform.scale) + centerX - containerTransform.x;
              adjustedY = ((currentY - centerY) / containerTransform.scale) + centerY - containerTransform.y;
            }
            
            // Convert canvas coordinates to video coordinates
            const newVideoX = unmapX(adjustedX);
            const newVideoY = unmapY(adjustedY);

            // Use original keypoint position, not current (which may have been modified)
            onKeypointDrag(
              dragState.draggedKeypoint!,
              newVideoX,
              newVideoY,
              dragState.originalKp.x,
              dragState.originalKp.y
            );

            dragState.lastDragX = currentX;
            dragState.lastDragY = currentY;
          }
        }
      }
    };

    const handlePointerUp = (e: PointerEvent): void => {
      // If in passthrough mode, forward the event and reset
      if (passthroughRef.current.active && passthroughRef.current.targetElement) {
        const newEvent = new PointerEvent(e.type, {
          bubbles: true,
          cancelable: true,
          pointerId: e.pointerId,
          width: e.width,
          height: e.height,
          pressure: e.pressure,
          tangentialPressure: e.tangentialPressure,
          tiltX: e.tiltX,
          tiltY: e.tiltY,
          twist: e.twist,
          pointerType: e.pointerType,
          isPrimary: e.isPrimary,
          clientX: e.clientX,
          clientY: e.clientY,
          screenX: e.screenX,
          screenY: e.screenY,
          button: e.button,
          buttons: e.buttons,
        });
        passthroughRef.current.targetElement.dispatchEvent(newEvent);
        passthroughRef.current = { active: false, targetElement: null };
        return;
      }
      
      const draggedKeypointIndex = dragState.draggedKeypoint;
      const wasDragging = dragState.isDragging;
      
      // Reset drag state first (important: do this before calling callbacks)
      dragState.draggedKeypoint = null;
      dragState.originalKp = null;
      dragState.isDragging = false;
      
      // Always show menu on click, unless we were actually dragging
      // (Only prevent menu if drag mode was enabled AND we actually dragged)
      if (draggedKeypointIndex !== null && onKeypointClick) {
        if (!wasDragging) {
          // It was a click, show the menu
          const { mapX, mapY } = getMapFunctions();
          // Use current keypoint position (may have been adjusted)
          const kp = keypoints[draggedKeypointIndex];
          if (kp) {
            const kpX = mapX(kp.x);
            const kpY = mapY(kp.y);
            const screenRect = canvas.getBoundingClientRect();
            const screenX = screenRect.left + kpX;
            const screenY = screenRect.top + kpY;
            // Call directly without setTimeout
            onKeypointClick(draggedKeypointIndex, screenX, screenY);
          }
        }
      }
      
      // Update hover state after drag ends
      const rect = canvas.getBoundingClientRect();
      let currentX = e.clientX - rect.left;
      let currentY = e.clientY - rect.top;
      
      // Apply container transform
      if (containerTransform) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        currentX = ((currentX - centerX) / containerTransform.scale) + centerX - containerTransform.x;
        currentY = ((currentY - centerY) / containerTransform.scale) + centerY - containerTransform.y;
      }
      
      const hoveredIndex = findKeypointAtPosition(currentX, currentY);
      setHoveredKeypoint(hoveredIndex);
      
      if (dragModeEnabled) {
        canvas.releasePointerCapture(e.pointerId);
      }
    };

    // Also handle click events directly as a fallback (more reliable than pointer events for clicks)
    const handleClick = (e: MouseEvent): void => {
      // Only handle if we're not in the middle of a drag
      if (dragState.draggedKeypoint !== null || dragState.isDragging) {
        // If we just finished a drag, don't trigger click
        return;
      }

      const rect = canvas.getBoundingClientRect();
      let clickX = e.clientX - rect.left;
      let clickY = e.clientY - rect.top;

      // Apply container transform to click coordinates
      if (containerTransform) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        clickX = ((clickX - centerX) / containerTransform.scale) + centerX - containerTransform.x;
        clickY = ((clickY - centerY) / containerTransform.scale) + centerY - containerTransform.y;
      }

      const keypointIndex = findKeypointAtPosition(clickX, clickY);
      
      if (keypointIndex !== null && onKeypointClick) {
        e.stopPropagation();
        e.preventDefault();
        const { mapX, mapY } = getMapFunctions();
        const kp = keypoints[keypointIndex];
        if (kp) {
          const kpX = mapX(kp.x);
          const kpY = mapY(kp.y);
          const screenRect = canvas.getBoundingClientRect();
          const screenX = screenRect.left + kpX;
          const screenY = screenRect.top + kpY;
          // Call immediately
          onKeypointClick(keypointIndex, screenX, screenY);
        }
      }
    };

    const handlePointerLeave = (): void => {
      // Clear passthrough mode when leaving canvas
      passthroughRef.current = { active: false, targetElement: null };
      // Clear hover when mouse leaves canvas
      setHoveredKeypoint(null);
      // Notify parent that hover is cleared
      if (onHoverKeypoint) {
        onHoverKeypoint(null);
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
    canvas.addEventListener('pointermove', handlePointerMove, { passive: false });
    canvas.addEventListener('pointerup', handlePointerUp, { passive: false });
    canvas.addEventListener('pointercancel', handlePointerUp, { passive: false });
    canvas.addEventListener('pointerleave', handlePointerLeave);
    // Add click handler as fallback
    if (onKeypointClick) {
      canvas.addEventListener('click', handleClick, { capture: true });
    }

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      if (onKeypointClick) {
        canvas.removeEventListener('click', handleClick, { capture: true });
      }
    };
  }, [
    canvasRef, 
    onKeypointClick, 
    onKeypointDrag,
    onHoverKeypoint,
    keypoints, 
    videoWidth, 
    videoHeight, 
    canvasWidth, 
    canvasHeight, 
    drawWidth, 
    drawHeight, 
    offsetX, 
    offsetY, 
    flipX, 
    threshold, 
    effectiveThreshold, 
    containerTransform,
    shouldCollapseFace,
    dragModeEnabled,
    setHoveredKeypoint,
    onClickOutside
  ]);

  const shouldCaptureEvents = allowInteraction && (onKeypointClick || onKeypointDrag);
  return (
    <canvas
      ref={canvasRef}
      className={shouldCaptureEvents ? "absolute inset-0 pointer-events-auto cursor-pointer" : "absolute inset-0 pointer-events-none"}
      style={{ zIndex: 15 }}
    />
  );
}
