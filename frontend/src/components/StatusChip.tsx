import { Chip } from '@mui/material';

interface Props { status: string; }

const COLOR_MAP: Record<string, 'success' | 'warning' | 'error'> = {
  Healthy: 'success',
  Warning: 'warning',
  Critical: 'error',
};

export default function StatusChip({ status }: Props) {
  return <Chip label={status} color={COLOR_MAP[status] ?? 'default'} size="small" />;
}
