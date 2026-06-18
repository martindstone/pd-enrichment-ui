import { useState, useEffect, useMemo } from 'react';
import {
  Modal, Stack, TextInput, PasswordInput, Button, Group, Text,
  ActionIcon, Alert, Table, SegmentedControl, Stepper, Loader, Autocomplete,
} from '@mantine/core';
import { IconPlus, IconTrash, IconInfoCircle, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  validateSnCredentials, createSnIntegration, fetchSnIntegrations,
  addSnCredentials, updateSnCredentials,
  fetchSnTableList, fetchSnFieldList,
} from '../api/client';
import type { SnTableInfo, SnFieldInfo } from '../api/client';
import type { SnIntegration, SnFieldMappingInput, NewSnCredentials } from '../api/types';

interface MappingRow {
  servicenow_field: string;
  event_field: string;
  isQuery: boolean;
}

export interface SnSessionCreds {
  instanceEndpoint: string;
  user: string;
  password: string;
}

interface Props {
  token: string;
  opened: boolean;
  onClose: () => void;
  onCreated: (integration: SnIntegration, creds: SnSessionCreds) => void;
}

export function SnSetupModal({ token, opened, onClose, onCreated }: Props) {
  const [active, setActive] = useState(0);

  // Step 1 — credentials
  const [instanceEndpoint, setInstanceEndpoint] = useState('');
  const [snUser, setSnUser] = useState('');
  const [snPassword, setSnPassword] = useState('');
  const [validating, setValidating] = useState(false);
  const [credentialsValid, setCredentialsValid] = useState(false);

  // Step 2 — first table
  const [displayName, setDisplayName] = useState('');
  const [ciTableName, setCiTableName] = useState('');
  const [queryFilter, setQueryFilter] = useState('');
  const [mappings, setMappings] = useState<MappingRow[]>([
    { servicenow_field: '', event_field: '', isQuery: true },
    { servicenow_field: '', event_field: '', isQuery: false },
  ]);
  const [submitting, setSubmitting] = useState(false);

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
    if (!opened) {
      setActive(0);
      setInstanceEndpoint('');
      setSnUser('');
      setSnPassword('');
      setValidating(false);
      setCredentialsValid(false);
      setDisplayName('');
      setCiTableName('');
      setQueryFilter('');
      setMappings([
        { servicenow_field: '', event_field: '', isQuery: true },
        { servicenow_field: '', event_field: '', isQuery: false },
      ]);
      setSubmitting(false);
      setTableInfos([]);
      setFieldInfos([]);
    }
  }, [opened]);

  // Load initial table list when entering step 2
  useEffect(() => {
    if (active === 1 && credentialsValid && tableInfos.length === 0) {
      loadSnTables('');
    }
  }, [active, credentialsValid]);

  // Debounced table search as user types
  useEffect(() => {
    if (active !== 1 || !credentialsValid) return;
    const timer = setTimeout(() => loadSnTables(ciTableName), 400);
    return () => clearTimeout(timer);
  }, [ciTableName, active, credentialsValid]);

  const loadSnTables = async (search: string) => {
    setLoadingTables(true);
    try {
      const tables = await fetchSnTableList(
        instanceEndpoint.trim(), snUser.trim(), snPassword, search || undefined
      );
      setTableInfos(tables);
    } catch {
      // user can still type manually
    } finally {
      setLoadingTables(false);
    }
  };

  const loadSnFields = async (tableName: string) => {
    if (!tableName.trim()) { setFieldInfos([]); return; }
    setLoadingFields(true);
    try {
      const fields = await fetchSnFieldList(
        instanceEndpoint.trim(), snUser.trim(), snPassword, tableName.trim()
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

  const handleValidate = async () => {
    setValidating(true);
    setCredentialsValid(false);
    try {
      await validateSnCredentials(instanceEndpoint.trim(), snUser.trim(), snPassword);
      setCredentialsValid(true);
      setActive(1);
    } catch (e: unknown) {
      notifications.show({ color: 'red', title: 'Connection failed', message: (e as Error).message });
    } finally {
      setValidating(false);
    }
  };

  const updateMapping = (i: number, patch: Partial<MappingRow>) =>
    setMappings((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const removeMapping = (i: number) => setMappings((prev) => prev.filter((_, idx) => idx !== i));
  const addMapping = () => setMappings((prev) => [...prev, { servicenow_field: '', event_field: '', isQuery: false }]);

  const queryCount = mappings.filter((m) => m.isQuery).length;
  const enrichedCount = mappings.filter((m) => !m.isQuery).length;

  const step1Valid =
    instanceEndpoint.trim().startsWith('https://') &&
    snUser.trim().length > 0 &&
    snPassword.length > 0;

  const step2Valid =
    displayName.trim().length > 0 &&
    ciTableName.trim().length > 0 &&
    mappings.every((m) => m.servicenow_field.trim() && m.event_field.trim()) &&
    queryCount >= 1 && enrichedCount >= 1 && mappings.length >= 2 && mappings.length <= 20;

  const handleSubmit = async () => {
    setSubmitting(true);
    const creds: NewSnCredentials = {
      instance_endpoint: instanceEndpoint.trim(),
      user: snUser.trim(),
      password: snPassword,
    };
    const table = {
      display_name: displayName.trim(),
      ci_table_name: ciTableName.trim(),
      query_filter: queryFilter.trim() || undefined,
      field_mappings: mappings.map((m): SnFieldMappingInput => ({
        servicenow_field: m.servicenow_field.trim(),
        event_field: m.event_field.trim(),
        ...(m.isQuery ? { type: 'query' as const } : {}),
      })),
    };
    try {
      const integration = await createSnIntegration(token, {
        name: 'ServiceNow Enrichment',
        cmdb_tables: [table],
      });

      // Credentials are a global resource — find their ID via PUT if POST is rejected
      const existingCredId = integration.credentials?.id;
      if (existingCredId) {
        await updateSnCredentials(token, existingCredId, creds);
      } else {
        try {
          await addSnCredentials(token, creds);
        } catch {
          // POST rejected — credentials from a previous integration may still exist.
          // Re-fetch to see if PD linked them to this integration.
          const fresh = await fetchSnIntegrations(token);
          const credId = fresh.find((i) => i.id === integration.id)?.credentials?.id;
          if (credId) {
            await updateSnCredentials(token, credId, creds);
          } else {
            throw new Error('Integration created but credentials could not be set — use "Update Credentials" from the integration page');
          }
        }
      }

      notifications.show({ color: 'green', title: 'Integration created', message: displayName.trim() });
      onCreated(integration, { instanceEndpoint: instanceEndpoint.trim(), user: snUser.trim(), password: snPassword });
      onClose();
    } catch (e: unknown) {
      notifications.show({ color: 'red', title: 'Setup failed', message: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Set Up ServiceNow Integration" size="xl">
      <Stack gap="lg">
        <Stepper active={active} size="sm">
          <Stepper.Step label="Connect" description="Validate credentials" />
          <Stepper.Step label="First Table" description="Configure CMDB sync" />
        </Stepper>

        {active === 0 && (
          <Stack gap="md">
            <TextInput
              label="Instance URL"
              placeholder="https://your-instance.service-now.com"
              required
              value={instanceEndpoint}
              onChange={(e) => { setInstanceEndpoint(e.currentTarget.value); setCredentialsValid(false); }}
              error={instanceEndpoint && !instanceEndpoint.trim().startsWith('https://') ? 'Must start with https://' : undefined}
            />
            <Group grow>
              <TextInput
                label="Username"
                placeholder="admin"
                required
                value={snUser}
                onChange={(e) => { setSnUser(e.currentTarget.value); setCredentialsValid(false); }}
              />
              <PasswordInput
                label="Password"
                required
                value={snPassword}
                onChange={(e) => { setSnPassword(e.currentTarget.value); setCredentialsValid(false); }}
              />
            </Group>
            {credentialsValid && (
              <Alert color="green" icon={<IconCheck size={14} />}>Connected successfully</Alert>
            )}
            <Group justify="flex-end">
              <Button variant="subtle" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handleValidate}
                loading={validating}
                disabled={!step1Valid}
                rightSection={validating ? <Loader size="xs" /> : undefined}
              >
                Validate & Continue
              </Button>
            </Group>
          </Stack>
        )}

        {active === 1 && (
          <Stack gap="md">
            <Group grow align="flex-start">
              <TextInput
                label="Display Name"
                placeholder="Server CIs"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.currentTarget.value)}
              />
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
                  Map ServiceNow column names to PagerDuty event field names.
                  Supports dot-walked fields (e.g. <code>location.city</code>).
                  At least one mapping must be <strong>Query</strong>.
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
                        <Autocomplete
                          size="xs"
                          placeholder="name"
                          value={m.servicenow_field}
                          onChange={(v) => updateMapping(i, { servicenow_field: v })}
                          data={fieldOptions}
                          limit={30}
                          rightSection={loadingFields ? <Loader size="xs" /> : undefined}
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
                      </Table.Td>
                      <Table.Td>
                        <TextInput size="xs" placeholder="source" value={m.event_field}
                          onChange={(e) => updateMapping(i, { event_field: e.currentTarget.value })} />
                      </Table.Td>
                      <Table.Td>
                        <SegmentedControl size="xs"
                          value={m.isQuery ? 'query' : 'enriched'}
                          onChange={(v) => updateMapping(i, { isQuery: v === 'query' })}
                          disabled={m.isQuery && queryCount <= 1}
                          data={[{ label: 'Query', value: 'query' }, { label: 'Enriched', value: 'enriched' }]}
                        />
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon variant="subtle" color="red" size="sm"
                          onClick={() => removeMapping(i)} disabled={mappings.length <= 2}>
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              {queryCount < 1 && <Text size="xs" c="red">At least one query mapping required.</Text>}
              {enrichedCount < 1 && <Text size="xs" c="red">At least one enriched mapping required.</Text>}
              <Button size="xs" variant="subtle" leftSection={<IconPlus size={14} />}
                onClick={addMapping} disabled={mappings.length >= 20} w="fit-content">
                Add mapping
              </Button>
            </Stack>
            <Group justify="space-between">
              <Button variant="subtle" onClick={() => setActive(0)}>Back</Button>
              <Group gap="xs">
                <Button variant="subtle" onClick={onClose} disabled={submitting}>Cancel</Button>
                <Button onClick={handleSubmit} loading={submitting} disabled={!step2Valid}>
                  Create Integration
                </Button>
              </Group>
            </Group>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
