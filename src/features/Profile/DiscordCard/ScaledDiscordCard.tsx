import { type CSSProperties, useLayoutEffect, useRef, useState } from 'react';
import {
  DISCORD_CARD_HEIGHT,
  DISCORD_CARD_WIDTH,
  type DiscordCardData,
  type DiscordCardLayoutDefinition,
} from './types';
import { useCycleIndex } from './useCycleIndex';

export const ScaledDiscordCard = ({
  layout,
  data,
  vars,
  active,
  className = '',
}: {
  layout: DiscordCardLayoutDefinition;
  data: DiscordCardData;
  vars: CSSProperties;
  active?: number;
  className?: string;
}) => {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [visible, setVisible] = useState(true);
  const cycled = useCycleIndex(
    data.targets.length,
    active === undefined && visible,
  );
  const Layout = layout.component;

  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setScale(entry.contentRect.width / DISCORD_CARD_WIDTH),
    );
    observer.observe(element);
    const visibility = new IntersectionObserver((entries) =>
      setVisible(entries[entries.length - 1].isIntersecting),
    );
    visibility.observe(element);
    return () => {
      observer.disconnect();
      visibility.disconnect();
    };
  }, []);

  return (
    <div
      ref={container}
      className={`relative w-full overflow-hidden ${className}`}
      style={{ aspectRatio: `${DISCORD_CARD_WIDTH} / ${DISCORD_CARD_HEIGHT}` }}
    >
      <div
        className="dc-root absolute top-0 left-0 origin-top-left"
        style={{
          width: DISCORD_CARD_WIDTH,
          height: DISCORD_CARD_HEIGHT,
          transform: `scale(${scale})`,
          ...vars,
        }}
      >
        <Layout data={data} active={active ?? cycled} />
      </div>
    </div>
  );
};
