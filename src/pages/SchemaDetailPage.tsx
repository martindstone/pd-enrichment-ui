import { useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';
import {
  Stack, Group, Text, Badge, Button, ActionIcon, Tooltip,
  Alert, Tabs, Anchor, Pagination, Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft, IconUpload, IconDownload, IconRefresh,
  IconTrash, IconEdit, IconInfoCircle,
} from '@tabler/icons-react';
import { DataTable } from '../components/DataTable';
import { SnStatusBadge } from '../components/SnStatusBadge';
import { CsvUploadModal } from '../components/CsvUploadModal';
import { SchemaFormModal } from '../components/SchemaFormModal';
import {
  useRecords, useDeleteRecord, useExportAllRecords, useSnStatusMap, keys,
} from '../hooks/queries';
import type { EnrichmentSchema, EnrichmentRecord } from '../api/types';

const PAGE_SIZE = 25;

interface Props {
  token: string;
  schema: EnrichmentSchema;
  onBack: () => void;
  onSchemaUpdated: (schema: EnrichmentSchema) => void;
}

export function SchemaDetailPage({ token, schema, onBack, onSchemaUpdated }: Props) {
  const { data: snStatus = {} } = useSnStatusMap(token);
  const qc = useQueryClient();
  const [pageIndex, setPageIndex] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const {
    data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useRecords(token, schema.id, PAGE_SIZE);

  const deleteRecord = useDeleteRecord(token, schema.id);
  const exportAll = useExportAllRecords(token);

  const pages = data?.pages ?? [];
  const currentPage = pages[pageIndex];
  const records: EnrichmentRecord[] = currentPage?.records ?? [];
  const totalPages = hasNextPage ? pages.length + 1 : pages.length;

  const handlePageChange = async (p: number) => {
    const idx = p - 1;
    if (idx >= pages.length) await fetchNextPage();
    setPageIndex(idx);
  };

  const handleDelete = (rec: EnrichmentRecord) => {
    const queryField = schema.fields.find((f) => f.type === 'query')?.name;
    const label = (queryField && rec.enrichment_data[queryField]) ?? rec.record_id.slice(0, 8);
    modals.openConfirmModal({
      title: 'Delete Record',
      children: <Text size="sm">Delete record <strong>{label}</strong>?</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        deleteRecord.mutateAsync(rec.record_id).catch((e: Error) =>
          notifications.show({ color: 'red', title: 'Delete failed', message: e.message })
        ),
    });
  };

  const handleExport = () => {
    exportAll.mutate(schema.id, {
      onSuccess: (all) => {
        const cols = schema.fields.map((f) => f.name);
        const rows = [cols.join(',')];
        for (const rec of all) {
          rows.push(
            cols.map((c) => {
              const v = rec.enrichment_data[c] ?? '';
              return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
            }).join(',')
          );
        }
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${schema.name}_enrichment.csv`;
        a.click();
        URL.revokeObjectURL(url);
        notifications.show({ color: 'green', message: `Exported ${all.length} records` });
      },
      onError: (e: Error) =>
        notifications.show({ color: 'red', title: 'Export failed', message: e.message }),
    });
  };

  // Dynamic columns from schema fields
  const col = useMemo(() => createColumnHelper<EnrichmentRecord>(), []);
  const columns = useMemo(() => {
    const fieldCols = schema.fields.map((f) =>
      col.accessor((rec) => rec.enrichment_data[f.name] ?? '', {
        id: f.name,
        header: () => (
          <>
            {f.name}
            {f.type === 'query' && <Text span c="orange"> *</Text>}
          </>
        ),
      })
    );
    const actionCol = col.display({
      id: 'actions',
      meta: { width: 40 },
      cell: ({ row }) => (
        <Tooltip label="Delete record">
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleDelete(row.original); }}
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Tooltip>
      ),
    });
    return [...fieldCols, actionCol];
  }, [schema.fields]);

  const fieldCols = useMemo(() => [
    createColumnHelper<typeof schema.fields[0]>().accessor('name', {
      header: 'Field Name',
      cell: (info) => (
        <Text fw={info.row.original.type === 'query' ? 600 : undefined}>
          {info.getValue()}{info.row.original.type === 'query' && <Text span c="orange"> *</Text>}
        </Text>
      ),
    }),
    createColumnHelper<typeof schema.fields[0]>().accessor('type', {
      header: 'Type',
      cell: (info) => (
        <Badge variant="light" color={info.getValue() === 'query' ? 'orange' : 'blue'} size="sm">
          {info.getValue()}
        </Badge>
      ),
    }),
  ], []);

  const snSyncStatus = schema.integration_type === 'SERVICENOW' ? snStatus[schema.name] : undefined;

  return (
    <Stack gap="md">
      <Anchor component="button" onClick={onBack} c="dimmed" size="sm">
        <Group gap={4}>
          <IconArrowLeft size={14} />
          {schema.integration_type === 'SERVICENOW' ? 'ServiceNow' : 'Local Schemas'}
        </Group>
      </Anchor>

      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Group gap="sm">
            <Title order={3}>{schema.name}</Title>
            <Badge variant="outline">{schema.integration_type}</Badge>
            {snSyncStatus && <SnStatusBadge status={snSyncStatus} />}
          </Group>
          {schema.description && <Text c="dimmed" size="sm">{schema.description}</Text>}
        </Stack>
        <Tooltip label="Edit schema">
          <ActionIcon variant="light" onClick={() => setEditOpen(true)}>
            <IconEdit size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Tabs defaultValue="records">
        <Tabs.List>
          <Tabs.Tab value="records">Records</Tabs.Tab>
          <Tabs.Tab value="fields">Fields</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="records" pt="md">
          <Stack gap="sm">
            {schema.integration_type === 'SERVICENOW' && (
              <Alert icon={<IconInfoCircle size={14} />} color="blue" variant="light">
                Records are synced from ServiceNow. Manage data through the ServiceNow tab.
              </Alert>
            )}
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Page {pageIndex + 1} · {records.length} shown
              </Text>
              <Group gap="xs">
                {schema.integration_type !== 'SERVICENOW' && (
                  <Button size="xs" variant="light" leftSection={<IconUpload size={14} />} onClick={() => setUploadOpen(true)}>
                    Upload CSV
                  </Button>
                )}
                <Button size="xs" variant="light" leftSection={<IconDownload size={14} />} onClick={handleExport} loading={exportAll.isPending}>
                  Export CSV
                </Button>
                <Tooltip label="Refresh">
                  <ActionIcon variant="subtle" size="sm" onClick={() => { setPageIndex(0); qc.invalidateQueries({ queryKey: keys.records(token, schema.id) }); }}>
                    <IconRefresh size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>

            {error && <Alert color="red">{(error as Error).message}</Alert>}

            <DataTable
              data={records}
              columns={columns}
              loading={isLoading || isFetchingNextPage}
              emptyMessage={
                schema.integration_type === 'CSV'
                  ? 'No records yet — if you just uploaded, data may take a few seconds to appear. Try refreshing.'
                  : 'No records'
              }
              scrollable
            />

            {totalPages > 1 && (
              <Group justify="center">
                <Pagination value={pageIndex + 1} onChange={handlePageChange} total={totalPages} />
              </Group>
            )}
            <Text size="xs" c="dimmed">* query field</Text>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="fields" pt="md">
          <Stack gap="xs">
            <DataTable data={schema.fields} columns={fieldCols} />
            <Text size="xs" c="dimmed">* query field — used to match incoming events. Fields cannot be changed after schema creation.</Text>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <CsvUploadModal
        token={token}
        schema={schema}
        opened={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => {
          setPageIndex(0);
          setTimeout(() => qc.invalidateQueries({ queryKey: keys.records(token, schema.id) }), 2000);
        }}
      />
      <SchemaFormModal
        token={token}
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => { onSchemaUpdated(updated); setEditOpen(false); }}
        existing={schema}
      />
    </Stack>
  );
}
