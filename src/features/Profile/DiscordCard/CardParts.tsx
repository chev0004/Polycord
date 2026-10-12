import {
  type CSSProperties,
  Fragment,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { IconType } from 'react-icons';
import { MdLocationOn, MdSchedule } from 'react-icons/md';
import type { DiscordCardData, DiscordCardTarget } from './types';
import './base.css';

export const BRAND_CAPS = 'POLYCORD.NET';

export const BrandName = ({
  tone = 'dark',
  style,
}: {
  tone?: 'dark' | 'light';
  style?: CSSProperties;
}) => (
  <span
    className={`dc-pn ${tone === 'dark' ? 'dc-pn-d' : 'dc-pn-l'}`}
    style={style}
  >
    Polycord.net
  </span>
);

export const avatarBackground = (avatarUrl?: string): CSSProperties =>
  avatarUrl
    ? {
        backgroundImage: `url(${JSON.stringify(avatarUrl)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {};

export const CardAvatar = ({
  data,
  style,
}: {
  data: DiscordCardData;
  style?: CSSProperties;
}) => (
  <div
    className="dc-av"
    style={{ ...avatarBackground(data.avatarUrl), ...style }}
  >
    {data.avatarUrl ? null : data.initials}
  </div>
);

export const Cycle = ({
  targets,
  active,
  className = '',
  children,
}: {
  targets: DiscordCardTarget[];
  active: number;
  className?: string;
  children: (target: DiscordCardTarget) => ReactNode;
}) => {
  const previous = (active + targets.length - 1) % targets.length;

  return (
    <span className={`dc-cy ${className}`}>
      {targets.map((target, index) => (
        <span
          key={target.code}
          aria-hidden={index !== active}
          className={
            index === active ? 'dc-on' : index === previous ? 'dc-out' : ''
          }
        >
          {children(target)}
        </span>
      ))}
    </span>
  );
};

export const FitText = ({
  max,
  as: Tag = 'span',
  className,
  children,
}: {
  max: number;
  as?: 'span' | 'div' | 'b';
  className?: string;
  children: string;
}) => {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !children) return;
    const fit = () => {
      element.style.fontSize = '';
      element.style.width = 'max-content';
      const natural = element.offsetWidth;
      element.style.width = '';
      if (natural > max) {
        element.style.fontSize = `${(Number.parseFloat(getComputedStyle(element).fontSize) * max) / natural}px`;
      }
    };
    fit();
    document.fonts?.ready.then(fit);
  }, [max, children]);

  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
};

const TOP_OFFSET = 0.19;

export const FitLines = ({
  max,
  bottom,
  vars,
  className,
  children,
}: {
  max: number;
  bottom: number;
  vars: (bottom: number) => Record<string, string>;
  className?: string;
  children: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState([children]);

  useLayoutEffect(() => {
    const element = ref.current;
    const parent = element?.parentElement;
    if (!element || !parent || !children) return;
    const fit = () => {
      const probe = element.cloneNode() as HTMLElement;
      probe.removeAttribute('style');
      probe.style.visibility = 'hidden';
      probe.style.width = 'max-content';
      parent.append(probe);
      const base = Number.parseFloat(getComputedStyle(probe).fontSize);
      const width = (text: string) => {
        probe.textContent = text;
        return probe.offsetWidth;
      };
      const words = children.split(' ');
      const split = words
        .slice(1)
        .map((_, index) => [
          words.slice(0, index + 1).join(' '),
          words.slice(index + 1).join(' '),
        ])
        .map((pair) => ({ pair, width: Math.max(...pair.map(width)) }))
        .sort((a, b) => a.width - b.width)[0];
      const single = Math.min(base, (max * base) / width(children));
      const double = split
        ? Math.min(base, (max * base) / split.width, bottom / (2 - TOP_OFFSET))
        : 0;
      probe.remove();
      const wrapped = double > single;
      const size = wrapped ? double : single;
      element.style.fontSize = `${size}px`;
      for (const [name, value] of Object.entries(
        vars(((wrapped ? 2 : 1) - TOP_OFFSET) * size),
      ))
        parent.style.setProperty(name, value);
      setLines(wrapped && split ? split.pair : [children]);
    };
    fit();
    document.fonts?.ready.then(fit);
  }, [max, bottom, vars, children]);

  return (
    <div ref={ref} className={className}>
      {lines.map((line, index) => (
        <Fragment key={line}>
          {index > 0 ? <br /> : null}
          {line}
        </Fragment>
      ))}
    </div>
  );
};

export const Icon = ({
  icon: Glyph,
  style,
}: {
  icon: IconType;
  style?: CSSProperties;
}) => <Glyph className="dc-ms" style={style} aria-hidden="true" />;

export const ScheduleRow = ({ data }: { data: DiscordCardData }) =>
  data.availability ? (
    <div className="dc-row">
      <Icon icon={MdSchedule} />
      <span>
        <b>{data.availability.days}</b> {data.availability.range}
      </span>
    </div>
  ) : null;

export const LocationRow = ({
  data,
  currently,
}: {
  data: DiscordCardData;
  currently?: (time: string) => string;
}) =>
  data.country || data.time ? (
    <div className="dc-row">
      <Icon icon={MdLocationOn} />
      <span>
        {data.country ? <b>{data.country}</b> : null}
        {data.country && data.time ? ' · ' : null}
        {data.time ? (currently ? currently(data.time) : data.time) : null}
      </span>
    </div>
  ) : null;

const useFitRow = <T extends HTMLElement>(tags: string[], minShown: number) => {
  const ref = useRef<T>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the items are rebuilt whenever the tags change
  useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;
    const items = [...row.children] as HTMLElement[];
    const more = items.pop() as HTMLElement;
    const fit = () => {
      let shown = items.length;
      const shrink = (value: string) => {
        for (const item of items) item.style.flexShrink = value;
      };
      const show = () => {
        items.forEach((item, index) => {
          item.hidden = index >= shown;
        });
        more.hidden = shown === items.length;
        more.textContent = `+${items.length - shown}`;
      };
      shrink('0');
      show();
      while (shown > minShown && row.scrollWidth > row.clientWidth) {
        shown -= 1;
        show();
      }
      shrink('');
    };
    fit();
    document.fonts?.ready.then(fit);
    const observer = new ResizeObserver(fit);
    observer.observe(row);
    return () => observer.disconnect();
  }, [tags]);

  return ref;
};

export const TagChips = ({
  tags,
  small = false,
  style,
}: {
  tags: string[];
  small?: boolean;
  style?: CSSProperties;
}) => {
  const ref = useFitRow<HTMLDivElement>(tags, 1);

  return tags.length ? (
    <div ref={ref} className={`dc-chips ${small ? 'dc-sm' : ''}`} style={style}>
      {tags.map((tag) => (
        <span key={tag} className="dc-chip">
          {tag}
        </span>
      ))}
      <span className="dc-chip" hidden />
    </div>
  ) : null;
};

export const TagsText = ({
  tags,
  className,
}: {
  tags: string[];
  className: string;
}) => {
  const ref = useFitRow<HTMLSpanElement>(tags, 0);

  return (
    <span ref={ref} className={`dc-tt ${className}`}>
      {tags.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
      <span hidden />
    </span>
  );
};
