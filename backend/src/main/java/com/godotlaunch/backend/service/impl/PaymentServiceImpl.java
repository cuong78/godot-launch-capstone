package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.CreatePaymentRequest;
import com.godotlaunch.backend.dto.request.CreateTopUpRequest;
import com.godotlaunch.backend.dto.response.PaymentResponse;
import com.godotlaunch.backend.dto.response.PaymentStatusSummaryResponse;
import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.Order;
import com.godotlaunch.backend.entity.Payment;
import com.godotlaunch.backend.entity.Transaction;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Wallet;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import com.godotlaunch.backend.entity.enums.OrderType;
import com.godotlaunch.backend.entity.enums.PaymentStatus;
import com.godotlaunch.backend.entity.enums.TxnType;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.dto.request.PaymentGatewayCreateRequest;
import com.godotlaunch.backend.dto.response.PaymentGatewayCreateResponse;
import com.godotlaunch.backend.dto.response.PaymentGatewayStatusResponse;
import com.godotlaunch.backend.dto.response.PaymentGatewayWebhookResult;
import com.godotlaunch.backend.repository.AssetRepository;
import com.godotlaunch.backend.repository.OrderRepository;
import com.godotlaunch.backend.repository.PaymentRepository;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import com.godotlaunch.backend.repository.TransactionRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.WalletRepository;
import com.godotlaunch.backend.repository.PaymentGateway;
import com.godotlaunch.backend.service.EmailService;
import com.godotlaunch.backend.service.PaymentService;
import com.godotlaunch.backend.service.PlatformSettingsService;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.repository.GameRepository;
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
    private final EmailService emailService;
    private final GameRepository gameRepository;

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

        if (orderRepository.existsByBuyerIdAndAssetId(buyer.getId(), item.getId())) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }

        Wallet buyerWallet = walletRepository.findByUserId(buyer.getId())
                .orElseGet(() -> createWallet(buyer));

        String buyRef = "BUY_ASSET:" + item.getId();

        Payment payment = paymentRepository.findByWalletIdAndPaymentReferenceAndPaymentStatus(
                buyerWallet.getId(), buyRef, PaymentStatus.PENDING).orElse(null);

        if (payment == null) {
            payment = new Payment();
            payment.setWallet(buyerWallet);
            payment.setPaymentStatus(PaymentStatus.PENDING);
            payment.setAmount(item.getPrice());
            payment.setCurrency(DEFAULT_CURRENCY);
            payment.setPaymentReference(buyRef);
            payment = paymentRepository.save(payment);
        } else {
            payment = syncPaymentFromGateway(payment);
            payment.setCurrency(DEFAULT_CURRENCY);
            if (payment.getPaymentStatus() == PaymentStatus.PAID) {
                return mapToResponse(paymentRepository.save(payment));
            }

            if (payment.getAmount().compareTo(item.getPrice()) != 0) {
                payment.setAmount(item.getPrice());
                payment = paymentRepository.save(payment);
            }

            if (isActiveCheckout(payment)) {
                return mapToResponse(payment);
            }
        }

        if (payment.getAmount().compareTo(BigDecimal.ZERO) == 0) {
            payment.setCheckoutUrl(null);
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
        payment.setPaidAt(null);

        return mapToResponse(paymentRepository.save(payment));
    }

    @Override
    @Transactional
    public PaymentResponse createTopUpPayment(CreateTopUpRequest request, String buyerEmail) {
        User buyer = getUserByEmail(buyerEmail);
        validatePurchaserRole(buyer);

        Wallet buyerWallet = walletRepository.findByUserId(buyer.getId())
                .orElseGet(() -> createWallet(buyer));

        Payment payment = new Payment();
        payment.setWallet(buyerWallet);
        payment.setPaymentStatus(PaymentStatus.PENDING);
        payment.setAmount(request.getAmount());
        payment.setCurrency(DEFAULT_CURRENCY);
        payment = paymentRepository.save(payment);
        payment.setPaymentReference(buildTopUpReference(payment.getId()));

        PaymentGatewayCreateResponse gatewayResponse = paymentGateway.createPayment(
                PaymentGatewayCreateRequest.builder()
                        .orderCode(generatePayOSOrderCode())
                        .amount(toPayOSAmount(payment.getAmount()))
                        .buyerName(resolveBuyerName(buyer))
                        .buyerEmail(buyer.getEmail())
                        .itemName("Wallet top-up")
                        .description(buildPaymentReference(payment.getId()))
                        .returnUrl(buildFrontendUrl("/payment/success?paymentId=" + payment.getId()))
                        .cancelUrl(buildFrontendUrl("/payment/cancelled?paymentId=" + payment.getId()))
                        .expiredAt(Instant.now().plusSeconds(PAYMENT_LINK_EXPIRY_MINUTES * 60L).getEpochSecond())
                        .build()
        );

        payment.setPaymentStatus(resolveCreatedPaymentStatus(gatewayResponse.getStatus()));
        payment.setPayosOrderCode(gatewayResponse.getOrderCode());
        payment.setPayosPaymentLinkId(gatewayResponse.getPaymentLinkId());
        payment.setCheckoutUrl(gatewayResponse.getCheckoutUrl());

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

        log.info("PayOS payment {} has been confirmed and finalized", completedPayment.getId());
        return mapToResponse(completedPayment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getCurrentUserPayments(String requesterEmail) {
        User requester = getUserByEmail(requesterEmail);
        return paymentRepository.findByWalletUserIdOrderByCreatedAtDesc(requester.getId()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PaymentResponse getPaymentByOrder(UUID orderId, String requesterEmail) {
        Transaction txn = transactionRepository.findByOrderIdAndPaymentIsNotNull(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

        Payment payment = txn.getPayment();
        if (payment == null) {
            throw new AppException(ErrorCode.PAYMENT_NOT_FOUND);
        }

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

        if (!payment.getWallet().getUser().getId().equals(requester.getId())) {
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
        return payment.getPaymentStatus() == PaymentStatus.PAID;
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

        if (gatewayStatus.getStatus() != PaymentStatus.PAID) {
            applyGatewayStatus(payment, gatewayStatus);
            payment.setPayosPaymentLinkId(firstNonBlank(gatewayStatus.getPaymentLinkId(), payment.getPayosPaymentLinkId()));
            return paymentRepository.save(payment);
        }

        // PayOS confirms PAID here — finalize immediately instead of waiting for the webhook,
        // since the webhook may never arrive in local/dev setups without a public tunnel.
        Payment lockedPayment = paymentRepository.findByIdForUpdate(payment.getId())
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));
        if (lockedPayment.getPaymentStatus() == PaymentStatus.PAID) {
            return lockedPayment;
        }

        lockedPayment.setPayosPaymentLinkId(firstNonBlank(gatewayStatus.getPaymentLinkId(), lockedPayment.getPayosPaymentLinkId()));
        lockedPayment.setPaymentReference(firstNonBlank(lockedPayment.getPaymentReference(), buildPaymentReference(lockedPayment.getId())));

        Payment completedPayment = completePaidPayment(
                lockedPayment,
                resolvePaidAt(gatewayStatus.getPaidAt()),
                gatewayStatus.getTransactionReference()
        );

        log.info("Payment {} finalized via confirm/sync fallback (webhook not required)", completedPayment.getId());
        return completedPayment;
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
        Wallet buyerWallet = payment.getWallet();
        buyerWallet.setBalance(buyerWallet.getBalance().add(payment.getAmount()));
        walletRepository.save(buyerWallet);

        String paymentReference = payment.getPaymentReference();
        if (paymentReference != null && paymentReference.startsWith("BUY_ASSET:")) {
            UUID assetId = UUID.fromString(paymentReference.substring("BUY_ASSET:".length()));
            Asset item = assetRepository.findById(assetId)
                    .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));
            User buyer = buyerWallet.getUser();

            Order order = orderRepository.findByBuyerIdAndAssetId(buyer.getId(), item.getId()).orElse(null);
            if (order == null) {
                order = new Order();
                order.setBuyer(buyer);
                order.setAsset(item);
                order.setOrderType(resolveOrderType(item));
                order.setPricePaid(item.getPrice());
                order = orderRepository.save(order);
            }

            if (!transactionRepository.existsByOrderId(order.getId())) {
                BigDecimal platformCommission = calculatePlatformCommission(payment.getAmount());
                BigDecimal sellerRevenue = payment.getAmount().subtract(platformCommission);

                Wallet sellerWallet = walletRepository.findByUserId(item.getSeller().getId())
                        .orElseGet(() -> createWallet(item.getSeller()));

                if (!DEFAULT_CURRENCY.equalsIgnoreCase(sellerWallet.getCurrency())) {
                    sellerWallet.setCurrency(DEFAULT_CURRENCY);
                }

                Transaction transaction = new Transaction();
                transaction.setWallet(sellerWallet);
                transaction.setRelatedUser(buyer);
                transaction.setGame(null);
                transaction.setAsset(item);
                transaction.setAmount(sellerRevenue);
                transaction.setType(resolveTransactionType(item));
                transaction.setReferenceId(firstNonBlank(transactionReference, payment.getPaymentReference(), order.getId().toString()));
                transaction.setOrder(order);
                transactionRepository.save(transaction);

                sellerWallet.setBalance(sellerWallet.getBalance().add(sellerRevenue));
                walletRepository.save(sellerWallet);

                buyerWallet.setBalance(buyerWallet.getBalance().subtract(payment.getAmount()));
                walletRepository.save(buyerWallet);

                Transaction buyerTxn = new Transaction();
                buyerTxn.setWallet(buyerWallet);
                buyerTxn.setRelatedUser(item.getSeller());
                buyerTxn.setAsset(item);
                buyerTxn.setAmount(payment.getAmount().negate());
                buyerTxn.setType(resolveTransactionType(item));
                buyerTxn.setReferenceId(firstNonBlank(transactionReference, payment.getPaymentReference(), order.getId().toString()));
                buyerTxn.setOrder(order);
                buyerTxn.setPayment(payment);
                transactionRepository.save(buyerTxn);
            }
        } else {
            if (!transactionRepository.findByPaymentId(payment.getId()).isPresent()) {
                Transaction transaction = new Transaction();
                transaction.setWallet(buyerWallet);
                transaction.setAmount(payment.getAmount());
                transaction.setType(TxnType.wallet_topup);
                transaction.setReferenceId(firstNonBlank(transactionReference, payment.getPaymentReference()));
                transaction.setPayment(payment);
                transactionRepository.save(transaction);

                sendTopUpConfirmationEmail(buyerWallet.getUser(), payment);
            }
        }

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

    private String buildTopUpReference(UUID paymentId) {
        return "TOPUP:" + paymentId;
    }

    private void sendTopUpConfirmationEmail(User buyer, Payment payment) {
        try {
            String amountText = payment.getAmount().setScale(0, RoundingMode.HALF_UP).toPlainString();
            emailService.sendNotificationEmail(
                    buyer.getEmail(),
                    "Wallet top-up successful",
                    "Your wallet has been topped up with " + amountText + " " + DEFAULT_CURRENCY
                            + ". Transaction reference: " + firstNonBlank(payment.getPaymentReference(), payment.getId().toString()) + "."
            );
        } catch (Exception ex) {
            log.warn("Failed to send top-up confirmation email to {}: {}", buyer.getEmail(), ex.getMessage());
        }
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
        UUID assetId = null;
        String assetTitle = null;
        String assetType = "asset";
        UUID orderId = null;
        UUID buyerId = payment.getWallet().getUser().getId();
        String buyerEmail = payment.getWallet().getUser().getEmail();
        String buyerFullName = payment.getWallet().getUser().getFullName();
        UUID sellerId = null;
        String sellerEmail = null;
        String sellerFullName = null;

        String ref = payment.getPaymentReference();
        if (ref != null && ref.startsWith("BUY_ASSET:")) {
            try {
                assetId = UUID.fromString(ref.substring("BUY_ASSET:".length()));
                Asset asset = assetRepository.findById(assetId).orElse(null);
                if (asset != null) {
                    assetTitle = asset.getTitle();
                    sellerId = asset.getSeller().getId();
                    sellerEmail = asset.getSeller().getEmail();
                    sellerFullName = asset.getSeller().getFullName();
                    assetType = "asset";
                }
            } catch (Exception e) {
                // Ignore parsing errors
            }
        } else if (ref != null && ref.startsWith("BUY_GAME:")) {
            try {
                UUID gameId = UUID.fromString(ref.substring("BUY_GAME:".length()));
                Game game = gameRepository.findById(gameId).orElse(null);
                if (game != null) {
                    assetId = game.getId();
                    assetTitle = game.getTitle();
                    sellerId = game.getCreator().getId();
                    sellerEmail = game.getCreator().getEmail();
                    sellerFullName = game.getCreator().getFullName();
                    assetType = "game_source";
                }
            } catch (Exception e) {
                // Ignore parsing errors
            }
        }

        if (payment.getPaymentStatus() == PaymentStatus.PAID) {
            Transaction txn = transactionRepository.findByPaymentId(payment.getId()).orElse(null);
            if (txn != null && txn.getOrder() != null) {
                orderId = txn.getOrder().getId();
                if (txn.getAsset() != null) {
                    assetId = txn.getAsset().getId();
                    assetTitle = txn.getAsset().getTitle();
                    sellerId = txn.getAsset().getSeller().getId();
                    sellerEmail = txn.getAsset().getSeller().getEmail();
                    sellerFullName = txn.getAsset().getSeller().getFullName();
                    assetType = "asset";
                } else if (txn.getGame() != null) {
                    assetId = txn.getGame().getId();
                    assetTitle = txn.getGame().getTitle();
                    sellerId = txn.getGame().getCreator().getId();
                    sellerEmail = txn.getGame().getCreator().getEmail();
                    sellerFullName = txn.getGame().getCreator().getFullName();
                    assetType = "game_source";
                }
            }
        }

        return PaymentResponse.builder()
                .id(payment.getId())
                .orderId(orderId)
                .assetId(assetId)
                .assetTitle(assetTitle)
                .assetType(assetType)
                .marketplaceItemId(assetId)
                .marketplaceItemTitle(assetTitle)
                .marketplaceItemType(assetType)
                .buyerId(buyerId)
                .buyerEmail(buyerEmail)
                .buyerFullName(buyerFullName)
                .sellerId(sellerId)
                .sellerEmail(sellerEmail)
                .sellerFullName(sellerFullName)
                .paymentStatus(payment.getPaymentStatus())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .payosOrderCode(payment.getPayosOrderCode())
                .payosPaymentLinkId(payment.getPayosPaymentLinkId())
                .payosTransactionId(payment.getPayosTransactionId())
                .checkoutUrl(payment.getCheckoutUrl())
                .paymentReference(payment.getPaymentReference())
                .paidAt(payment.getPaidAt())
                .downloadUrl(orderId != null && assetId != null ? "/api/v1/downloads/" + orderId : null)
                .createdAt(payment.getCreatedAt())
                .updatedAt(payment.getUpdatedAt())
                .build();
    }

}
