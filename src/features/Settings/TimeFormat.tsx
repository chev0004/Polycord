'use client';

import { createContext, type ReactNode, useContext } from 'react';
import type { TimeFormat } from '@/constants/languages';

const TimeFormatContext = createContext<TimeFormat>('24hr');

export const TimeFormatProvider = ({
  value,
  children,
}: {
  value: TimeFormat;
  children: ReactNode;
}) => (
  <TimeFormatContext.Provider value={value}>
    {children}
  </TimeFormatContext.Provider>
);

export const useTimeFormat = () => useContext(TimeFormatContext);
