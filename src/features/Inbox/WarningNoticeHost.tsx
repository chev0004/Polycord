'use client';

import { createContext, type ReactNode, useContext, useState } from 'react';
import { hasNotice } from '@/types';
import { useInbox } from './useInbox';
import { WarningNotice } from './WarningNotice';

const OpenNoticeContext = createContext<(id: string) => void>(() => {});

export const useOpenNotice = () => useContext(OpenNoticeContext);

export const WarningNoticeHost = ({ children }: { children: ReactNode }) => {
  const inbox = useInbox({ notifications: [] });
  const [openId, setOpenId] = useState<string | null>(null);
  const shown =
    inbox.notifications.find((n) => n.id === openId && hasNotice(n)) ??
    inbox.pendingNotice;

  return (
    <OpenNoticeContext.Provider value={setOpenId}>
      {children}
      <WarningNotice
        key={shown?.id}
        open={shown !== undefined}
        acknowledged={shown?.acknowledgedAt !== undefined}
        busy={inbox.pending}
        onAcknowledge={() => {
          setOpenId(null);
          if (shown) void inbox.acknowledge(shown.id);
        }}
        onClose={() => setOpenId(null)}
      />
    </OpenNoticeContext.Provider>
  );
};
