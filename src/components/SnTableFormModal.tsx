import { useState, useEffect, useMemo } from 'react';
import {
  Modal, Stack, TextInput, Button, Group, Text,
  ActionIcon, Alert, Table, SegmentedControl, Loader, Autocomplete,
} from '@mantine/core';
import { IconPlus, IconTrash, IconInfoCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { addSnTable, updateSnTable, fetchSnTableList, fetchSnFieldList } from '../api/client';
import type { SnTableInfo, SnFieldInfo } from '../api/client';
import type { SnCmdbTable, SnFieldMappingInput } from '../api/types';
import type { SnSessionCreds } from './SnSetupModal';

interface MappingRow {
  servicenow_field: string;
  event_field: string;
  isQuery: boolean;
}

interface Props {
  token: string;
  integrationId: string;
  opened: boolean;
  onClose: () => void;
  onSaved: (table: SnCmdbTable) => void;
  existing?: SnCmdbTable;
  snCreds?: SnSessionCreds;
}

export function SnTableFormModal({ token, integrationId, opened, onClose, onSaved, existing, snCreds }: Props) {
  const isEdit = !!existing;
  const [displayName, setDisplayName] = useState('');
  const [ciTableName, setCiTableName] = useState('');
  const [queryFilter, setQueryFilter] = useState('');
  const [mappings, setMappings] = useState<MappingRow[]>([
    { servicenow_field: '', event_field: '', isQuery: true },
    { servicenow_field: '', event_field: '', isQuery: false },
  ]);
  const [loading, setLoading] = useState(false);

  // SN browse state
  const [tableInfos, setTableInfos] = useState<SnTableInfo[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [fieldInfos, setFieldInfos] = useState<SnFieldInfo[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);

  const tableOptions = useMemo(() => tableInfos.map((t) => ({ value: t.name, label: t.name })), [tableInfos]);
  const fieldOptions = useMemo(() => fieldInfos.map((f) => ({ value: f.element, label: f.element })), [fieldInfos]);

  const tableLabel = useMemo(() => new Map(tableInfos.map((t) => [t.name, t.label])), [tableInfos]);
  const fieldLabel = useMemo(() => new Map(fieldInfos.map((f) => [f.element, f.column_label])), [fieldInfos]);

  useEffect(() => {
    if (opened) {
      const tableVal = existing?.ci_table_name ?? '';
      setDisplayName(existing?.display_name ?? '');
      setCiTableName(tableVal);
      setQueryFilter(existing?.query_filter ?? '');
      setMappings(
        existing?.field_mappings.map((m) => ({
          servicenow_field: m.servicenow_field,
          event_field: m.event_field,
          isQuery: m.type === 'query',
        })) ?? [
          { servicenow_field: '', event_field: '', isQuery: true },
          { servicenow_field: '', event_field: '', isQuery: false },
        ]
      );
      setTableInfos([]);
      setFieldInfos([]);
      if (snCreds) {
        loadSnTables('');
        if (tableVal) loadSnFields(tableVal);
      }
    }
  }, [opened, existing]);

  // Debounced table search when user types (add mode only)
  useEffect(() => {
    if (!opened || !snCreds || isEdit) return;
    const timer = setTimeout(() => loadSnTables(ciTableName), 400);
    return () => clearTimeout(timer);
  }, [ciTableName, opened, snCreds, isEdit]);

  const loadSnTables = async (search: string) => {
    if (!snCreds) return;
    setLoadingTables(true);
    try {
      const tables = await fetchSnTableList(
        snCreds.instanceEndpoint, snCreds.user, snCreds.password, search || undefined
      );
      setTableInfos(tables);
    } catch {
      // user can still type manually
    } finally {
      setLoadingTables(false);
    }
  };

  const loadSnFields = async (tableName: string) => {
    if (!snCreds || !tableName.trim()) { setFieldInfos([]); return; }
    setLoadingFields(true);
    try {
      const fields = await fetchSnFieldList(
        snCreds.instanceEndpoint, snCreds.user, snCreds.password, tableName.trim()
      );
      setFieldInfos(fields);
    } catch {
      setFieldInfos([]);
    } finally {
      setLoadingFields(false);
    }
  };

  const handleTableSelect = (value: string) => {
    setCiTableName(value);
    loadSnFields(value);
    if (!displayName.trim()) {
      const info = tableInfos.find((t) => t.name === value);
      if (info?.label && info.label !== value) setDisplayName(info.label);
    }
  };

  const updateMapping = (i: number, patch: Partial<MappingRow>) =>
    setMappings((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  const removeMapping = (i: number) => setMappings((prev) => prev.filter((_, idx) => idx !== i));

  const addMapping = () =>
    setMappings((prev) => [...prev, { servicenow_field: '', event_field: '', isQuery: false }]);

  const queryCount = mappings.filter((m) => m.isQuery).length;
  const enrichedCount = mappings.filter((m) => !m.isQuery).length;

  const valid =
    displayName.trim().length > 0 &&
    ciTableName.trim().length > 0 &&
    mappings.every((m) => m.servicenow_field.trim() && m.event_field.trim()) &&
    queryCount >= 1 &&
    enrichedCount >= 1 &&
    mappings.length >= 2 &&
    mappings.length <= 20;

  const buildPayload = () => ({
    display_name: displayName.trim(),
    ci_table_name: ciTableName.trim(),
    query_filter: queryFilter.trim() || undefined,
    field_mappings: mappings.map((m): SnFieldMappingInput => ({
      servicenow_field: m.servicenow_field.trim(),
      event_field: m.event_field.trim(),
      ...(m.isQuery ? { type: 'query' as const } : {}),
    })),
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = buildPayload();
      const saved = isEdit
        ? await updateSnTable(token, integrationId, existing.id, payload)
        : await addSnTable(token, integrationId, payload);
      notifications.show({
        color: 'green',
        title: isEdit ? 'Table updated' : 'Table added',
        message: saved.display_name,
      });
      onSaved(saved);
      onClose();
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Error', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? `Edit Table — ${existing?.display_name}` : 'Add CMDB Table'}
      size="xl"
    >
      <Stack gap="md">
        <Group grow align="flex-start">
          <TextInput
            label="Display Name"
            placeholder="Server CIs"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.currentTarget.value)}
          />
          {snCreds && !isEdit ? (
            <Autocomplete
              label="SN Table Name"
              placeholder="cmdb_ci_server"
              required
              value={ciTableName}
              onChange={setCiTableName}
              onOptionSubmit={handleTableSelect}
              onBlur={() => { if (ciTableName.trim() && fieldInfos.length === 0) loadSnFields(ciTableName); }}
              data={tableOptions}
              limit={30}
              rightSection={loadingTables ? <Loader size="xs" /> : undefined}
              renderOption={({ option }) => {
                const lbl = tableLabel.get(option.value);
                return (
                  <Stack gap={0}>
                    <Text size="sm" ff="monospace">{option.value}</Text>
                    {lbl && lbl !== option.value && <Text size="xs" c="dimmed">{lbl}</Text>}
                  </Stack>
                );
              }}
            />
          ) : (
            <TextInput
              label="SN Table Name"
              placeholder="cmdb_ci_server"
              required
              disabled={isEdit}
              value={ciTableName}
              onChange={(e) => setCiTableName(e.currentTarget.value)}
              description={isEdit ? 'Cannot change after creation' : undefined}
            />
          )}
        </Group>

        <TextInput
          label="Query Filter"
          placeholder="operational_status=1"
          description="ServiceNow encoded query syntax — optional"
          value={queryFilter}
          onChange={(e) => setQueryFilter(e.currentTarget.value)}
        />

        <Stack gap={4}>
          <Group justify="space-between">
            <Text size="sm" fw={500}>Field Mappings</Text>
            <Text size="xs" c="dimmed">{mappings.length} / 20</Text>
          </Group>
          <Alert icon={<IconInfoCircle size={14} />} color="blue" variant="light" p="xs">
            <Text size="xs">
              Map ServiceNow column names to PagerDuty event field names. Supports dot-walked fields (e.g. <code>location.city</code>).
              Mark at least one as <strong>Query</strong> — this is used to match incoming events.
            </Text>
          </Alert>
          <Table withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ServiceNow Field</Table.Th>
                <Table.Th>Event Field</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th w={40} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {mappings.map((m, i) => (
                <Table.Tr key={i}>
                  <Table.Td>
                    {snCreds && fieldOptions.length > 0 ? (
                      <Autocomplete
                        size="xs"
                        placeholder="name"
                        value={m.servicenow_field}
                        onChange={(v) => updateMapping(i, { servicenow_field: v })}
                        data={fieldOptions}
                        limit={30}
                        rightSection={loadingFields && i === 0 ? <Loader size="xs" /> : undefined}
                        renderOption={({ option }) => {
                          const lbl = fieldLabel.get(option.value);
                          return (
                            <Stack gap={0}>
                              <Text size="sm" ff="monospace">{option.value}</Text>
                              {lbl && lbl !== option.value && <Text size="xs" c="dimmed">{lbl}</Text>}
                            </Stack>
                          );
                        }}
                      />
                    ) : (
                      <TextInput
                        size="xs"
                        placeholder="name"
                        value={m.servicenow_field}
                        onChange={(e) => updateMapping(i, { servicenow_field: e.currentTarget.value })}
                      />
                    )}
                  </Table.Td>
                  <Table.Td>
                    <TextInput
                      size="xs"
                      placeholder="source"
                      value={m.event_field}
                      onChange={(e) => updateMapping(i, { event_field: e.currentTarget.value })}
                    />
                  </Table.Td>
                  <Table.Td>
                    <SegmentedControl
                      size="xs"
                      value={m.isQuery ? 'query' : 'enriched'}
                      onChange={(v) => updateMapping(i, { isQuery: v === 'query' })}
                      disabled={m.isQuery && queryCount <= 1}
                      data={[
                        { label: 'Query', value: 'query' },
                        { label: 'Enriched', value: 'enriched' },
                      ]}
                    />
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => removeMapping(i)}
                      disabled={mappings.length <= 2}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          {queryCount < 1 && <Text size="xs" c="red">At least one query mapping required.</Text>}
          {enrichedCount < 1 && <Text size="xs" c="red">At least one enriched mapping required.</Text>}
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconPlus size={14} />}
            onClick={addMapping}
            disabled={mappings.length >= 20}
            w="fit-content"
          >
            Add mapping
          </Button>
        </Stack>

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading} disabled={!valid}>
            {isEdit ? 'Save Changes' : 'Add Table'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
