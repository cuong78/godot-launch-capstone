package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.request.CreatePaymentRequest;
import com.godotlaunch.backend.dto.request.CreateTopUpRequest;
import com.godotlaunch.backend.dto.response.PaymentResponse;
import com.godotlaunch.backend.dto.response.PaymentGatewayCreateResponse;
import com.godotlaunch.backend.dto.response.PaymentGatewayStatusResponse;
import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.Order;
import com.godotlaunch.backend.entity.Payment;
import com.godotlaunch.backend.entity.Transaction;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Wallet;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.enums.PaymentStatus;
import com.godotlaunch.backend.entity.enums.TxnType;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import com.godotlaunch.backend.repository.AssetRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.OrderRepository;
import com.godotlaunch.backend.repository.PaymentGateway;
import com.godotlaunch.backend.repository.PaymentRepository;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import com.godotlaunch.backend.repository.TransactionRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.WalletRepository;
import com.godotlaunch.backend.service.EmailService;
import com.godotlaunch.backend.service.PlatformSettingsService;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.constant.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceImplTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private AssetRepository assetRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private SourceSnapshotRepository sourceSnapshotRepository;

    @Mock
    private PaymentGateway paymentGateway;

    @Mock
    private PlatformSettingsService platformSettingsService;

    @Mock
    private EmailService emailService;

    @Mock
    private GameRepository gameRepository;

    @InjectMocks
    private PaymentServiceImpl paymentService;

    private User buyer;
    private User seller;
    private User platformAdmin;
    private Wallet buyerWallet;
    private Wallet sellerWallet;
    private Wallet platformWallet;
    private Asset asset;
    private Payment payment;

    @BeforeEach
    void setUp() {
        Role customerRole = new Role();
        customerRole.setName("customer");

        Role developerRole = new Role();
        developerRole.setName("developer");

        Role adminRole = new Role();
        adminRole.setName("admin");

        buyer = new User();
        buyer.setId(UUID.randomUUID());
        buyer.setEmail("buyer@godotlaunch.dev");
        buyer.setFullName("Buyer");
        buyer.setRole(customerRole);

        seller = new User();
        seller.setId(UUID.randomUUID());
        seller.setEmail("seller@godotlaunch.dev");
        seller.setFullName("Seller");
        seller.setRole(developerRole);

        platformAdmin = new User();
        platformAdmin.setId(UUID.randomUUID());
        platformAdmin.setEmail("admin@godotlaunch.com");
        platformAdmin.setFullName("Platform Admin");
        platformAdmin.setRole(adminRole);

        buyerWallet = new Wallet();
        buyerWallet.setId(UUID.randomUUID());
        buyerWallet.setUser(buyer);
        buyerWallet.setCurrency("VND");
        buyerWallet.setBalance(BigDecimal.ZERO);

        sellerWallet = new Wallet();
        sellerWallet.setId(UUID.randomUUID());
        sellerWallet.setUser(seller);
        sellerWallet.setCurrency("VND");
        sellerWallet.setBalance(new BigDecimal("50000"));

        platformWallet = new Wallet();
        platformWallet.setId(UUID.randomUUID());
        platformWallet.setUser(platformAdmin);
        platformWallet.setCurrency("VND");
        platformWallet.setBalance(new BigDecimal("20000"));

        asset = new Asset();
        asset.setId(UUID.randomUUID());
        asset.setTitle("Test Asset");
        asset.setPrice(new BigDecimal("100000"));
        asset.setSeller(seller);

        payment = new Payment();
        payment.setId(UUID.randomUUID());
        payment.setWallet(buyerWallet);
        payment.setPaymentStatus(PaymentStatus.PENDING);
        payment.setAmount(new BigDecimal("100000"));
        payment.setCurrency("VND");
        payment.setCheckoutUrl("https://pay.example/checkout");
        payment.setPaymentReference("BUY_ASSET:" + asset.getId());
    }

    @Test
    void completePaidPayment_ShouldCreditPlatformWalletAndCreateCommissionTransaction() throws Exception {
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(orderRepository.findByBuyerIdAndAssetId(buyer.getId(), asset.getId())).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            if (order.getId() == null) {
                order.setId(UUID.randomUUID());
            }
            return order;
        });
        when(transactionRepository.existsByOrderId(any(UUID.class))).thenReturn(false);
        when(walletRepository.findByUserId(seller.getId())).thenReturn(Optional.of(sellerWallet));
        when(userRepository.findByEmail("admin@godotlaunch.com")).thenReturn(Optional.of(platformAdmin));
        when(walletRepository.findByUserId(platformAdmin.getId())).thenReturn(Optional.of(platformWallet));
        when(platformSettingsService.getPlatformCommissionRate()).thenReturn(BigDecimal.TEN);
        when(walletRepository.save(any(Wallet.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Payment completedPayment = invokeCompletePaidPayment(
                payment,
                Instant.parse("2026-07-11T10:15:30Z"),
                "payos_tx_123"
        );

        assertEquals(PaymentStatus.PAID, completedPayment.getPaymentStatus());
        assertEquals(0, buyerWallet.getBalance().compareTo(BigDecimal.ZERO));
        assertEquals(0, sellerWallet.getBalance().compareTo(new BigDecimal("140000.00")));
        assertEquals(0, platformWallet.getBalance().compareTo(new BigDecimal("30000.00")));
        assertEquals("payos_tx_123", completedPayment.getPayosTransactionId());
        assertNull(completedPayment.getCheckoutUrl());
        assertNotNull(completedPayment.getPaidAt());

        ArgumentCaptor<Transaction> txnCaptor = ArgumentCaptor.forClass(Transaction.class);
        verify(transactionRepository, times(3)).save(txnCaptor.capture());
        List<Transaction> savedTransactions = txnCaptor.getAllValues();

        Transaction commissionTxn = savedTransactions.stream()
                .filter(txn -> txn.getType() == TxnType.commission)
                .findFirst()
                .orElseThrow();

        assertEquals(platformWallet, commissionTxn.getWallet());
        assertEquals(0, commissionTxn.getAmount().compareTo(new BigDecimal("10000.00")));
        assertEquals(asset, commissionTxn.getAsset());
        assertEquals(buyer, commissionTxn.getRelatedUser());
    }

    private Payment invokeCompletePaidPayment(Payment targetPayment, Instant paidAt, String transactionReference) throws Exception {
        Method method = PaymentServiceImpl.class.getDeclaredMethod(
                "completePaidPayment",
                Payment.class,
                Instant.class,
                String.class
        );
        method.setAccessible(true);
        return (Payment) method.invoke(paymentService, targetPayment, paidAt, transactionReference);
    }

    @Test
    void createPayOSPayment_ShouldCallGatewayAndReturnResponse() {
        // Arrange
        CreatePaymentRequest request = new CreatePaymentRequest();
        request.setAssetId(asset.getId());
        asset.setStatus(ItemStatus.active);

        PaymentGatewayCreateResponse gatewayRes = PaymentGatewayCreateResponse.builder()
                .orderCode(123456L)
                .paymentLinkId("link_id")
                .checkoutUrl("https://checkout.url")
                .status(PaymentStatus.PENDING)
                .build();

        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(orderRepository.existsByBuyerIdAndAssetId(buyer.getId(), asset.getId())).thenReturn(false);
        when(walletRepository.findByUserId(buyer.getId())).thenReturn(Optional.of(buyerWallet));
        when(paymentRepository.findByWalletIdAndPaymentReferenceAndPaymentStatus(any(), any(), any())).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            Payment p = invocation.getArgument(0);
            if (p.getId() == null) {
                p.setId(UUID.randomUUID());
            }
            return p;
        });
        when(paymentGateway.createPayment(any())).thenReturn(gatewayRes);

        // Act
        PaymentResponse response = paymentService.createPayOSPayment(request, buyer.getEmail());

        // Assert
        assertNotNull(response);
        assertEquals("https://checkout.url", response.getCheckoutUrl());
        verify(paymentGateway, times(1)).createPayment(any());
    }

    @Test
    void createTopUpPayment_ShouldSavePaymentAndCallGateway() {
        // Arrange
        CreateTopUpRequest request = new CreateTopUpRequest();
        request.setAmount(new BigDecimal("200000"));

        PaymentGatewayCreateResponse gatewayRes = PaymentGatewayCreateResponse.builder()
                .orderCode(654321L)
                .paymentLinkId("topup_link_id")
                .checkoutUrl("https://topup.checkout.url")
                .status(PaymentStatus.PENDING)
                .build();

        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(walletRepository.findByUserId(buyer.getId())).thenReturn(Optional.of(buyerWallet));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            Payment p = invocation.getArgument(0);
            if (p.getId() == null) {
                p.setId(UUID.randomUUID());
            }
            return p;
        });
        when(paymentGateway.createPayment(any())).thenReturn(gatewayRes);

        // Act
        PaymentResponse response = paymentService.createTopUpPayment(request, buyer.getEmail());

        // Assert
        assertNotNull(response);
        assertEquals("https://topup.checkout.url", response.getCheckoutUrl());
        verify(paymentGateway, times(1)).createPayment(any());
    }

    @Test
    void confirmPayment_ShouldSyncGatewayStatus() {
        // Arrange
        UUID pId = UUID.randomUUID();
        Payment p = new Payment();
        p.setId(pId);
        p.setWallet(buyerWallet);
        p.setPaymentStatus(PaymentStatus.PENDING);
        p.setAmount(new BigDecimal("100000"));
        p.setPayosOrderCode(123456L);

        PaymentGatewayStatusResponse statusRes = PaymentGatewayStatusResponse.builder()
                .orderCode(123456L)
                .status(PaymentStatus.PENDING)
                .build();

        when(paymentRepository.findById(pId)).thenReturn(Optional.of(p));
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(paymentGateway.getPaymentStatus(123456L)).thenReturn(statusRes);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        PaymentResponse response = paymentService.confirmPayment(pId, buyer.getEmail());

        // Assert
        assertNotNull(response);
        assertEquals(PaymentStatus.PENDING, response.getPaymentStatus());
    }

    @Test
    void cancelPayment_ShouldCancelOnGateway() {
        // Arrange
        UUID pId = UUID.randomUUID();
        Payment p = new Payment();
        p.setId(pId);
        p.setWallet(buyerWallet);
        p.setPaymentStatus(PaymentStatus.PENDING);
        p.setAmount(new BigDecimal("100000"));
        p.setPayosOrderCode(123456L);
        p.setCheckoutUrl("https://checkout.url");

        PaymentGatewayStatusResponse statusRes = PaymentGatewayStatusResponse.builder()
                .orderCode(123456L)
                .status(PaymentStatus.CANCELLED)
                .build();

        when(paymentRepository.findById(pId)).thenReturn(Optional.of(p));
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(paymentGateway.cancelPayment(123456L)).thenReturn(statusRes);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        PaymentResponse response = paymentService.cancelPayment(pId, buyer.getEmail());

        // Assert
        assertNotNull(response);
        assertEquals(PaymentStatus.CANCELLED, response.getPaymentStatus());
    }

    @Test
    void handleWebhook_ShouldAcknowledgeValidationRequest() {
        com.godotlaunch.backend.dto.response.PaymentGatewayWebhookResult webhookResult = com.godotlaunch.backend.dto.response.PaymentGatewayWebhookResult.builder()
                .validationRequest(true)
                .build();
        when(paymentGateway.verifyWebhook(any())).thenReturn(webhookResult);

        PaymentResponse response = paymentService.handleWebhook(new Object());
        assertNull(response);
    }

    @Test
    void handleWebhook_ShouldThrowException_WhenWebhookInvalid() {
        com.godotlaunch.backend.dto.response.PaymentGatewayWebhookResult webhookResult = com.godotlaunch.backend.dto.response.PaymentGatewayWebhookResult.builder()
                .validationRequest(false)
                .orderCode(null)
                .build();
        when(paymentGateway.verifyWebhook(any())).thenReturn(webhookResult);

        org.junit.jupiter.api.Assertions.assertThrows(AppException.class, () ->
                paymentService.handleWebhook(new Object())
        );
    }

    @Test
    void handleWebhook_ShouldThrowException_WhenAmountMismatch() {
        com.godotlaunch.backend.dto.response.PaymentGatewayWebhookResult webhookResult = com.godotlaunch.backend.dto.response.PaymentGatewayWebhookResult.builder()
                .validationRequest(false)
                .orderCode(123456L)
                .amount(50000L)
                .build();
        when(paymentGateway.verifyWebhook(any())).thenReturn(webhookResult);

        Payment p = new Payment();
        p.setAmount(new BigDecimal("100000"));
        when(paymentRepository.findByPayosOrderCodeForUpdate(123456L)).thenReturn(Optional.of(p));

        org.junit.jupiter.api.Assertions.assertThrows(AppException.class, () ->
                paymentService.handleWebhook(new Object())
        );
    }

    @Test
    void handleWebhook_ShouldFinalizeTopUpPayment_WhenValid() {
        com.godotlaunch.backend.dto.response.PaymentGatewayWebhookResult webhookResult = com.godotlaunch.backend.dto.response.PaymentGatewayWebhookResult.builder()
                .validationRequest(false)
                .orderCode(123456L)
                .amount(100000L)
                .paymentLinkId("link_123")
                .transactionReference("txn_123")
                .occurredAt("2026-07-26T10:00:00Z")
                .build();

        Payment topupPayment = new Payment();
        topupPayment.setId(UUID.randomUUID());
        topupPayment.setWallet(buyerWallet);
        topupPayment.setPaymentStatus(PaymentStatus.PENDING);
        topupPayment.setAmount(new BigDecimal("100000"));
        topupPayment.setCurrency("VND");
        topupPayment.setPaymentReference("TOPUP:" + topupPayment.getId());

        when(paymentGateway.verifyWebhook(any())).thenReturn(webhookResult);
        when(paymentRepository.findByPayosOrderCodeForUpdate(123456L)).thenReturn(Optional.of(topupPayment));

        PaymentGatewayStatusResponse statusRes = PaymentGatewayStatusResponse.builder()
                .orderCode(123456L)
                .status(PaymentStatus.PAID)
                .paymentLinkId("link_123")
                .transactionReference("txn_123")
                .paidAt("2026-07-26T10:00:00Z")
                .build();
        when(paymentGateway.getPaymentStatus(123456L)).thenReturn(statusRes);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponse response = paymentService.handleWebhook(new Object());

        assertNotNull(response);
        assertEquals(PaymentStatus.PAID, response.getPaymentStatus());
        assertEquals("txn_123", response.getPayosTransactionId());
    }

    @Test
    void createPayOSPayment_ShouldCompleteImmediately_WhenFreeAsset() {
        CreatePaymentRequest request = new CreatePaymentRequest();
        request.setAssetId(asset.getId());
        asset.setStatus(ItemStatus.active);
        asset.setPrice(BigDecimal.ZERO);

        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(orderRepository.existsByBuyerIdAndAssetId(buyer.getId(), asset.getId())).thenReturn(false);
        when(walletRepository.findByUserId(buyer.getId())).thenReturn(Optional.of(buyerWallet));
        when(paymentRepository.findByWalletIdAndPaymentReferenceAndPaymentStatus(any(), any(), any())).thenReturn(Optional.empty());

        when(orderRepository.findByBuyerIdAndAssetId(buyer.getId(), asset.getId())).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            if (order.getId() == null) {
                order.setId(UUID.randomUUID());
            }
            return order;
        });
        when(transactionRepository.existsByOrderId(any(UUID.class))).thenReturn(false);
        when(walletRepository.findByUserId(seller.getId())).thenReturn(Optional.of(sellerWallet));
        when(userRepository.findByEmail("admin@godotlaunch.com")).thenReturn(Optional.of(platformAdmin));
        when(walletRepository.findByUserId(platformAdmin.getId())).thenReturn(Optional.of(platformWallet));
        when(platformSettingsService.getPlatformCommissionRate()).thenReturn(BigDecimal.TEN);
        when(walletRepository.save(any(Wallet.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            Payment p = invocation.getArgument(0);
            if (p.getId() == null) {
                p.setId(UUID.randomUUID());
            }
            return p;
        });

        PaymentResponse response = paymentService.createPayOSPayment(request, buyer.getEmail());

        assertNotNull(response);
        assertEquals(PaymentStatus.PAID, response.getPaymentStatus());
        assertEquals(0, response.getAmount().compareTo(BigDecimal.ZERO));
    }

    @Test
    void getPaymentById_ShouldReturnPayment_WhenRequesterAuthorized() {
        UUID paymentId = UUID.randomUUID();
        Payment p = new Payment();
        p.setId(paymentId);
        p.setWallet(buyerWallet);
        p.setPaymentStatus(PaymentStatus.PAID);
        p.setAmount(new BigDecimal("100000"));

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(p));
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));

        PaymentResponse response = paymentService.getPaymentById(paymentId, buyer.getEmail());

        assertNotNull(response);
        assertEquals(PaymentStatus.PAID, response.getPaymentStatus());
    }

    @Test
    void getPaymentById_ShouldThrowException_WhenRequesterUnauthorized() {
        UUID paymentId = UUID.randomUUID();
        Payment p = new Payment();
        p.setId(paymentId);
        p.setWallet(sellerWallet);
        p.setPaymentStatus(PaymentStatus.PAID);
        p.setAmount(new BigDecimal("100000"));

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(p));
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));

        org.junit.jupiter.api.Assertions.assertThrows(AppException.class, () ->
                paymentService.getPaymentById(paymentId, buyer.getEmail())
        );
    }

    @Test
    void getAdminPayments_ShouldReturnList() {
        Payment p = new Payment();
        p.setId(UUID.randomUUID());
        p.setWallet(buyerWallet);
        p.setPaymentStatus(PaymentStatus.PAID);
        p.setAmount(new BigDecimal("100000"));

        when(paymentRepository.findTop50ByOrderByCreatedAtDesc()).thenReturn(List.of(p));

        List<PaymentResponse> responses = paymentService.getAdminPayments();

        assertEquals(1, responses.size());
    }

    @Test
    void createTopUpPayment_ShouldSuccess() {
        CreateTopUpRequest req = new CreateTopUpRequest();
        req.setAmount(new BigDecimal("200000"));

        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(walletRepository.findByUserId(buyer.getId())).thenReturn(Optional.of(buyerWallet));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> {
            Payment p = i.getArgument(0);
            if (p.getId() == null) {
                p.setId(UUID.randomUUID());
            }
            return p;
        });

        PaymentGatewayCreateResponse gatewayResponse = PaymentGatewayCreateResponse.builder()
                .status(PaymentStatus.PENDING)
                .checkoutUrl("http://checkout/url")
                .orderCode(12345L)
                .paymentLinkId("link-id")
                .build();
        when(paymentGateway.createPayment(any())).thenReturn(gatewayResponse);

        PaymentResponse response = paymentService.createTopUpPayment(req, buyer.getEmail());

        assertNotNull(response);
        assertEquals("http://checkout/url", response.getCheckoutUrl());
        verify(paymentGateway).createPayment(any());
    }

    @Test
    void handleWebhook_ShouldAckValidationRequest() {
        Object payload = new Object();
        com.godotlaunch.backend.dto.response.PaymentGatewayWebhookResult webhookResult = com.godotlaunch.backend.dto.response.PaymentGatewayWebhookResult.builder()
                .validationRequest(true)
                .build();

        when(paymentGateway.verifyWebhook(payload)).thenReturn(webhookResult);

        PaymentResponse response = paymentService.handleWebhook(payload);

        assertNull(response);
    }

    @Test
    void handleWebhook_ShouldProcessPaid() {
        Object payload = new Object();
        com.godotlaunch.backend.dto.response.PaymentGatewayWebhookResult webhookResult = com.godotlaunch.backend.dto.response.PaymentGatewayWebhookResult.builder()
                .validationRequest(false)
                .orderCode(12345L)
                .amount(100000L)
                .paymentLinkId("link-123")
                .transactionReference("txn-123")
                .occurredAt("2026-07-26T10:00:00Z")
                .build();

        Payment p = new Payment();
        p.setId(UUID.randomUUID());
        p.setWallet(buyerWallet);
        p.setAmount(new BigDecimal("100000"));
        p.setPaymentStatus(PaymentStatus.PENDING);
        p.setPaymentReference("BUY_ASSET:" + asset.getId());

        when(paymentGateway.verifyWebhook(payload)).thenReturn(webhookResult);
        when(paymentRepository.findByPayosOrderCodeForUpdate(12345L)).thenReturn(Optional.of(p));

        PaymentGatewayStatusResponse gatewayStatus = PaymentGatewayStatusResponse.builder()
                .status(PaymentStatus.PAID)
                .transactionReference("txn-123")
                .paidAt("2026-07-26T10:00:00Z")
                .build();
        when(paymentGateway.getPaymentStatus(12345L)).thenReturn(gatewayStatus);

        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(orderRepository.findByBuyerIdAndAssetId(buyer.getId(), asset.getId())).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(UUID.randomUUID());
            return o;
        });
        when(transactionRepository.existsByOrderId(any(UUID.class))).thenReturn(false);
        when(walletRepository.findByUserId(seller.getId())).thenReturn(Optional.of(sellerWallet));
        when(userRepository.findByEmail("admin@godotlaunch.com")).thenReturn(Optional.of(platformAdmin));
        when(walletRepository.findByUserId(platformAdmin.getId())).thenReturn(Optional.of(platformWallet));
        when(platformSettingsService.getPlatformCommissionRate()).thenReturn(BigDecimal.TEN);

        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> i.getArgument(0));

        PaymentResponse response = paymentService.handleWebhook(payload);

        assertNotNull(response);
        assertEquals(PaymentStatus.PAID, response.getPaymentStatus());
    }

    @Test
    void handleWebhook_ShouldThrowException_WhenOrderNotFound() {
        Object payload = new Object();
        com.godotlaunch.backend.dto.response.PaymentGatewayWebhookResult webhookResult = com.godotlaunch.backend.dto.response.PaymentGatewayWebhookResult.builder()
                .validationRequest(false)
                .orderCode(12345L)
                .amount(100000L)
                .build();

        when(paymentGateway.verifyWebhook(payload)).thenReturn(webhookResult);
        when(paymentRepository.findByPayosOrderCodeForUpdate(12345L)).thenReturn(Optional.empty());

        org.junit.jupiter.api.Assertions.assertThrows(AppException.class, () ->
                paymentService.handleWebhook(payload)
        );
    }

    @Test
    void cancelPayment_ShouldSuccess_WhenValid() {
        UUID paymentId = UUID.randomUUID();
        Payment p = new Payment();
        p.setId(paymentId);
        p.setWallet(buyerWallet);
        p.setPaymentStatus(PaymentStatus.PENDING);
        p.setCheckoutUrl("http://checkout/url");
        p.setPayosOrderCode(12345L);

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(p));
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));

        PaymentGatewayStatusResponse gatewayStatus = PaymentGatewayStatusResponse.builder()
                .status(PaymentStatus.CANCELLED)
                .build();
        when(paymentGateway.cancelPayment(12345L)).thenReturn(gatewayStatus);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> i.getArgument(0));

        PaymentResponse response = paymentService.cancelPayment(paymentId, buyer.getEmail());

        assertNotNull(response);
        assertEquals(PaymentStatus.CANCELLED, response.getPaymentStatus());
    }

    @Test
    void cancelPayment_ShouldThrowException_WhenAlreadyPaid() {
        UUID paymentId = UUID.randomUUID();
        Payment p = new Payment();
        p.setId(paymentId);
        p.setWallet(buyerWallet);
        p.setPaymentStatus(PaymentStatus.PAID);

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(p));
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));

        org.junit.jupiter.api.Assertions.assertThrows(AppException.class, () ->
                paymentService.cancelPayment(paymentId, buyer.getEmail())
        );
    }

    @Test
    void cancelPayment_ShouldThrowException_WhenNotCancellable() {
        UUID paymentId = UUID.randomUUID();
        Payment p = new Payment();
        p.setId(paymentId);
        p.setWallet(buyerWallet);
        p.setPaymentStatus(PaymentStatus.PENDING);
        p.setCheckoutUrl(null); // No checkout URL makes it not cancellable

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(p));
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));

        org.junit.jupiter.api.Assertions.assertThrows(AppException.class, () ->
                paymentService.cancelPayment(paymentId, buyer.getEmail())
        );
    }

    @Test
    void getCurrentUserPayments_ShouldReturnList() {
        Payment p = new Payment();
        p.setId(UUID.randomUUID());
        p.setWallet(buyerWallet);
        p.setPaymentStatus(PaymentStatus.PAID);

        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(paymentRepository.findByWalletUserIdOrderByCreatedAtDesc(buyer.getId())).thenReturn(List.of(p));

        List<PaymentResponse> responses = paymentService.getCurrentUserPayments(buyer.getEmail());

        assertEquals(1, responses.size());
    }

    @Test
    void getPaymentByOrder_ShouldReturnPayment() {
        UUID orderId = UUID.randomUUID();
        Transaction txn = new Transaction();
        Payment p = new Payment();
        p.setId(UUID.randomUUID());
        p.setWallet(buyerWallet);
        p.setPaymentStatus(PaymentStatus.PAID);
        txn.setPayment(p);

        when(transactionRepository.findByOrderIdAndPaymentIsNotNull(orderId)).thenReturn(Optional.of(txn));
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));

        PaymentResponse response = paymentService.getPaymentByOrder(orderId, buyer.getEmail());

        assertNotNull(response);
    }

    @Test
    void confirmPayment_ShouldSucceed() {
        UUID paymentId = UUID.randomUUID();
        Payment p = new Payment();
        p.setId(paymentId);
        p.setWallet(buyerWallet);
        p.setPaymentStatus(PaymentStatus.PENDING);
        p.setAmount(new BigDecimal("100000"));

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(p));
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));

        PaymentResponse response = paymentService.confirmPayment(paymentId, buyer.getEmail());

        assertNotNull(response);
    }

    @Test
    void getPaymentById_ShouldSucceed() {
        UUID paymentId = UUID.randomUUID();
        Payment p = new Payment();
        p.setId(paymentId);
        p.setWallet(buyerWallet);
        p.setPaymentStatus(PaymentStatus.PAID);
        p.setAmount(new BigDecimal("100000"));

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(p));
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));

        PaymentResponse response = paymentService.getPaymentById(paymentId, buyer.getEmail());

        assertNotNull(response);
        assertEquals(PaymentStatus.PAID, response.getPaymentStatus());
    }

    @Test
    void getPaymentStatus_ShouldReturnSummary() {
        UUID orderId = UUID.randomUUID();
        Transaction txn = new Transaction();
        Payment p = new Payment();
        p.setId(UUID.randomUUID());
        p.setWallet(buyerWallet);
        p.setPaymentStatus(PaymentStatus.PAID);
        txn.setPayment(p);

        when(transactionRepository.findByOrderIdAndPaymentIsNotNull(orderId)).thenReturn(Optional.of(txn));
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));

        com.godotlaunch.backend.dto.response.PaymentStatusSummaryResponse summary = paymentService.getPaymentStatus(orderId, buyer.getEmail());

        assertNotNull(summary);
        assertEquals(p.getId(), summary.getPaymentId());
    }

    @Test
    void createPayOSPayment_ShouldSucceedImmediately_WhenPriceIsZero() {
        asset.setPrice(BigDecimal.ZERO);
        asset.setStatus(ItemStatus.active);

        CreatePaymentRequest request = new CreatePaymentRequest();
        request.setAssetId(asset.getId());

        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(walletRepository.findByUserId(buyer.getId())).thenReturn(Optional.of(buyerWallet));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> i.getArgument(0));

        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(UUID.randomUUID());
            return o;
        });

        when(transactionRepository.existsByOrderId(any(UUID.class))).thenReturn(false);
        when(walletRepository.findByUserId(seller.getId())).thenReturn(Optional.of(sellerWallet));
        when(userRepository.findByEmail("admin@godotlaunch.com")).thenReturn(Optional.of(platformAdmin));
        when(walletRepository.findByUserId(platformAdmin.getId())).thenReturn(Optional.of(platformWallet));
        when(platformSettingsService.getPlatformCommissionRate()).thenReturn(BigDecimal.TEN);

        PaymentResponse response = paymentService.createPayOSPayment(request, buyer.getEmail());

        assertNotNull(response);
        assertEquals(PaymentStatus.PAID, response.getPaymentStatus());
    }
}
