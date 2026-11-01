"use client";

import { QueryClient, QueryClientProvider, queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchWorkspaceProjects, fetchWorkspaceTasks } from "./project-service";
import { subscribeWorkspaceRecords } from "./workspace-record-events";

const WorkspaceContext = createContext<string | null>(null);
export const workspaceRecordsKey = (workspaceId: string) => ["workspace-records", workspaceId] as const;

export function workspaceRecordsOptions(workspaceId: string) {
  return queryOptions({
    queryKey: workspaceRecordsKey(workspaceId),
    queryFn: async () => {
      const [tasks, projects] = await Promise.all([fetchWorkspaceTasks(workspaceId), fetchWorkspaceProjects(workspaceId)]);
      return { tasks, projects };
    },
    staleTime: 0,
    retry: false,
    // Uses existing RLS-protected reads; does not introduce public broadcast channels.
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });
}

// The shell keys this boundary by workspace ID: drafts, queries and in-flight UI
// callbacks from a departed workspace cannot update the newly selected workspace.
export function WorkspaceDataProvider({ workspaceId, children }: { workspaceId: string; children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  useEffect(() => {
    const refresh = () => { void client.invalidateQueries({ queryKey: workspaceRecordsKey(workspaceId) }); };
    const unsubscribe = subscribeWorkspaceRecords((changedWorkspace) => {
      if (changedWorkspace === workspaceId) refresh();
    });
    window.addEventListener("storage", refresh);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", refresh);
      void client.cancelQueries();
    };
  }, [client, workspaceId]);
  return <QueryClientProvider client={client}><WorkspaceContext.Provider value={workspaceId}>{children}</WorkspaceContext.Provider></QueryClientProvider>;
}

export function useWorkspaceRecords() {
  const workspaceId = useContext(WorkspaceContext);
  const client = useQueryClient();
  if (!workspaceId) throw new Error("Workspace data requires a selected workspace");
  const query = useQuery(workspaceRecordsOptions(workspaceId));
  return {
    workspaceId,
    tasks: query.data?.tasks ?? [],
    projects: query.data?.projects ?? [],
    loading: query.isPending,
    error: query.error?.message ?? null,
    reload: () => client.invalidateQueries({ queryKey: workspaceRecordsKey(workspaceId) }),
  };
}
