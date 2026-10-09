const unsaved = new Set<string>();
const listeners = new Set<() => void>();

export const setUnsavedChanges = (id: string, changed: boolean) => {
  if (unsaved.has(id) === changed) return;
  if (changed) unsaved.add(id);
  else unsaved.delete(id);
  for (const listener of listeners) listener();
};

export const hasUnsavedChanges = () => unsaved.size > 0;

export const onUnsavedChanges = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
