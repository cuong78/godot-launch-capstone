package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.ContractRequest;
import com.godotlaunch.backend.dto.response.ContractAiSuggestionResponse;
import com.godotlaunch.backend.dto.response.ContractResponse;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.service.ContractService;
import com.godotlaunch.backend.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/contracts")
@Tag(name = "Contract API", description = "Contract management and e-signatures")
public class ContractController {

    private final ContractService contractService;
    private final UserRepository userRepository;

    public ContractController(ContractService contractService, UserRepository userRepository) {
        this.contractService = contractService;
        this.userRepository = userRepository;
    }

    @PostMapping("/offers")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a contract offer for a game (Admin only)")
    public ResponseEntity<ApiResponse<ContractResponse>> createOffer(
            @Valid @RequestBody ContractRequest request,
            Authentication authentication) {
        User admin = userRepository.findByEmail(authentication.getName()).orElseThrow();
        ContractResponse response = contractService.createOffer(request, admin.getId());
        return ResponseEntity.ok(ApiResponse.success(response, "Contract offer created successfully"));
    }

    @GetMapping("/ai-suggestion")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "AI gợi ý loại hợp đồng + giá/% phù hợp cho game (Admin only)")
    public ResponseEntity<ApiResponse<ContractAiSuggestionResponse>> suggestContractTerms(
            @RequestParam UUID gameId) {
        ContractAiSuggestionResponse response = contractService.suggestContractTerms(gameId);
        return ResponseEntity.ok(ApiResponse.success(response, "Contract AI suggestion generated"));
    }

    @GetMapping("/my-contracts")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")
    @Operation(summary = "Get contracts for the logged in developer")
    public ResponseEntity<ApiResponse<List<ContractResponse>>> getMyContracts(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        List<ContractResponse> responses = contractService.getContractsByDeveloper(user.getId());
        return ResponseEntity.ok(ApiResponse.success(responses, "Developer contracts retrieved successfully"));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get all contracts (Admin only)")
    public ResponseEntity<ApiResponse<List<ContractResponse>>> getAllContracts() {
        List<ContractResponse> responses = contractService.getAllContracts();
        return ResponseEntity.ok(ApiResponse.success(responses, "All contracts retrieved successfully"));
    }

    @GetMapping("/{contractId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get contract details by ID")
    public ResponseEntity<ApiResponse<ContractResponse>> getContractById(@PathVariable UUID contractId) {
        ContractResponse response = contractService.getContractById(contractId);
        return ResponseEntity.ok(ApiResponse.success(response, "Contract retrieved successfully"));
    }

    @PostMapping("/{contractId}/sign/developer")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Developer signs the contract")
    public ResponseEntity<ApiResponse<ContractResponse>> signByDeveloper(
            @PathVariable UUID contractId,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication) {
        User developer = userRepository.findByEmail(authentication.getName()).orElseThrow();
        String signatureBase64 = body != null ? body.get("signatureBase64") : null;
        String sellerRepresentative = body != null ? body.get("sellerRepresentative") : null;
        String sellerAddress = body != null ? body.get("sellerAddress") : null;
        String sellerTaxCode = body != null ? body.get("sellerTaxCode") : null;
        
        ContractResponse response = contractService.signByDeveloper(
                contractId, 
                developer.getId(), 
                signatureBase64,
                sellerRepresentative,
                sellerAddress,
                sellerTaxCode
        );
        return ResponseEntity.ok(ApiResponse.success(response, "Contract signed by developer successfully"));
    }

    @PostMapping("/{contractId}/reject")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Developer rejects the contract")
    public ResponseEntity<ApiResponse<ContractResponse>> rejectByDeveloper(
            @PathVariable UUID contractId,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication) {
        try {
            User developer = userRepository.findByEmail(authentication.getName()).orElseThrow();
            String rejectionReason = body != null ? body.get("rejectionReason") : "";
            ContractResponse response = contractService.rejectByDeveloper(contractId, developer.getId(), rejectionReason);
            return ResponseEntity.ok(ApiResponse.success(response, "Contract rejected by developer successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ApiResponse.error(500, "Lỗi Server: " + e.getMessage()));
        }
    }
}
