package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.response.TransactionResponse;
import com.godotlaunch.backend.dto.response.WalletResponse;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.Transaction;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Wallet;
import com.godotlaunch.backend.entity.enums.TxnType;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.TransactionRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WalletServiceImplTest {

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private GameRepository gameRepository;

    @InjectMocks
    private WalletServiceImpl walletService;

    private User mockUser;
    private Wallet mockWallet;

    @BeforeEach
    void setUp() {
        mockUser = new User();
        mockUser.setId(UUID.randomUUID());
        mockUser.setEmail("dev@godotlaunch.dev");

        mockWallet = new Wallet();
        mockWallet.setId(UUID.randomUUID());
        mockWallet.setUser(mockUser);
        mockWallet.setBalance(BigDecimal.ZERO);
        mockWallet.setCurrency("VND");
    }

    @Test
    @DisplayName("shouldGetOrCreateWallet_WhenExists")
    void shouldGetOrCreateWallet_WhenExists() {
        when(walletRepository.findByUserId(mockUser.getId())).thenReturn(Optional.of(mockWallet));

        Wallet result = walletService.getOrCreateWallet(mockUser);

        assertThat(result).isEqualTo(mockWallet);
    }

    @Test
    @DisplayName("shouldGetOrCreateWallet_WhenDoesNotExist")
    void shouldGetOrCreateWallet_WhenDoesNotExist() {
        when(walletRepository.findByUserId(mockUser.getId())).thenReturn(Optional.empty());
        when(walletRepository.save(any(Wallet.class))).thenReturn(mockWallet);

        Wallet result = walletService.getOrCreateWallet(mockUser);

        assertThat(result).isEqualTo(mockWallet);
    }

    @Test
    @DisplayName("shouldGetWalletResponse_WhenUserExists")
    void shouldGetWalletResponse_WhenUserExists() {
        when(userRepository.findByEmail(mockUser.getEmail())).thenReturn(Optional.of(mockUser));
        when(walletRepository.findByUserId(mockUser.getId())).thenReturn(Optional.of(mockWallet));

        WalletResponse response = walletService.getWalletResponse(mockUser.getEmail());

        assertThat(response.getBalance()).isEqualTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("shouldThrowException_WhenUserNotFoundForWalletResponse")
    void shouldThrowException_WhenUserNotFoundForWalletResponse() {
        when(userRepository.findByEmail(mockUser.getEmail())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> walletService.getWalletResponse(mockUser.getEmail()))
                .isInstanceOf(AppException.class);
    }

    @Test
    @DisplayName("shouldGetTransactionHistory_WhenUserExists")
    void shouldGetTransactionHistory_WhenUserExists() {
        Pageable pageable = PageRequest.of(0, 10);
        Transaction txn = new Transaction();
        txn.setWallet(mockWallet);
        txn.setAmount(BigDecimal.TEN);
        txn.setType(TxnType.revenue_share);
        Page<Transaction> page = new PageImpl<>(List.of(txn), pageable, 1);

        when(userRepository.findByEmail(mockUser.getEmail())).thenReturn(Optional.of(mockUser));
        when(transactionRepository.findByWalletUserIdOrderByCreatedAtDesc(mockUser.getId(), pageable)).thenReturn(page);

        Page<TransactionResponse> result = walletService.getTransactionHistory(mockUser.getEmail(), pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("shouldAddRevenue_WhenSellerExists")
    void shouldAddRevenue_WhenSellerExists() {
        UUID buyerId = UUID.randomUUID();
        User buyer = new User();
        buyer.setId(buyerId);

        UUID gameId = UUID.randomUUID();
        Game game = new Game();
        game.setId(gameId);

        when(userRepository.findById(mockUser.getId())).thenReturn(Optional.of(mockUser));
        when(userRepository.findById(buyerId)).thenReturn(Optional.of(buyer));
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        when(walletRepository.findByUserId(mockUser.getId())).thenReturn(Optional.of(mockWallet));

        walletService.addRevenue(mockUser.getId(), buyerId, new BigDecimal("100.00"), new BigDecimal("10.00"), gameId, "ref-123");

        assertThat(mockWallet.getBalance()).isEqualTo(new BigDecimal("90.00"));
        verify(walletRepository, times(1)).save(mockWallet);
        verify(transactionRepository, times(1)).save(any(Transaction.class));
    }

    @Test
    @DisplayName("shouldThrowException_WhenNetRevenueIsNegative")
    void shouldThrowException_WhenNetRevenueIsNegative() {
        when(userRepository.findById(mockUser.getId())).thenReturn(Optional.of(mockUser));
        when(walletRepository.findByUserId(mockUser.getId())).thenReturn(Optional.of(mockWallet));

        assertThatThrownBy(() -> walletService.addRevenue(mockUser.getId(), null, BigDecimal.TEN, new BigDecimal("20.00"), null, "ref-123"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Net amount cannot be negative");
    }
}
