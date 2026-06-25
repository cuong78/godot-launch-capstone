package com.godotlaunch.backend.dto.response;

import com.godotlaunch.backend.entity.enums.ItemType;
import com.godotlaunch.backend.entity.enums.OrderStatus;
import com.godotlaunch.backend.entity.enums.PaymentProvider;
import com.godotlaunch.backend.entity.enums.PaymentStatus;
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
public class PaymentResponse {
    private UUID id;
    private UUID orderId;
    private UUID marketplaceItemId;
    private String marketplaceItemTitle;
    private ItemType marketplaceItemType;
    private UUID buyerId;
    private String buyerEmail;
    private String buyerFullName;
    private UUID sellerId;
    private String sellerEmail;
    private String sellerFullName;
    private OrderStatus orderStatus;
    private PaymentProvider paymentProvider;
    private PaymentStatus paymentStatus;
    private BigDecimal amount;
    private String currency;
    private Long payosOrderCode;
    private String payosPaymentLinkId;
    private String payosTransactionId;
    private String checkoutUrl;
    private String paymentReference;
    private Instant paidAt;
    private String downloadUrl;
    private Instant createdAt;
    private Instant updatedAt;
}
