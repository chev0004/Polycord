import {
  type CSSProperties,
  cloneElement,
  isValidElement,
  type ReactNode,
} from 'react';
import type { Shot } from './animation';

type NodeProps = {
  'data-motion'?: string;
  'data-backdrop'?: boolean;
  style?: CSSProperties;
  children?: ReactNode;
  width?: number;
  height?: number;
};

export const staged = (
  node: ReactNode,
  { show = [], lite = false }: Shot,
  inside?: boolean,
): ReactNode => {
  const walk = (child: ReactNode, shown = inside) =>
    staged(child, { show, lite }, shown);

  if (Array.isArray(node)) return node.map((child) => walk(child));
  if (!isValidElement<NodeProps>(node)) return node;
  if (typeof node.type === 'function') {
    const rendered = (node.type as (props: NodeProps) => ReactNode)(node.props);
    return walk(
      isValidElement(rendered)
        ? cloneElement(rendered, { key: node.key })
        : rendered,
    );
  }

  const motion = node.props['data-motion'];
  const shown = motion ? show.includes(motion) : inside;
  const hidden = shown === false;
  const bare = hidden || (lite && !shown);
  const kept = Object.entries(node.props.style ?? {}).filter(
    ([key]) => !(bare && (key === 'overflow' || key.endsWith('Shadow'))),
  );
  const style: CSSProperties = {
    ...Object.fromEntries(kept),
    ...(hidden && { opacity: 0 }),
  };

  const picture = node.type === 'svg' || node.type === 'img';
  if (picture && lite && !shown && !node.props['data-backdrop'])
    return (
      <div
        key={node.key}
        style={{
          display: 'flex',
          width: node.props.width,
          height: node.props.height,
          ...style,
        }}
      />
    );

  const { children } = node.props;
  return cloneElement(
    node,
    { style },
    ...(Array.isArray(children)
      ? children.map((child) => walk(child, shown))
      : [walk(children, shown)]),
  );
};
