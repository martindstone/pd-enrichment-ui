import { useEffect, useState } from 'react';
import { Modal, ScrollArea, Table, Text, Alert, Loader, Stack, Group, Badge } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { testSnTable } from '../api/client';
import type { SnCmdbTable } from '../api/types';

interface Props {
  token: string;
  integrationId: string;
  table: SnCmdbTable | null;
  onClose: () => void;
}

export function SnTableTestModal({ token, integrationId, table, onClose }: Props) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [cols, setCols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!table) return;
    setRows([]);
    setCols([]);
    setError('');
    setLoading(true);
    testSnTable(token, integrationId, table.id)
      .then((result) => {
        const data = result.enrichment_data ?? [];
        if (data.length > 0) {
          // Show mapped event fields first, then SN metadata
          const mappedFields = table.field_mappings.map((m) => m.servicenow_field);
          const allKeys = Object.keys(data[0]);
          const ordered = [
            ...mappedFields.filter((k) => allKeys.includes(k)),
            ...allKeys.filter((k) => !mappedFields.includes(k)),
          ];
          setCols(ordered);
          setRows(data);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [table]);

  return (
    <Modal
      opened={!!table}
      onClose={onClose}
      title={`Test — ${table?.display_name ?? ''}`}
      size="xl"
    >
      <Stack gap="sm">
        <Group gap="xs">
          <Text size="sm" c="dimmed">Up to 10 live sample records from ServiceNow</Text>
          {table && (
            <Badge size="sm" variant="outline">{table.ci_table_name}</Badge>
          )}
          {table?.query_filter && (
            <Badge size="sm" variant="light" color="gray">filter: {table.query_filter}</Badge>
          )}
        </Group>

        {loading && <Loader size="sm" />}
        {error && <Alert icon={<IconAlertCircle size={14} />} color="red">{error}</Alert>}

        {!loading && rows.length > 0 && (
          <ScrollArea>
            <Table withTableBorder striped>
              <Table.Thead>
                <Table.Tr>
                  {cols.map((c) => {
                    const isEventField = table?.field_mappings.some((m) => m.servicenow_field === c);
                    return (
                      <Table.Th key={c} style={{ whiteSpace: 'nowrap' }}>
                        {c}{isEventField && <Text span c="orange"> *</Text>}
                      </Table.Th>
                    );
                  })}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row, i) => (
                  <Table.Tr key={i}>
                    {cols.map((c) => (
                      <Table.Td key={c} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row[c] ?? ''}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
        {!loading && !error && rows.length === 0 && (
          <Text c="dimmed" ta="center" py="md">No records returned.</Text>
        )}
        <Text size="xs" c="dimmed">* mapped field</Text>
      </Stack>
    </Modal>
  );
}
