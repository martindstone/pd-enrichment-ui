import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table';
import { Table, Skeleton, Text, ScrollArea } from '@mantine/core';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    nowrap?: boolean;
    width?: number | string;
    align?: 'left' | 'center' | 'right';
  }
}

interface Props<T> {
  data: T[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
  loading?: boolean;
  skeletonRows?: number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  scrollable?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  loading,
  skeletonRows = 5,
  emptyMessage = 'No data',
  onRowClick,
  scrollable,
}: Props<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const tableEl = (
    <Table striped withTableBorder highlightOnHover={!!onRowClick}>
      <Table.Thead>
        {table.getHeaderGroups().map((hg) => (
          <Table.Tr key={hg.id}>
            {hg.headers.map((h) => (
              <Table.Th
                key={h.id}
                style={{
                  width: h.column.columnDef.meta?.width,
                  textAlign: h.column.columnDef.meta?.align,
                  whiteSpace: h.column.columnDef.meta?.nowrap ? 'nowrap' : undefined,
                }}
              >
                {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
              </Table.Th>
            ))}
          </Table.Tr>
        ))}
      </Table.Thead>
      <Table.Tbody>
        {loading ? (
          Array.from({ length: skeletonRows }).map((_, i) => (
            <Table.Tr key={i}>
              {columns.map((_, j) => (
                <Table.Td key={j}><Skeleton height={16} /></Table.Td>
              ))}
            </Table.Tr>
          ))
        ) : table.getRowModel().rows.length === 0 ? (
          <Table.Tr>
            <Table.Td colSpan={columns.length}>
              <Text ta="center" c="dimmed" py="md">{emptyMessage}</Text>
            </Table.Td>
          </Table.Tr>
        ) : (
          table.getRowModel().rows.map((row) => (
            <Table.Tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
            >
              {row.getVisibleCells().map((cell) => (
                <Table.Td
                  key={cell.id}
                  style={{
                    textAlign: cell.column.columnDef.meta?.align,
                    whiteSpace: cell.column.columnDef.meta?.nowrap ? 'nowrap' : undefined,
                    overflow: 'hidden',
                    maxWidth: cell.column.columnDef.meta?.width,
                    textOverflow: 'ellipsis',
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Table.Td>
              ))}
            </Table.Tr>
          ))
        )}
      </Table.Tbody>
    </Table>
  );

  return scrollable ? <ScrollArea>{tableEl}</ScrollArea> : tableEl;
}
