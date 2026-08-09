package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.config.FaceServiceClient;
import com.godotlaunch.backend.dto.request.CreateDisputeRequest;
import com.godotlaunch.backend.dto.request.ResolveDisputeRequest;
import com.godotlaunch.backend.dto.response.DisputeResponse;
import com.godotlaunch.backend.entity.BannedIdentity;
import com.godotlaunch.backend.entity.Dispute;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Wallet;
import com.godotlaunch.backend.entity.enums.DisputeStatus;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.entity.enums.TxnType;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.BannedIdentityRepository;
import com.godotlaunch.backend.repository.DisputeRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.RoleRepository;
import com.godotlaunch.backend.repository.TransactionRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.WalletRepository;
import com.godotlaunch.backend.service.AuditLogService;
import com.godotlaunch.backend.service.PlatformSettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DisputeServiceImplTest {

    @Mock
    private DisputeRepository disputeRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private GameRepository gameRepository;

    @Mock
    private BannedIdentityRepository bannedIdentityRepository;

    @Mock
    private FaceServiceClient faceServiceClient;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private PlatformSettingsService platformSettingsService;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private DisputeServiceImpl disputeService;

    private User reporter;
    private User seller;
    private Game game;
    private Dispute dispute;
    private UUID disputeId;

    @BeforeEach
    void setUp() {
        reporter = new User();
        reporter.setId(UUID.randomUUID());
        reporter.setEmail("reporter@godotlaunch.dev");

        seller = new User();
        seller.setId(UUID.randomUUID());
        seller.setEmail("seller@godotlaunch.dev");

        game = new Game();
        game.setId(UUID.randomUUID());
        game.setCreator(seller);
        game.setTitle("Indie Game");

        disputeId = UUID.randomUUID();
        dispute = new Dispute();
        dispute.setId(disputeId);
        dispute.setReporter(reporter);
        dispute.setReportedSeller(seller);
        dispute.setGame(game);
        dispute.setStatus(DisputeStatus.open);
    }

    @Test
    @DisplayName("shouldCreateDispute_WhenRequestIsValid")
    void shouldCreateDispute_WhenRequestIsValid() {
        CreateDisputeRequest request = new CreateDisputeRequest();
        request.setGameId(game.getId());
        request.setReason("Copyright Infringement");

        when(userRepository.findByEmail(reporter.getEmail())).thenReturn(Optional.of(reporter));
        when(gameRepository.findById(game.getId())).thenReturn(Optional.of(game));
        when(disputeRepository.save(any(Dispute.class))).thenAnswer(i -> {
            Dispute d = i.getArgument(0);
            d.setId(disputeId);
            return d;
        });

        DisputeResponse response = disputeService.createDispute(request, reporter.getEmail());

        assertThat(response.getId()).isEqualTo(disputeId);
        assertThat(game.getStatus()).isEqualTo(GameStatus.rejected); // auto-suspend
        verify(disputeRepository, times(1)).save(any(Dispute.class));
    }

    @Test
    @DisplayName("shouldThrowException_WhenReporterNotFound")
    void shouldThrowException_WhenReporterNotFound() {
        CreateDisputeRequest request = new CreateDisputeRequest();
        when(userRepository.findByEmail(reporter.getEmail())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> disputeService.createDispute(request, reporter.getEmail()))
                .isInstanceOf(AppException.class);
    }

    @Test
    @DisplayName("shouldResolveDispute_WhenSellerFault")
    void shouldResolveDispute_WhenSellerFault() {
        User admin = new User();
        admin.setEmail("admin@godotlaunch.dev");

        ResolveDisputeRequest request = new ResolveDisputeRequest();
        request.setResolution("resolved_seller_fault");
        request.setResolutionNote("Confirmed infringement");
        request.setRefundAmount(new BigDecimal("100.00"));
        request.setBanUser(true);

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(disputeRepository.findById(disputeId)).thenReturn(Optional.of(dispute));
        when(disputeRepository.save(any(Dispute.class))).thenAnswer(i -> i.getArgument(0));

        DisputeResponse response = disputeService.resolveDispute(disputeId, request, admin.getEmail());

        assertThat(response.getStatus()).isEqualTo("resolved_seller_fault");
        assertThat(seller.getStatus()).isEqualTo("banned");
        verify(bannedIdentityRepository, times(1)).save(any(BannedIdentity.class));
        verify(faceServiceClient, times(1)).banFace(eq(seller.getId()), anyString());
    }

    @Test
    @DisplayName("shouldResolveDispute_WhenReporterFault")
    void shouldResolveDispute_WhenReporterFault() {
        User admin = new User();
        admin.setEmail("admin@godotlaunch.dev");

        ResolveDisputeRequest request = new ResolveDisputeRequest();
        request.setResolution("resolved_reporter_fault");
        request.setResolutionNote("False report");
        request.setBanUser(true);

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(disputeRepository.findById(disputeId)).thenReturn(Optional.of(dispute));
        when(disputeRepository.save(any(Dispute.class))).thenAnswer(i -> i.getArgument(0));

        DisputeResponse response = disputeService.resolveDispute(disputeId, request, admin.getEmail());

        assertThat(response.getStatus()).isEqualTo("resolved_reporter_fault");
        assertThat(game.getStatus()).isEqualTo(GameStatus.published);
        assertThat(reporter.getStatus()).isEqualTo("banned");
    }

    @Test
    @DisplayName("shouldResolveDispute_WhenInconclusive")
    void shouldResolveDispute_WhenInconclusive() {
        User admin = new User();
        admin.setEmail("admin@godotlaunch.dev");

        ResolveDisputeRequest request = new ResolveDisputeRequest();
        request.setResolution("resolved_inconclusive");
        request.setResolutionNote("Not enough evidence");

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(disputeRepository.findById(disputeId)).thenReturn(Optional.of(dispute));
        when(disputeRepository.save(any(Dispute.class))).thenAnswer(i -> i.getArgument(0));

        DisputeResponse response = disputeService.resolveDispute(disputeId, request, admin.getEmail());

        assertThat(response.getStatus()).isEqualTo("resolved_inconclusive");
        assertThat(game.getStatus()).isEqualTo(GameStatus.published);
    }

    @Test
    @DisplayName("confirmed dispute refund reduces seller revenue and credits restricted funds")
    void confirmRefund_ShouldMoveFundsWithCorrectSources() {
        User admin = new User();
        admin.setEmail("admin@godotlaunch.dev");
        dispute.setStatus(DisputeStatus.resolved_seller_fault);
        dispute.setRefundAmount(new BigDecimal("80"));

        Wallet sellerWallet = new Wallet();
        sellerWallet.setUser(seller);
        sellerWallet.setBalance(new BigDecimal("100"));
        sellerWallet.setWithdrawableBalance(new BigDecimal("60"));

        Wallet reporterWallet = new Wallet();
        reporterWallet.setUser(reporter);
        reporterWallet.setBalance(new BigDecimal("10"));
        reporterWallet.setWithdrawableBalance(BigDecimal.ZERO);

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(disputeRepository.findByIdWithLock(disputeId)).thenReturn(Optional.of(dispute));
        when(walletRepository.findByUserIdWithLock(seller.getId())).thenReturn(Optional.of(sellerWallet));
        when(walletRepository.findByUserIdWithLock(reporter.getId())).thenReturn(Optional.of(reporterWallet));
        when(disputeRepository.save(any(Dispute.class))).thenAnswer(i -> i.getArgument(0));

        DisputeResponse response = disputeService.confirmRefund(disputeId, admin.getEmail());

        assertThat(response.getRefundConfirmedAt()).isNotNull();
        assertThat(sellerWallet.getBalance()).isEqualByComparingTo("20");
        assertThat(sellerWallet.getWithdrawableBalance()).isZero();
        assertThat(reporterWallet.getBalance()).isEqualByComparingTo("90");
        assertThat(reporterWallet.getWithdrawableBalance()).isZero();
        verify(transactionRepository, times(2)).save(argThat(txn -> txn.getType() == TxnType.refund));
    }

    @Test
    @DisplayName("shouldGetAllDisputes_WhenCalled")
    void shouldGetAllDisputes_WhenCalled() {
        when(disputeRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(dispute));

        List<DisputeResponse> list = disputeService.getAllDisputes();

        assertThat(list).hasSize(1);
    }

    @Test
    @DisplayName("shouldGetMyReportedDisputes_WhenUserExists")
    void shouldGetMyReportedDisputes_WhenUserExists() {
        when(userRepository.findByEmail(reporter.getEmail())).thenReturn(Optional.of(reporter));
        when(disputeRepository.findByReporterIdOrderByCreatedAtDesc(reporter.getId())).thenReturn(List.of(dispute));

        List<DisputeResponse> list = disputeService.getMyReportedDisputes(reporter.getEmail());

        assertThat(list).hasSize(1);
    }

    @Test
    @DisplayName("shouldGetDisputeById_WhenExists")
    void shouldGetDisputeById_WhenExists() {
        when(disputeRepository.findById(disputeId)).thenReturn(Optional.of(dispute));

        DisputeResponse response = disputeService.getDispute(disputeId);

        assertThat(response.getId()).isEqualTo(disputeId);
    }
}
