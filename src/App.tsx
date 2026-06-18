import { useState } from 'react';
import { AppShell, Group, Title, ActionIcon, Tooltip, Text, Tabs } from '@mantine/core';
import { IconKey, IconDatabase, IconBrandSnowflake } from '@tabler/icons-react';
import { useToken } from './hooks/useToken';
import { TokenGate } from './components/TokenGate';
import { SchemaListPage } from './pages/SchemaListPage';
import { SchemaDetailPage } from './pages/SchemaDetailPage';
import { SnIntegrationPage } from './pages/SnIntegrationPage';
import type { EnrichmentSchema } from './api/types';

type PageView = { page: 'list' } | { page: 'detail'; schema: EnrichmentSchema };

export default function App() {
  const { token, setToken, clearToken } = useToken();
  const [tab, setTab] = useState<string>('local');
  const [localView, setLocalView] = useState<PageView>({ page: 'list' });
  const [snView, setSnView] = useState<PageView>({ page: 'list' });

  if (!token) return <TokenGate onSave={setToken} />;

  return (
    <AppShell header={{ height: 52 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="lg">
            <Title order={4} style={{ userSelect: 'none' }}>Enrichment Studio</Title>
            <Tabs
              value={tab}
              onChange={(v) => {
                setTab(v ?? 'local');
                if (v === 'local') setLocalView({ page: 'list' });
                if (v === 'servicenow') setSnView({ page: 'list' });
              }}
              variant="pills"
              styles={{ root: { '--tabs-list-border-width': '0' } }}
            >
              <Tabs.List>
                <Tabs.Tab value="local" leftSection={<IconDatabase size={14} />}>Local</Tabs.Tab>
                <Tabs.Tab value="servicenow" leftSection={<IconBrandSnowflake size={14} />}>ServiceNow</Tabs.Tab>
              </Tabs.List>
            </Tabs>
          </Group>
          <Group gap="xs">
            <Text size="xs" c="dimmed">Token saved</Text>
            <Tooltip label="Change API token">
              <ActionIcon variant="subtle" onClick={clearToken}>
                <IconKey size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        {tab === 'local' && localView.page === 'list' && (
          <SchemaListPage
            token={token}
            onSelect={(schema) => setLocalView({ page: 'detail', schema })}
          />
        )}
        {tab === 'local' && localView.page === 'detail' && (
          <SchemaDetailPage
            token={token}
            schema={localView.schema}
            onBack={() => setLocalView({ page: 'list' })}
            onSchemaUpdated={(updated) =>
              setLocalView((v) => (v.page === 'detail' ? { ...v, schema: updated } : v))
            }
          />
        )}
        {tab === 'servicenow' && snView.page === 'list' && (
          <SnIntegrationPage
            token={token}
            onViewRecords={(schema) => setSnView({ page: 'detail', schema })}
          />
        )}
        {tab === 'servicenow' && snView.page === 'detail' && (
          <SchemaDetailPage
            token={token}
            schema={snView.schema}
            onBack={() => setSnView({ page: 'list' })}
            onSchemaUpdated={(updated) =>
              setSnView((v) => (v.page === 'detail' ? { ...v, schema: updated } : v))
            }
          />
        )}
      </AppShell.Main>
    </AppShell>
  );
}
