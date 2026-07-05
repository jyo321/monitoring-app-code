import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, CircularProgress, InputAdornment, MenuItem, Pagination,
  Select, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { getServers } from '../api/client';
import StatusChip from '../components/StatusChip';
import UsageBar from '../components/UsageBar';

export default function ServersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['servers', search, status, page],
    queryFn: () => getServers({ search: search || undefined, status: status || undefined, page, pageSize: 15 })
  });

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>Servers</Typography>

      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <TextField
          size="small" placeholder="Search hostname or IP..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 260 }}
        />
        <Select size="small" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} displayEmpty sx={{ minWidth: 140 }}>
          <MenuItem value="">All Statuses</MenuItem>
          <MenuItem value="Healthy">Healthy</MenuItem>
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
                <TableCell><b>Hostname</b></TableCell>
                <TableCell><b>IP Address</b></TableCell>
                <TableCell><b>Environment</b></TableCell>
                <TableCell><b>Status</b></TableCell>
                <TableCell><b>Max Disk Usage</b></TableCell>
                <TableCell><b>Last Seen</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.items.map(s => (
                <TableRow key={s.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/servers/${s.id}`)}>
                  <TableCell><Typography fontWeight={600}>{s.hostname}</Typography></TableCell>
                  <TableCell>{s.ipAddress}</TableCell>
                  <TableCell>{s.environment}</TableCell>
                  <TableCell><StatusChip status={s.healthStatus} /></TableCell>
                  <TableCell sx={{ minWidth: 180 }}><UsageBar value={s.maxUsagePercent} /></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{new Date(s.lastSeen).toLocaleString()}</Typography></TableCell>
                </TableRow>
              ))}
              {data?.items.length === 0 && (
                <TableRow><TableCell colSpan={6} align="center"><Typography color="text.secondary" py={2}>No servers found</Typography></TableCell></TableRow>
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
