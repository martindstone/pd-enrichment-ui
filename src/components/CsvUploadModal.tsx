import { useState, useRef } from 'react';
import {
  Modal, Stack, Text, Button, Group, Box, Code, Alert,
} from '@mantine/core';
import { IconUpload, IconInfoCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { uploadRecordsCsv } from '../api/client';
import type { EnrichmentSchema } from '../api/types';

interface Props {
  token: string;
  schema: EnrichmentSchema;
  opened: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

export function CsvUploadModal({ token, schema, opened, onClose, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const queryField = schema.fields.find((f) => f.type === 'query')?.name ?? '';
  const enrichedFields = schema.fields.filter((f) => f.type === 'enriched').map((f) => f.name);
  const exampleHeader = [queryField, ...enrichedFields].join(',');

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setCsvText((e.target?.result as string) ?? '');
    reader.readAsText(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    setLoading(true);
    try {
      const result = await uploadRecordsCsv(token, schema.id, csvText);
      notifications.show({
        color: 'green',
        title: 'Upload accepted',
        message: `${result.size_bytes} bytes — records will appear shortly`,
      });
      setFile(null);
      setCsvText('');
      onUploaded();
      onClose();
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Upload failed', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setCsvText('');
    onClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title={`Upload CSV — ${schema.name}`} size="lg">
      <Stack gap="md">
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          <Text size="sm">CSV must have a header row. Column names must match schema field names.</Text>
          <Text size="xs" mt={4} c="dimmed">Expected header: <Code>{exampleHeader}</Code></Text>
        </Alert>

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
            background: file ? theme.colors.green[0] : undefined,
          })}
        >
          <IconUpload size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          {file ? (
            <Text fw={500}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</Text>
          ) : (
            <Text c="dimmed">Drop a CSV file here, or click to browse</Text>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </Box>

        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button
            leftSection={<IconUpload size={16} />}
            onClick={handleUpload}
            loading={loading}
            disabled={!file}
          >
            Upload
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
