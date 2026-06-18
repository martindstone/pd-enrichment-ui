import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';
import {
  Stack, Group, Button, Title, Tooltip, ActionIcon, Badge, Text, Alert,
  Card, Skeleton,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconUpload, IconEye, IconEdit, IconTrash, IconRefresh } from '@tabler/icons-react';
import { DataTable } from '../components/DataTable';
import { SchemaFormModal } from '../components/SchemaFormModal';
import { CsvImportModal } from '../components/CsvImportModal';
import { useCsvSchemas, useDeleteSchema, keys } from '../hooks/queries';
import type { EnrichmentSchema, SchemaField } from '../api/types';

const fieldCol = createColumnHelper<SchemaField>();
const fieldColumns = [
  fieldCol.accessor('name', {
    header: 'Field',
    cell: (info) => (
      <Text size="sm" fw={info.row.original.type === 'query' ? 600 : undefined}>
        {info.getValue()}{info.row.original.type === 'query' && <Text span c="orange" size="sm"> *</Text>}
      </Text>
    ),
  }),
  fieldCol.accessor('type', {
    header: 'Type',
    meta: { width: 100 },
    cell: (info) => (
      <Badge variant="light" color={info.getValue() === 'query' ? 'orange' : 'blue'} size="xs">
        {info.getValue()}
      </Badge>
    ),
  }),
];

interface Props {
  token: string;
  onSelect: (schema: EnrichmentSchema) => void;
}

export function SchemaListPage({ token, onSelect }: Props) {
  const qc = useQueryClient();
  const { data: schemas = [], isLoading, error } = useCsvSchemas(token);
  const deleteSchema = useDeleteSchema(token);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EnrichmentSchema | null>(null);

  const handleDelete = (schema: EnrichmentSchema) => {
    modals.openConfirmModal({
      title: 'Delete Schema',
      children: (
        <Text size="sm">
          Delete <strong>{schema.name}</strong>? This removes all records and cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        deleteSchema.mutateAsync(schema.id).catch((e: Error) =>
          notifications.show({ color: 'red', title: 'Delete failed', message: e.message })
        ),
    });
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: keys.schemas(token) });

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="sm">
          <Title order={3}>Local Schemas</Title>
          {schemas.length > 0 && <Badge variant="light" size="sm">{schemas.length}</Badge>}
        </Group>
        <Group gap="xs">
          <Tooltip label="Refresh">
            <ActionIcon variant="subtle" onClick={invalidate} loading={isLoading}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
          <Button variant="light" leftSection={<IconUpload size={16} />} onClick={() => setImportOpen(true)}>
            Import CSV
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateOpen(true)}>
            New Schema
          </Button>
        </Group>
      </Group>

      {error && <Alert color="red">{(error as Error).message}</Alert>}

      {isLoading ? (
        <Stack gap="sm">{[1, 2, 3].map((i) => <Skeleton key={i} height={120} />)}</Stack>
      ) : schemas.length === 0 ? (
        <Alert color="blue">No local schemas yet — create one or import from a CSV file.</Alert>
      ) : (
        schemas.map((schema) => (
          <Card key={schema.id} withBorder padding="sm" bg="var(--mantine-color-default-hover)">
            <Stack gap="xs">
              <Group justify="space-between">
                <Group gap="sm">
                  <Text fw={500}>{schema.name}</Text>
                  <Badge variant="outline" size="sm">{schema.fields.length} fields</Badge>
                </Group>
                <Group gap={4}>
                  <Tooltip label="View records">
                    <ActionIcon variant="subtle" size="sm" onClick={() => onSelect(schema)}>
                      <IconEye size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Edit">
                    <ActionIcon variant="subtle" size="sm" onClick={() => setEditTarget(schema)}>
                      <IconEdit size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Delete">
                    <ActionIcon
                      variant="subtle" size="sm" color="red"
                      loading={deleteSchema.isPending}
                      onClick={() => handleDelete(schema)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
              {schema.description && <Text size="xs" c="dimmed">{schema.description}</Text>}
              <DataTable data={schema.fields} columns={fieldColumns} />
            </Stack>
          </Card>
        ))
      )}

      <CsvImportModal
        token={token}
        opened={importOpen}
        onClose={() => setImportOpen(false)}
        onCreated={(schema) => {
          invalidate();
          onSelect(schema);
          setTimeout(() => qc.invalidateQueries({ queryKey: keys.records(token, schema.id) }), 3000);
        }}
      />
      <SchemaFormModal
        token={token}
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => { setCreateOpen(false); invalidate(); }}
      />
      <SchemaFormModal
        token={token}
        opened={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); invalidate(); }}
        existing={editTarget ?? undefined}
      />
    </Stack>
  );
}
