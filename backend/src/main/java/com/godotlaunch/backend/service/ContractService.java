//package com.godotlaunch.backend.service;
//
//import com.godotlaunch.backend.dto.request.ContractRequest;
//import com.godotlaunch.backend.dto.response.ContractResponse;
//
//import java.util.List;
//import java.util.UUID;
//
//public interface ContractService {
//    ContractResponse createOffer(ContractRequest request, UUID adminId);
//    List<ContractResponse> getContractsByDeveloper(UUID developerId);
//    List<ContractResponse> getAllContracts();
//    ContractResponse getContractById(UUID contractId);
//    ContractResponse signByDeveloper(UUID contractId, UUID developerId, String signatureBase64);
//    ContractResponse signByAdmin(UUID contractId, UUID adminId, String signatureBase64);
//}
