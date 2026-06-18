import { Badge } from '@mantine/core';

const COLORS: Record<string, string> = {
  active: 'green',
  syncing: 'yellow',
  disabled: 'red',
};

interface Props {
  status: string;
}

export function SnStatusBadge({ status }: Props) {
  return (
    <Badge color={COLORS[status.toLowerCase()] ?? 'gray'} variant="light" size="sm">
      {status}
    </Badge>
  );
}
