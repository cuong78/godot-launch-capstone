package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.CreatePaymentRequest;
import com.godotlaunch.backend.dto.request.PaymentVerificationRequest;
import com.godotlaunch.backend.dto.request.UploadReceiptRequest;
import com.godotlaunch.backend.dto.response.PaymentResponse;
import com.godotlaunch.backend.entity.MarketplaceItem;
import com.godotlaunch.backend.entity.Order;
import com.godotlaunch.backend.entity.Payment;
import com.godotlaunch.backend.entity.Transaction;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Wallet;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import com.godotlaunch.backend.entity.enums.OrderType;
import com.godotlaunch.backend.entity.enums.PaymentMethod;
import com.godotlaunch.backend.entity.enums.PaymentStatus;
import com.godotlaunch.backend.entity.enums.TxnStatus;
import com.godotlaunch.backend.entity.enums.TxnType;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.MarketplaceItemRepository;
import com.godotlaunch.backend.repository.OrderRepository;
import com.godotlaunch.backend.repository.PaymentRepository;
import com.godotlaunch.backend.repository.TransactionRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.WalletRepository;
import com.godotlaunch.backend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    private static final String DEFAULT_CURRENCY = "USD";

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final MarketplaceItemRepository marketplaceItemRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final StorageRouter storageRouter;
    private final PaymentReceiptStorageService paymentReceiptStorageService;

    @Override
    @Transactional
    public PaymentResponse createPayment(CreatePaymentRequest request, String buyerEmail) {
        User buyer = getUserByEmail(buyerEmail);
        validatePurchaserRole(buyer);

        MarketplaceItem item = marketplaceItemRepository.findById(request.getMarketplaceItemId())
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));

        if (item.getStatus() != ItemStatus.active) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }

        if (item.getSeller().getId().equals(buyer.getId())) {
            throw new AppException(ErrorCode.OWN_PRODUCT_PURCHASE_NOT_ALLOWED);
        }

        Order order = orderRepository.findByBuyerIdAndMarketplaceItemId(buyer.getId(), item.getId())
                .orElseGet(() -> createOrder(buyer, item));

        Payment existingPayment = order.getPayment();
        if (existingPayment != null) {
            return mapToResponse(existingPayment);
        }

        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setPaymentMethod(PaymentMethod.MANUAL_BANK_TRANSFER);
        payment.setAmount(item.getPrice());
        payment.setCurrency(DEFAULT_CURRENCY);
        payment.setTransferReference(buildTransferReference(order.getId()));

        if (item.getPrice().compareTo(BigDecimal.ZERO) == 0) {
            payment.setPaymentStatus(PaymentStatus.PAID);
        } else {
            payment.setPaymentStatus(PaymentStatus.PENDING);
        }

        Payment savedPayment = paymentRepository.save(payment);
        return mapToResponse(savedPayment);
    }

    @Override
    @Transactional
    public PaymentResponse uploadReceipt(UUID paymentId, UploadReceiptRequest request, String buyerEmail) {
        Payment payment = getPaymentEntity(paymentId);
        User buyer = getUserByEmail(buyerEmail);
        ensureBuyerOwnsPayment(payment, buyer);

        if (payment.getAmount().compareTo(BigDecimal.ZERO) == 0) {
            return mapToResponse(payment);
        }

        if (payment.getPaymentStatus() == PaymentStatus.PAID) {
            throw new AppException(ErrorCode.PAYMENT_ALREADY_PAID);
        }

        if (payment.getPaymentStatus() == PaymentStatus.WAITING_VERIFICATION) {
            throw new AppException(ErrorCode.PAYMENT_NOT_READY_FOR_RECEIPT);
        }

        if (request.getReceiptFile() == null || request.getReceiptFile().isEmpty()) {
            throw new AppException(ErrorCode.PAYMENT_RECEIPT_REQUIRED);
        }

        String receiptUrl = uploadReceiptFile(request.getReceiptFile());

        payment.setReceiptUrl(receiptUrl);
        payment.setPayerName(request.getPayerName().trim());
        payment.setPayerBank(request.getPayerBank().trim());
        payment.setTransferReference(request.getTransferReference().trim());
        payment.setPaymentStatus(PaymentStatus.WAITING_VERIFICATION);
        payment.setVerifiedBy(null);
        payment.setVerifiedAt(null);
        payment.setRejectionReason(null);

        return mapToResponse(paymentRepository.save(payment));
    }

    @Override
    @Transactional
    public PaymentResponse approvePayment(UUID paymentId, String adminEmail) {
        Payment payment = getPaymentEntity(paymentId);
        User admin = getUserByEmail(adminEmail);

        if (payment.getPaymentStatus() == PaymentStatus.PAID) {
            throw new AppException(ErrorCode.PAYMENT_ALREADY_PAID);
        }

        if (payment.getPaymentStatus() != PaymentStatus.WAITING_VERIFICATION) {
            throw new AppException(ErrorCode.PAYMENT_NOT_AWAITING_VERIFICATION);
        }

        Order order = payment.getOrder();
        MarketplaceItem item = order.getMarketplaceItem();
        Wallet sellerWallet = walletRepository.findByUserId(item.getSeller().getId())
                .orElseGet(() -> createWallet(item.getSeller(), payment.getCurrency()));

        Transaction transaction = new Transaction();
        transaction.setWallet(sellerWallet);
        transaction.setRelatedUser(order.getBuyer());
        transaction.setGame(item.getSourceGame());
        transaction.setAmount(payment.getAmount());
        transaction.setPlatformCommission(BigDecimal.ZERO);
        transaction.setNetAmount(payment.getAmount());
        transaction.setType(TxnType.source_code_purchase);
        transaction.setStatus(TxnStatus.completed);
        transaction.setReferenceId(payment.getTransferReference());
        Transaction savedTransaction = transactionRepository.save(transaction);

        sellerWallet.setBalance(sellerWallet.getBalance().add(savedTransaction.getNetAmount()));
        walletRepository.save(sellerWallet);

        order.setTransaction(savedTransaction);
        orderRepository.save(order);

        payment.setPaymentStatus(PaymentStatus.PAID);
        payment.setVerifiedBy(admin);
        payment.setVerifiedAt(Instant.now());
        payment.setRejectionReason(null);

        return mapToResponse(paymentRepository.save(payment));
    }

    @Override
    @Transactional
    public PaymentResponse rejectPayment(UUID paymentId, PaymentVerificationRequest request, String adminEmail) {
        Payment payment = getPaymentEntity(paymentId);
        User admin = getUserByEmail(adminEmail);

        if (payment.getPaymentStatus() == PaymentStatus.PAID) {
            throw new AppException(ErrorCode.PAYMENT_ALREADY_PAID);
        }

        if (payment.getPaymentStatus() != PaymentStatus.WAITING_VERIFICATION) {
            throw new AppException(ErrorCode.PAYMENT_NOT_AWAITING_VERIFICATION);
        }

        if (!StringUtils.hasText(request.getRejectionReason())) {
            throw new AppException(ErrorCode.PAYMENT_REJECTION_REASON_REQUIRED);
        }

        payment.setPaymentStatus(PaymentStatus.REJECTED);
        payment.setVerifiedBy(admin);
        payment.setVerifiedAt(Instant.now());
        payment.setRejectionReason(request.getRejectionReason().trim());

        return mapToResponse(paymentRepository.save(payment));
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentResponse getPaymentByOrder(UUID orderId, String requesterEmail) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

        User requester = getUserByEmail(requesterEmail);
        boolean isAdmin = isAdmin(requester);
        if (!isAdmin && !payment.getOrder().getBuyer().getId().equals(requester.getId())) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        return mapToResponse(payment);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentResponse getPaymentById(UUID paymentId) {
        return mapToResponse(getPaymentEntity(paymentId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getPendingPayments() {
        return paymentRepository.findByPaymentStatusOrderByCreatedAtAsc(PaymentStatus.WAITING_VERIFICATION).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Resource loadReceiptFile(UUID paymentId, String requesterEmail) {
        Payment payment = getPaymentEntity(paymentId);
        User requester = getUserByEmail(requesterEmail);
        boolean isAdmin = isAdmin(requester);
        if (!isAdmin && !payment.getOrder().getBuyer().getId().equals(requester.getId())) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        if (!paymentReceiptStorageService.isLocalStorageRef(payment.getReceiptUrl())) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }

        return paymentReceiptStorageService.loadAsResource(payment.getReceiptUrl());
    }

    private Order createOrder(User buyer, MarketplaceItem item) {
        Order order = new Order();
        order.setBuyer(buyer);
        order.setMarketplaceItem(item);
        order.setOrderType(OrderType.source_code_purchase);
        order.setPricePaid(item.getPrice());
        return orderRepository.save(order);
    }

    private Wallet createWallet(User seller, String currency) {
        Wallet wallet = new Wallet();
        wallet.setUser(seller);
        wallet.setBalance(BigDecimal.ZERO);
        wallet.setCurrency(currency);
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

    private void ensureBuyerOwnsPayment(Payment payment, User buyer) {
        if (!payment.getOrder().getBuyer().getId().equals(buyer.getId())) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
    }

    private boolean isAdmin(User user) {
        return "admin".equalsIgnoreCase(user.getRole().getName());
    }

    private String buildTransferReference(UUID orderId) {
        return "GL-" + orderId.toString().substring(0, 8).toUpperCase(Locale.ROOT);
    }

    private String uploadReceiptFile(org.springframework.web.multipart.MultipartFile receiptFile) {
        try {
            return storageRouter.upload(
                    com.godotlaunch.backend.entity.enums.FileType.payment_receipt,
                    receiptFile,
                    "payments/receipts"
            );
        } catch (RuntimeException ex) {
            if (isMissingStorageConfig(ex)) {
                log.warn("Remote storage is not configured for payment receipts. Falling back to local receipt storage. Cause: {}", ex.getMessage());
                return paymentReceiptStorageService.storeLocally(receiptFile);
            }
            throw ex;
        }
    }

    private boolean isMissingStorageConfig(RuntimeException ex) {
        String message = ex.getMessage();
        return message != null
                && message.contains("payment_receipt")
                && message.contains("chưa được gán bucket");
    }

    private PaymentResponse mapToResponse(Payment payment) {
        Order order = payment.getOrder();
        MarketplaceItem item = order.getMarketplaceItem();

        return PaymentResponse.builder()
                .id(payment.getId())
                .orderId(order.getId())
                .marketplaceItemId(item.getId())
                .marketplaceItemTitle(item.getTitle())
                .marketplaceItemType(item.getItemType())
                .buyerId(order.getBuyer().getId())
                .buyerEmail(order.getBuyer().getEmail())
                .buyerFullName(order.getBuyer().getFullName())
                .sellerId(item.getSeller().getId())
                .sellerEmail(item.getSeller().getEmail())
                .sellerFullName(item.getSeller().getFullName())
                .paymentMethod(payment.getPaymentMethod())
                .paymentStatus(payment.getPaymentStatus())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .receiptUrl(resolveReceiptUrl(payment))
                .payerName(payment.getPayerName())
                .payerBank(payment.getPayerBank())
                .transferReference(payment.getTransferReference())
                .verifiedById(payment.getVerifiedBy() != null ? payment.getVerifiedBy().getId() : null)
                .verifiedByEmail(payment.getVerifiedBy() != null ? payment.getVerifiedBy().getEmail() : null)
                .verifiedAt(payment.getVerifiedAt())
                .rejectionReason(payment.getRejectionReason())
                .downloadUrl(payment.getPaymentStatus() == PaymentStatus.PAID ? item.getFileUrl() : null)
                .createdAt(payment.getCreatedAt())
                .updatedAt(payment.getUpdatedAt())
                .build();
    }

    private String resolveReceiptUrl(Payment payment) {
        if (paymentReceiptStorageService.isLocalStorageRef(payment.getReceiptUrl())) {
            return "/api/v1/payments/" + payment.getId() + "/receipt-file";
        }
        return payment.getReceiptUrl();
    }
}
