import {
  useQuery, useMutation, useInfiniteQuery, useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  listSchemas, createSchema, updateSchema, deleteSchema,
  fetchRecordsPage, fetchAllRecords, uploadRecordsCsv, deleteRecord,
  fetchSnIntegrations, createSnIntegration, deleteSnIntegration,
  addSnCredentials, updateSnCredentials,
  addSnTable, updateSnTable, deleteSnTable, enableSnTable,
} from '../api/client';
import type {
  EnrichmentSchema, SchemaField, RecordsPage, SnIntegration,
  NewSnTable, NewSnCredentials, SnStatusMap,
} from '../api/types';

// ── Query keys ────────────────────────────────────────────────────────────────

export const keys = {
  schemas: (token: string) => ['schemas', token] as const,
  records: (token: string, schemaId: string) => ['records', token, schemaId] as const,
  snIntegrations: (token: string) => ['sn-integrations', token] as const,
};

// ── Schema queries ────────────────────────────────────────────────────────────

export function useSchemas(token: string) {
  return useQuery({
    queryKey: keys.schemas(token),
    queryFn: () => listSchemas(token),
    staleTime: 30_000,
  });
}

export function useCsvSchemas(token: string) {
  return useQuery({
    queryKey: keys.schemas(token),
    queryFn: () => listSchemas(token),
    select: (schemas) => schemas.filter((s) => s.integration_type !== 'SERVICENOW'),
    staleTime: 30_000,
  });
}

export function useCreateSchema(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; integration_type: string; description?: string; fields: SchemaField[] }) =>
      createSchema(token, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.schemas(token) }),
  });
}

export function useUpdateSchema(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) =>
      updateSchema(token, id, data),
    onSuccess: (updated) => {
      qc.setQueryData<EnrichmentSchema[]>(keys.schemas(token), (prev) =>
        prev?.map((s) => (s.id === updated.id ? updated : s))
      );
    },
  });
}

export function useDeleteSchema(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSchema(token, id),
    onSuccess: (_: void, id: string) => {
      qc.setQueryData<EnrichmentSchema[]>(keys.schemas(token), (prev) =>
        prev?.filter((s) => s.id !== id)
      );
    },
  });
}

// ── Records queries ───────────────────────────────────────────────────────────

export function useRecords(token: string, schemaId: string, pageSize = 25) {
  return useInfiniteQuery<RecordsPage, Error, InfiniteData<RecordsPage>, readonly string[], string | undefined>({
    queryKey: keys.records(token, schemaId),
    queryFn: ({ pageParam }) => fetchRecordsPage(token, schemaId, pageParam, pageSize),
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    initialPageParam: undefined,
    staleTime: 30_000,
  });
}

export function useDeleteRecord(token: string, schemaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => deleteRecord(token, schemaId, recordId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.records(token, schemaId) }),
  });
}

export function useUploadCsv(token: string, schemaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (csvText: string) => uploadRecordsCsv(token, schemaId, csvText),
    onSuccess: () =>
      setTimeout(() => qc.invalidateQueries({ queryKey: keys.records(token, schemaId) }), 2000),
  });
}

export function useExportAllRecords(token: string) {
  return useMutation({
    mutationFn: (schemaId: string) => fetchAllRecords(token, schemaId),
  });
}

// ── ServiceNow queries ────────────────────────────────────────────────────────

export function useSnIntegrations(token: string) {
  return useQuery({
    queryKey: keys.snIntegrations(token),
    queryFn: () => fetchSnIntegrations(token),
    staleTime: 30_000,
  });
}

export function useSnStatusMap(token: string) {
  return useQuery({
    queryKey: keys.snIntegrations(token),
    queryFn: () => fetchSnIntegrations(token),
    select: (integrations: SnIntegration[]): SnStatusMap => {
      const map: SnStatusMap = {};
      for (const intg of integrations) {
        for (const t of intg.cmdb_tables ?? []) {
          if (t.display_name) map[t.display_name] = t.status;
        }
      }
      return map;
    },
    staleTime: 30_000,
  });
}

export function useCreateSnIntegration(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; cmdb_tables: NewSnTable[] }) =>
      createSnIntegration(token, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.snIntegrations(token) }),
  });
}

export function useDeleteSnIntegration(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (integrationId: string) => deleteSnIntegration(token, integrationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.snIntegrations(token) }),
  });
}

export function useAddSnCredentials(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (creds: NewSnCredentials) => addSnCredentials(token, creds),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.snIntegrations(token) }),
  });
}

export function useUpdateSnCredentials(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ credentialsId, creds }: { credentialsId: string; creds: NewSnCredentials }) =>
      updateSnCredentials(token, credentialsId, creds),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.snIntegrations(token) }),
  });
}

export function useAddSnTable(token: string, integrationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (table: NewSnTable) => addSnTable(token, integrationId, table),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.snIntegrations(token) }),
  });
}

export function useUpdateSnTable(token: string, integrationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tableId, data }: { tableId: string; data: NewSnTable }) =>
      updateSnTable(token, integrationId, tableId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.snIntegrations(token) }),
  });
}

export function useDeleteSnTable(token: string, integrationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tableId: string) => deleteSnTable(token, integrationId, tableId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.snIntegrations(token) }),
  });
}

export function useEnableSnTable(token: string, integrationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tableId: string) => enableSnTable(token, integrationId, tableId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.snIntegrations(token) }),
  });
}
