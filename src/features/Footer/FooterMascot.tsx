'use client';

import { useEffect, useRef } from 'react';

const eyeClassName =
  'transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] [transform:translate(var(--ex,0px),var(--ey,0px))]';

export const FooterMascot = () => {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const mascot = ref.current;
    if (!mascot || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let frame = 0;
    const look = (x: number, y: number) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = mascot.getBoundingClientRect();
        const dx = x - (box.left + box.width / 2);
        const dy = y - (box.top + box.height * 0.62);
        const distance = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, distance / 240);
        mascot.style.setProperty(
          '--ex',
          `${((dx / distance) * reach * 2.6).toFixed(2)}px`,
        );
        mascot.style.setProperty(
          '--ey',
          `${((dy / distance) * reach * 1.8).toFixed(2)}px`,
        );
      });
    };
    const onPointerMove = (event: PointerEvent) =>
      look(event.clientX, event.clientY);
    const onFocusIn = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      const box = event.target.getBoundingClientRect();
      look(box.left + box.width / 2, box.top + box.height / 2);
    };

    addEventListener('pointermove', onPointerMove);
    addEventListener('focusin', onFocusIn);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('pointermove', onPointerMove);
      removeEventListener('focusin', onFocusIn);
    };
  }, []);

  return (
    <svg
      ref={ref}
      viewBox="10 9 100 60"
      width="110"
      height="66"
      aria-hidden="true"
      className="pointer-events-none absolute bottom-[calc(100%-6.7px)] left-[4.1px] block sm:left-[20.1px]"
    >
      <defs>
        <clipPath id="footer-mascot-clip">
          <rect x="0" y="0" width="120" height="62" />
        </clipPath>
      </defs>
      <g clipPath="url(#footer-mascot-clip)">
        <g transform="translate(10 -2) scale(.83)">
          <path
            fill="#fff"
            d="M6 104C12 98 13 90 13 80C13 62 17 52 24 45L26 22Q27 14 34 18L48 29Q60 26 72 29L86 18Q93 14 94 22L96 45C103 52 107 62 107 80C107 90 108 98 114 104C92 88 28 88 6 104Z"
          />
          <circle
            className={eyeClassName}
            cx="44"
            cy="58"
            r="6.5"
            fill="#111"
          />
          <circle
            className={eyeClassName}
            cx="76"
            cy="58"
            r="6.5"
            fill="#111"
          />
        </g>
      </g>
      <ellipse cx="42" cy="63" rx="8" ry="5.5" fill="#fff" />
      <ellipse cx="78" cy="63" rx="8" ry="5.5" fill="#fff" />
    </svg>
  );
};
