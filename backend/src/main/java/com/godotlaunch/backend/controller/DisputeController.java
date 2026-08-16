package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CreateDisputeRequest;
import com.godotlaunch.backend.dto.request.ResolveDisputeRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.DisputeResponse;
import com.godotlaunch.backend.dto.response.EvidenceRepoAccessResponse;
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
    @PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")
    @Operation(summary = "Tố cáo sản phẩm vi phạm bản quyền", description = "B tạo dispute tố A. Sản phẩm bị tự động gỡ chờ điều tra. Chỉ developer (đã qua GitHub+Face+KYC) mới được tố cáo — dispute chỉ có ý nghĩa giữa các developer tranh chấp source code.")
    public ResponseEntity<ApiResponse<DisputeResponse>> createDispute(
            @Valid @RequestBody CreateDisputeRequest request, Principal principal) {
        DisputeResponse res = disputeService.createDispute(request, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(res, "Đã gửi khiếu nại. Sản phẩm tạm gỡ chờ điều tra."));
    }

    @GetMapping("/check-evidence-repo")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")
    @Operation(summary = "Kiểm tra quyền truy cập repo bằng chứng trước khi gửi khiếu nại", description = "PUBLIC/PRIVATE_GRANTED: cho phép submit ngay. PRIVATE_NO_ACCESS: frontend hiện popup mời bot (botUsername) trước khi cho submit.")
    public ResponseEntity<ApiResponse<EvidenceRepoAccessResponse>> checkEvidenceRepo(
            @RequestParam String repoUrl) {
        return ResponseEntity.ok(ApiResponse.success(
                disputeService.checkEvidenceRepoAccess(repoUrl), "OK"));
    }

    @PostMapping("/accept-bot-for-evidence")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")
    @Operation(summary = "Bot accept lời mời collaborator vào repo bằng chứng", description = "Gọi sau khi reporter đã mời bot làm collaborator trên GitHub. Trả granted=true nếu bot đã đọc được repo.")
    public ResponseEntity<ApiResponse<Boolean>> acceptBotForEvidence(
            @RequestParam String repoUrl) {
        boolean granted = disputeService.acceptBotInvitationForEvidence(repoUrl);
        return ResponseEntity.ok(ApiResponse.success(granted, granted ? "Bot đã có quyền truy cập repo." : "Bot chưa nhận được lời mời. Vui lòng kiểm tra lại."));
    }

    @GetMapping("/my-reports")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")
    @Operation(summary = "Khiếu nại tôi đã gửi")
    public ResponseEntity<ApiResponse<List<DisputeResponse>>> myReports(Principal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                disputeService.getMyReportedDisputes(principal.getName()), "OK"));
    }

    @GetMapping("/my-unpaid-debt")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'DEVELOPER', 'ADMIN')")
    @Operation(summary = "Khoản nợ dispute chưa trả của tôi")
    public ResponseEntity<ApiResponse<DisputeResponse>> myUnpaidDebt(Principal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                disputeService.getMyUnpaidDisputeDebt(principal.getName()), "OK"));
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

    @PostMapping("/{id}/confirm-refund")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Xác nhận seller đã hoàn tiền (admin)", description = "Trừ ví seller, cộng ví reporter đúng refundAmount, mở lại quyền developer nếu đang bị khóa vì dispute này.")
    public ResponseEntity<ApiResponse<DisputeResponse>> confirmRefund(
            @PathVariable UUID id,
            Principal principal) {
        DisputeResponse res = disputeService.confirmRefund(id, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(res, "Đã xác nhận hoàn tiền."));
    }

    @GetMapping("/{id}/ai-analysis")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "AI phân tích và gợi ý hướng phán xử cho Admin")
    public ResponseEntity<ApiResponse<String>> getAiAnalysis(@PathVariable UUID id) {
        String analysis = disputeService.getAiAnalysis(id);
        return ResponseEntity.ok(ApiResponse.success(analysis, "OK"));
    }
}
