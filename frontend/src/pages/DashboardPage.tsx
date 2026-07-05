import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Accordion, AccordionDetails, AccordionSummary,
  Box, Card, CardContent, CircularProgress, Grid,
  Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getDashboard, getServer, getServers } from '../api/client';
import type { ServerDto } from '../types';

const STATUS_STYLE = {
  Critical: { bg: '#fdf2f2', text: '#7f1d1d', dot: '#c0392b', badge: '🔴 CRITICAL', headerBg: '#f5c6c6' },
  Warning:  { bg: '#fdf8ef', text: '#7c4700', dot: '#c07800', badge: '🟡 WARNING',  headerBg: '#f5dfa0' },
  Healthy:  { bg: '#f2faf5', text: '#1a5c38', dot: '#2e7d52', badge: '🟢 OK',       headerBg: '#a8d5b8' },
};

type FilterKey = 'totalServers' | 'healthyServers' | 'warningServers' | 'criticalServers' | 'activeAlerts';

const STAT_CARDS: { key: FilterKey; label: string; icon: string; grad: string }[] = [
  { key: 'totalServers',    label: 'Total Servers', icon: '🖥️',  grad: 'linear-gradient(135deg, #4a6fa5 0%, #6b8cbe 100%)' },
  { key: 'healthyServers',  label: 'Healthy',        icon: '✅',  grad: 'linear-gradient(135deg, #2e7d52 0%, #4a9e6e 100%)' },
  { key: 'warningServers',  label: 'Warning',        icon: '⚠️',  grad: 'linear-gradient(135deg, #b97a00 0%, #d4960a 100%)' },
  { key: 'criticalServers', label: 'Critical',       icon: '🔴',  grad: 'linear-gradient(135deg, #9b1c1c 0%, #b91c1c 100%)' },
  { key: 'activeAlerts',    label: 'Active Alerts',  icon: '🚨',  grad: 'linear-gradient(135deg, #6b3fa0 0%, #8a5bbf 100%)' },
];

function filterServers(servers: ServerDto[], activeFilter: FilterKey | null): ServerDto[] {
  if (!activeFilter || activeFilter === 'totalServers') return servers;
  if (activeFilter === 'healthyServers')  return servers.filter(s => s.healthStatus === 'Healthy');
  if (activeFilter === 'warningServers')  return servers.filter(s => s.healthStatus === 'Warning');
  if (activeFilter === 'criticalServers') return servers.filter(s => s.healthStatus === 'Critical');
  if (activeFilter === 'activeAlerts')    return servers.filter(s => s.healthStatus === 'Warning' || s.healthStatus === 'Critical');
  return servers;
}

function filterLabel(key: FilterKey | null): string {
  if (!key || key === 'totalServers')   return 'All Servers';
  if (key === 'healthyServers')  return 'Healthy Servers';
  if (key === 'warningServers')  return 'Warning Servers';
  if (key === 'criticalServers') return 'Critical Servers';
  if (key === 'activeAlerts')    return 'Servers with Active Alerts';
  return 'Servers';
}

function rowSx(pct: number) {
  if (pct >= 90) return { bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700, fontSize: 15 };
  if (pct >= 80) return { bgcolor: '#ffedd5', color: '#9a3412', fontWeight: 700, fontSize: 15 };
  return { bgcolor: '#dcfce7', color: '#166534', fontWeight: 600, fontSize: 15 };
}

function rowStatus(pct: number) {
  if (pct >= 90) return '🔴 CRITICAL';
  if (pct >= 80) return '🟡 WARNING';
  return '🟢 OK';
}

function ServerAccordion({ server }: { server: ServerDto }) {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['server', server.id],
    queryFn: () => getServer(server.id),
    enabled: expanded,
    staleTime: 30_000,
  });

  const st = STATUS_STYLE[server.healthStatus] ?? STATUS_STYLE.Healthy;

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, open) => setExpanded(open)}
      elevation={3}
      disableGutters
      sx={{
        borderLeft: `6px solid ${st.dot}`,
        mb: 2,
        borderRadius: '10px !important',
        overflow: 'hidden',
        '&:before': { display: 'none' },
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 6 },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: st.text, fontSize: 28 }} />}
        sx={{ bgcolor: st.headerBg, minHeight: 64, '& .MuiAccordionSummary-content': { my: 1.5 } }}
      >
        <Box display="flex" alignItems="center" gap={2} flex={1} flexWrap="wrap" pr={1}>
          <Box sx={{
            width: 16, height: 16, borderRadius: '50%',
            bgcolor: st.dot, flexShrink: 0,
            boxShadow: `0 0 8px ${st.dot}`,
          }} />
          <Typography fontWeight={800} sx={{ color: st.text, fontSize: 18 }}>
            🖥️ {server.hostname}
          </Typography>
          <Typography sx={{ color: st.text, fontSize: 16, opacity: 0.8, fontWeight: 600 }}>
            ({server.ipAddress})
          </Typography>
          <Box sx={{ ml: 'auto' }}>
            <Box sx={{
              display: 'inline-block',
              px: 2, py: 0.6,
              bgcolor: st.dot, color: 'white',
              borderRadius: 2, fontSize: 14, fontWeight: 800, letterSpacing: 0.5,
              boxShadow: `0 2px 8px ${st.dot}88`,
            }}>
              {st.badge}
            </Box>
          </Box>
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 0, bgcolor: '#fafafa' }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress size={32} />
          </Box>
        ) : data?.latestDisks && data.latestDisks.length > 0 ? (
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 750 }}>
              <TableHead>
                <TableRow sx={{ background: 'linear-gradient(90deg, #1e3a5f 0%, #2d6a9f 100%)' }}>
                  {['Mount Point', 'Filesystem', 'Type', 'Total Size', 'Used', 'Available', 'Usage %', 'Status'].map(h => (
                    <TableCell key={h} sx={{ color: 'white', fontWeight: 800, fontSize: 15, py: 1.6, whiteSpace: 'nowrap' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.latestDisks.map((d, i) => {
                  const rs = rowSx(d.usagePercent);
                  return (
                    <TableRow key={d.id} sx={{ bgcolor: i % 2 === 0 ? rs.bgcolor : `${rs.bgcolor}cc` }}>
                      <TableCell sx={{ color: rs.color, fontWeight: rs.fontWeight, fontSize: rs.fontSize }}>{d.mountPoint}</TableCell>
                      <TableCell sx={{ color: rs.color, fontWeight: rs.fontWeight, fontSize: rs.fontSize }}>{d.fileSystem}</TableCell>
                      <TableCell sx={{ color: rs.color, fontWeight: rs.fontWeight, fontSize: rs.fontSize }}>{d.fileSystemType}</TableCell>
                      <TableCell sx={{ color: rs.color, fontWeight: rs.fontWeight, fontSize: rs.fontSize }}>{d.totalSize}</TableCell>
                      <TableCell sx={{ color: rs.color, fontWeight: rs.fontWeight, fontSize: rs.fontSize }}>{d.usedSize}</TableCell>
                      <TableCell sx={{ color: rs.color, fontWeight: rs.fontWeight, fontSize: rs.fontSize }}>{d.availableSize}</TableCell>
                      <TableCell sx={{ color: rs.color, fontWeight: 800, fontSize: 16 }}>{d.usagePercent.toFixed(0)}%</TableCell>
                      <TableCell sx={{ color: rs.color, fontWeight: rs.fontWeight, fontSize: rs.fontSize, whiteSpace: 'nowrap' }}>
                        {rowStatus(d.usagePercent)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        ) : (
          <Box p={3}>
            <Typography sx={{ fontSize: 16, color: 'text.secondary' }}>No disk data available for this server.</Typography>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

export default function DashboardPage() {
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);

  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    refetchInterval: 30_000,
  });

  const { data: servers, isLoading: serversLoading } = useQuery({
    queryKey: ['servers-all'],
    queryFn: () => getServers({ pageSize: 200 }),
    refetchInterval: 30_000,
  });

  if (dashLoading || serversLoading) {
    return <Box display="flex" justifyContent="center" mt={8}><CircularProgress size={48} /></Box>;
  }

  const dashValues: Record<FilterKey, number> = {
    totalServers:    dash?.totalServers    ?? 0,
    healthyServers:  dash?.healthyServers  ?? 0,
    warningServers:  dash?.warningServers  ?? 0,
    criticalServers: dash?.criticalServers ?? 0,
    activeAlerts:    dash?.activeAlerts    ?? 0,
  };

  const allServers = servers?.items ?? [];
  const visibleServers = filterServers(allServers, activeFilter);

  const handleCardClick = (key: FilterKey) => {
    setActiveFilter(prev => (prev === key ? null : key));
  };

  return (
    <Box>
      {/* Page header */}
      <Typography
        fontWeight={900}
        mb={3}
        sx={{
          fontSize: { xs: 20, sm: 26, md: 30 },
          background: 'linear-gradient(90deg, #1e3a5f 0%, #2c5f8a 60%, #3a7aad 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: 0.5,
        }}
      >
        📊 PalTech Servers Disk Usage Monitoring Report
      </Typography>

      {/* Stat cards — clickable filters */}
      <Grid container spacing={2.5} mb={4}>
        {STAT_CARDS.map(card => {
          const isActive = activeFilter === card.key;
          return (
            <Grid item xs={6} sm={4} md={2.4} key={card.key}>
              <Card
                elevation={isActive ? 8 : 4}
                onClick={() => handleCardClick(card.key)}
                sx={{
                  background: card.grad,
                  borderRadius: 3,
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  outline: isActive ? '3px solid white' : '3px solid transparent',
                  outlineOffset: '2px',
                  transform: isActive ? 'translateY(-6px) scale(1.03)' : 'none',
                  boxShadow: isActive ? '0 8px 24px rgba(0,0,0,0.35)' : undefined,
                  '&:hover': { transform: isActive ? 'translateY(-6px) scale(1.03)' : 'translateY(-4px)', boxShadow: 8 },
                  userSelect: 'none',
                }}
              >
                <CardContent sx={{ pb: '16px !important' }}>
                  <Typography sx={{ fontSize: 32, mb: 0.5 }}>{card.icon}</Typography>
                  <Typography fontWeight={900} sx={{ fontSize: 42, lineHeight: 1 }}>
                    {dashValues[card.key]}
                  </Typography>
                  <Typography sx={{ fontSize: 15, mt: 0.5, opacity: 0.92, fontWeight: 600 }}>
                    {card.label}
                  </Typography>
                  {isActive && (
                    <Typography sx={{ fontSize: 11, mt: 0.8, opacity: 0.85, fontWeight: 700, letterSpacing: 0.5 }}>
                      ▼ FILTERED — click to clear
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Section label */}
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Typography fontWeight={800} sx={{
          fontSize: 22,
          color: '#1e3a5f',
          borderLeft: '5px solid #2980b9',
          pl: 1.5,
        }}>
          {filterLabel(activeFilter)}
        </Typography>
        <Typography sx={{ fontSize: 15, color: '#555', fontWeight: 600 }}>
          ({visibleServers.length} server{visibleServers.length !== 1 ? 's' : ''})
        </Typography>
        {activeFilter && activeFilter !== 'totalServers' && (
          <Box
            onClick={() => setActiveFilter(null)}
            sx={{
              ml: 1, px: 1.5, py: 0.3,
              bgcolor: '#e0e0e0', borderRadius: 2,
              fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#333',
              '&:hover': { bgcolor: '#bdbdbd' },
            }}
          >
            ✕ Clear filter
          </Box>
        )}
      </Box>

      {visibleServers.length === 0 ? (
        <Card elevation={1}>
          <CardContent>
            <Typography sx={{ fontSize: 16, color: 'text.secondary' }}>
              {allServers.length === 0
                ? 'No servers registered yet.'
                : `No servers match the "${filterLabel(activeFilter)}" filter.`}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        visibleServers.map(s => (
          <ServerAccordion key={s.id} server={s} />
        ))
      )}
    </Box>
  );
}
