import { useEffect, useRef } from 'react';
import type { CenterOfMass, BalancePoint } from '../utils/poseAnalysis';
import { getContainLayout } from '../utils/videoLayout';

interface CenterOfMassCanvasProps {
  centerOfMass: CenterOfMass | null;
  balancePoint: BalancePoint | null;
  videoWidth: number;
  videoHeight: number;
  canvasWidth: number;
  canvasHeight: number;
}

export function CenterOfMassCanvas({
  centerOfMass,
  balancePoint,
  videoWidth,
  videoHeight,
  canvasWidth,
  canvasHeight,
}: CenterOfMassCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const layout = getContainLayout(
      canvasWidth,
      canvasHeight,
      videoWidth,
      videoHeight
    );
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const scaleX = (layout.drawWidth ?? canvasWidth) / videoWidth;
    const scaleY = (layout.drawHeight ?? canvasHeight) / videoHeight;
    const mapX = (x: number) => {
      const scaled = x * scaleX;
      return (layout.offsetX ?? 0) + scaled;
    };
    const mapY = (y: number) => (layout.offsetY ?? 0) + y * scaleY;

    // Draw center of mass
    if (centerOfMass && centerOfMass.confidence > 0.3) {
      const comX = mapX(centerOfMass.x);
      const comY = mapY(centerOfMass.y);
      
      // Draw circle
      ctx.beginPath();
      ctx.arc(comX, comY, 8, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(255, 0, 0, ${0.6 * centerOfMass.confidence})`;
      ctx.fill();
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw crosshair
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(comX - 12, comY);
      ctx.lineTo(comX + 12, comY);
      ctx.moveTo(comX, comY - 12);
      ctx.lineTo(comX, comY + 12);
      ctx.stroke();
    }

    // Draw balance point / base of support
    if (balancePoint) {
      const bpX = mapX(balancePoint.x);
      const bpY = mapY(balancePoint.y);
      const { posture, contactPoints } = balancePoint;

      const mapped = contactPoints.map(cp => ({ x: mapX(cp.x), y: mapY(cp.y) }));

      // ── Quadruped / Plank: filled support polygon ──────────────────────────
      if ((posture === 'quadruped' || posture === 'plank') && mapped.length >= 2) {
        // Order vertices clockwise around centroid for a proper convex polygon
        const cx = mapped.reduce((s, p) => s + p.x, 0) / mapped.length;
        const cy = mapped.reduce((s, p) => s + p.y, 0) / mapped.length;
        const ordered = [...mapped].sort(
          (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
        );

        ctx.beginPath();
        ctx.moveTo(ordered[0].x, ordered[0].y);
        ordered.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 255, 0, 0.12)';
        ctx.fill();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Contact point markers
        ctx.fillStyle = '#00ff00';
        mapped.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
      // ── Standing: line between ankles ─────────────────────────────────────
      else if (posture === 'standing' && balancePoint.supportBase.left && balancePoint.supportBase.right) {
        const lx = mapX(balancePoint.supportBase.left.x);
        const ly = mapY(balancePoint.supportBase.left.y);
        const rx = mapX(balancePoint.supportBase.right.x);
        const ry = mapY(balancePoint.supportBase.right.y);

        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(rx, ry);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#00ff00';
        [{ x: lx, y: ly }, { x: rx, y: ry }].forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
      // ── Single-leg: single contact marker (slightly larger) ───────────────
      else if (posture === 'single_leg' && mapped.length > 0) {
        ctx.beginPath();
        ctx.arc(mapped[0].x, mapped[0].y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#00ff00';
        ctx.fill();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // ── Fallback: draw whatever contact points exist ───────────────────────
      else {
        ctx.fillStyle = '#00ff00';
        mapped.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
          ctx.fill();
        });
      }

      // BOS projection point (green circle)
      ctx.beginPath();
      ctx.arc(bpX, bpY, 6, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
      ctx.fill();
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Vertical dashed line from CoM down to BOS point
      if (centerOfMass && centerOfMass.confidence > 0.3) {
        const comX = mapX(centerOfMass.x);
        const comY = mapY(centerOfMass.y);
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(comX, comY);
        ctx.lineTo(bpX, bpY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [centerOfMass, balancePoint, videoWidth, videoHeight, canvasWidth, canvasHeight]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 14 }}
    />
  );
}
