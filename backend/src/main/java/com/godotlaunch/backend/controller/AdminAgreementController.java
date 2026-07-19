package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CreateAgreementVersionRequest;
import com.godotlaunch.backend.dto.response.AgreementVersionResponse;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.AgreementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/agreements")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@Tag(name = "Admin Agreement API", description = "Admin endpoints for editing the distribution agreement content")
public class AdminAgreementController {

    private final AgreementService agreementService;
    private final UserRepository userRepository;

    @GetMapping
    @Operation(summary = "List all agreement versions, newest first")
    public ResponseEntity<ApiResponse<List<AgreementVersionResponse>>> listVersions() {
        return ResponseEntity.ok(ApiResponse.success(
                agreementService.listVersions(),
                "Agreement versions retrieved successfully"
        ));
    }

    @PostMapping
    @Operation(summary = "Create a new agreement version (becomes the active version)")
    public ResponseEntity<ApiResponse<AgreementVersionResponse>> createVersion(
            @Valid @RequestBody CreateAgreementVersionRequest request,
            Authentication authentication) {
        User admin = userRepository.findByEmail(authentication.getName()).orElseThrow();
        return ResponseEntity.ok(ApiResponse.success(
                agreementService.createNewVersion(request.getContent(), admin.getId()),
                "Agreement version created successfully"
        ));
    }
}
