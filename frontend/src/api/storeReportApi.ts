import api from './axios';
import {
  ApiResponse,
  ExternalPublishResponse,
  EligibleStoreGameResponse,
  GooglePlayMockConfigDto,
  StoreDailyMetricResponse,
  StoreReportImportResponse,
  StoreRevenueStatementResponse,
  StoreRevenueSummaryResponse,
} from '../types';

export const storeReportApi = {
  // Admin APIs
  getPublisherConfig: async (): Promise<ApiResponse<GooglePlayMockConfigDto>> => {
    const res = await api.get<ApiResponse<GooglePlayMockConfigDto>>('/api/v1/admin/platform-settings/google-play-mock');
    return res.data;
  },

  updatePublisherConfig: async (config: GooglePlayMockConfigDto): Promise<ApiResponse<GooglePlayMockConfigDto>> => {
    const res = await api.put<ApiResponse<GooglePlayMockConfigDto>>('/api/v1/admin/platform-settings/google-play-mock', config);
    return res.data;
  },

  getEligibleStoreGames: async (): Promise<ApiResponse<EligibleStoreGameResponse[]>> => {
    const res = await api.get<ApiResponse<EligibleStoreGameResponse[]>>('/api/v1/admin/store-reports/eligible-games');
    return res.data;
  },

  activateMockPublish: async (externalPublishId: string, packageName: string, priceProposed?: number): Promise<ApiResponse<ExternalPublishResponse>> => {
    const res = await api.post<ApiResponse<ExternalPublishResponse>>(
      `/api/v1/admin/store-publishes/${externalPublishId}/activate-mock`,
      { packageName, priceProposed }
    );
    return res.data;
  },

  activateMockPublishForGame: async (gameId: string, packageName: string, priceProposed?: number): Promise<ApiResponse<ExternalPublishResponse>> => {
    const res = await api.post<ApiResponse<ExternalPublishResponse>>(
      `/api/v1/admin/store-reports/games/${gameId}/activate-mock`,
      { packageName, priceProposed }
    );
    return res.data;
  },

  syncDownloads: async (externalPublishId: string): Promise<ApiResponse<StoreReportImportResponse>> => {
    const res = await api.post<ApiResponse<StoreReportImportResponse>>(
      `/api/v1/admin/store-publishes/${externalPublishId}/sync-downloads`
    );
    return res.data;
  },

  executeDemoPayout: async (externalPublishId: string, periodKey?: string): Promise<ApiResponse<StoreRevenueStatementResponse>> => {
    const params = periodKey ? `?periodKey=${encodeURIComponent(periodKey)}` : '';
    const res = await api.post<ApiResponse<StoreRevenueStatementResponse>>(
      `/api/v1/admin/store-publishes/${externalPublishId}/demo-payout${params}`
    );
    return res.data;
  },

  getAllReportImports: async (): Promise<ApiResponse<StoreReportImportResponse[]>> => {
    const res = await api.get<ApiResponse<StoreReportImportResponse[]>>('/api/v1/admin/store-reports/imports');
    return res.data;
  },

  getAllDailyMetrics: async (): Promise<ApiResponse<StoreDailyMetricResponse[]>> => {
    const res = await api.get<ApiResponse<StoreDailyMetricResponse[]>>('/api/v1/admin/store-reports/metrics');
    return res.data;
  },

  getAllRevenueStatements: async (): Promise<ApiResponse<StoreRevenueStatementResponse[]>> => {
    const res = await api.get<ApiResponse<StoreRevenueStatementResponse[]>>('/api/v1/admin/store-revenue-statements');
    return res.data;
  },

  getStoreRevenueSummary: async (): Promise<ApiResponse<StoreRevenueSummaryResponse>> => {
    const res = await api.get<ApiResponse<StoreRevenueSummaryResponse>>('/api/v1/admin/store-revenue-summary');
    return res.data;
  },

  downloadAdminRawCsv: async (importId: string): Promise<Blob> => {
    const res = await api.get(`/api/v1/admin/store-reports/imports/${importId}/download`, {
      responseType: 'blob',
    });
    return res.data;
  },

  // Developer APIs
  getDeveloperStoreGames: async (): Promise<ApiResponse<ExternalPublishResponse[]>> => {
    const res = await api.get<ApiResponse<ExternalPublishResponse[]>>('/api/v1/developer/store-games');
    return res.data;
  },

  getDeveloperDailyMetrics: async (gameId: string): Promise<ApiResponse<StoreDailyMetricResponse[]>> => {
    const res = await api.get<ApiResponse<StoreDailyMetricResponse[]>>(`/api/v1/developer/store-games/${gameId}/download-metrics`);
    return res.data;
  },

  getDeveloperReportImports: async (gameId: string): Promise<ApiResponse<StoreReportImportResponse[]>> => {
    const res = await api.get<ApiResponse<StoreReportImportResponse[]>>(`/api/v1/developer/store-games/${gameId}/report-imports`);
    return res.data;
  },

  getDeveloperRevenueStatements: async (gameId: string): Promise<ApiResponse<StoreRevenueStatementResponse[]>> => {
    const res = await api.get<ApiResponse<StoreRevenueStatementResponse[]>>(`/api/v1/developer/store-games/${gameId}/revenue-statements`);
    return res.data;
  },

  downloadDeveloperRawCsv: async (gameId: string, importId: string): Promise<Blob> => {
    const res = await api.get(`/api/v1/developer/store-games/${gameId}/reports/${importId}/download`, {
      responseType: 'blob',
    });
    return res.data;
  },
};
