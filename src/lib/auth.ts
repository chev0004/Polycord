export type CurrentUser = {
  id: string;
  name: string;
  avatarUrl?: string;
  email?: string;
};

export const getCurrentUser = async (): Promise<CurrentUser | null> => {
  return null;
};
