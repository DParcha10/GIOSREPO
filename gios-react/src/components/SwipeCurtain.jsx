import React, { useEffect, useRef, useCallback } from 'react';
import { 
  Columns, ChevronLeft, ChevronRight, X, Eye, Sliders, Calendar, Satellite, Sparkles
} from 'lucide-react';

export default function SwipeCurtain({
  sliderPos = 50,
  setSliderPos,
  isActive,
  onClose,
  leftTitle = 'Baseline Optical (RGB)',
  leftDate = '2025-08-15',
  leftSensor = 'Sentinel-2 L2A',
  rightTitle = 'Moisture Anomaly (NDMI)',
  rightDate = '2026-08-20',
  rightSensor = 'Sentinel-2 L2A',
  containerRef
}) {
  const isDragging = useRef(false);
  const handleRef = useRef(null);

  const updatePositionFromEvent = useCallback((clientX) => {
    if (!containerRef?.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let percentage = (x / rect.width) * 100;
    if (percentage < 2) percentage = 2;
    if (percentage > 98) percentage = 98;
    setSliderPos(Math.round(percentage * 10) / 10);
  }, [containerRef, setSliderPos]);

  // Mouse & Touch drag handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  const handleTouchStart = () => {
    isDragging.current = true;
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      updatePositionFromEvent(e.clientX);
    };

    const handleTouchMove = (e) => {
      if (!isDragging.current || !e.touches[0]) return;
      updatePositionFromEvent(e.touches[0].clientX);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [updatePositionFromEvent]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        setSliderPos(pos => Math.max(2, pos - 2));
      } else if (e.key === 'ArrowRight') {
        setSliderPos(pos => Math.min(98, pos + 2));
      } else if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, setSliderPos, onClose]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[850] overflow-hidden select-none">
      
      {/* Left Pane Badge (Baseline) */}
      <div 
        className="absolute top-16 left-6 pointer-events-auto transition-opacity duration-200"
        style={{ opacity: sliderPos > 15 ? 1 : 0.2 }}
      >
        <div className="glass-panel !rounded-xl p-3 border-teal-500/40 shadow-2xl flex flex-col gap-1 max-w-[260px] bg-black/60 backdrop-blur-md">
          <div className="flex items-center justify-between text-[10px] font-mono text-teal-300 uppercase tracking-wider font-bold">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span> Left Pane: Baseline
            </span>
            <span>{sliderPos}%</span>
          </div>
          <div className="text-xs font-bold text-white leading-tight">{leftTitle}</div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono mt-0.5">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-teal-400" /> {leftDate}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Satellite className="w-3 h-3 text-teal-400" /> {leftSensor}</span>
          </div>
        </div>
      </div>

      {/* Right Pane Badge (Anomaly) */}
      <div 
        className="absolute top-16 right-6 pointer-events-auto transition-opacity duration-200"
        style={{ opacity: sliderPos < 85 ? 1 : 0.2 }}
      >
        <div className="glass-panel !rounded-xl p-3 border-red-500/40 shadow-2xl flex flex-col gap-1 max-w-[260px] bg-black/60 backdrop-blur-md">
          <div className="flex items-center justify-between text-[10px] font-mono text-red-300 uppercase tracking-wider font-bold">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span> Right Pane: Anomaly
            </span>
            <span>{100 - sliderPos}%</span>
          </div>
          <div className="text-xs font-bold text-white leading-tight">{rightTitle}</div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono mt-0.5">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-red-400" /> {rightDate}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Satellite className="w-3 h-3 text-red-400" /> {rightSensor}</span>
          </div>
        </div>
      </div>

      {/* Top Floating Control Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto z-[870]">
        <div className="glass-panel !rounded-full px-4 py-1.5 border-primary/30 flex items-center gap-3 shadow-2xl bg-black/75 backdrop-blur-lg">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white font-['Orbitron']">
            <Columns className="w-4 h-4 text-primary" />
            <span>Multi-Temporal Swipe</span>
          </div>

          <div className="h-4 w-px bg-gray-700"></div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1">
            {[25, 50, 75].map(val => (
              <button
                key={val}
                onClick={() => setSliderPos(val)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold transition-all ${
                  sliderPos === val 
                    ? 'bg-primary text-black shadow-[0_0_8px_rgba(0,255,170,0.5)]' 
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-gray-700"></div>

          <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">
            Drag divider or use ◄ ► keys
          </span>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Exit Swipe Curtain Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Draggable Vertical Divider Line */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none transition-none"
        style={{ left: `${sliderPos}%` }}
      >
        {/* Glow Line */}
        <div className="absolute inset-y-0 -left-[1.5px] w-[3px] bg-gradient-to-b from-primary via-white to-secondary shadow-[0_0_12px_rgba(0,255,170,0.8)]"></div>

        {/* Center Draggable Handle */}
        <div
          ref={handleRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="absolute top-1/2 -translate-y-1/2 -left-5 w-10 h-10 rounded-full bg-black/90 border-2 border-primary text-white shadow-[0_0_20px_rgba(0,255,170,0.7)] flex items-center justify-center cursor-ew-resize pointer-events-auto hover:scale-110 active:scale-95 transition-transform"
          title="Drag to compare pre- vs post-event"
        >
          <div className="flex items-center gap-0.5">
            <ChevronLeft className="w-3.5 h-3.5 text-teal-300" />
            <div className="w-0.5 h-3 bg-white/70 rounded-full"></div>
            <ChevronRight className="w-3.5 h-3.5 text-teal-300" />
          </div>
        </div>
      </div>

    </div>
  );
}
