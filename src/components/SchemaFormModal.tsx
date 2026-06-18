import { useState, useEffect } from 'react';
import {
  Modal, Stack, TextInput, Textarea, Button, Group, Text, Badge, Alert,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { SchemaFieldEditor } from './SchemaFieldEditor';
import { createSchema, updateSchema } from '../api/client';
import type { EnrichmentSchema, SchemaField } from '../api/types';

interface Props {
  token: string;
  opened: boolean;
  onClose: () => void;
  onSaved: (schema: EnrichmentSchema) => void;
  existing?: EnrichmentSchema;
}

export function SchemaFormModal({ token, opened, onClose, onSaved, existing }: Props) {
  const isEdit = !!existing;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<SchemaField[]>([
    { name: '', type: 'query' },
    { name: '', type: 'enriched' },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (opened) {
      setName(existing?.name ?? '');
      setDescription(existing?.description ?? '');
      if (!isEdit) {
        setFields([{ name: '', type: 'query' }, { name: '', type: 'enriched' }]);
      }
    }
  }, [opened, existing, isEdit]);

  const queryCount = fields.filter((f) => f.type === 'query').length;

  const createValid =
    name.trim().length > 0 &&
    name.trim().length <= 50 &&
    fields.every((f) => f.name.trim().length > 0) &&
    queryCount >= 1 && queryCount <= 3 &&
    fields.some((f) => f.type === 'enriched');

  const editValid = name.trim().length > 0 && name.trim().length <= 50;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let saved: EnrichmentSchema;
      if (isEdit) {
        saved = await updateSchema(token, existing.id, {
          name: name.trim(),
          description: description.trim() || undefined,
        });
      } else {
        saved = await createSchema(token, {
          name: name.trim(),
          integration_type: 'CSV',
          description: description.trim() || undefined,
          fields,
        });
      }
      notifications.show({
        color: 'green',
        title: isEdit ? 'Schema updated' : 'Schema created',
        message: saved.name,
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
      title={isEdit ? `Edit Schema — ${existing?.name}` : 'New Schema'}
      size="lg"
    >
      <Stack gap="md">
        <TextInput
          label="Name"
          placeholder="my_schema"
          description="Max 50 characters"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          error={name.trim().length > 50 ? 'Max 50 characters' : undefined}
        />
        <Textarea
          label="Description"
          placeholder="Optional description"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          rows={2}
        />

        {isEdit ? (
          <Stack gap={4}>
            <Text size="sm" fw={500}>Fields <Text span c="dimmed" size="xs">(read-only — cannot be changed after creation)</Text></Text>
            <Group gap="xs" wrap="wrap">
              {existing?.fields.map((f) => (
                <Badge
                  key={f.name}
                  variant="light"
                  color={f.type === 'query' ? 'orange' : 'blue'}
                  size="sm"
                >
                  {f.name}{f.type === 'query' ? ' *' : ''}
                </Badge>
              ))}
            </Group>
          </Stack>
        ) : (
          <Stack gap={4}>
            <Text size="sm" fw={500}>Fields</Text>
            <Alert icon={<IconInfoCircle size={14} />} color="blue" variant="light" p="xs">
              <Text size="xs">Field definitions are permanent — they cannot be changed after the schema is created. Use 1–3 query fields to match incoming events.</Text>
            </Alert>
            <SchemaFieldEditor fields={fields} onChange={setFields} />
          </Stack>
        )}

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            loading={loading}
            disabled={isEdit ? !editValid : !createValid}
          >
            {isEdit ? 'Save Changes' : 'Create Schema'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
