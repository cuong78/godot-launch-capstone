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
import com.godotlaunch.backend.repository.OrderRepository;
import com.godotlaunch.backend.repository.PlagiarismFlagRepository;
import com.godotlaunch.backend.repository.RoleRepository;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import com.godotlaunch.backend.repository.TransactionRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.WalletRepository;
import com.godotlaunch.backend.service.AuditLogService;
import com.godotlaunch.backend.service.GitHubRepoService;
import com.godotlaunch.backend.service.NotificationService;
import com.godotlaunch.backend.service.PlatformSettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
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

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private SourceSnapshotRepository sourceSnapshotRepository;

    @Mock
    private PlagiarismFlagRepository plagiarismFlagRepository;

    @Mock
    private GitHubRepoService gitHubRepoService;

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

        User adminUser = new User();
        adminUser.setId(UUID.randomUUID());
        adminUser.setEmail("admin@godotlaunch.com");
        lenient().when(userRepository.findByEmail("admin@godotlaunch.com")).thenReturn(Optional.of(adminUser));
        lenient().when(userRepository.findAdminsOrderByCreatedAtAsc(any())).thenReturn(List.of(adminUser));
        lenient().when(userRepository.findByIdWithLock(any())).thenAnswer(inv -> {
            UUID id = inv.getArgument(0);
            if (id.equals(reporter.getId())) return Optional.of(reporter);
            if (id.equals(seller.getId())) return Optional.of(seller);
            return Optional.of(adminUser);
        });
        lenient().when(walletRepository.findByUserIdWithLock(any())).thenAnswer(inv -> {
            UUID id = inv.getArgument(0);
            Wallet w = new Wallet();
            User u = id.equals(reporter.getId()) ? reporter : (id.equals(seller.getId()) ? seller : adminUser);
            w.setUser(u);
            w.setBalance(BigDecimal.valueOf(1000000));
            w.setWithdrawableBalance(BigDecimal.valueOf(1000000));
            return Optional.of(w);
        });
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
        doReturn(Optional.of(sellerWallet)).when(walletRepository).findByUserIdWithLock(seller.getId());
        when(disputeRepository.save(any(Dispute.class))).thenAnswer(i -> i.getArgument(0));

        DisputeResponse response = disputeService.confirmRefund(disputeId, admin.getEmail());

        assertThat(response.getRefundConfirmedAt()).isNotNull();
        assertThat(sellerWallet.getBalance()).isEqualByComparingTo("20");
        assertThat(sellerWallet.getWithdrawableBalance()).isZero();
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

    @Test
    @DisplayName("AI dispute analysis fetches GitHub timeline for both seller and reporter source")
    void getAiAnalysis_ShouldFetchBothGithubSourceTimelines() {
        String sellerRepo = "https://github.com/seller/original-game";
        String reporterRepo = "https://github.com/reporter/evidence-game";
        game.setGithubRepoUrl(sellerRepo);
        dispute.setEvidenceRepoUrl(reporterRepo);
        dispute.setReason("Source copied");
        reporter.setFullName("Reporter");

        when(disputeRepository.findById(disputeId)).thenReturn(Optional.of(dispute));
        when(gitHubRepoService.getRepoMetadata(sellerRepo)).thenReturn(Map.of(
                "created_at", "2026-08-17T08:00:00Z",
                "pushed_at", "2026-08-17T09:00:00Z",
                "owner", Map.of("login", "seller")
        ));
        when(gitHubRepoService.getRepoMetadata(reporterRepo)).thenReturn(Map.of(
                "created_at", "2026-08-17T08:30:00Z",
                "pushed_at", "2026-08-17T09:30:00Z",
                "owner", Map.of("login", "reporter")
        ));
        when(gitHubRepoService.getRepoCommitsMetadata(sellerRepo)).thenReturn(List.of());
        when(gitHubRepoService.getRepoCommitsMetadata(reporterRepo)).thenReturn(List.of());
        when(sourceSnapshotRepository.findFirstByGameIdOrderByCreatedAtDesc(game.getId()))
                .thenReturn(Optional.empty());

        disputeService.getAiAnalysis(disputeId);

        verify(gitHubRepoService).getRepoMetadata(sellerRepo);
        verify(gitHubRepoService).getRepoMetadata(reporterRepo);
        verify(gitHubRepoService).getRepoCommitsMetadata(sellerRepo);
        verify(gitHubRepoService).getRepoCommitsMetadata(reporterRepo);
    }

    @Test
    @DisplayName("GitHub timeline comparison uses repository created_at values")
    void buildGitHubTimelineComparison_ShouldUseGithubCreationTimes() {
        String comparison = disputeService.buildGitHubTimelineComparison(
                Instant.parse("2026-08-17T08:00:00Z"),
                Instant.parse("2026-08-17T08:30:00Z")
        );

        assertThat(comparison)
                .contains("A (Seller)")
                .contains("B (Reporter)")
                .contains("30 phút")
                .contains("2026-08-17T08:00:00Z")
                .contains("2026-08-17T08:30:00Z");
    }

    @Test
    @DisplayName("GitHub timeline comparison never falls back when created_at is missing")
    void buildGitHubTimelineComparison_ShouldBeInconclusiveWhenGithubCreationTimeMissing() {
        String comparison = disputeService.buildGitHubTimelineComparison(
                null,
                Instant.parse("2026-08-17T08:30:00Z")
        );

        assertThat(comparison).contains("Không đủ mốc `created_at`");
    }
}
