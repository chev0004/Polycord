import { createContext, useContext } from 'react';

export const DiscoverySkeletonContext = createContext(false);

export const useDiscoverySkeleton = () => useContext(DiscoverySkeletonContext);
