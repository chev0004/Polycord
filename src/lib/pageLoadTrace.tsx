import 'server-only';

import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { withRenderPool } from '@/db/client';
import { PageLoadReady } from '@/features/Navigation/PageLoadTrace';
import { createLoadTrace } from './loadTrace';

export const createPageLoadTrace = async () =>
  createLoadTrace(
    new Request('https://polycord.internal', { headers: await headers() }),
  );

export const tracePage =
  <T extends { params: Promise<{ lang: string }> }>(
    route: string,
    render: (props: T) => Promise<ReactNode> | ReactNode,
  ) =>
  (props: T) =>
    withRenderPool(async () => {
      const trace = await createPageLoadTrace();
      const content = await (trace
        ? trace.measure('page', () => Promise.resolve(render(props)))
        : render(props));
      const { lang } = await props.params;
      return (
        <>
          {content}
          {trace && (
            <PageLoadReady
              route={`/${lang}/${route}`}
              spans={trace.spans}
              deferred={route === 'inbox'}
            />
          )}
        </>
      );
    });
