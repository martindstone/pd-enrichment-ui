import { useState } from 'react';
import {
  Center, Stack, Title, Text, Button, Paper, PasswordInput,
} from '@mantine/core';
import { IconKey } from '@tabler/icons-react';

interface Props {
  onSave: (token: string) => void;
}

export function TokenGate({ onSave }: Props) {
  const [value, setValue] = useState('');

  return (
    <Center h="100vh">
      <Paper shadow="md" p="xl" w={420} withBorder>
        <Stack gap="md">
          <Stack gap={4}>
            <Title order={2}>Enrichment Studio</Title>
            <Text c="dimmed" size="sm">Enter your PagerDuty API token to continue.</Text>
          </Stack>
          <PasswordInput
            label="API Token"
            placeholder="u+xxxxxxxxxxxx"
            leftSection={<IconKey size={16} />}
            value={value}
            onChange={(e) => setValue(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && value && onSave(value)}
          />
          <Text size="xs" c="dimmed">
            Saved to localStorage. Use a read/write token from your PagerDuty account.
          </Text>
          <Button fullWidth disabled={!value} onClick={() => onSave(value)}>
            Save & Continue
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}
