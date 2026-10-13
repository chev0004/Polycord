import type { StaffRole } from '@/features/Admin/types';
import type { DiscoveryProfile } from '@/features/Discovery/ProfileCard';

export type ProfileSheetData = {
  profile: DiscoveryProfile;
  isLoggedIn: boolean;
  isSaved: boolean;
  isOwn: boolean;
  viewerTimezone?: string;
  staff?: { meId: string; role: StaffRole };
};

export type ProfileSheetTarget = string | ProfileSheetData;

let target: ProfileSheetTarget | null = null;
const listeners = new Set<() => void>();
const cached = new Map<string, { data: ProfileSheetData; at: number }>();
const requests = new Map<string, Promise<ProfileSheetData>>();
let viewer: string | null | undefined;
let generation = 0;

export const profileSheetStore = {
  get: () => target,
  peek: (id: string) => {
    const entry = cached.get(id);
    return entry && Date.now() - entry.at < 15_000 ? entry.data : null;
  },
  remember: (data: ProfileSheetData) => {
    if (cached.size >= 32) cached.delete(cached.keys().next().value as string);
    cached.set(data.profile.id, { data, at: Date.now() });
  },
  load: (id: string): Promise<ProfileSheetData> => {
    const data = profileSheetStore.peek(id);
    if (data) return Promise.resolve(data);
    const pending = requests.get(id);
    if (pending) return pending;
    const started = generation;
    const request = fetch(`/api/profile/public/${id}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Profile unavailable');
        const data: ProfileSheetData = await response.json();
        if (generation === started) profileSheetStore.remember(data);
        return data;
      })
      .finally(() => {
        if (requests.get(id) === request) requests.delete(id);
      });
    requests.set(id, request);
    return request;
  },
  prefetch: (id: string) => {
    profileSheetStore.load(id).catch(() => {});
  },
  invalidate: () => {
    generation++;
    cached.clear();
    requests.clear();
  },
  setViewer: (id: string | null) => {
    if (viewer === id) return;
    profileSheetStore.invalidate();
    if (viewer !== undefined) profileSheetStore.close();
    viewer = id;
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  open: (next: ProfileSheetTarget) => {
    if (typeof next !== 'string') profileSheetStore.remember(next);
    target = next;
    for (const listener of listeners) listener();
  },
  close: () => {
    target = null;
    for (const listener of listeners) listener();
  },
};
