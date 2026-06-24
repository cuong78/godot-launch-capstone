package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ResolveDisputeRequest {
    // Kết luận admin theo cây quyết định:
    // 'resolved_seller_fault'    → A đạo nhái (TH3): A hoàn tiền, ban A
    // 'resolved_reporter_fault'  → B vu cáo (TH2): trừ điểm/ban B
    // 'resolved_inconclusive'    → không kết luận được (TH1): khôi phục, không phạt
    @NotBlank(message = "Kết luận là bắt buộc")
    private String resolution;   // = status mới

    private String resolutionNote;

    // TH3: số tiền A phải hoàn (set refund_deadline = now + 5 ngày)
    private BigDecimal refundAmount;

    // Có ban user không (A ở TH3 / B ở TH2 nếu spam)
    private boolean banUser;
}
