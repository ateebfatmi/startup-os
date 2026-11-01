// Same-tab invalidation only; remote users are refreshed through authenticated reads.
const listeners = new Set<(workspaceId: string) => void>();

export function notifyWorkspaceRecordsChanged(workspaceId: string) {
  listeners.forEach((listener) => listener(workspaceId));
}

export function subscribeWorkspaceRecords(listener: (workspaceId: string) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
