package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.request.ActivateMockPublishRequest;
import com.godotlaunch.backend.dto.request.GooglePlayMockConfigDto;
import com.godotlaunch.backend.dto.response.*;
import com.godotlaunch.backend.entity.*;
import com.godotlaunch.backend.entity.enums.ContractType;
import com.godotlaunch.backend.entity.enums.ExtStatus;
import com.godotlaunch.backend.repository.*;
import com.godotlaunch.backend.service.SeaweedFsService;
import com.godotlaunch.backend.service.WalletService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StoreReportServiceImplTest {

    @Mock
    private ExternalPublishRepository externalPublishRepository;
    @Mock
    private StoreReportImportRepository storeReportImportRepository;
    @Mock
    private StoreDailyInstallMetricRepository storeDailyInstallMetricRepository;
    @Mock
    private StoreRevenueStatementRepository storeRevenueStatementRepository;
    @Mock
    private ContractRepository contractRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private WalletRepository walletRepository;
    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private WalletService walletService;
    @Mock
    private SeaweedFsService seaweedFsService;
    @Mock
    private GooglePlayMockClient googlePlayMockClient;

    @InjectMocks
    private StoreReportServiceImpl storeReportService;

    private UUID publishId;
    private UUID gameId;
    private UUID devId;
    private UUID adminId;
    private ExternalPublish publish;
    private Game game;
    private User dev;
    private User admin;
    private Contract contract;

    @BeforeEach
    void setUp() {
        publishId = UUID.randomUUID();
        gameId = UUID.randomUUID();
        devId = UUID.randomUUID();
        adminId = UUID.randomUUID();

        dev = new User();
        dev.setId(devId);
        dev.setEmail("dev@test.com");

        admin = new User();
        admin.setId(adminId);
        admin.setEmail("admin@test.com");

        game = new Game();
        game.setId(gameId);
        game.setTitle("Sky Adventure");
        game.setCreator(dev);

        publish = new ExternalPublish();
        publish.setId(publishId);
        publish.setGame(game);
        publish.setStatus(ExtStatus.live);
        publish.setPackageName("com.godotlaunch.skyadventure");

        contract = new Contract();
        contract.setId(UUID.randomUUID());
        contract.setGame(game);
        contract.setSeller(dev);
        contract.setContractType(ContractType.co_publishing);
        contract.setRevenueSplit((short) 80);
    }

    @Test
    void updatePublisherConfig_ShouldRejectInvalidBucketUri() {
        GooglePlayMockConfigDto dto = GooglePlayMockConfigDto.builder()
                .bucketUri("invalid-uri")
                .serviceAccountEmail("test@project.iam.gserviceaccount.com")
                .build();

        assertThatThrownBy(() -> storeReportService.updatePublisherConfig(dto, adminId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("gs://pubsite_prod_rev_");
    }

    @Test
    void activateMockPublish_ShouldRegisterWithMockContainer() {
        when(externalPublishRepository.findById(publishId)).thenReturn(Optional.of(publish));
        when(externalPublishRepository.findAll()).thenReturn(List.of(publish));

        ActivateMockPublishRequest request = ActivateMockPublishRequest.builder().packageName("com.godotlaunch.newgame").build();

        ExternalPublishResponse res = storeReportService.activateMockPublish(publishId, request, adminId);

        assertThat(res).isNotNull();
        assertThat(res.getPackageName()).isEqualTo("com.godotlaunch.newgame");
        verify(googlePlayMockClient, times(1)).registerApp("com.godotlaunch.newgame");
    }

    @Test
    void syncDownloadsForGame_ShouldParseCsvAndUpsertMetrics() {
        when(externalPublishRepository.findById(publishId)).thenReturn(Optional.of(publish));
        String csv = "Date,Package Name,Country,Daily User Installs\n2026-08-28,com.godotlaunch.skyadventure,VN,5";
        when(googlePlayMockClient.fetchInstallReportCsv(eq("com.godotlaunch.skyadventure"), anyString())).thenReturn(csv);
        when(seaweedFsService.uploadStream(any(InputStream.class), anyString(), eq("text/csv"))).thenReturn("http://seaweedfs/csv");
        when(storeReportImportRepository.save(any(StoreReportImport.class))).thenAnswer(i -> {
            StoreReportImport imp = i.getArgument(0);
            imp.setId(UUID.randomUUID());
            return imp;
        });

        StoreReportImportResponse res = storeReportService.syncDownloadsForGame(publishId, adminId);

        assertThat(res).isNotNull();
        assertThat(res.getStatus()).isEqualTo("succeeded");
        verify(storeDailyInstallMetricRepository, times(1)).save(any(StoreDailyInstallMetric.class));
    }

    @Test
    void executeDemoPayout_ShouldCalculate15PercentFeeAnd85PercentNetProceeds() {
        game.setPriceProposed(new BigDecimal("10000"));
        when(externalPublishRepository.findById(publishId)).thenReturn(Optional.of(publish));
        when(contractRepository.findFirstByGameId(gameId)).thenReturn(Optional.of(contract));
        when(storeRevenueStatementRepository.findByExternalPayoutId(anyString())).thenReturn(Optional.empty());

        Map<String, Object> payoutMap = new HashMap<>();
        payoutMap.put("externalPayoutId", "MOCK-GP-202608-com.godotlaunch.skyadventure");
        payoutMap.put("grossRevenue", 1000000);
        when(googlePlayMockClient.fetchPayoutStatement(anyString(), anyString(), anyLong(), any())).thenReturn(payoutMap);

        when(storeRevenueStatementRepository.save(any(StoreRevenueStatement.class))).thenAnswer(i -> i.getArgument(0));

        Wallet wallet = new Wallet();
        wallet.setBalance(BigDecimal.ZERO);
        wallet.setWithdrawableBalance(BigDecimal.ZERO);
        when(walletService.getOrCreateWallet(dev)).thenReturn(wallet);
        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));

        StoreRevenueStatementResponse res = storeReportService.executeDemoPayout(publishId, "2026-08-demo-01", adminId);

        assertThat(res).isNotNull();
        assertThat(res.getGrossRevenue()).isEqualByComparingTo("1000000.00");
        assertThat(res.getGoogleFeeAmount()).isEqualByComparingTo("150000.00");
        assertThat(res.getNetStoreProceeds()).isEqualByComparingTo("850000.00");
        assertThat(res.getDeveloperEarnings()).isEqualByComparingTo("680000.00");
        assertThat(res.getPlatformRetainedRevenue()).isEqualByComparingTo("170000.00");

        verify(transactionRepository, times(1)).save(any(Transaction.class));
    }
}
