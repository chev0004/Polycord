import {
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

type Point = { x: number; y: number };

export const PANEL_POSITION_KEY = 'polycord:load-trace-position';
const DRAG_THRESHOLD = 4;

const readPosition = (): Point | null => {
  try {
    const saved = JSON.parse(
      localStorage.getItem(PANEL_POSITION_KEY) ?? 'null',
    );
    return Number.isFinite(saved?.x) && Number.isFinite(saved?.y)
      ? { x: saved.x, y: saved.y }
      : null;
  } catch {
    return null;
  }
};

const writePosition = (position: Point) => {
  try {
    localStorage.setItem(PANEL_POSITION_KEY, JSON.stringify(position));
  } catch {
    return;
  }
};

export const useDraggablePanel = () => {
  const panel = useRef<HTMLElement>(null);
  const [position, setPosition] = useState<Point | null>(null);
  const placed = position !== null;
  const stopDrag = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);

  const fit = useCallback((point: Point): Point => {
    const rect = panel.current?.getBoundingClientRect();
    return {
      x: Math.min(
        Math.max(0, point.x),
        Math.max(0, window.innerWidth - (rect?.width ?? 0)),
      ),
      y: Math.min(
        Math.max(0, point.y),
        Math.max(0, window.innerHeight - (rect?.height ?? 0)),
      ),
    };
  }, []);

  useLayoutEffect(() => {
    const saved = readPosition();
    if (saved) setPosition(fit(saved));
  }, [fit]);

  useEffect(() => {
    if (!placed || !panel.current) return;
    const refit = () =>
      setPosition((current) => {
        if (!current) return current;
        const next = fit(current);
        return next.x === current.x && next.y === current.y ? current : next;
      });
    const observer = new ResizeObserver(refit);
    observer.observe(panel.current);
    window.addEventListener('resize', refit);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', refit);
    };
  }, [placed, fit]);

  useEffect(() => () => stopDrag.current?.(), []);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || !panel.current) return;
    stopDrag.current?.();
    suppressClick.current = false;
    const rect = panel.current.getBoundingClientRect();
    const grab = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const origin = { x: event.clientX, y: event.clientY };
    let moved = false;
    let latest: Point | null = null;
    const move = (next: globalThis.PointerEvent) => {
      if (
        !moved &&
        Math.hypot(next.clientX - origin.x, next.clientY - origin.y) <
          DRAG_THRESHOLD
      )
        return;
      moved = true;
      latest = fit({ x: next.clientX - grab.x, y: next.clientY - grab.y });
      setPosition(latest);
    };
    const end = () => {
      stopDrag.current?.();
      if (!moved) return;
      suppressClick.current = true;
      if (latest) writePosition(latest);
    };
    stopDrag.current = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      stopDrag.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  return {
    panel,
    placed,
    style: position
      ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' }
      : undefined,
    handle: {
      onPointerDown,
      onClick: (event: { preventDefault: () => void }) => {
        if (!suppressClick.current) return;
        suppressClick.current = false;
        event.preventDefault();
      },
    },
  };
};
