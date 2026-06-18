export interface SchemaField {
  name: string;
  type: 'query' | 'enriched';
}

export interface EnrichmentSchema {
  id: string;
  type: string;
  integration_type: 'CSV' | 'SERVICENOW';
  name: string;
  description: string | null;
  fields: SchemaField[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EnrichmentRecord {
  record_id: string;
  type: string;
  created_at: string;
  enrichment_data: Record<string, string>;
}

export interface RecordsPage {
  schema_id: string;
  records: EnrichmentRecord[];
  next_cursor: string | null;
}

export interface UploadResponse {
  upload_id: string;
  schema_id: string;
  filename: string;
  size_bytes: number;
  status: string;
  accepted_at: string;
}

export interface SnCmdbTable {
  id: string;
  display_name: string;
  ci_table_name: string;
  query_filter: string;
  field_mappings: Array<{
    servicenow_field: string;
    event_field: string;
    type: 'query' | 'enriched';
  }>;
  status: 'active' | 'syncing' | 'disabled' | string;
  created_at: string;
  updated_at: string;
}

export interface SnCredentials {
  id: string;
  instance_endpoint: string;
  user: string;
  created_at: string;
  updated_at: string;
}

export interface SnIntegration {
  id: string;
  name: string;
  description: string;
  cmdb_tables: SnCmdbTable[];
  credentials: SnCredentials | null;
  created_at: string;
  updated_at: string;
}

export interface NewSnCredentials {
  instance_endpoint: string;
  user: string;
  password: string;
}

// keyed by ci_table_name
export type SnStatusMap = Record<string, 'active' | 'syncing' | 'disabled' | 'error' | string>;

export interface SnFieldMapping {
  servicenow_field: string;
  event_field: string;
  type: 'query' | 'enriched';
}

// Used when creating/updating — omit type for enriched, include for query
export interface SnFieldMappingInput {
  servicenow_field: string;
  event_field: string;
  type?: 'query';
}

export interface NewSnTable {
  display_name: string;
  ci_table_name: string;
  query_filter?: string;
  field_mappings: SnFieldMappingInput[];
}

export interface SnTestResult {
  enrichment_data: Record<string, string>[];
}

export interface ApiError {
  message: string;
  code: number;
  errors: string[];
}
