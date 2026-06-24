package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CreateDisputeRequest;
import com.godotlaunch.backend.dto.request.ResolveDisputeRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.DisputeResponse;
import com.godotlaunch.backend.service.DisputeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/disputes")
@RequiredArgsConstructor
@Tag(name = "Dispute API", description = "Tranh chấp bản quyền source: tố cáo + admin phán xử")
public class DisputeController {

    private final DisputeService disputeService;

    @PostMapping
    @PreAuthorize("hasAnyRole('DEVELOPER', 'CUSTOMER', 'ADMIN')")
    @Operation(summary = "Tố cáo sản phẩm vi phạm bản quyền", description = "B tạo dispute tố A. Sản phẩm bị tự động gỡ chờ điều tra.")
    public ResponseEntity<ApiResponse<DisputeResponse>> createDispute(
            @Valid @RequestBody CreateDisputeRequest request, Principal principal) {
        DisputeResponse res = disputeService.createDispute(request, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(res, "Đã gửi khiếu nại. Sản phẩm tạm gỡ chờ điều tra."));
    }

    @GetMapping("/my-reports")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'CUSTOMER', 'ADMIN')")
    @Operation(summary = "Khiếu nại tôi đã gửi")
    public ResponseEntity<ApiResponse<List<DisputeResponse>>> myReports(Principal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                disputeService.getMyReportedDisputes(principal.getName()), "OK"));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Toàn bộ disputes (admin)")
    public ResponseEntity<ApiResponse<List<DisputeResponse>>> all() {
        return ResponseEntity.ok(ApiResponse.success(disputeService.getAllDisputes(), "OK"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Chi tiết dispute (admin)")
    public ResponseEntity<ApiResponse<DisputeResponse>> detail(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(disputeService.getDispute(id), "OK"));
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Phán xử dispute (admin)", description = "Theo cây quyết định TH1/2/3: seller_fault / reporter_fault / inconclusive.")
    public ResponseEntity<ApiResponse<DisputeResponse>> resolve(
            @PathVariable UUID id,
            @Valid @RequestBody ResolveDisputeRequest request,
            Principal principal) {
        DisputeResponse res = disputeService.resolveDispute(id, request, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(res, "Đã phán xử khiếu nại."));
    }
}
