package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.TransactionResponse;
import com.godotlaunch.backend.dto.response.WalletResponse;
import com.godotlaunch.backend.service.WalletService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.math.BigDecimal;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/wallets")
@RequiredArgsConstructor
@Tag(name = "Wallet API", description = "Endpoints for managing user wallets and checking transaction history")
public class WalletController {

    private final WalletService walletService;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get current user's wallet details", description = "Retrieves the balance and currency of the logged-in user.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<WalletResponse>> getMyWallet(Principal principal) {
        WalletResponse response = walletService.getWalletResponse(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Wallet details retrieved successfully."));
    }

    @GetMapping("/me/transactions")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get current user's transaction history", description = "Retrieves a list of financial transactions related to the logged-in user.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Page<TransactionResponse>>> getMyTransactionHistory(Principal principal, Pageable pageable) {
        Page<TransactionResponse> response = walletService.getTransactionHistory(principal.getName(), pageable);
        return ResponseEntity.ok(ApiResponse.success(response, "Transaction history retrieved successfully."));
    }

    @PostMapping("/platform-topup-demo")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "[DEMO] Nạp tiền demo vào ví platform", description = "Chỉ hoạt động khi DEMO_MODE=true trong .env — dùng để chuẩn bị vốn trước khi demo trước hội đồng, tránh phải sửa DB tay. Không phải tiền thật.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<WalletResponse>> demoTopupPlatformWallet(@RequestParam BigDecimal amount) {
        WalletResponse response = walletService.demoTopupPlatformWallet(amount);
        return ResponseEntity.ok(ApiResponse.success(response, "Đã nạp tiền demo vào ví platform."));
    }
}
