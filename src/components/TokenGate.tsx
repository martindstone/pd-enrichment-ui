import { useState } from 'react';
import {
  Center, Stack, Title, Text, Button, Paper, PasswordInput, Alert,
} from '@mantine/core';
import { IconKey, IconAlertCircle } from '@tabler/icons-react';
import { checkToken } from '../api/client';

interface Props {
  onSave: (token: string) => void;
  initialError?: string;
}

export function TokenGate({ onSave, initialError }: Props) {
  const [value, setValue] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState(initialError ?? '');

  const handleSave = async () => {
    setError('');
    setValidating(true);
    try {
      await checkToken(value);
      onSave(value);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setValidating(false);
    }
  };

  return (
    <Center h="100vh">
      <Paper shadow="md" p="xl" w={420} withBorder>
        <Stack gap="md">
          <Stack gap={4}>
            <Title order={2}>Enrichment Studio</Title>
            <Text c="dimmed" size="sm">Enter your PagerDuty API token to continue.</Text>
          </Stack>
          {error && (
            <Alert icon={<IconAlertCircle size={14} />} color="red" variant="light">
              {error}
            </Alert>
          )}
          <PasswordInput
            label="API Token"
            placeholder="u+xxxxxxxxxxxx"
            leftSection={<IconKey size={16} />}
            value={value}
            onChange={(e) => { setValue(e.currentTarget.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && value && !validating && handleSave()}
            error={!!error}
          />
          <Text size="xs" c="dimmed">
            Saved to localStorage. Use a read/write token from your PagerDuty account.
          </Text>
          <Button fullWidth disabled={!value} loading={validating} onClick={handleSave}>
            Save & Continue
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}
