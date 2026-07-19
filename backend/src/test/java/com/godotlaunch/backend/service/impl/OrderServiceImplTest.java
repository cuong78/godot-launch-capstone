package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.entity.*;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import com.godotlaunch.backend.entity.enums.OrderType;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.exception.InsufficientBalanceException;
import com.godotlaunch.backend.repository.*;
import com.godotlaunch.backend.service.PlatformSettingsService;
import com.godotlaunch.backend.service.WalletService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceImplTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private AssetRepository assetRepository;

    @Mock
    private GameRepository gameRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private WalletService walletService;

    @Mock
    private PlatformSettingsService platformSettingsService;

    @Mock
    private PaymentRepository paymentRepository;

    @InjectMocks
    private OrderServiceImpl orderService;

    private User buyer;
    private User seller;
    private User platformAdmin;
    private Asset mockAsset;
    private Game mockGame;
    private Wallet buyerWallet;
    private Wallet sellerWallet;
    private Wallet platformWallet;
    private UUID targetId;

    @BeforeEach
    void setUp() {
        targetId = UUID.randomUUID();

        buyer = new User();
        buyer.setId(UUID.fromString("11111111-1111-1111-1111-111111111111"));
        buyer.setEmail("buyer@example.com");

        seller = new User();
        seller.setId(UUID.fromString("22222222-2222-2222-2222-222222222222"));
        seller.setEmail("seller@example.com");

        platformAdmin = new User();
        platformAdmin.setId(UUID.fromString("33333333-3333-3333-3333-333333333333"));
        platformAdmin.setEmail("admin@godotlaunch.com");

        buyerWallet = new Wallet();
        buyerWallet.setUser(buyer);
        buyerWallet.setBalance(new BigDecimal("100000"));

        sellerWallet = new Wallet();
        sellerWallet.setUser(seller);
        sellerWallet.setBalance(new BigDecimal("50000"));

        platformWallet = new Wallet();
        platformWallet.setUser(platformAdmin);
        platformWallet.setBalance(new BigDecimal("200000"));

        mockAsset = new Asset();
        mockAsset.setId(targetId);
        mockAsset.setTitle("3D Model Asset");
        mockAsset.setStatus(ItemStatus.active);
        mockAsset.setPrice(new BigDecimal("50000"));
        mockAsset.setSeller(seller);

        mockGame = new Game();
        mockGame.setId(targetId);
        mockGame.setTitle("Godot Platformer");
        mockGame.setStatus(GameStatus.published);
        mockGame.setPriceProposed(new BigDecimal("80000"));
        mockGame.setCreator(seller);
    }

    @Test
    @DisplayName("Should successfully purchase asset using wallet balance")
    void shouldBuyAsset_Successfully() {
        // Arrange
        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(buyer));
        when(assetRepository.findById(targetId)).thenReturn(Optional.of(mockAsset));
        when(orderRepository.existsByBuyerIdAndAssetId(buyer.getId(), targetId)).thenReturn(false);
        when(userRepository.findByEmail("admin@godotlaunch.com")).thenReturn(Optional.of(platformAdmin));

        when(walletRepository.findByUserIdWithLock(buyer.getId())).thenReturn(Optional.of(buyerWallet));
        when(walletRepository.findByUserIdWithLock(seller.getId())).thenReturn(Optional.of(sellerWallet));
        when(walletRepository.findByUserIdWithLock(platformAdmin.getId())).thenReturn(Optional.of(platformWallet));
        when(platformSettingsService.getPlatformCommissionRate()).thenReturn(new BigDecimal("10"));

        Order savedOrder = new Order();
        savedOrder.setId(UUID.randomUUID());
        when(orderRepository.save(any(Order.class))).thenReturn(savedOrder);
        when(paymentRepository.save(any(Payment.class))).thenReturn(new Payment());

        // Act
        Order result = orderService.buy("buyer@example.com", targetId, OrderType.asset_purchase);

        // Assert
        assertThat(result).isNotNull();
        assertThat(buyerWallet.getBalance()).isEqualByComparingTo("50000"); // 100000 - 50000
        assertThat(sellerWallet.getBalance()).isEqualByComparingTo("95000");  // 50000 + 45000 (90%)
        assertThat(platformWallet.getBalance()).isEqualByComparingTo("205000"); // 200000 + 5000 (10%)

        verify(orderRepository, times(1)).save(any(Order.class));
        verify(paymentRepository, times(1)).save(any(Payment.class));
        verify(transactionRepository, times(3)).save(any(Transaction.class));
    }

    @Test
    @DisplayName("Should throw OWN_PRODUCT_PURCHASE_NOT_ALLOWED when buyer is the seller")
    void shouldThrowException_WhenBuyerIsSeller() {
        // Arrange
        mockAsset.setSeller(buyer);
        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(buyer));
        when(assetRepository.findById(targetId)).thenReturn(Optional.of(mockAsset));

        // Act & Assert
        assertThatThrownBy(() -> orderService.buy("buyer@example.com", targetId, OrderType.asset_purchase))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.OWN_PRODUCT_PURCHASE_NOT_ALLOWED);
    }

    @Test
    @DisplayName("Should throw InsufficientBalanceException when buyer balance is lower than item price")
    void shouldThrowException_WhenInsufficientBalance() {
        // Arrange
        buyerWallet.setBalance(new BigDecimal("10000")); // lower than 50000
        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(buyer));
        when(assetRepository.findById(targetId)).thenReturn(Optional.of(mockAsset));
        when(orderRepository.existsByBuyerIdAndAssetId(buyer.getId(), targetId)).thenReturn(false);
        when(userRepository.findByEmail("admin@godotlaunch.com")).thenReturn(Optional.of(platformAdmin));

        when(walletRepository.findByUserIdWithLock(buyer.getId())).thenReturn(Optional.of(buyerWallet));
        when(walletRepository.findByUserIdWithLock(seller.getId())).thenReturn(Optional.of(sellerWallet));
        when(walletRepository.findByUserIdWithLock(platformAdmin.getId())).thenReturn(Optional.of(platformWallet));

        // Act & Assert
        assertThatThrownBy(() -> orderService.buy("buyer@example.com", targetId, OrderType.asset_purchase))
                .isInstanceOf(InsufficientBalanceException.class);
    }

    @Test
    @DisplayName("Should throw BAD_REQUEST when game status is not published")
    void shouldThrowException_WhenGameNotPublished() {
        // Arrange
        mockGame.setStatus(GameStatus.draft);
        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(buyer));
        when(gameRepository.findById(targetId)).thenReturn(Optional.of(mockGame));

        // Act & Assert
        assertThatThrownBy(() -> orderService.buy("buyer@example.com", targetId, OrderType.source_code_purchase))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.BAD_REQUEST);
    }
}
