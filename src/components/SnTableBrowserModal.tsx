import { useState, useEffect, useMemo } from 'react';
import {
  Modal, Stack, TextInput, PasswordInput, Button, Group, Text,
  Badge, Grid, ScrollArea, UnstyledButton, ActionIcon, Tooltip,
  Loader, Code, Alert,
} from '@mantine/core';
import { IconSearch, IconCopy, IconInfoCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { createColumnHelper } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { validateSnCredentials, fetchSnTableList, fetchSnFieldList } from '../api/client';
import type { SnTableInfo, SnFieldInfo } from '../api/client';

interface Props {
  instanceEndpoint: string;
  user: string;
  opened: boolean;
  onClose: () => void;
}

const fieldCol = createColumnHelper<SnFieldInfo>();

const TYPE_COLORS: Record<string, string> = {
  reference: 'violet',
  string: 'blue',
  integer: 'cyan',
  decimal: 'cyan',
  boolean: 'green',
  glide_date_time: 'orange',
  glide_date: 'orange',
};

export function SnTableBrowserModal({ instanceEndpoint, user, opened, onClose }: Props) {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [tableSearch, setTableSearch] = useState('');
  const [tables, setTables] = useState<SnTableInfo[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [fields, setFields] = useState<SnFieldInfo[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [fieldSearch, setFieldSearch] = useState('');

  useEffect(() => {
    if (!opened) {
      setPassword('');
      setAuthed(false);
      setTableSearch('');
      setTables([]);
      setSelectedTable(null);
      setFields([]);
      setFieldSearch('');
    }
  }, [opened]);

  // Debounced table search
  useEffect(() => {
    if (!authed) return;
    const timer = setTimeout(() => loadTables(tableSearch), 400);
    return () => clearTimeout(timer);
  }, [tableSearch, authed]);

  const loadTables = async (search: string) => {
    setLoadingTables(true);
    try {
      setTables(await fetchSnTableList(instanceEndpoint, user, password, search || undefined));
    } catch (e: unknown) {
      notifications.show({ color: 'red', message: (e as Error).message });
    } finally {
      setLoadingTables(false);
    }
  };

  const loadFields = async (tableName: string) => {
    setSelectedTable(tableName);
    setFields([]);
    setFieldSearch('');
    setLoadingFields(true);
    try {
      setFields(await fetchSnFieldList(instanceEndpoint, user, password, tableName));
    } catch (e: unknown) {
      notifications.show({ color: 'red', message: (e as Error).message });
    } finally {
      setLoadingFields(false);
    }
  };

  const connect = async () => {
    setConnecting(true);
    try {
      await validateSnCredentials(instanceEndpoint, user, password);
      setAuthed(true);
    } catch (e: unknown) {
      notifications.show({ color: 'red', title: 'Connection failed', message: (e as Error).message });
    } finally {
      setConnecting(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    notifications.show({ color: 'green', message: `Copied: ${text}`, autoClose: 1200 });
  };

  const filteredFields = useMemo(() =>
    fieldSearch
      ? fields.filter((f) =>
          f.element.includes(fieldSearch.toLowerCase()) ||
          f.column_label.toLowerCase().includes(fieldSearch.toLowerCase())
        )
      : fields,
    [fields, fieldSearch]
  );

  const columns = useMemo(() => [
    fieldCol.accessor('element', {
      header: 'Field Name',
      cell: (info) => (
        <Group gap={4} wrap="nowrap">
          <Code style={{ fontSize: 11 }}>{info.getValue()}</Code>
          <Tooltip label="Copy">
            <ActionIcon variant="subtle" size="xs" onClick={() => copy(info.getValue())}>
              <IconCopy size={11} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    }),
    fieldCol.accessor('column_label', { header: 'Label' }),
    fieldCol.accessor('type_display', {
      header: 'Type',
      meta: { width: 110 },
      cell: (info) => (
        <Badge size="xs" variant="light"
          color={TYPE_COLORS[info.row.original.type_value] ?? 'gray'}>
          {info.getValue()}
        </Badge>
      ),
    }),
    fieldCol.accessor('reference_table', {
      header: 'References',
      meta: { width: 170 },
      cell: (info) => {
        const table = info.getValue();
        if (!table) return null;
        return (
          <Tooltip label={`Browse ${table}`}>
            <Text
              size="xs" c="dimmed" ff="monospace"
              style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
              onClick={() => { setTableSearch(table); loadFields(table); }}
            >
              {table}
            </Text>
          </Tooltip>
        );
      },
    }),
  ], [fields]);

  const selectedTableInfo = tables.find((t) => t.name === selectedTable);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Browse ServiceNow Tables"
      size="90%"
      styles={{ body: { padding: 0 } }}
    >
      {!authed ? (
        <Stack gap="md" p="md">
          <Text size="sm" c="dimmed">
            Enter your ServiceNow password to browse <strong>{instanceEndpoint}</strong> as <strong>{user}</strong>.
          </Text>
          <PasswordInput
            label="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && password && connect()}
            autoFocus
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>Cancel</Button>
            <Button onClick={connect} loading={connecting} disabled={!password}>Connect</Button>
          </Group>
        </Stack>
      ) : (
        <Grid gap={0} style={{ height: 560 }}>
          {/* Table list */}
          <Grid.Col span={4} style={{ borderRight: '1px solid var(--mantine-color-default-border)' }}>
            <Stack gap={0} h="100%">
              <Stack gap="xs" p="sm" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                <TextInput
                  placeholder="Search tables…"
                  leftSection={<IconSearch size={14} />}
                  rightSection={loadingTables ? <Loader size="xs" /> : undefined}
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.currentTarget.value)}
                  size="sm"
                />
                <Text size="xs" c="dimmed">
                  {tableSearch ? `${tables.length} results` : `${tables.length} CMDB tables — search to find others`}
                </Text>
              </Stack>
              <ScrollArea style={{ flex: 1 }}>
                <Stack gap={0}>
                  {tables.map((t) => (
                    <UnstyledButton
                      key={t.name}
                      onClick={() => loadFields(t.name)}
                      p="xs"
                      style={(theme) => ({
                        borderLeft: selectedTable === t.name
                          ? `3px solid ${theme.colors.blue[5]}`
                          : '3px solid transparent',
                        background: selectedTable === t.name
                          ? theme.colors.blue[0]
                          : undefined,
                      })}
                    >
                      <Text size="sm" ff="monospace" fw={selectedTable === t.name ? 600 : undefined}>
                        {t.name}
                      </Text>
                      {t.label && t.label !== t.name && (
                        <Text size="xs" c="dimmed">{t.label}</Text>
                      )}
                    </UnstyledButton>
                  ))}
                  {!loadingTables && tables.length === 0 && (
                    <Text size="sm" c="dimmed" ta="center" py="xl">No tables found</Text>
                  )}
                </Stack>
              </ScrollArea>
            </Stack>
          </Grid.Col>

          {/* Field list */}
          <Grid.Col span={8}>
            {!selectedTable ? (
              <Stack align="center" justify="center" h="100%" gap="xs">
                <Text c="dimmed">Select a table to explore its fields</Text>
                <Text size="xs" c="dimmed">Reference fields show their target table — click to navigate for dot-walk paths</Text>
              </Stack>
            ) : (
              <Stack gap={0} h="100%">
                <Group justify="space-between" p="sm"
                  style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                  <Stack gap={2}>
                    <Group gap="xs">
                      <Text size="sm" fw={600} ff="monospace">{selectedTable}</Text>
                      {selectedTableInfo?.label && selectedTableInfo.label !== selectedTable && (
                        <Text size="sm" c="dimmed">— {selectedTableInfo.label}</Text>
                      )}
                      {!loadingFields && (
                        <Badge size="xs" variant="light">{filteredFields.length} fields</Badge>
                      )}
                    </Group>
                  </Stack>
                  <TextInput
                    placeholder="Filter fields…"
                    size="xs"
                    leftSection={<IconSearch size={12} />}
                    value={fieldSearch}
                    onChange={(e) => setFieldSearch(e.currentTarget.value)}
                    style={{ width: 180 }}
                  />
                </Group>
                {fields.some((f) => f.type_value === 'reference') && !fieldSearch && (
                  <Alert icon={<IconInfoCircle size={13} />} color="blue" variant="light" radius={0} p="xs">
                    <Text size="xs">Reference fields can be dot-walked in mappings — e.g. <Code>location.city</Code>. Click a reference table name to explore its fields.</Text>
                  </Alert>
                )}
                <ScrollArea style={{ flex: 1 }}>
                  <DataTable
                    data={filteredFields}
                    columns={columns}
                    loading={loadingFields}
                    emptyMessage="No fields"
                  />
                </ScrollArea>
              </Stack>
            )}
          </Grid.Col>
        </Grid>
      )}
    </Modal>
  );
}
