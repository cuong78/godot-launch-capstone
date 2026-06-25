package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.response.TransactionResponse;
import com.godotlaunch.backend.dto.response.WalletResponse;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Wallet;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface WalletService {
    Wallet getOrCreateWallet(User user);
    WalletResponse getWalletResponse(String email);
    Page<TransactionResponse> getTransactionHistory(String email, Pageable pageable);
    void addRevenue(UUID sellerId, UUID buyerId, BigDecimal amount, BigDecimal platformCommission, UUID gameId, String referenceId);
}
