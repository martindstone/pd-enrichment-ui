import { useState, useEffect } from 'react';
import { Modal, Stack, TextInput, PasswordInput, Button, Group, Alert } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { validateSnCredentials, updateSnCredentials } from '../api/client';
import type { SnCredentials } from '../api/types';
import type { SnSessionCreds } from './SnSetupModal';

interface Props {
  token: string;
  existing: SnCredentials;
  opened: boolean;
  onClose: () => void;
  onSaved: (creds: SnSessionCreds) => void;
}

export function SnCredentialsModal({ token: _token, existing, opened, onClose, onSaved }: Props) {
  const [instanceEndpoint, setInstanceEndpoint] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [validated, setValidated] = useState(false);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (opened) {
      setInstanceEndpoint(existing.instance_endpoint);
      setUser(existing.user);
      setPassword('');
      setValidated(false);
    }
  }, [opened, existing]);

  const changed = instanceEndpoint !== existing.instance_endpoint || user !== existing.user || password.length > 0;

  const handleValidate = async () => {
    setValidating(true);
    setValidated(false);
    try {
      await validateSnCredentials(instanceEndpoint.trim(), user.trim(), password);
      setValidated(true);
    } catch (e: unknown) {
      notifications.show({ color: 'red', title: 'Connection failed', message: (e as Error).message });
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSnCredentials(_token, existing.id, {
        instance_endpoint: instanceEndpoint.trim(),
        user: user.trim(),
        password,
      });
      notifications.show({ color: 'green', message: 'Credentials updated' });
      onSaved({ instanceEndpoint: instanceEndpoint.trim(), user: user.trim(), password });
      onClose();
    } catch (e: unknown) {
      notifications.show({ color: 'red', title: 'Update failed', message: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const canValidate =
    instanceEndpoint.trim().startsWith('https://') &&
    user.trim().length > 0 &&
    password.length > 0;

  return (
    <Modal opened={opened} onClose={onClose} title="Update ServiceNow Credentials" size="md">
      <Stack gap="md">
        <TextInput
          label="Instance URL"
          required
          value={instanceEndpoint}
          onChange={(e) => { setInstanceEndpoint(e.currentTarget.value); setValidated(false); }}
          error={instanceEndpoint && !instanceEndpoint.trim().startsWith('https://') ? 'Must start with https://' : undefined}
        />
        <Group grow>
          <TextInput
            label="Username"
            required
            value={user}
            onChange={(e) => { setUser(e.currentTarget.value); setValidated(false); }}
          />
          <PasswordInput
            label="Password"
            placeholder="Enter to change"
            required
            value={password}
            onChange={(e) => { setPassword(e.currentTarget.value); setValidated(false); }}
          />
        </Group>
        {validated && (
          <Alert color="green" icon={<IconCheck size={14} />}>Connected successfully</Alert>
        )}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose} disabled={saving}>Cancel</Button>
          {!validated ? (
            <Button onClick={handleValidate} loading={validating} disabled={!canValidate || !changed}>
              Validate
            </Button>
          ) : (
            <Button onClick={handleSave} loading={saving}>
              Save Credentials
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
