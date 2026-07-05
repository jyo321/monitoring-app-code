import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, MenuItem, Select,
  Table, TableBody, TableCell, TableHead, TableRow, Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getServer, getServerHistory } from '../api/client';
import StatusChip from '../components/StatusChip';
import UsageBar from '../components/UsageBar';

export default function ServerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mountPoint, setMountPoint] = useState('/');
  const [range, setRange] = useState('24h');

  const { data: server, isLoading } = useQuery({
    queryKey: ['server', id],
    queryFn: () => getServer(Number(id))
  });

  const { data: history } = useQuery({
    queryKey: ['history', id, mountPoint, range],
    queryFn: () => getServerHistory(Number(id), mountPoint, range),
    enabled: !!id
  });

  if (isLoading) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;
  if (!server) return null;

  const mountPoints = [...new Set(server.latestDisks.map(d => d.mountPoint))];

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/servers')} sx={{ mb: 2 }}>Back</Button>

      <Box display="flex" alignItems="center" gap={2} mb={3} flexWrap="wrap">
        <Typography variant="h5" fontWeight={700}>{server.hostname}</Typography>
        <StatusChip status={server.healthStatus} />
        <Typography color="text.secondary">{server.ipAddress}</Typography>
        <Typography variant="caption" color="text.secondary">Last seen: {new Date(server.lastSeen).toLocaleString()}</Typography>
      </Box>

      {/* Disk Usage Table */}
      <Typography variant="h6" fontWeight={600} mb={1}>Current Disk Usage</Typography>
      <Card elevation={2} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f1f5f9' }}>
              <TableCell><b>Mount</b></TableCell>
              <TableCell><b>Filesystem</b></TableCell>
              <TableCell><b>Type</b></TableCell>
              <TableCell><b>Total</b></TableCell>
              <TableCell><b>Used</b></TableCell>
              <TableCell><b>Available</b></TableCell>
              <TableCell sx={{ minWidth: 160 }}><b>Usage</b></TableCell>
              <TableCell><b>Collected At</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {server.latestDisks.map(d => (
              <TableRow key={d.id}>
                <TableCell><Typography fontWeight={600}>{d.mountPoint}</Typography></TableCell>
                <TableCell>{d.fileSystem}</TableCell>
                <TableCell>{d.fileSystemType}</TableCell>
                <TableCell>{d.totalSize}</TableCell>
                <TableCell>{d.usedSize}</TableCell>
                <TableCell>{d.availableSize}</TableCell>
                <TableCell><UsageBar value={d.usagePercent} /></TableCell>
                <TableCell><Typography variant="caption">{new Date(d.collectedAt).toLocaleString()}</Typography></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Historical Chart */}
      <Box display="flex" alignItems="center" gap={2} mb={1} flexWrap="wrap">
        <Typography variant="h6" fontWeight={600}>Historical Trend</Typography>
        <Select size="small" value={mountPoint} onChange={e => setMountPoint(e.target.value)}>
          {mountPoints.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
        </Select>
        <Select size="small" value={range} onChange={e => setRange(e.target.value)}>
          <MenuItem value="24h">Last 24 hours</MenuItem>
          <MenuItem value="7d">Last 7 days</MenuItem>
          <MenuItem value="30d">Last 30 days</MenuItem>
        </Select>
      </Box>
      <Card elevation={2} sx={{ mb: 3, p: 2 }}>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={history?.map(h => ({ time: new Date(h.collectedAt).toLocaleString(), usage: h.usagePercent }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
            <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Usage']} />
            <Line type="monotone" dataKey="usage" stroke="#1e40af" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Alert History */}
      <Typography variant="h6" fontWeight={600} mb={1}>Alert History</Typography>
      <Card elevation={2}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f1f5f9' }}>
              <TableCell><b>Severity</b></TableCell>
              <TableCell><b>Mount Point</b></TableCell>
              <TableCell><b>Usage %</b></TableCell>
              <TableCell><b>Message</b></TableCell>
              <TableCell><b>Created</b></TableCell>
              <TableCell><b>Status</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {server.recentAlerts.map(a => (
              <TableRow key={a.id}>
                <TableCell><Chip label={a.severity} color={a.severity === 'Critical' ? 'error' : 'warning'} size="small" /></TableCell>
                <TableCell>{a.mountPoint}</TableCell>
                <TableCell>{a.usagePercent.toFixed(1)}%</TableCell>
                <TableCell>{a.message}</TableCell>
                <TableCell><Typography variant="caption">{new Date(a.createdAt).toLocaleString()}</Typography></TableCell>
                <TableCell><Chip label={a.isResolved ? 'Resolved' : 'Active'} color={a.isResolved ? 'default' : 'error'} size="small" /></TableCell>
              </TableRow>
            ))}
            {server.recentAlerts.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center"><Typography color="text.secondary" py={1}>No alerts</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </Box>
  );
}
