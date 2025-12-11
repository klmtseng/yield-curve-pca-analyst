
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { YieldCurvePoint, Tenor, PCAResult } from '../types';
import { calculateLatestResiduals, calculateRollingLoadings, performPCA } from '../utils/math';

interface Props {
  data: YieldCurvePoint[];
  tenors: Tenor[];
  type: 'yield' | 'residual';
  width?: number;
  height?: number;
}

const RotatableSurfaceChart: React.FC<Props> = ({ data, tenors, type, width = 600, height = 400 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: 45, z: 45 }); // Degrees
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // 1. Prepare Data Grid (Z = Time, X = Tenor, Y = Value)
  const gridData = useMemo(() => {
    if (data.length === 0) return [];
    
    // Downsample time dimension for performance if too large
    const step = Math.ceil(data.length / 50); 
    const sampledData = data.filter((_, i) => i % step === 0 || i === data.length - 1);

    if (type === 'yield') {
      return sampledData.map((point, timeIdx) => {
        return tenors.map((tenor, tenorIdx) => ({
          x: tenorIdx, // Tenor Axis
          z: timeIdx,  // Time Axis
          y: Number(point[tenor]), // Yield Value
          val: Number(point[tenor]),
          date: point.date,
          tenor
        }));
      });
    } else {
      // For Residuals, we need to calculate rolling PCA residuals
      // This is expensive, so we do a simplified version: 
      // Calculate PCA on the WHOLE dataset (static) for visualization speed,
      // or implement a rolling calculation. For surface viz, static PCA residuals are often acceptable
      // to see the "overall" shape, but let's try to be somewhat accurate.
      
      const pca = performPCA(data, tenors);
      // We calculate residuals for the sampled points based on the global PCA
      // (Visualizing rolling PCA residuals in 3D is very heavy, this is an approximation for viz)
      const { meanVector, eigenvectors, scores } = pca;

      return sampledData.map((point, timeIdx) => {
        // Find the index in the original full dataset to get the correct score
        // This is an approximation. Ideally we run calculateLatestResiduals for every single date.
        // For the sake of the UI responsiveness, we reconstruct using the global model.
        
        // Reconstruct model value
        const originalIdx = data.findIndex(d => d.date === point.date);
        const dailyScores = scores[originalIdx] || [0,0,0];

        return tenors.map((tenor, tenorIdx) => {
          let modelVal = meanVector[tenorIdx];
          for (let k = 0; k < 3; k++) {
            modelVal += dailyScores[k] * eigenvectors[k][tenorIdx];
          }
          const actual = Number(point[tenor]);
          const residual = (actual - modelVal) * 100; // In Basis Points
          
          return {
            x: tenorIdx,
            z: timeIdx,
            y: residual, // Use Residual for height
            val: residual,
            date: point.date,
            tenor
          };
        });
      });
    }
  }, [data, tenors, type]);

  // 2. Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || gridData.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, height);

    // Scaling Factors
    const numTenors = tenors.length;
    const numDates = gridData.length;
    
    // Find value bounds for Y-scaling
    let minVal = Infinity;
    let maxVal = -Infinity;
    gridData.forEach(row => row.forEach(pt => {
      if (pt.val < minVal) minVal = pt.val;
      if (pt.val > maxVal) maxVal = pt.val;
    }));

    // Padding bounds
    const yRange = maxVal - minVal || 1;
    const padding = yRange * 0.1;

    // 3D Projection Helper
    const project = (x: number, y: number, z: number) => {
      // Center coordinates
      const cx = x - numTenors / 2;
      const cz = z - numDates / 2;
      
      // Scale coordinates
      const scaleX = (width * 0.6) / numTenors;
      const scaleZ = (width * 0.6) / numDates;
      const scaleY = (height * 0.4) / (yRange + padding * 2);

      const sx = cx * scaleX;
      const sz = cz * scaleZ;
      const sy = (y - (minVal + yRange/2)) * scaleY; // Center Y

      // Rotation Matrix (Simple Euler)
      const radX = (rotation.x * Math.PI) / 180;
      const radZ = (rotation.z * Math.PI) / 180;

      // Rotate around Y-axis (which is Z in screen space conceptually for rotation)
      const rx = sx * Math.cos(radZ) - sz * Math.sin(radZ);
      const rz = sx * Math.sin(radZ) + sz * Math.cos(radZ);

      // Rotate around X-axis (tilt)
      const ry = sy * Math.cos(radX) - rz * Math.sin(radX);
      const rz2 = sy * Math.sin(radX) + rz * Math.cos(radX);

      // Perspective projection
      const fov = 800;
      const dist = fov / (fov + rz2 + 400); // +400 pushes it back

      return {
        x: width / 2 + rx * dist,
        y: height / 2 - ry * dist // Flip Y for canvas
      };
    };

    // Draw Grid Lines
    ctx.lineWidth = 1;
    
    // Draw "Time" Lines (Longitudinal)
    for (let t = 0; t < numTenors; t++) {
      ctx.beginPath();
      ctx.strokeStyle = type === 'yield' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(167, 139, 250, 0.3)'; // Sky or Purple
      for (let d = 0; d < numDates; d++) {
        const point = gridData[d][t];
        const proj = project(point.x, point.y, point.z);
        if (d === 0) ctx.moveTo(proj.x, proj.y);
        else ctx.lineTo(proj.x, proj.y);
      }
      ctx.stroke();
    }

    // Draw "Tenor" Lines (Cross-sectional) - Draw these last so they pop
    for (let d = 0; d < numDates; d++) {
      ctx.beginPath();
      // Gradient based on recency
      const opacity = 0.2 + (d / numDates) * 0.8;
      
      for (let t = 0; t < numTenors; t++) {
        const point = gridData[d][t];
        const proj = project(point.x, point.y, point.z);
        
        // Color logic
        if (type === 'residual') {
            // Heatmap coloring for residuals
            const val = point.val;
            if (val > 0) ctx.strokeStyle = `rgba(74, 222, 128, ${opacity})`; // Green
            else ctx.strokeStyle = `rgba(248, 113, 113, ${opacity})`; // Red
        } else {
            ctx.strokeStyle = `rgba(56, 189, 248, ${opacity})`;
        }
        
        if (t === 0) ctx.moveTo(proj.x, proj.y);
        else ctx.lineTo(proj.x, proj.y);
      }
      ctx.stroke();
    }

    // Draw Labels (Simple)
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    
    // Tenor Labels (at latest date)
    const lastRow = gridData[numDates-1];
    if (lastRow) {
      lastRow.forEach((pt, i) => {
        if (i % 2 === 0) { // Skip some to avoid clutter
          const proj = project(pt.x, pt.y, pt.z);
          ctx.fillText(pt.tenor, proj.x, proj.y - 5);
        }
      });
    }

    // Date Label (start and end)
    const startPt = gridData[0][0];
    const endPt = gridData[numDates-1][0];
    const projStart = project(startPt.x, minVal, startPt.z);
    const projEnd = project(endPt.x, minVal, endPt.z);
    
    ctx.fillText(startPt.date, projStart.x - 20, projStart.y + 15);
    ctx.fillText(endPt.date, projEnd.x - 20, projEnd.y + 15);


  }, [gridData, rotation, width, height, tenors, type]);

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    
    setRotation(prev => ({
      z: prev.z - deltaX * 0.5,
      x: Math.max(0, Math.min(90, prev.x + deltaY * 0.5)) // Clamp tilt
    }));

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div 
      className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden relative cursor-move"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="absolute top-3 left-4 pointer-events-none">
        <h3 className="text-lg font-semibold text-slate-200">
          {type === 'yield' ? '3D Yield Curve Surface' : '3D Residual Surface (Rich/Cheap)'}
        </h3>
        <p className="text-xs text-slate-400">Click & Drag to Rotate</p>
      </div>
      <canvas 
        ref={canvasRef} 
        width={width} 
        height={height} 
        className="w-full h-full block"
      />
    </div>
  );
};

export default RotatableSurfaceChart;
