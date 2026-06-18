import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Stack, Group, Title, Text, Badge, Button, ActionIcon, Tooltip,
  Card, Alert, Skeleton, Divider, Anchor,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconPlus, IconEdit, IconTrash, IconFlask, IconPlayerPlay,
  IconRefresh, IconAlertCircle, IconServer, IconEye, IconKey,
  IconBrandSnowflake, IconTable,
} from '@tabler/icons-react';
import { createColumnHelper } from '@tanstack/react-table';
import { DataTable } from '../components/DataTable';
import { SnStatusBadge } from '../components/SnStatusBadge';
import { SnTableFormModal } from '../components/SnTableFormModal';
import { SnTableTestModal } from '../components/SnTableTestModal';
import { SnSetupModal } from '../components/SnSetupModal';
import { SnCredentialsModal } from '../components/SnCredentialsModal';
import { SnTableBrowserModal } from '../components/SnTableBrowserModal';
import {
  useSnIntegrations, useSchemas, useDeleteSnTable, useEnableSnTable,
  useDeleteSnIntegration, keys,
} from '../hooks/queries';
import type { SnCmdbTable, SnFieldMapping, EnrichmentSchema } from '../api/types';
import type { SnSessionCreds } from '../components/SnSetupModal';

const mappingCol = createColumnHelper<SnFieldMapping>();
const mappingColumns = [
  mappingCol.accessor('servicenow_field', { header: 'ServiceNow Field' }),
  mappingCol.accessor('event_field', { header: 'Event Field' }),
  mappingCol.accessor('type', {
    header: 'Type',
    meta: { width: 100 },
    cell: (info) => (
      <Badge size="xs" variant="light" color={info.getValue() === 'query' ? 'orange' : 'blue'}>
        {info.getValue()}
      </Badge>
    ),
  }),
];

interface Props {
  token: string;
  onViewRecords?: (schema: EnrichmentSchema) => void;
}

export function SnIntegrationPage({ token, onViewRecords }: Props) {
  const qc = useQueryClient();
  const { data: integrations = [], isLoading, error } = useSnIntegrations(token);
  const { data: allSchemas = [] } = useSchemas(token);
  const [addTableFor, setAddTableFor] = useState<string | null>(null);
  const [editTable, setEditTable] = useState<{ integrationId: string; table: SnCmdbTable } | null>(null);
  const [testTable, setTestTable] = useState<{ integrationId: string; table: SnCmdbTable } | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [snSessionCreds, setSnSessionCreds] = useState<SnSessionCreds | undefined>();

  const primaryIntegrationId = integrations[0]?.id ?? '';
  const deleteTable = useDeleteSnTable(token, primaryIntegrationId);
  const enableTable = useEnableSnTable(token, primaryIntegrationId);
  const deleteIntegration = useDeleteSnIntegration(token);

  const handleDeleteTable = (table: SnCmdbTable) => {
    modals.openConfirmModal({
      title: 'Delete Table',
      children: (
        <Stack gap="xs">
          <Text size="sm">Delete <strong>{table.display_name}</strong> ({table.ci_table_name})?</Text>
          {table.status === 'active' && (
            <Alert icon={<IconAlertCircle size={14} />} color="orange" variant="light">
              This table is active — deleting stops syncing and removes all enrichment data for this table.
            </Alert>
          )}
        </Stack>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        deleteTable.mutateAsync(table.id).catch((e: Error) =>
          notifications.show({ color: 'red', title: 'Delete failed', message: e.message })
        ),
    });
  };

  const handleEnable = (table: SnCmdbTable) =>
    enableTable.mutateAsync(table.id)
      .then(() => notifications.show({ color: 'green', message: `Sync enabled for ${table.display_name}` }))
      .catch((e: Error) => notifications.show({ color: 'red', title: 'Enable failed', message: e.message }));

  const handleDeleteIntegration = (integrationId: string) => {
    modals.openConfirmModal({
      title: 'Delete Integration',
      children: (
        <Stack gap="xs">
          <Text size="sm">Delete the entire ServiceNow integration?</Text>
          <Alert icon={<IconAlertCircle size={14} />} color="red" variant="light">
            This removes all CMDB tables and stops all syncing. Enrichment data already in PagerDuty is also removed. This cannot be undone.
          </Alert>
        </Stack>
      ),
      labels: { confirm: 'Delete Integration', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        deleteIntegration.mutateAsync(integrationId).catch((e: Error) =>
          notifications.show({ color: 'red', title: 'Delete failed', message: e.message })
        ),
    });
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: keys.snIntegrations(token) });

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>ServiceNow Integration</Title>
        <Group gap="xs">
          {integrations[0]?.credentials && (
            <Tooltip label="Browse SN tables & fields">
              <ActionIcon variant="subtle" onClick={() => setBrowserOpen(true)}>
                <IconTable size={18} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label="Refresh">
            <ActionIcon variant="subtle" onClick={invalidate} loading={isLoading}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {error && <Alert color="red" icon={<IconAlertCircle size={14} />}>{(error as Error).message}</Alert>}

      {isLoading ? (
        <Stack gap="sm">{[1, 2].map((i) => <Skeleton key={i} height={120} />)}</Stack>
      ) : integrations.length === 0 ? (
        <Card withBorder padding="xl">
          <Stack align="center" gap="md">
            <IconBrandSnowflake size={48} opacity={0.3} />
            <Stack gap={4} align="center">
              <Text fw={600} size="lg">No ServiceNow integration configured</Text>
              <Text size="sm" c="dimmed">Connect your ServiceNow instance to sync CMDB data automatically into PagerDuty enrichments.</Text>
            </Stack>
            <Button leftSection={<IconServer size={16} />} onClick={() => setSetupOpen(true)}>
              Set Up Integration
            </Button>
          </Stack>
        </Card>
      ) : (
        integrations.map((intg) => (
          <Card key={intg.id} withBorder padding="md">
            <Stack gap="md">
              <Group justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Text fw={600} size="lg">{intg.name}</Text>
                  {intg.description && <Text size="sm" c="dimmed">{intg.description}</Text>}
                  {intg.credentials ? (
                    <Group gap="xs" align="center">
                      <Text size="xs" c="dimmed">Instance:</Text>
                      <Anchor size="xs" href={intg.credentials.instance_endpoint} target="_blank">
                        {intg.credentials.instance_endpoint}
                      </Anchor>
                      <Text size="xs" c="dimmed">· User: {intg.credentials.user}</Text>
                      <Tooltip label="Update credentials">
                        <ActionIcon variant="subtle" size="xs" onClick={() => setCredentialsOpen(true)}>
                          <IconKey size={12} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  ) : (
                    <Alert icon={<IconAlertCircle size={14} />} color="orange" variant="light" p="xs">
                      <Group gap="xs">
                        <Text size="xs">Credentials not configured — sync is inactive.</Text>
                        <Button size="xs" variant="light" color="orange" onClick={() => setCredentialsOpen(true)}>
                          Add Credentials
                        </Button>
                      </Group>
                    </Alert>
                  )}
                </Stack>
                <Group gap="xs">
                  <Badge variant="light" color="gray">{intg.cmdb_tables.length} / 5 tables</Badge>
                  <Tooltip label="Delete integration">
                    <ActionIcon
                      variant="subtle" color="red" size="sm"
                      loading={deleteIntegration.isPending}
                      onClick={() => handleDeleteIntegration(intg.id)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>

              <Divider />

              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="sm" fw={500}>CMDB Tables</Text>
                  {intg.cmdb_tables.length < 5 && (
                    <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={() => setAddTableFor(intg.id)}>
                      Add Table
                    </Button>
                  )}
                </Group>

                {intg.cmdb_tables.length === 0 ? (
                  <Text size="sm" c="dimmed">No tables configured.</Text>
                ) : (
                  intg.cmdb_tables.map((table) => {
                    const schema = allSchemas.find(
                      (s) => s.name === table.display_name && s.integration_type === 'SERVICENOW'
                    );
                    return (
                      <Card key={table.id} withBorder padding="sm" bg="var(--mantine-color-default-hover)">
                        <Stack gap="xs">
                          <Group justify="space-between">
                            <Group gap="sm">
                              <Text fw={500}>{table.display_name}</Text>
                              <Badge variant="outline" size="sm">{table.ci_table_name}</Badge>
                              <SnStatusBadge status={table.status} />
                            </Group>
                            <Group gap={4}>
                              {schema && onViewRecords && (
                                <Tooltip label="View records">
                                  <ActionIcon variant="subtle" size="sm" onClick={() => onViewRecords(schema)}>
                                    <IconEye size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                              <Tooltip label="Test — pull sample records from ServiceNow">
                                <ActionIcon variant="subtle" size="sm" color="blue" onClick={() => setTestTable({ integrationId: intg.id, table })}>
                                  <IconFlask size={14} />
                                </ActionIcon>
                              </Tooltip>
                              {table.status === 'disabled' && (
                                <>
                                  <Tooltip label="Enable sync">
                                    <ActionIcon
                                      variant="subtle" size="sm" color="green"
                                      loading={enableTable.isPending}
                                      onClick={() => handleEnable(table)}
                                    >
                                      <IconPlayerPlay size={14} />
                                    </ActionIcon>
                                  </Tooltip>
                                  <Tooltip label="Edit table">
                                    <ActionIcon variant="subtle" size="sm" onClick={() => setEditTable({ integrationId: intg.id, table })}>
                                      <IconEdit size={14} />
                                    </ActionIcon>
                                  </Tooltip>
                                </>
                              )}
                              <Tooltip label="Delete table">
                                <ActionIcon
                                  variant="subtle" size="sm" color="red"
                                  loading={deleteTable.isPending}
                                  onClick={() => handleDeleteTable(table)}
                                >
                                  <IconTrash size={14} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Group>
                          {table.query_filter && (
                            <Text size="xs" c="dimmed">Filter: <code>{table.query_filter}</code></Text>
                          )}
                          <DataTable data={table.field_mappings} columns={mappingColumns} />
                        </Stack>
                      </Card>
                    );
                  })
                )}
              </Stack>
            </Stack>
          </Card>
        ))
      )}

      {integrations[0]?.credentials && (
        <SnTableBrowserModal
          instanceEndpoint={integrations[0].credentials.instance_endpoint}
          user={integrations[0].credentials.user}
          opened={browserOpen}
          onClose={() => setBrowserOpen(false)}
        />
      )}

      <SnSetupModal
        token={token}
        opened={setupOpen}
        onClose={() => setSetupOpen(false)}
        onCreated={(_intg, creds) => { setSetupOpen(false); setSnSessionCreds(creds); invalidate(); }}
      />

      {integrations[0] && (
        <SnCredentialsModal
          token={token}
          existing={integrations[0].credentials ?? {
            id: '', instance_endpoint: '', user: '',
            created_at: '', updated_at: '',
          }}
          opened={credentialsOpen}
          onClose={() => setCredentialsOpen(false)}
          onSaved={(creds) => { setSnSessionCreds(creds); invalidate(); }}
        />
      )}

      <SnTableFormModal
        token={token}
        integrationId={addTableFor ?? primaryIntegrationId}
        opened={!!addTableFor}
        onClose={() => setAddTableFor(null)}
        onSaved={() => { setAddTableFor(null); invalidate(); }}
        snCreds={snSessionCreds}
        snInstance={integrations[0]?.credentials
          ? { instanceEndpoint: integrations[0].credentials.instance_endpoint, user: integrations[0].credentials.user }
          : undefined}
      />
      <SnTableFormModal
        token={token}
        integrationId={editTable?.integrationId ?? primaryIntegrationId}
        opened={!!editTable}
        onClose={() => setEditTable(null)}
        onSaved={() => { setEditTable(null); invalidate(); }}
        existing={editTable?.table}
        snCreds={snSessionCreds}
        snInstance={integrations[0]?.credentials
          ? { instanceEndpoint: integrations[0].credentials.instance_endpoint, user: integrations[0].credentials.user }
          : undefined}
      />
      <SnTableTestModal
        token={token}
        integrationId={testTable?.integrationId ?? primaryIntegrationId}
        table={testTable?.table ?? null}
        onClose={() => setTestTable(null)}
      />
    </Stack>
  );
}
