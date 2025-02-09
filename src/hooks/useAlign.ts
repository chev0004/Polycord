import { useEffect, useRef, useState } from 'react';

export const useAlign = () => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [align, setAlign] = useState<'end' | 'center' | 'start'>('end');

  useEffect(() => {
    if (triggerRef.current) {
      const { right } = triggerRef.current.getBoundingClientRect();
      if (right > window.innerWidth / 2) {
        setAlign('end');
      } else {
        setAlign('start');
      }
    }
  }, []);

  return { triggerRef, align };
};
