import { useEffect, useRef } from 'react';

// Прогресс чтения: обновляем transform напрямую через ref, без setState
// на каждый скролл — ноль ре-рендеров React.
export default function ReadingProgress() {
  const barRef = useRef(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1 bg-transparent" aria-hidden="true">
      <div
        ref={barRef}
        className="h-full origin-left bg-gradient-to-r from-primary-700 via-primary-500 to-primary-400"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}
