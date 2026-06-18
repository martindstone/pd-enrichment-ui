import { Stack, Group, TextInput, SegmentedControl, ActionIcon, Button, Text } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import type { SchemaField } from '../api/types';

interface Props {
  fields: SchemaField[];
  onChange: (fields: SchemaField[]) => void;
}

export function SchemaFieldEditor({ fields, onChange }: Props) {
  const update = (i: number, patch: Partial<SchemaField>) =>
    onChange(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const remove = (i: number) => onChange(fields.filter((_, idx) => idx !== i));

  const add = () => onChange([...fields, { name: '', type: 'enriched' }]);

  const queryCount = fields.filter((f) => f.type === 'query').length;

  return (
    <Stack gap="xs">
      {fields.map((field, i) => (
        <Group key={i} gap="xs" align="flex-start">
          <TextInput
            placeholder="field_name"
            value={field.name}
            onChange={(e) => update(i, { name: e.currentTarget.value })}
            style={{ flex: 1 }}
            size="sm"
          />
          <SegmentedControl
            size="sm"
            value={field.type}
            onChange={(v) => update(i, { type: v as SchemaField['type'] })}
            disabled={field.type === 'query' && queryCount <= 1}
            data={[
              { label: 'Query', value: 'query' },
              { label: 'Enriched', value: 'enriched' },
            ]}
          />
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => remove(i)}
            title="Remove field"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ))}
      {queryCount === 0 && fields.length > 0 && (
        <Text size="xs" c="red">At least one query field is required.</Text>
      )}
      {queryCount > 3 && (
        <Text size="xs" c="red">Maximum 3 query fields allowed.</Text>
      )}
      <Button
        size="xs"
        variant="subtle"
        leftSection={<IconPlus size={14} />}
        onClick={add}
        w="fit-content"
      >
        Add field
      </Button>
    </Stack>
  );
}
