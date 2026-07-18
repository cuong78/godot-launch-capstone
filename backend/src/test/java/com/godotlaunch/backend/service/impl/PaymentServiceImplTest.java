package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.Order;
import com.godotlaunch.backend.entity.Payment;
import com.godotlaunch.backend.entity.Transaction;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Wallet;
import com.godotlaunch.backend.entity.enums.PaymentStatus;
import com.godotlaunch.backend.entity.enums.TxnType;
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
        buyer = new User();
        buyer.setId(UUID.randomUUID());
        buyer.setEmail("buyer@godotlaunch.dev");
        buyer.setFullName("Buyer");

        seller = new User();
        seller.setId(UUID.randomUUID());
        seller.setEmail("seller@godotlaunch.dev");
        seller.setFullName("Seller");

        platformAdmin = new User();
        platformAdmin.setId(UUID.randomUUID());
        platformAdmin.setEmail("admin@godotlaunch.com");
        platformAdmin.setFullName("Platform Admin");

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
}
