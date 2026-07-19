package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.AgreementAcceptanceStatusResponse;
import com.godotlaunch.backend.dto.response.AgreementVersionResponse;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.AgreementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/agreements")
@RequiredArgsConstructor
@Tag(name = "Agreement API", description = "Thoa thuan phan phoi — noi dung hien hanh va xac nhan dong y cua user dang dang nhap")
public class AgreementController {

    private final AgreementService agreementService;
    private final UserRepository userRepository;

    @GetMapping("/active")
    @Operation(summary = "Get the current active distribution agreement content")
    public ResponseEntity<ApiResponse<AgreementVersionResponse>> getActive() {
        return ResponseEntity.ok(ApiResponse.success(
                agreementService.getActiveAgreement(),
                "Active agreement retrieved successfully"
        ));
    }

    @GetMapping("/acceptance-status")
    @Operation(summary = "Get whether the logged in user has accepted the active agreement version")
    public ResponseEntity<ApiResponse<AgreementAcceptanceStatusResponse>> getAcceptanceStatus(
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        return ResponseEntity.ok(ApiResponse.success(
                agreementService.getAcceptanceStatus(user.getId()),
                "Agreement acceptance status retrieved successfully"
        ));
    }

    @PostMapping("/accept")
    @Operation(summary = "Record that the logged in user accepts the active agreement version")
    public ResponseEntity<ApiResponse<AgreementAcceptanceStatusResponse>> accept(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        return ResponseEntity.ok(ApiResponse.success(
                agreementService.acceptActiveAgreement(user.getId()),
                "Agreement accepted successfully"
        ));
    }
}
