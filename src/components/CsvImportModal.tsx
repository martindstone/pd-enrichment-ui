import { useState, useRef } from 'react';
import {
  Modal, Stack, TextInput, Textarea, Button, Group, Text, Box,
  Alert, SegmentedControl, ScrollArea,
} from '@mantine/core';
import { IconUpload, IconInfoCircle, IconArrowLeft } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { createSchema, uploadRecordsCsv } from '../api/client';
import type { EnrichmentSchema, SchemaField } from '../api/types';

interface Props {
  token: string;
  opened: boolean;
  onClose: () => void;
  onCreated: (schema: EnrichmentSchema) => void;
}

function parseHeaders(text: string): string[] {
  const firstLine = text.split(/\r?\n/)[0] ?? '';
  const headers: string[] = [];
  let inQuotes = false;
  let current = '';
  for (const char of firstLine) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) { headers.push(current.trim()); current = ''; }
    else current += char;
  }
  if (current) headers.push(current.trim());
  return headers.filter(Boolean);
}

export function CsvImportModal({ token, opened: _opened, onClose, onCreated }: Props) {
  const [step, setStep] = useState<'upload' | 'configure'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState('');
  const [fields, setFields] = useState<SchemaField[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setCsvText('');
    setFields([]);
    setName('');
    setDescription('');
    setLoading(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? '';
      const headers = parseHeaders(text);
      if (headers.length === 0) {
        notifications.show({ color: 'red', message: 'No headers found in CSV' });
        return;
      }
      setFile(f);
      setCsvText(text);
      // First column defaults to query, rest to enriched
      setFields(headers.map((h, i) => ({ name: h, type: i === 0 ? 'query' : 'enriched' }) as SchemaField));
      setName(f.name.replace(/\.csv$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_'));
      setStep('configure');
    };
    reader.readAsText(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const toggleType = (i: number, type: SchemaField['type']) =>
    setFields(fields.map((f, idx) => idx === i ? { ...f, type } : f));

  const queryCount = fields.filter((f) => f.type === 'query').length;
  const hasEnriched = fields.some((f) => f.type === 'enriched');

  const valid =
    name.trim().length > 0 &&
    name.trim().length <= 50 &&
    queryCount >= 1 && queryCount <= 3 &&
    hasEnriched;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const schema = await createSchema(token, {
        name: name.trim(),
        integration_type: 'CSV',
        description: description.trim() || undefined,
        fields,
      });
      await uploadRecordsCsv(token, schema.id, csvText);
      notifications.show({
        color: 'green',
        title: 'Schema created',
        message: `${schema.name} — records will appear shortly`,
      });
      reset();
      onCreated(schema);
    } catch (e: unknown) {
      notifications.show({ color: 'red', title: 'Error', message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={_opened} onClose={handleClose} title="Import from CSV" size="lg">
      {step === 'upload' ? (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Drop a CSV file to detect fields from its headers. You'll configure which fields are used to match events before creating the schema.
          </Text>
          <Box
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            style={(theme) => ({
              border: `2px dashed ${theme.colors.gray[4]}`,
              borderRadius: theme.radius.md,
              padding: theme.spacing.xl,
              textAlign: 'center',
              cursor: 'pointer',
            })}
          >
            <IconUpload size={32} style={{ opacity: 0.4, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
            <Text c="dimmed">Drop a CSV file here, or click to browse</Text>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </Box>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={handleClose}>Cancel</Button>
          </Group>
        </Stack>
      ) : (
        <Stack gap="md">
          <Group gap="xs" align="center">
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconArrowLeft size={12} />}
              onClick={() => setStep('upload')}
            >
              Change file
            </Button>
            <Text size="sm" c="dimmed">{file?.name}</Text>
          </Group>

          <TextInput
            label="Schema Name"
            description="Max 50 characters, used as the enrichment identifier"
            required
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            error={name.trim().length > 50 ? 'Max 50 characters' : undefined}
          />
          <Textarea
            label="Description"
            placeholder="Optional"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            rows={2}
          />

          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw={500}>Fields ({fields.length} detected)</Text>
              <Text size="xs" c="dimmed">Mark 1–3 as Query to match incoming events</Text>
            </Group>
            <Alert icon={<IconInfoCircle size={14} />} color="blue" variant="light" p="xs">
              <Text size="xs">Field definitions are permanent — they cannot be changed after the schema is created.</Text>
            </Alert>
            <ScrollArea.Autosize mah={220}>
              <Stack gap={6}>
                {fields.map((field, i) => (
                  <Group key={i} justify="space-between" px="xs" py={2}>
                    <Text size="sm" ff="monospace">{field.name}</Text>
                    <SegmentedControl
                      size="xs"
                      value={field.type}
                      onChange={(v) => toggleType(i, v as SchemaField['type'])}
                      disabled={field.type === 'query' && queryCount <= 1}
                      data={[
                        { label: 'Query', value: 'query' },
                        { label: 'Enriched', value: 'enriched' },
                      ]}
                    />
                  </Group>
                ))}
              </Stack>
            </ScrollArea.Autosize>
            {queryCount > 3 && <Text size="xs" c="red">Maximum 3 query fields allowed.</Text>}
            {!hasEnriched && fields.length > 0 && <Text size="xs" c="red">At least one enriched field is required.</Text>}
          </Stack>

          <Group justify="flex-end">
            <Button variant="subtle" onClick={handleClose} disabled={loading}>Cancel</Button>
            <Button
              leftSection={<IconUpload size={16} />}
              onClick={handleSubmit}
              loading={loading}
              disabled={!valid}
            >
              Create & Upload
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
