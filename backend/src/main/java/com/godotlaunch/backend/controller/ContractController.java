package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.ContractRequest;
import com.godotlaunch.backend.dto.response.ContractResponse;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.service.ContractService;
import com.godotlaunch.backend.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/contracts")
@Tag(name = "Contract API", description = "Contract management and e-signatures")
public class ContractController {

    private final ContractService contractService;
    private final com.godotlaunch.backend.repository.UserRepository userRepository;

    public ContractController(ContractService contractService, com.godotlaunch.backend.repository.UserRepository userRepository) {
        this.contractService = contractService;
        this.userRepository = userRepository;
    }

    @PostMapping("/offers")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a contract offer for a game (Admin only)")
    public ResponseEntity<ContractResponse> createOffer(
            @Valid @RequestBody ContractRequest request,
            Authentication authentication) {
        User admin = userRepository.findByEmail(authentication.getName()).orElseThrow();
        ContractResponse response = contractService.createOffer(request, admin.getId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my-contracts")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")
    @Operation(summary = "Get contracts for the logged in developer")
    public ResponseEntity<List<ContractResponse>> getMyContracts(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        List<ContractResponse> responses = contractService.getContractsByDeveloper(user.getId());
        return ResponseEntity.ok(responses);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get all contracts (Admin only)")
    public ResponseEntity<List<ContractResponse>> getAllContracts() {
        return ResponseEntity.ok(contractService.getAllContracts());
    }

    @GetMapping("/{contractId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get contract details by ID")
    public ResponseEntity<ContractResponse> getContractById(@PathVariable UUID contractId) {
        return ResponseEntity.ok(contractService.getContractById(contractId));
    }

    @PostMapping("/{contractId}/sign/developer")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Developer signs the contract")
    public ResponseEntity<ContractResponse> signByDeveloper(
            @PathVariable UUID contractId,
            @RequestBody(required = false) java.util.Map<String, String> body,
            Authentication authentication) {
        User developer = userRepository.findByEmail(authentication.getName()).orElseThrow();
        String signatureBase64 = body != null ? body.get("signatureBase64") : null;
        ContractResponse response = contractService.signByDeveloper(contractId, developer.getId(), signatureBase64);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{contractId}/sign/admin")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin counter-signs the contract")
    public ResponseEntity<ContractResponse> signByAdmin(
            @PathVariable UUID contractId,
            @RequestBody(required = false) java.util.Map<String, String> body,
            Authentication authentication) {
        User admin = userRepository.findByEmail(authentication.getName()).orElseThrow();
        String signatureBase64 = body != null ? body.get("signatureBase64") : null;
        ContractResponse response = contractService.signByAdmin(contractId, admin.getId(), signatureBase64);
        return ResponseEntity.ok(response);
    }
}
