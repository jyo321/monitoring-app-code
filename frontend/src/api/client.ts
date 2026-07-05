import axios from 'axios';
import type { AlertDto, DashboardDto, DiskMetricDto, PagedResult, ServerDetailDto, ServerDto } from '../types';

const api = axios.create({ baseURL: '/api' });

export const getDashboard = () =>
  api.get<DashboardDto>('/dashboard').then(r => r.data);

export const getServers = (params?: { search?: string; status?: string; page?: number; pageSize?: number }) =>
  api.get<PagedResult<ServerDto>>('/servers', { params }).then(r => r.data);

export const getServer = (id: number) =>
  api.get<ServerDetailDto>(`/servers/${id}`).then(r => r.data);

export const getServerHistory = (id: number, mountPoint: string, range: string) =>
  api.get<DiskMetricDto[]>(`/servers/${id}/history`, { params: { mountPoint, range } }).then(r => r.data);

export const getAlerts = (params?: { resolved?: boolean; severity?: string; page?: number; pageSize?: number }) =>
  api.get<PagedResult<AlertDto>>('/alerts', { params }).then(r => r.data);

export const resolveAlert = (id: number) =>
  api.patch(`/alerts/${id}/resolve`).then(r => r.data);
