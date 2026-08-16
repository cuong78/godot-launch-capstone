import api from './axios';
import { ApiResponse, ContractResponse } from '../types';

export interface ContractRequestDto {
  gameId: string;
  contractType: 'full_acquisition' | 'co_publishing';
  revenueSplit?: number;
  lumpSumAmount?: string;
  disputeResolutionClause?: string;
  additionalTerms?: string;
  buyerRepresentative?: string;
  buyerPosition?: string;
  sellerRepresentative?: string;
  sellerAddress?: string;
  sellerTaxCode?: string;
  buyerSignatureBase64?: string;
}

export interface ContractAiSuggestionResponse {
  suggestedContractType: 'full_acquisition' | 'co_publishing';
  suggestedLumpSumAmount?: number;
  suggestedRevenueSplit?: number;
  reasoning: string;
  unavailable: boolean;
}

export const contractApi = {
  createOffer: async (data: ContractRequestDto): Promise<ApiResponse<ContractResponse>> => {
    const response = await api.post<ApiResponse<ContractResponse>>('/api/contracts/offers', data);
    return response.data;
  },

  getMyContracts: async (): Promise<ApiResponse<ContractResponse[]>> => {
    const response = await api.get<ApiResponse<ContractResponse[]>>('/api/contracts/my-contracts');
    return response.data;
  },

  getAllContracts: async (): Promise<ApiResponse<ContractResponse[]>> => {
    const response = await api.get<ApiResponse<ContractResponse[]>>('/api/contracts');
    return response.data;
  },

  getContractById: async (contractId: string): Promise<ApiResponse<ContractResponse>> => {
    const response = await api.get<ApiResponse<ContractResponse>>(`/api/contracts/${contractId}`);
    return response.data;
  },

  signByDeveloper: async (
    contractId: string, 
    signatureBase64: string,
    sellerRepresentative?: string,
    sellerAddress?: string,
    sellerTaxCode?: string
  ): Promise<ApiResponse<ContractResponse>> => {
    const response = await api.post<ApiResponse<ContractResponse>>(`/api/contracts/${contractId}/sign/developer`, {
      signatureBase64,
      sellerRepresentative,
      sellerAddress,
      sellerTaxCode
    });
    return response.data;
  },

  rejectByDeveloper: async (contractId: string, rejectionReason?: string): Promise<ApiResponse<ContractResponse>> => {
    const response = await api.post<ApiResponse<ContractResponse>>(`/api/contracts/${contractId}/reject`, {
      rejectionReason
    });
    return response.data;
  },

  suggestContractTerms: async (gameId: string): Promise<ApiResponse<ContractAiSuggestionResponse>> => {
    const response = await api.get<ApiResponse<ContractAiSuggestionResponse>>(
      '/api/contracts/ai-suggestion',
      { params: { gameId } }
    );
    return response.data;
  },
};
