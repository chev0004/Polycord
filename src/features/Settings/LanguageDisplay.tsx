'use client';

import { createContext, type ReactNode, useContext } from 'react';

const LanguageDisplayContext = createContext<'long' | 'short'>('long');

export const LanguageDisplayProvider = ({
  value,
  children,
}: {
  value: 'long' | 'short';
  children: ReactNode;
}) => (
  <LanguageDisplayContext.Provider value={value}>
    {children}
  </LanguageDisplayContext.Provider>
);
export const useLanguageDisplay = () => useContext(LanguageDisplayContext);
