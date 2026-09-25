import React, { useState, useRef, useCallback } from "react";
import { SlidersHorizontal } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  beforeTag?: string;
  afterTag?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage,
  afterImage,
  beforeLabel = "Before Hazard",
  afterLabel = "After Closure",
  beforeTag = "Recorded 14 Sep 2026 · GPS Verified",
  afterTag = "Recorded 21 Sep 2026 · Satya Proof",
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let percentage = (x / rect.width) * 100;
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    setSliderPos(percentage);
  }, []);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-80 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 select-none cursor-ew-resize shadow-2xl"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      onTouchMove={handleTouchMove}
    >
      {/* After Image (Background) */}
      <img
        src={afterImage}
        alt="After Closure"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute top-3 right-3 bg-white/95 dark:bg-slate-900/90 border border-emerald-300 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-300 text-xs px-3 py-1 rounded-full font-mono font-semibold backdrop-blur-md shadow-md flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
        {afterLabel} ({afterTag})
      </div>

      {/* Before Image (Clipped Layer) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPos}%` }}
      >
        <img
          src={beforeImage}
          alt="Before Hazard"
          className="absolute inset-0 w-full h-full object-cover max-w-none"
          style={{ width: containerRef.current?.clientWidth || "100%" }}
        />
        <div className="absolute top-3 left-3 bg-white/95 dark:bg-slate-900/90 border border-rose-300 dark:border-rose-500/50 text-rose-800 dark:text-rose-300 text-xs px-3 py-1 rounded-full font-mono font-semibold backdrop-blur-md shadow-md flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-rose-500" />
          {beforeLabel} ({beforeTag})
        </div>
      </div>

      {/* Draggable Divider Line */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.8)] z-10"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-9 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-xl border-2 border-slate-900 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform">
          <SlidersHorizontal size={16} />
        </div>
      </div>
    </div>
  );
};
