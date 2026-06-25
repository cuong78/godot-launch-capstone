package com.godotlaunch.backend.dto.response;

import com.godotlaunch.backend.entity.enums.OrderStatus;
import com.godotlaunch.backend.entity.enums.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentStatusSummaryResponse {
    private UUID paymentId;
    private UUID orderId;
    private OrderStatus orderStatus;
    private PaymentStatus paymentStatus;
    private String checkoutUrl;
    private String downloadUrl;
}
