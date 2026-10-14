'use client';

import { createContext, useContext } from 'react';
import { ProfileSheetHost } from './ProfileSheetHost';

const ProfileSheetLayoutContext = createContext(false);

export const useProfileSheetLayout = () =>
  useContext(ProfileSheetLayoutContext);

export const ProfileSheetLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <ProfileSheetLayoutContext.Provider value>
    {children}
    <ProfileSheetHost />
  </ProfileSheetLayoutContext.Provider>
);
