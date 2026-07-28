import React, { useRef, useState, useEffect } from 'react';
import { Trash2, RotateCcw, PenTool } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Point {
  x: number;
  y: number;
}

interface SignaturePadProps {
  onChange: (base64: string | null) => void;
  width?: number;
  height?: number;
  placeholder?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onChange,
  width = 500,
  height = 200,
  placeholder
}) => {
  const { t } = useTranslation(['shared']);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastImageDataRef = useRef<ImageData | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#000000'); // black ink
  const [brushSize, setBrushSize] = useState(2.5);
  
  // Point history for stroke smoothing and undo
  const pointsRef = useRef<Point[]>([]);
  const [history, setHistory] = useState<string[]>([]); // Array of dataURLs for undo states
  const [isEmpty, setIsEmpty] = useState(true);
  const signaturePlaceholder = placeholder || t('signaturePad.placeholder');

  // Set up High-DPI canvas
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get the device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    
    // Get container width to make it responsive
    const rect = canvas.getBoundingClientRect();
    
    // Set actual canvas resolution scaled by DPR
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Scale context back so drawing coords match CSS pixels
    ctx.scale(dpr, dpr);
    
    // Setup stroke settings
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Redraw current history if resizing occurred
    if (history.length > 0) {
      const img = new Image();
      img.src = history[history.length - 1];
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
    }
  };

  useEffect(() => {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, [history]);

  // Extract relative coordinates from events
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      // Touch event
      if (e.touches.length === 0) return null;
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      // Mouse event
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  // Start Drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coord = getCoordinates(e);
    if (!coord) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Save state for undo before drawing starts
    const dataURL = canvas.toDataURL();
    setHistory(prev => [...prev, dataURL]);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      setIsDrawing(true);
      pointsRef.current = [coord];
      setIsEmpty(false);

      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(coord.x, coord.y);
      ctx.lineTo(coord.x, coord.y);
      ctx.stroke();
    }
  };

  // Draw Stroke (smooth incremental drawing)
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const coord = getCoordinates(e);
    if (!coord) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const points = pointsRef.current;
    points.push(coord);

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    if (points.length === 2) {
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.stroke();
    } else if (points.length > 2) {
      const p0 = points[points.length - 3];
      const p1 = points[points.length - 2];
      const p2 = points[points.length - 1];

      const xc1 = (p0.x + p1.x) / 2;
      const yc1 = (p0.y + p1.y) / 2;
      const xc2 = (p1.x + p2.x) / 2;
      const yc2 = (p1.y + p2.y) / 2;

      ctx.moveTo(xc1, yc1);
      ctx.quadraticCurveTo(p1.x, p1.y, xc2, yc2);
      ctx.stroke();
    }
  };

  // Stop Drawing
  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    pointsRef.current = [];
    lastImageDataRef.current = null;
    
    // Fire callback with transparent PNG base64
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL());
    }
  };

  // Clear Canvas
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    pointsRef.current = [];
    setHistory([]);
    lastImageDataRef.current = null;
    setIsEmpty(true);
    onChange(null);
  };

  // Undo Last Stroke
  const handleUndo = () => {
    if (history.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const prevStates = [...history];
    const lastState = prevStates.pop(); // Remove current drawing
    setHistory(prevStates);

    if (lastState) {
      const img = new Image();
      img.src = lastState;
      img.onload = () => {
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
        
        // If we undo back to the initial blank state
        if (prevStates.length === 0) {
          setIsEmpty(true);
          onChange(null);
        } else {
          onChange(canvas.toDataURL());
        }
      };
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-3 w-full max-w-full">
      {/* Canvas Board */}
      <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white shadow-inner group">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-44 block cursor-crosshair touch-none"
        />
        
        {isEmpty && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-xs font-medium gap-1.5 select-none transition-opacity duration-300">
            <PenTool size={14} className="animate-pulse" />
            {signaturePlaceholder}
          </div>
        )}
      </div>

      {/* Signature Toolbar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-100/50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/40">
        
        {/* Brush size slider */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">
            {t('signaturePad.brushSize')}
          </span>
          <input
            type="range"
            min="1.5"
            max="6"
            step="0.5"
            value={brushSize}
            onChange={(e) => setBrushSize(parseFloat(e.target.value))}
            className="w-20 accent-sky-500 h-1 rounded-full cursor-pointer bg-slate-250 dark:bg-slate-800"
          />
        </div>

        {/* Clear & Undo Buttons */}
        <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title={t('signaturePad.undoTitle')}
            aria-label={t('signaturePad.undoTitle')}
          >
            <RotateCcw size={12} />
            <span>{t('signaturePad.undo')}</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-955/20 border border-transparent dark:border-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 hover:text-rose-700 transition-all cursor-pointer"
            title={t('signaturePad.clearTitle')}
            aria-label={t('signaturePad.clearTitle')}
          >
            <Trash2 size={12} />
            <span>{t('signaturePad.clear')}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
