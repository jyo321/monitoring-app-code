import { Box, LinearProgress, Typography } from '@mui/material';

interface Props { value: number; }

export default function UsageBar({ value }: Props) {
  const color = value >= 90 ? 'error' : value >= 80 ? 'warning' : 'success';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <LinearProgress
        variant="determinate"
        value={Math.min(value, 100)}
        color={color}
        sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
      />
      <Typography variant="body2" sx={{ minWidth: 42 }}>{value.toFixed(1)}%</Typography>
    </Box>
  );
}
