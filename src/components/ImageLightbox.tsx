import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import MaterialIcon from './MaterialIcon';

interface ImageLightboxProps {
  src: string;
  alt: string;
  children: React.ReactElement;
}

const ImageLightbox = ({ src, alt, children }: ImageLightboxProps) => {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => { setScale(1); setTranslate({ x: 0, y: 0 }); }, []);

  const handleOpen = () => { reset(); setOpen(true); };
  const handleClose = () => setOpen(false);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    setScale(prev => Math.min(5, Math.max(0.5, prev - e.deltaY * 0.002)));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (scale <= 1) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [scale, translate]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setTranslate({
      x: dragStart.current.tx + (e.clientX - dragStart.current.x),
      y: dragStart.current.ty + (e.clientY - dragStart.current.y),
    });
  }, [dragging]);

  const handlePointerUp = useCallback(() => setDragging(false), []);

  // Pinch-to-zoom for touch
  const lastDistance = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDistance.current = Math.hypot(dx, dy);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastDistance.current > 0) {
        const delta = dist / lastDistance.current;
        setScale(prev => Math.min(5, Math.max(0.5, prev * delta)));
      }
      lastDistance.current = dist;
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === '+' || e.key === '=') setScale(s => Math.min(5, s + 0.3));
      if (e.key === '-') setScale(s => Math.max(0.5, s - 0.3));
      if (e.key === '0') reset();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, reset]);

  return (
    <>
      {React.cloneElement(children, {
        onClick: handleOpen,
        className: (children.props.className || '') + ' cursor-zoom-in',
        role: 'button',
        tabIndex: 0,
      })}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
          >
            {/* Controls */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <button onClick={() => setScale(s => Math.min(5, s + 0.5))} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white backdrop-blur transition-colors">
                <MaterialIcon name="add" size={20} />
              </button>
              <button onClick={() => setScale(s => Math.max(0.5, s - 0.5))} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white backdrop-blur transition-colors">
                <MaterialIcon name="remove" size={20} />
              </button>
              <button onClick={reset} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white backdrop-blur transition-colors">
                <MaterialIcon name="fit_screen" size={20} />
              </button>
              <button onClick={handleClose} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white backdrop-blur transition-colors">
                <MaterialIcon name="close" size={20} />
              </button>
            </div>

            {/* Scale indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-medium backdrop-blur">
              {Math.round(scale * 100)}%
            </div>

            {/* Image container */}
            <div
              ref={containerRef}
              className="w-full h-full flex items-center justify-center overflow-hidden select-none"
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              style={{ cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default', touchAction: 'none' }}
            >
              <img
                src={src}
                alt={alt}
                className="max-w-[90vw] max-h-[85vh] object-contain pointer-events-none"
                draggable={false}
                style={{
                  transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                  transition: dragging ? 'none' : 'transform 0.15s ease-out',
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ImageLightbox;
