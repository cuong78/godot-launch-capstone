import React, { useRef, useEffect } from 'react';

export default function SignaturePad({ onSave, onCancel }) {
  const canvasRef = useRef(null);
  
  // High-performance mutable refs to bypass React re-render cycle entirely during drawing
  const isDrawingRef = useRef(false);
  const lastCoordsRef = useRef({ x: 0, y: 0 });
  const rectRef = useRef(null);
  const ctxRef = useRef(null);

  // Scale standard coordinates appropriately based on canvas dimensions and cached bounding rectangle
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    // Critical Optimization: Use cached bounding rect to prevent browser layout thrashing/reflow on mousemove
    const rect = rectRef.current || canvas.getBoundingClientRect();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Cache the canvas layout position once when user touches/clicks to draw
    rectRef.current = canvas.getBoundingClientRect();
    
    const { x, y } = getCoordinates(e);
    lastCoordsRef.current = { x, y };
    isDrawingRef.current = true;
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    
    // Draw extremely fast, non-accumulated single line segment
    ctx.beginPath();
    ctx.moveTo(lastCoordsRef.current.x, lastCoordsRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    lastCoordsRef.current = { x, y };
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctxRef.current = ctx;
    
    // Line style configuration (Smooth dark blue digital look)
    ctx.strokeStyle = '#00F2FF'; // Cyberpunk Cyan
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Clear canvas with white background so the signature is transparently printable on the white contract page
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Bind native event listeners directly to bypass React Synthetic Event system overhead.
    // passive: false is critical for smooth, non-blocking touchmove preventDefault().
    canvas.addEventListener('mousedown', startDrawing, { passive: false });
    canvas.addEventListener('mousemove', draw, { passive: false });
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    
    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
      
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="flex flex-col gap-4 p-5 bg-surface-container border border-outline-variant/30 rounded-xl max-w-lg w-full mx-auto shadow-2xl animate-in zoom-in-95 duration-200">
      <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
        <div className="flex flex-col">
          <h4 className="font-headline-sm text-sm uppercase text-primary-container tracking-wider">
            VẼ CHỮ KÝ TAY / DRAW DIGITAL SIGNATURE
          </h4>
          <span className="text-[10px] text-on-surface-variant font-mono uppercase mt-0.5">
            Use your mouse or touch screen to sign below
          </span>
        </div>
        <button 
          onClick={clearCanvas} 
          type="button"
          className="text-xs uppercase font-mono px-3 py-1 rounded bg-error/15 border border-error/20 text-error hover:bg-error/35 hover:text-white transition-all cursor-pointer"
        >
          Xóa / Clear
        </button>
      </div>
      
      <div className="relative w-full bg-white rounded-lg p-1.5 border border-white/10 overflow-hidden shadow-inner">
        <canvas
          ref={canvasRef}
          width={600}
          height={260}
          className="w-full h-[180px] sm:h-[220px] bg-white rounded touch-none cursor-crosshair"
        />
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none select-none text-[10px] uppercase font-mono tracking-widest text-slate-300 font-bold opacity-75">
          [ VÙNG KÝ TÊN / SIGNATURE BOUNDARY ]
        </div>
      </div>
      
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onCancel}
          type="button"
          className="px-5 py-2.5 border border-white/10 rounded-lg text-xs font-mono text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer"
        >
          HỦY BỎ / CANCEL
        </button>
        <button
          onClick={handleSave}
          type="button"
          className="px-6 py-2.5 bg-primary-container text-on-primary-fixed rounded-lg text-xs font-bold hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,242,255,0.2)] cursor-pointer"
        >
          KÝ XÁC NHẬN / CONFIRM &amp; SIGN
        </button>
      </div>
    </div>
  );
}
