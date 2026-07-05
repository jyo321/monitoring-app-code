import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Card, Chip, CircularProgress, MenuItem, Pagination,
  Select, Table, TableBody, TableCell, TableHead, TableRow, Typography
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getAlerts, resolveAlert } from '../api/client';

export default function AlertsPage() {
  const [resolved, setResolved] = useState<boolean | undefined>(false);
  const [severity, setSeverity] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['alerts', resolved, severity, page],
    queryFn: () => getAlerts({ resolved, severity: severity || undefined, page, pageSize: 20 })
  });

  const resolve = useMutation({
    mutationFn: resolveAlert,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] })
  });

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>Alerts</Typography>

      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <Select size="small" value={resolved === undefined ? 'all' : resolved ? 'resolved' : 'active'}
          onChange={e => { setResolved(e.target.value === 'all' ? undefined : e.target.value === 'resolved'); setPage(1); }}>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="resolved">Resolved</MenuItem>
          <MenuItem value="all">All</MenuItem>
        </Select>
        <Select size="small" value={severity} onChange={e => { setSeverity(e.target.value); setPage(1); }} displayEmpty sx={{ minWidth: 140 }}>
          <MenuItem value="">All Severities</MenuItem>
          <MenuItem value="Warning">Warning</MenuItem>
          <MenuItem value="Critical">Critical</MenuItem>
        </Select>
      </Box>

      <Card elevation={2}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                <TableCell><b>Severity</b></TableCell>
                <TableCell><b>Server</b></TableCell>
                <TableCell><b>Mount Point</b></TableCell>
                <TableCell><b>Usage %</b></TableCell>
                <TableCell><b>Message</b></TableCell>
                <TableCell><b>Created</b></TableCell>
                <TableCell><b>Status</b></TableCell>
                <TableCell><b>Action</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.items.map(a => (
                <TableRow key={a.id}>
                  <TableCell><Chip label={a.severity} color={a.severity === 'Critical' ? 'error' : 'warning'} size="small" /></TableCell>
                  <TableCell>
                    <Typography fontWeight={600}>{a.hostname}</Typography>
                    <Typography variant="caption" color="text.secondary">{a.ipAddress}</Typography>
                  </TableCell>
                  <TableCell>{a.mountPoint}</TableCell>
                  <TableCell>{a.usagePercent.toFixed(1)}%</TableCell>
                  <TableCell>{a.message}</TableCell>
                  <TableCell><Typography variant="caption">{new Date(a.createdAt).toLocaleString()}</Typography></TableCell>
                  <TableCell><Chip label={a.isResolved ? 'Resolved' : 'Active'} color={a.isResolved ? 'default' : 'error'} size="small" /></TableCell>
                  <TableCell>
                    {!a.isResolved && (
                      <Button size="small" startIcon={<CheckCircleIcon />} onClick={() => resolve.mutate(a.id)} disabled={resolve.isPending}>
                        Resolve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {data?.items.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center"><Typography color="text.secondary" py={2}>No alerts found</Typography></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {data && data.totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={2}>
          <Pagination count={data.totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" />
        </Box>
      )}
    </Box>
  );
}
