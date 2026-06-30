package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.CreatePaymentRequest;
import com.godotlaunch.backend.dto.response.PaymentResponse;
import com.godotlaunch.backend.dto.response.PaymentStatusSummaryResponse;
import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.Order;
import com.godotlaunch.backend.entity.Payment;
import com.godotlaunch.backend.entity.Transaction;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Wallet;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import com.godotlaunch.backend.entity.enums.OrderStatus;
import com.godotlaunch.backend.entity.enums.OrderType;
import com.godotlaunch.backend.entity.enums.PaymentStatus;
import com.godotlaunch.backend.entity.enums.TxnStatus;
import com.godotlaunch.backend.entity.enums.TxnType;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.AssetRepository;
import com.godotlaunch.backend.repository.OrderRepository;
import com.godotlaunch.backend.repository.PaymentRepository;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import com.godotlaunch.backend.repository.TransactionRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.WalletRepository;
import com.godotlaunch.backend.service.PaymentService;
import com.godotlaunch.backend.service.PlatformSettingsService;
import com.godotlaunch.backend.service.payment.PaymentGateway;
import com.godotlaunch.backend.service.payment.PaymentGatewayCreateRequest;
import com.godotlaunch.backend.service.payment.PaymentGatewayCreateResponse;
import com.godotlaunch.backend.service.payment.PaymentGatewayStatusResponse;
import com.godotlaunch.backend.service.payment.PaymentGatewayWebhookResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    private static final String DEFAULT_CURRENCY = "VND";
    private static final int PAYMENT_LINK_EXPIRY_MINUTES = 30;
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final AssetRepository assetRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final SourceSnapshotRepository sourceSnapshotRepository;
    private final PaymentGateway paymentGateway;
    private final PlatformSettingsService platformSettingsService;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Override
    @Transactional
    public PaymentResponse createPayOSPayment(CreatePaymentRequest request, String buyerEmail) {
        User buyer = getUserByEmail(buyerEmail);
        validatePurchaserRole(buyer);

        Asset item = assetRepository.findById(request.getAssetId())
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));

        if (item.getStatus() != ItemStatus.active) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }

        if (item.getSeller().getId().equals(buyer.getId())) {
            throw new AppException(ErrorCode.OWN_PRODUCT_PURCHASE_NOT_ALLOWED);
        }

        Order order = orderRepository.findByBuyerIdAndAssetId(buyer.getId(), item.getId())
                .orElseGet(() -> createOrder(buyer, item));

        Payment payment = order.getPayment();
        if (payment == null) {
            payment = new Payment();
            payment.setOrder(order);
            payment.setPaymentStatus(PaymentStatus.PENDING);
            payment.setAmount(item.getPrice());
            payment.setCurrency(DEFAULT_CURRENCY);
            payment = paymentRepository.save(payment);
        } else {
            payment = syncPaymentFromGateway(payment);
            payment.setCurrency(DEFAULT_CURRENCY);
            if (payment.getPaymentStatus() == PaymentStatus.PAID) {
                return mapToResponse(paymentRepository.save(payment));
            }

            payment = refreshPendingPaymentPricing(order, payment, item);

            if (isActiveCheckout(payment)) {
                return mapToResponse(paymentRepository.save(payment));
            }
        }

        if (payment.getAmount().compareTo(BigDecimal.ZERO) == 0) {
            payment.setCheckoutUrl(null);
            payment.setPaymentReference(buildFreePaymentReference(payment.getId()));
            payment = completePaidPayment(payment, Instant.now(), null);
            return mapToResponse(payment);
        }

        PaymentGatewayCreateResponse gatewayResponse = paymentGateway.createPayment(
                PaymentGatewayCreateRequest.builder()
                        .orderCode(generatePayOSOrderCode())
                        .amount(toPayOSAmount(payment.getAmount()))
                        .buyerName(resolveBuyerName(buyer))
                        .buyerEmail(buyer.getEmail())
                        .itemName(item.getTitle())
                        .description(buildPaymentReference(payment.getId()))
                        .returnUrl(buildFrontendUrl("/payment/success?paymentId=" + payment.getId()))
                        .cancelUrl(buildFrontendUrl("/payment/cancelled?paymentId=" + payment.getId()))
                        .expiredAt(Instant.now().plusSeconds(PAYMENT_LINK_EXPIRY_MINUTES * 60L).getEpochSecond())
                        .build()
        );

        payment.setPaymentStatus(resolveCreatedPaymentStatus(gatewayResponse.getStatus()));
        payment.setPayosOrderCode(gatewayResponse.getOrderCode());
        payment.setPayosPaymentLinkId(gatewayResponse.getPaymentLinkId());
        payment.setPayosTransactionId(null);
        payment.setCheckoutUrl(gatewayResponse.getCheckoutUrl());
        payment.setPaymentReference(buildPaymentReference(payment.getId()));
        payment.setPaidAt(null);

        return mapToResponse(paymentRepository.save(payment));
    }

    @Override
    @Transactional
    public PaymentResponse confirmPayment(UUID paymentId, String requesterEmail) {
        Payment payment = getPaymentEntity(paymentId);
        User requester = getUserByEmail(requesterEmail);
        ensureRequesterCanAccess(payment, requester);
        return mapToResponse(syncPaymentFromGateway(payment));
    }

    @Override
    @Transactional
    public PaymentResponse cancelPayment(UUID paymentId, String requesterEmail) {
        Payment payment = getPaymentEntity(paymentId);
        User requester = getUserByEmail(requesterEmail);
        ensureRequesterCanAccess(payment, requester);

        if (payment.getPaymentStatus() == PaymentStatus.PAID) {
            throw new AppException(ErrorCode.PAYMENT_ALREADY_PAID);
        }

        if (!StringUtils.hasText(payment.getCheckoutUrl()) || payment.getPayosOrderCode() == null) {
            throw new AppException(ErrorCode.PAYMENT_NOT_CANCELLABLE);
        }

        if (isTerminalFailure(payment.getPaymentStatus())) {
            return mapToResponse(payment);
        }

        PaymentGatewayStatusResponse gatewayStatus = paymentGateway.cancelPayment(payment.getPayosOrderCode());
        applyGatewayStatus(payment, gatewayStatus);
        return mapToResponse(paymentRepository.save(payment));
    }

    @Override
    @Transactional
    public PaymentResponse handleWebhook(Object payload) {
        PaymentGatewayWebhookResult webhook = paymentGateway.verifyWebhook(payload);
        if (webhook.isValidationRequest()) {
            log.info("PayOS webhook URL validation request acknowledged successfully.");
            return null;
        }

        if (webhook.getOrderCode() == null || webhook.getAmount() == null) {
            throw new AppException(ErrorCode.PAYMENT_WEBHOOK_INVALID);
        }

        Payment payment = paymentRepository.findByPayosOrderCodeForUpdate(webhook.getOrderCode())
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

        long expectedAmount = toPayOSAmount(payment.getAmount());
        if (expectedAmount != webhook.getAmount()) {
            throw new AppException(ErrorCode.PAYMENT_AMOUNT_MISMATCH);
        }

        if (isCompletedPayment(payment)) {
            payment.setPayosPaymentLinkId(firstNonBlank(webhook.getPaymentLinkId(), payment.getPayosPaymentLinkId()));
            payment.setPayosTransactionId(firstNonBlank(webhook.getTransactionReference(), payment.getPayosTransactionId()));
            payment.setPaidAt(payment.getPaidAt() != null ? payment.getPaidAt() : resolvePaidAt(webhook.getOccurredAt()));
            return mapToResponse(paymentRepository.save(payment));
        }

        PaymentGatewayStatusResponse gatewayStatus = paymentGateway.getPaymentStatus(webhook.getOrderCode());

        if (gatewayStatus.getStatus() != PaymentStatus.PAID) {
            applyGatewayStatus(payment, gatewayStatus);
            log.info("PayOS webhook received for order {} but payment is not paid yet. Current status: {}",
                    webhook.getOrderCode(), gatewayStatus.getStatus());
            return mapToResponse(paymentRepository.save(payment));
        }

        payment.setPayosPaymentLinkId(firstNonBlank(
                webhook.getPaymentLinkId(),
                gatewayStatus.getPaymentLinkId(),
                payment.getPayosPaymentLinkId()
        ));
        payment.setPaymentReference(firstNonBlank(payment.getPaymentReference(), buildPaymentReference(payment.getId())));

        Payment completedPayment = completePaidPayment(
                payment,
                resolvePaidAt(webhook.getOccurredAt(), gatewayStatus.getPaidAt()),
                firstNonBlank(webhook.getTransactionReference(), gatewayStatus.getTransactionReference())
        );

        log.info("PayOS payment {} has been confirmed and finalized for order {}",
                completedPayment.getId(), completedPayment.getOrder().getId());
        return mapToResponse(completedPayment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getCurrentUserPayments(String requesterEmail) {
        User requester = getUserByEmail(requesterEmail);
        return paymentRepository.findByOrderBuyerIdOrderByCreatedAtDesc(requester.getId()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PaymentResponse getPaymentByOrder(UUID orderId, String requesterEmail) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

        User requester = getUserByEmail(requesterEmail);
        ensureRequesterCanAccess(payment, requester);

        Payment syncedPayment = syncPaymentFromGateway(payment);
        return mapToResponse(syncedPayment);
    }

    @Override
    @Transactional
    public PaymentResponse getPaymentById(UUID paymentId, String requesterEmail) {
        Payment payment = getPaymentEntity(paymentId);
        User requester = getUserByEmail(requesterEmail);
        ensureRequesterCanAccess(payment, requester);

        Payment syncedPayment = syncPaymentFromGateway(payment);
        return mapToResponse(syncedPayment);
    }

    @Override
    @Transactional
    public PaymentStatusSummaryResponse getPaymentStatus(UUID orderId, String requesterEmail) {
        PaymentResponse payment = getPaymentByOrder(orderId, requesterEmail);
        return PaymentStatusSummaryResponse.builder()
                .paymentId(payment.getId())
                .orderId(payment.getOrderId())
                .orderStatus(payment.getOrderStatus())
                .paymentStatus(payment.getPaymentStatus())
                .checkoutUrl(payment.getCheckoutUrl())
                .downloadUrl(payment.getDownloadUrl())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getAdminPayments() {
        return paymentRepository.findTop50ByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private Order createOrder(User buyer, Asset item) {
        Order order = new Order();
        order.setBuyer(buyer);
        order.setAsset(item);
        order.setOrderType(resolveOrderType(item));
        order.setOrderStatus(OrderStatus.PENDING);
        order.setPricePaid(item.getPrice());
        return orderRepository.save(order);
    }

    private Wallet createWallet(User seller) {
        Wallet wallet = new Wallet();
        wallet.setUser(seller);
        wallet.setBalance(BigDecimal.ZERO);
        wallet.setCurrency(DEFAULT_CURRENCY);
        return walletRepository.save(wallet);
    }

    private Payment getPaymentEntity(UUID paymentId) {
        return paymentRepository.findById(paymentId)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private void validatePurchaserRole(User buyer) {
        String roleName = buyer.getRole().getName().toLowerCase(Locale.ROOT);
        if (!"customer".equals(roleName) && !"developer".equals(roleName)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
    }

    private void ensureRequesterCanAccess(Payment payment, User requester) {
        if (isAdmin(requester)) {
            return;
        }

        if (!payment.getOrder().getBuyer().getId().equals(requester.getId())) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
    }

    private boolean isAdmin(User user) {
        return "admin".equalsIgnoreCase(user.getRole().getName());
    }

    private boolean isActiveCheckout(Payment payment) {
        return (payment.getPaymentStatus() == PaymentStatus.PENDING || payment.getPaymentStatus() == PaymentStatus.PROCESSING)
                && StringUtils.hasText(payment.getCheckoutUrl());
    }

    private boolean isTerminalFailure(PaymentStatus status) {
        return status == PaymentStatus.CANCELLED
                || status == PaymentStatus.FAILED
                || status == PaymentStatus.EXPIRED;
    }

    private boolean isCompletedPayment(Payment payment) {
        return payment.getPaymentStatus() == PaymentStatus.PAID
                && payment.getOrder().getOrderStatus() == OrderStatus.PAID;
    }

    private Payment refreshPendingPaymentPricing(Order order, Payment payment, Asset item) {
        BigDecimal latestPrice = item.getPrice();
        boolean orderPriceChanged = order.getPricePaid() == null || order.getPricePaid().compareTo(latestPrice) != 0;
        boolean paymentAmountChanged = payment.getAmount() == null || payment.getAmount().compareTo(latestPrice) != 0;

        if (!orderPriceChanged && !paymentAmountChanged) {
            return payment;
        }

        log.info(
                "Refreshing pending payment {} for marketplace item {} from amount {} to {}",
                payment.getId(),
                item.getId(),
                payment.getAmount(),
                latestPrice
        );

        if (isActiveCheckout(payment) && payment.getPayosOrderCode() != null) {
            try {
                paymentGateway.cancelPayment(payment.getPayosOrderCode());
            } catch (Exception ex) {
                log.warn(
                        "Failed to cancel stale PayOS checkout {} while refreshing payment {} pricing: {}",
                        payment.getPayosOrderCode(),
                        payment.getId(),
                        ex.getMessage()
                );
            }
        }

        order.setPricePaid(latestPrice);
        orderRepository.save(order);

        payment.setAmount(latestPrice);
        payment.setCheckoutUrl(null);
        payment.setPayosOrderCode(null);
        payment.setPayosPaymentLinkId(null);
        payment.setPayosTransactionId(null);
        payment.setPaidAt(null);
        payment.setPaymentStatus(PaymentStatus.PENDING);

        return paymentRepository.save(payment);
    }

    @Transactional
    protected Payment syncPaymentFromGateway(Payment payment) {
        if (payment.getPayosOrderCode() == null || payment.getPaymentStatus() == PaymentStatus.PAID) {
            return payment;
        }

        PaymentGatewayStatusResponse gatewayStatus = paymentGateway.getPaymentStatus(payment.getPayosOrderCode());

        if (gatewayStatus.getStatus() == PaymentStatus.PAID) {
            payment.setPaymentStatus(PaymentStatus.PROCESSING);
        } else {
            applyGatewayStatus(payment, gatewayStatus);
        }

        payment.setPayosPaymentLinkId(firstNonBlank(gatewayStatus.getPaymentLinkId(), payment.getPayosPaymentLinkId()));
        return paymentRepository.save(payment);
    }

    private void applyGatewayStatus(Payment payment, PaymentGatewayStatusResponse gatewayStatus) {
        payment.setPayosPaymentLinkId(firstNonBlank(gatewayStatus.getPaymentLinkId(), payment.getPayosPaymentLinkId()));

        if (gatewayStatus.getStatus() == PaymentStatus.PAID) {
            payment.setPaymentStatus(PaymentStatus.PROCESSING);
            return;
        }

        payment.setPaymentStatus(gatewayStatus.getStatus());
        if (isTerminalFailure(gatewayStatus.getStatus())) {
            payment.setCheckoutUrl(null);
        }
    }

    private Payment completePaidPayment(Payment payment, Instant paidAt, String transactionReference) {
        Order order = payment.getOrder();
        Asset item = order.getAsset();

        if (order.getTransaction() == null) {
            BigDecimal platformCommission = calculatePlatformCommission(payment.getAmount());
            BigDecimal sellerRevenue = payment.getAmount().subtract(platformCommission);

            Wallet sellerWallet = walletRepository.findByUserId(item.getSeller().getId())
                    .orElseGet(() -> createWallet(item.getSeller()));

            if (!DEFAULT_CURRENCY.equalsIgnoreCase(sellerWallet.getCurrency())) {
                sellerWallet.setCurrency(DEFAULT_CURRENCY);
            }

            Transaction transaction = new Transaction();
            transaction.setWallet(sellerWallet);
            transaction.setRelatedUser(order.getBuyer());
            // Asset = tài nguyên lẻ, không gắn game (game-source purchase wire ở Phase 2)
            transaction.setGame(null);
            transaction.setAsset(item);
            transaction.setAmount(payment.getAmount());
            transaction.setPlatformCommission(platformCommission);
            transaction.setNetAmount(sellerRevenue);
            transaction.setType(resolveTransactionType(item));
            transaction.setStatus(TxnStatus.completed);
            transaction.setReferenceId(firstNonBlank(transactionReference, payment.getPaymentReference(), order.getId().toString()));

            Transaction savedTransaction = transactionRepository.save(transaction);
            sellerWallet.setBalance(sellerWallet.getBalance().add(sellerRevenue));
            walletRepository.save(sellerWallet);

            order.setTransaction(savedTransaction);
        }

        order.setOrderStatus(OrderStatus.PAID);
        orderRepository.save(order);

        payment.setPaymentStatus(PaymentStatus.PAID);
        payment.setPaidAt(payment.getPaidAt() != null ? payment.getPaidAt() : paidAt);
        payment.setPayosTransactionId(firstNonBlank(transactionReference, payment.getPayosTransactionId()));
        payment.setCheckoutUrl(null);

        return paymentRepository.save(payment);
    }

    private BigDecimal calculatePlatformCommission(BigDecimal paymentAmount) {
        BigDecimal commissionRate = platformSettingsService.getPlatformCommissionRate();
        return paymentAmount
                .multiply(commissionRate)
                .divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP);
    }

    private long toPayOSAmount(BigDecimal amount) {
        return amount.setScale(0, RoundingMode.HALF_UP).longValueExact();
    }

    private Long generatePayOSOrderCode() {
        for (int attempt = 0; attempt < 10; attempt++) {
            long raw = Math.abs(UUID.randomUUID().getMostSignificantBits());
            long candidate = 1_000_000_000L + (raw % 900_000_000_000L);
            if (!paymentRepository.existsByPayosOrderCode(candidate)) {
                return candidate;
            }
        }

        throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    private PaymentStatus resolveCreatedPaymentStatus(PaymentStatus gatewayStatus) {
        if (gatewayStatus == null || gatewayStatus == PaymentStatus.PAID) {
            return PaymentStatus.PENDING;
        }
        return gatewayStatus;
    }

    private String buildPaymentReference(UUID paymentId) {
        return "GL" + paymentId.toString().replace("-", "").substring(0, 10).toUpperCase(Locale.ROOT);
    }

    private String buildFreePaymentReference(UUID paymentId) {
        return "FREE-" + paymentId.toString().substring(0, 8).toUpperCase(Locale.ROOT);
    }

    private String buildFrontendUrl(String path) {
        String normalizedBase = frontendUrl != null ? frontendUrl.trim() : "http://localhost:3000";
        if (normalizedBase.endsWith("/")) {
            normalizedBase = normalizedBase.substring(0, normalizedBase.length() - 1);
        }
        return normalizedBase + path;
    }

    private String resolveBuyerName(User buyer) {
        if (StringUtils.hasText(buyer.getFullName())) {
            return buyer.getFullName().trim();
        }
        return buyer.getEmail();
    }

    private Instant resolvePaidAt(String... timestamps) {
        for (String timestamp : timestamps) {
            Instant parsed = parseInstant(timestamp);
            if (parsed != null) {
                return parsed;
            }
        }
        return Instant.now();
    }

    private Instant parseInstant(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        try {
            return Instant.parse(value);
        } catch (Exception ignored) {
        }

        try {
            return OffsetDateTime.parse(value).toInstant();
        } catch (Exception ignored) {
        }

        try {
            return LocalDateTime.parse(value).toInstant(ZoneOffset.UTC);
        } catch (Exception ignored) {
        }

        return null;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return null;
    }

    private OrderType resolveOrderType(Asset item) {
        // Asset = tài nguyên lẻ → luôn asset_purchase (source_code purchase thuộc luồng game market, Phase 2)
        return OrderType.asset_purchase;
    }

    private TxnType resolveTransactionType(Asset item) {
        return TxnType.asset_purchase;
    }

    private PaymentResponse mapToResponse(Payment payment) {
        Order order = payment.getOrder();
        Asset item = order.getAsset();

        return PaymentResponse.builder()
                .id(payment.getId())
                .orderId(order.getId())
                .assetId(item.getId())
                .assetTitle(item.getTitle())
                .assetType("asset")
                .buyerId(order.getBuyer().getId())
                .buyerEmail(order.getBuyer().getEmail())
                .buyerFullName(order.getBuyer().getFullName())
                .sellerId(item.getSeller().getId())
                .sellerEmail(item.getSeller().getEmail())
                .sellerFullName(item.getSeller().getFullName())
                .orderStatus(order.getOrderStatus())
                .paymentStatus(payment.getPaymentStatus())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .payosOrderCode(payment.getPayosOrderCode())
                .payosPaymentLinkId(payment.getPayosPaymentLinkId())
                .payosTransactionId(payment.getPayosTransactionId())
                .checkoutUrl(payment.getCheckoutUrl())
                .paymentReference(payment.getPaymentReference())
                .paidAt(payment.getPaidAt())
                .downloadUrl(resolveDownloadUrl(order, item, payment))
                .createdAt(payment.getCreatedAt())
                .updatedAt(payment.getUpdatedAt())
                .build();
    }

    private String resolveDownloadUrl(Order order, Asset item, Payment payment) {
        if (order.getOrderStatus() != OrderStatus.PAID
                || payment.getPaymentStatus() != PaymentStatus.PAID) {
            return null;
        }

        // Asset = file đã upload: có file thật (khác 'pending') mới cho tải.
        boolean hasFile = StringUtils.hasText(item.getFileUrl())
                && !"pending".equalsIgnoreCase(item.getFileUrl());
        if (!hasFile) {
            return null;
        }

        return "/api/v1/downloads/" + order.getId();
    }
}
