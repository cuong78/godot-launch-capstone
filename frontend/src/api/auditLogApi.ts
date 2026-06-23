import api from './axios';
import { ApiResponse, Page, AuditLogResponse, AuditLogFilterParams } from '../types';

export const auditLogApi = {
  getAuditLogs: async (params: AuditLogFilterParams): Promise<ApiResponse<Page<AuditLogResponse>>> => {
    const response = await api.get<ApiResponse<Page<AuditLogResponse>>>('/api/v1/admin/audit-logs', { params });
    return response.data;
  }
};
