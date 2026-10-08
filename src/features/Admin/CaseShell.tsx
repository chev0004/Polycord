'use client';

import { Avatar } from '@/components/Avatar';
import { ModerationChips } from './ModerationChips';
import type { ModState } from './types';

export type CasePreview = {
  username?: string;
  avatarUrl?: string;
  state?: ModState;
};

const Bar = ({ className }: { className: string }) => (
  <div
    className={`animate-pulse rounded-lg bg-background-darker ${className}`}
  />
);

const Placeholder = ({ rows }: { rows: string[] }) => (
  <div className="flex flex-col gap-2.5">
    <Bar className="h-3 w-24" />
    {rows.map((row) => (
      <Bar key={row} className="h-14" />
    ))}
  </div>
);

export const CaseSkeleton = ({ actions = true }: { actions?: boolean }) => (
  <div aria-busy className="flex flex-col gap-[22px] px-5 pt-4 pb-6">
    {actions ? (
      <div className="flex gap-2">
        {['warn', 'hide', 'suspend', 'ban'].map((action) => (
          <Bar key={action} className="h-[34px] w-20" />
        ))}
      </div>
    ) : null}
    <Placeholder rows={['report-1', 'report-2']} />
    <Placeholder rows={['log-1', 'log-2', 'log-3']} />
  </div>
);

export const CaseShell = ({
  name,
  preview,
}: {
  name: string;
  preview?: CasePreview;
}) => (
  <>
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3.5 border-line border-b px-5 pt-[18px] pb-4">
      <Avatar avatarUrl={preview?.avatarUrl} size="md" />
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="font-bold text-foreground text-xl leading-tight">
          {name}
        </h2>
        {preview?.username ? (
          <span className="text-[12.5px] text-muted">@{preview.username}</span>
        ) : null}
        <div className="mt-1 flex min-h-[22px] flex-wrap items-center gap-1.5">
          {preview?.state ? <ModerationChips state={preview.state} /> : null}
        </div>
      </div>
    </div>
    <CaseSkeleton />
  </>
);
