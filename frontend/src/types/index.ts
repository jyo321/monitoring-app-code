export interface ServerDto {
  id: number;
  hostname: string;
  ipAddress: string;
  environment: string;
  lastSeen: string;
  healthStatus: 'Healthy' | 'Warning' | 'Critical';
  maxUsagePercent: number;
}

export interface DiskMetricDto {
  id: number;
  mountPoint: string;
  fileSystem: string;
  fileSystemType: string;
  totalSize: string;
  usedSize: string;
  availableSize: string;
  usagePercent: number;
  collectedAt: string;
}

export interface AlertDto {
  id: number;
  serverId: number;
  hostname: string;
  ipAddress: string;
  severity: 'Warning' | 'Critical';
  alertType: string;
  message: string;
  mountPoint: string;
  usagePercent: number;
  createdAt: string;
  isResolved: boolean;
}

export interface ServerDetailDto extends ServerDto {
  latestDisks: DiskMetricDto[];
  recentAlerts: AlertDto[];
}

export interface DashboardDto {
  totalServers: number;
  healthyServers: number;
  warningServers: number;
  criticalServers: number;
  activeAlerts: number;
  recentAlerts: AlertDto[];
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
