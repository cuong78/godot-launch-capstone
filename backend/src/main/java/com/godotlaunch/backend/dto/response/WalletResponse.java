package com.godotlaunch.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletResponse {
    private UUID id;
    private UUID userId;
    private BigDecimal balance;
    /**
     * Chỉ > 0 khi balance thực tế đang âm (ví platform đang ứng trước cho
     * dispute mà seller chưa trả nợ) — bằng đúng |balance|. Frontend hiển
     * thị balance là 0 và show số này như một dòng công nợ riêng, KHÔNG
     * hiện số dư âm ra UI vì không đúng ngữ nghĩa "số dư ví".
     */
    private BigDecimal outstandingDebt;
    private String currency;
    private Instant updatedAt;
}
