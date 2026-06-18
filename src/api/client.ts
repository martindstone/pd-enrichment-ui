import type {
  EnrichmentSchema,
  EnrichmentRecord,
  RecordsPage,
  SnIntegration,
  SnCmdbTable,
  SnCredentials,
  NewSnTable,
  NewSnCredentials,
  SnTestResult,
  UploadResponse,
  SchemaField,
} from './types';

const PD_BASE = 'https://api.pagerduty.com';

function headers(token: string, contentType = 'application/json'): Record<string, string> {
  return {
    Authorization: `Token token=${token}`,
    Accept: 'application/vnd.pagerduty+json;version=2',
    'Content-Type': contentType,
  };
}

async function checkOk(res: Response): Promise<Response> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body?.error?.message ?? body?.error ?? msg;
      const errs: string[] = body?.error?.errors ?? [];
      if (errs.length) msg += ': ' + errs.join(', ');
    } catch {}
    throw new Error(msg);
  }
  return res;
}

// ── Schemas ───────────────────────────────────────────────────────────────────

export async function listSchemas(token: string): Promise<EnrichmentSchema[]> {
  const res = await fetch(`${PD_BASE}/enrichment/schemas`, { headers: headers(token) });
  await checkOk(res);
  return (await res.json()).schemas as EnrichmentSchema[];
}

export async function createSchema(
  token: string,
  data: { name: string; integration_type: string; description?: string; fields: SchemaField[] }
): Promise<EnrichmentSchema> {
  const res = await fetch(`${PD_BASE}/enrichment/schemas`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(data),
  });
  await checkOk(res);
  return (await res.json()).schema as EnrichmentSchema;
}

export async function updateSchema(
  token: string,
  id: string,
  data: { name?: string; description?: string }
): Promise<EnrichmentSchema> {
  const res = await fetch(`${PD_BASE}/enrichment/schemas/${id}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify({ schema: data }),
  });
  await checkOk(res);
  return (await res.json()).schema as EnrichmentSchema;
}

export async function deleteSchema(token: string, id: string): Promise<void> {
  const res = await fetch(`${PD_BASE}/enrichment/schemas/${id}`, {
    method: 'DELETE',
    headers: headers(token),
  });
  await checkOk(res);
}

// ── Records ───────────────────────────────────────────────────────────────────

export async function fetchRecordsPage(
  token: string,
  schemaId: string,
  cursor?: string,
  limit = 100
): Promise<RecordsPage> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const res = await fetch(`${PD_BASE}/enrichment/schemas/${schemaId}/records?${params}`, {
    headers: headers(token),
  });
  await checkOk(res);
  return (await res.json()) as RecordsPage;
}

export async function fetchAllRecords(
  token: string,
  schemaId: string
): Promise<EnrichmentRecord[]> {
  const all: EnrichmentRecord[] = [];
  let cursor: string | undefined;
  do {
    const page = await fetchRecordsPage(token, schemaId, cursor);
    all.push(...page.records);
    cursor = page.next_cursor ?? undefined;
  } while (cursor);
  return all;
}

export async function uploadRecordsCsv(
  token: string,
  schemaId: string,
  csvText: string
): Promise<UploadResponse> {
  const res = await fetch(`${PD_BASE}/enrichment/schemas/${schemaId}/records`, {
    method: 'POST',
    headers: {
      Authorization: `Token token=${token}`,
      Accept: 'application/vnd.pagerduty+json;version=2',
      'Content-Type': 'text/csv',
    },
    body: csvText,
  });
  await checkOk(res);
  return (await res.json()) as UploadResponse;
}

export async function deleteRecord(
  token: string,
  schemaId: string,
  recordId: string
): Promise<void> {
  const res = await fetch(`${PD_BASE}/enrichment/schemas/${schemaId}/records/${recordId}`, {
    method: 'DELETE',
    headers: headers(token),
  });
  await checkOk(res);
}

// ── ServiceNow integration ────────────────────────────────────────────────────

export async function fetchSnIntegrations(token: string): Promise<SnIntegration[]> {
  const res = await fetch(`${PD_BASE}/enrichment/integrations/servicenow`, {
    headers: headers(token),
  });
  await checkOk(res);
  return (await res.json()).integrations as SnIntegration[];
}

export async function createSnIntegration(
  token: string,
  data: { name: string; description?: string; cmdb_tables: NewSnTable[] }
): Promise<SnIntegration> {
  const res = await fetch(`${PD_BASE}/enrichment/integrations/servicenow`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(data),
  });
  await checkOk(res);
  return (await res.json()) as SnIntegration;
}

export async function deleteSnIntegration(token: string, integrationId: string): Promise<void> {
  const res = await fetch(
    `${PD_BASE}/enrichment/integrations/servicenow/${integrationId}`,
    { method: 'DELETE', headers: headers(token) }
  );
  await checkOk(res);
}

export async function addSnCredentials(
  token: string,
  creds: NewSnCredentials
): Promise<SnCredentials> {
  const res = await fetch(`${PD_BASE}/enrichment/integrations/servicenow/credentials`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ credentials: creds }),
  });
  await checkOk(res);
  return (await res.json()).credentials as SnCredentials;
}

export async function updateSnCredentials(
  token: string,
  credentialsId: string,
  creds: NewSnCredentials
): Promise<SnCredentials> {
  const res = await fetch(
    `${PD_BASE}/enrichment/integrations/servicenow/credentials/${credentialsId}`,
    { method: 'PUT', headers: headers(token), body: JSON.stringify({ credentials: creds }) }
  );
  await checkOk(res);
  return (await res.json()).credentials as SnCredentials;
}

export async function addSnTable(
  token: string,
  integrationId: string,
  table: NewSnTable
): Promise<SnCmdbTable> {
  const res = await fetch(
    `${PD_BASE}/enrichment/integrations/servicenow/${integrationId}/tables`,
    { method: 'POST', headers: headers(token), body: JSON.stringify({ cmdb_table: table }) }
  );
  await checkOk(res);
  return (await res.json()).cmdb_table as SnCmdbTable;
}

export async function updateSnTable(
  token: string,
  integrationId: string,
  tableId: string,
  table: NewSnTable
): Promise<SnCmdbTable> {
  const res = await fetch(
    `${PD_BASE}/enrichment/integrations/servicenow/${integrationId}/tables/${tableId}`,
    { method: 'PUT', headers: headers(token), body: JSON.stringify({ cmdb_table: table }) }
  );
  await checkOk(res);
  return (await res.json()).cmdb_table as SnCmdbTable;
}

export async function deleteSnTable(
  token: string,
  integrationId: string,
  tableId: string
): Promise<void> {
  const res = await fetch(
    `${PD_BASE}/enrichment/integrations/servicenow/${integrationId}/tables/${tableId}`,
    { method: 'DELETE', headers: headers(token) }
  );
  await checkOk(res);
}

export async function testSnTable(
  token: string,
  integrationId: string,
  tableId: string
): Promise<SnTestResult> {
  const res = await fetch(
    `${PD_BASE}/enrichment/integrations/servicenow/${integrationId}/tables/${tableId}/test`,
    { headers: headers(token) }
  );
  await checkOk(res);
  return (await res.json()) as SnTestResult;
}

export async function enableSnTable(
  token: string,
  integrationId: string,
  tableId: string
): Promise<void> {
  const res = await fetch(
    `${PD_BASE}/enrichment/integrations/servicenow/${integrationId}/tables/${tableId}/enable`,
    { method: 'POST', headers: headers(token) }
  );
  await checkOk(res);
}

// ── ServiceNow direct browse (calls SN REST API from browser) ────────────────

// In dev, route through the Vite /sn-proxy middleware to avoid CORS.
// In production, call SN directly (requires CORS configured on the SN instance).
async function snFetch(
  instanceEndpoint: string,
  user: string,
  password: string,
  path: string
): Promise<unknown> {
  const base = instanceEndpoint.replace(/\/$/, '');
  const url = `/sn-proxy/${new URL(base).hostname}${path}`;
  const auth = btoa(`${user}:${password}`);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    });
  } catch {
    throw new Error('Cannot reach ServiceNow instance — check the URL and your network');
  }
  if (res.status === 401) throw new Error('Invalid username or password');
  if (res.status === 403) throw new Error('User lacks REST API access in ServiceNow');
  if (!res.ok) throw new Error(`ServiceNow responded with HTTP ${res.status}`);
  return res.json();
}

export interface SnTableInfo {
  name: string;
  label: string;
}

export interface SnFieldInfo {
  element: string;
  column_label: string;
  type_display: string;
  type_value: string;
  reference_table: string;
  reference_label: string;
}

export async function fetchSnTableList(
  instanceEndpoint: string,
  user: string,
  password: string,
  search?: string
): Promise<SnTableInfo[]> {
  const query = search
    ? `nameLIKE${search}^ORlabelLIKE${search}`
    : 'nameSTARTSWITHcmdb_ci';
  const data = await snFetch(instanceEndpoint, user, password,
    `/api/now/table/sys_db_object?sysparm_query=${encodeURIComponent(query)}&sysparm_fields=name,label&sysparm_display_value=true&sysparm_limit=150&sysparm_orderby=name`
  ) as { result: { name: string; label: string }[] };
  return data.result ?? [];
}

export async function fetchSnFieldList(
  instanceEndpoint: string,
  user: string,
  password: string,
  tableName: string
): Promise<SnFieldInfo[]> {
  const query = `name=${tableName}^active=true^elementISNOTEMPTY`;
  const data = await snFetch(instanceEndpoint, user, password,
    `/api/now/table/sys_dictionary?sysparm_query=${encodeURIComponent(query)}&sysparm_fields=element,column_label,internal_type,reference&sysparm_display_value=all&sysparm_limit=500&sysparm_orderby=element`
  ) as {
    result: Array<{
      element: { value: string };
      column_label: { value: string };
      internal_type: { value: string; display_value: string };
      reference: { value: string; display_value: string };
    }>;
  };
  return (data.result ?? []).map((f) => ({
    element: f.element.value,
    column_label: f.column_label.value,
    type_display: f.internal_type.display_value,
    type_value: f.internal_type.value,
    reference_table: f.reference.value,
    reference_label: f.reference.display_value,
  }));
}

// ── ServiceNow direct validation ──────────────────────────────────────────────

export async function validateSnCredentials(
  instanceEndpoint: string,
  user: string,
  password: string
): Promise<void> {
  await snFetch(instanceEndpoint, user, password, '/api/now/table/sys_user?sysparm_limit=1&sysparm_fields=sys_id');
}
