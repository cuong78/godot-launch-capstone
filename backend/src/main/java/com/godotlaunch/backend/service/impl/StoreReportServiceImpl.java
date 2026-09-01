package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.ActivateMockPublishRequest;
import com.godotlaunch.backend.dto.request.GooglePlayMockConfigDto;
import com.godotlaunch.backend.dto.response.*;
import com.godotlaunch.backend.entity.*;
import com.godotlaunch.backend.entity.enums.ContractStatus;
import com.godotlaunch.backend.entity.enums.ContractType;
import com.godotlaunch.backend.entity.enums.ExtStatus;
import com.godotlaunch.backend.entity.enums.TxnType;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.*;
import com.godotlaunch.backend.service.SeaweedFsService;
import com.godotlaunch.backend.service.StoreReportService;
import com.godotlaunch.backend.service.WalletService;
import com.godotlaunch.backend.util.WalletBalancePolicy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class StoreReportServiceImpl implements StoreReportService {

    private final ExternalPublishRepository externalPublishRepository;
    private final StoreReportImportRepository storeReportImportRepository;
    private final StoreDailyInstallMetricRepository storeDailyInstallMetricRepository;
    private final StoreRevenueStatementRepository storeRevenueStatementRepository;
    private final ContractRepository contractRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final GameRepository gameRepository;
    private final GameVersionRepository gameVersionRepository;
    private final WalletService walletService;
    private final SeaweedFsService seaweedFsService;
    private final GooglePlayMockClient googlePlayMockClient;

    // In-memory / stored configuration cache for Publisher Settings
    private static GooglePlayMockConfigDto publisherConfig = GooglePlayMockConfigDto.builder()
            .provider("GOOGLE_PLAY_MOCK")
            .bucketUri("gs://pubsite_prod_rev_01234567890987654321")
            .serviceAccountEmail("godotlaunch-play-reports@your-project.iam.gserviceaccount.com")
            .dailySyncTime("02:00")
            .enabled(true)
            .build();

    @Override
    public GooglePlayMockConfigDto updatePublisherConfig(GooglePlayMockConfigDto configDto, UUID adminId) {
        if (configDto.getBucketUri() == null || !configDto.getBucketUri().startsWith("gs://pubsite_prod_rev_") || configDto.getBucketUri().contains(" ")) {
            throw new RuntimeException("Bucket URI không đúng định dạng Google Play (bắt đầu bằng gs://pubsite_prod_rev_ và không chứa khoảng trắng)");
        }
        if (configDto.getServiceAccountEmail() == null || !configDto.getServiceAccountEmail().contains("@") || !configDto.getServiceAccountEmail().endsWith(".gserviceaccount.com")) {
            throw new RuntimeException("Service Account Email không đúng định dạng (...@project.iam.gserviceaccount.com)");
        }
        publisherConfig = configDto;
        log.info("[MOCK PUBLISHER CONFIG] Updated by admin {}: bucketUri={}", adminId, configDto.getBucketUri());
        return publisherConfig;
    }

    @Override
    public GooglePlayMockConfigDto getPublisherConfig() {
        return publisherConfig;
    }

    @Override
    @Transactional(readOnly = true)
    public List<EligibleStoreGameResponse> getEligibleStoreGames() {
        List<Game> games = gameRepository.findAll();
        List<EligibleStoreGameResponse> result = new ArrayList<>();

        for (Game game : games) {
            Optional<Contract> contractOpt = contractRepository.findFirstByGameId(game.getId());
            Optional<ExternalPublish> publishOpt = externalPublishRepository.findFirstByGame_IdOrderByCreatedAtDesc(game.getId());

            boolean hasSignedContract = contractOpt.isPresent() && contractOpt.get().getStatus() == ContractStatus.signed;
            boolean isEligibleStatus = game.getStatus() == com.godotlaunch.backend.entity.enums.GameStatus.awaiting_store_build 
                    || game.getStatus() == com.godotlaunch.backend.entity.enums.GameStatus.published 
                    || game.getStatus() == com.godotlaunch.backend.entity.enums.GameStatus.approved;

            if (hasSignedContract || isEligibleStatus || publishOpt.isPresent()) {
                Long totalInstalls = storeDailyInstallMetricRepository.sumDailyUserInstallsByGameId(game.getId());
                if (totalInstalls == null) totalInstalls = 0L;

                ExternalPublish pub = publishOpt.orElse(null);
                Contract c = contractOpt.orElse(null);

                Boolean hasUnsyncedDownloads = null;
                Instant lastSyncedAt = null;

                if (pub != null && pub.getPackageName() != null) {
                    Optional<StoreReportImport> latestImpOpt = storeReportImportRepository
                            .findFirstByExternalPublish_Game_IdOrderBySyncedAtDesc(game.getId());
                    if (latestImpOpt.isPresent()) {
                        lastSyncedAt = latestImpOpt.get().getSyncedAt();
                        LocalDate lastSyncDate = LocalDate.ofInstant(lastSyncedAt, java.time.ZoneId.systemDefault());
                        LocalDate today = LocalDate.now();
                        hasUnsyncedDownloads = lastSyncDate.isBefore(today);
                    } else {
                        hasUnsyncedDownloads = true;
                    }
                }

                result.add(EligibleStoreGameResponse.builder()
                        .gameId(game.getId())
                        .gameTitle(game.getTitle())
                        .gameStatus(game.getStatus() != null ? game.getStatus().name() : "unknown")
                        .creatorName(game.getCreator() != null ? (game.getCreator().getFullName() != null ? game.getCreator().getFullName() : game.getCreator().getEmail()) : "N/A")
                        .creatorEmail(game.getCreator() != null ? game.getCreator().getEmail() : "N/A")
                        .externalPublishId(pub != null ? pub.getId() : null)
                        .provider(pub != null ? pub.getProvider() : "GOOGLE_PLAY_MOCK")
                        .packageName(pub != null ? pub.getPackageName() : null)
                        .publishStatus(pub != null ? pub.getStatus().name() : "not_activated")
                        .reportingEnabled(pub != null ? pub.getReportingEnabled() : false)
                        .publishedAt(pub != null ? pub.getPublishedAt() : null)
                        .createdAt(game.getCreatedAt())
                        .totalInstalls(totalInstalls)
                        .hasCoPublishingContract(c != null && c.getContractType() == ContractType.co_publishing)
                        .contractType(c != null && c.getContractType() != null ? c.getContractType().name() : null)
                        .revenueSplit(c != null ? c.getRevenueSplit() : null)
                        .hasUnsyncedDownloads(hasUnsyncedDownloads)
                        .lastSyncedAt(lastSyncedAt)
                        .build());
            }
        }

        // Sort latest first (by publishedAt / createdAt descending)
        result.sort((a, b) -> {
            Instant aTime = a.getPublishedAt() != null ? a.getPublishedAt() : a.getCreatedAt();
            Instant bTime = b.getPublishedAt() != null ? b.getPublishedAt() : b.getCreatedAt();
            if (aTime == null && bTime == null) return 0;
            if (aTime == null) return 1;
            if (bTime == null) return -1;
            return bTime.compareTo(aTime);
        });

        return result;
    }

    @Override
    @Transactional
    public ExternalPublishResponse activateMockPublishForGame(UUID gameId, ActivateMockPublishRequest request, UUID adminId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found with ID: " + gameId));

        String packageName = request.getPackageName();
        if (packageName == null || packageName.isBlank()) {
            throw new RuntimeException("Package name là bắt buộc khi kích hoạt Google Play Mock");
        }

        // Validate package name uniqueness
        Optional<ExternalPublish> existingWithPkg = externalPublishRepository.findAll().stream()
                .filter(p -> packageName.equalsIgnoreCase(p.getPackageName()) && !p.getGame().getId().equals(gameId))
                .findFirst();
        if (existingWithPkg.isPresent()) {
            throw new RuntimeException("Package name '" + packageName + "' đã được sử dụng cho một game khác!");
        }

        // Look up or create ExternalPublish
        ExternalPublish publish = externalPublishRepository.findFirstByGame_IdOrderByCreatedAtDesc(gameId)
                .orElseGet(() -> {
                    GameVersion version = gameVersionRepository.findByGame_IdAndIsCurrentTrue(gameId)
                            .orElseGet(() -> {
                                List<GameVersion> versions = gameVersionRepository.findByGame_IdOrderByReleasedAtDesc(gameId);
                                if (!versions.isEmpty()) return versions.get(0);
                                GameVersion newV = new GameVersion();
                                newV.setGame(game);
                                newV.setVersionNumber("1.0.0");
                                newV.setCurrent(true);
                                return gameVersionRepository.save(newV);
                            });
                    ExternalPublish p = new ExternalPublish();
                    p.setGame(game);
                    p.setGameVersion(version);
                    return p;
                });

        // Register package with mock container
        googlePlayMockClient.registerApp(packageName);

        publish.setProvider("GOOGLE_PLAY_MOCK");
        publish.setPackageName(packageName);
        publish.setReportingEnabled(true);
        publish.setStatus(ExtStatus.live);
        publish.setPublishedAt(Instant.now());
        publish.setMockRegistrationId("MOCK-REG-" + packageName);

        // Update price proposed / store selling price if specified in request
        if (request.getPriceProposed() != null && request.getPriceProposed().compareTo(java.math.BigDecimal.ZERO) > 0) {
            game.setPriceProposed(request.getPriceProposed());
        }

        if (game.getStatus() == com.godotlaunch.backend.entity.enums.GameStatus.awaiting_store_build || game.getStatus() == com.godotlaunch.backend.entity.enums.GameStatus.approved) {
            game.setStatus(com.godotlaunch.backend.entity.enums.GameStatus.published);
        }
        gameRepository.save(game);
        publish = externalPublishRepository.save(publish);

        log.info("[MOCK PUBLISH ACTIVATED FOR GAME] Game {} ({}) with package {} price {}", game.getTitle(), gameId, packageName, game.getPriceProposed());
        return mapToPublishResponse(publish);
    }

    @Override
    @Transactional
    public ExternalPublishResponse activateMockPublish(UUID externalPublishId, ActivateMockPublishRequest request, UUID adminId) {
        ExternalPublish publish = externalPublishRepository.findById(externalPublishId)
                .orElseThrow(() -> new RuntimeException("External publish record not found"));

        String packageName = request.getPackageName();
        if (packageName == null || packageName.isBlank()) {
            throw new RuntimeException("Package name là bắt buộc khi kích hoạt Google Play Mock");
        }

        // Validate package name uniqueness
        Optional<ExternalPublish> existing = externalPublishRepository.findAll().stream()
                .filter(p -> packageName.equalsIgnoreCase(p.getPackageName()) && !p.getId().equals(externalPublishId))
                .findFirst();
        if (existing.isPresent()) {
            throw new RuntimeException("Package name '" + packageName + "' đã được sử dụng cho một game khác!");
        }

        // Register package with mock container
        googlePlayMockClient.registerApp(packageName);

        publish.setProvider("GOOGLE_PLAY_MOCK");
        publish.setPackageName(packageName);
        publish.setReportingEnabled(true);
        publish.setStatus(ExtStatus.live);
        publish.setPublishedAt(Instant.now());
        publish.setMockRegistrationId("MOCK-REG-" + packageName);

        externalPublishRepository.save(publish);

        // Update price proposed / store selling price if specified in request
        if (request.getPriceProposed() != null && request.getPriceProposed().compareTo(java.math.BigDecimal.ZERO) > 0) {
            Game game = publish.getGame();
            game.setPriceProposed(request.getPriceProposed());
            gameRepository.save(game);
        }

        log.info("[MOCK PUBLISH ACTIVATED] Game {} with package {}", publish.getGame().getTitle(), packageName);

        return mapToPublishResponse(publish);
    }

    @Override
    @Transactional
    public StoreReportImportResponse syncDownloadsForGame(UUID externalPublishId, UUID adminId) {
        return syncDownloadsForGame(externalPublishId, (String) null, adminId);
    }

    @Override
    @Transactional
    public StoreReportImportResponse syncDownloadsForGame(UUID externalPublishId, String targetYyyyMM, UUID adminId) {
        ExternalPublish publish = externalPublishRepository.findById(externalPublishId)
                .orElseGet(() -> externalPublishRepository.findFirstByGame_IdOrderByCreatedAtDesc(externalPublishId)
                        .orElseThrow(() -> new RuntimeException("Chưa tìm thấy bản ghi xuất bản Google Play cho game này. Vui lòng bấm Kích hoạt Mock trước!")));

        if (publish.getPackageName() == null || publish.getPackageName().isBlank()) {
            throw new RuntimeException("Game chưa được cấu hình Package Name để đồng bộ report");
        }

        Optional<StoreReportImport> latestImpOpt = storeReportImportRepository
                .findFirstByExternalPublish_Game_IdOrderBySyncedAtDesc(publish.getGame().getId());

        LocalDate today = LocalDate.now();
        LocalDate startDate;

        if (latestImpOpt.isPresent() && latestImpOpt.get().getSyncedAt() != null) {
            LocalDate lastSyncDate = LocalDate.ofInstant(latestImpOpt.get().getSyncedAt(), java.time.ZoneId.systemDefault());
            startDate = lastSyncDate.plusDays(1);
        } else {
            Instant pushTime = publish.getPublishedAt() != null ? publish.getPublishedAt() : (publish.getGame().getCreatedAt() != null ? publish.getGame().getCreatedAt() : Instant.now());
            startDate = LocalDate.ofInstant(pushTime, java.time.ZoneId.systemDefault());
        }

        LocalDate endDate = today;

        if (startDate.isAfter(endDate)) {
            throw new RuntimeException("Không có lượt tải mới nào kể từ lần đồng bộ gần nhất!");
        }

        String startDateStr = startDate.format(DateTimeFormatter.ISO_LOCAL_DATE);
        String endDateStr = endDate.format(DateTimeFormatter.ISO_LOCAL_DATE);
        String reportPeriod = startDateStr.equals(endDateStr) ? startDateStr : (startDateStr + " ~ " + endDateStr);

        String csvContent = googlePlayMockClient.fetchInstallReportCsv(publish.getPackageName(), startDateStr, endDateStr);

        byte[] csvBytes = csvContent.getBytes(StandardCharsets.UTF_8);
        String checksum = calculateSha256(csvBytes);

        // Upload raw CSV to SeaweedFS
        String objectKey = "reports/installs/" + publish.getPackageName() + "/" + startDateStr + "_to_" + endDateStr + "_" + UUID.randomUUID() + ".csv";
        String rawFileUrl = seaweedFsService.uploadStream(new ByteArrayInputStream(csvBytes), objectKey, "text/csv");

        // Save import history record
        StoreReportImport reportImport = StoreReportImport.builder()
                .provider("GOOGLE_PLAY_MOCK")
                .externalPublish(publish)
                .sourceObjectPath("stats/installs/installs_" + publish.getPackageName() + "_" + startDateStr + "_to_" + endDateStr + ".csv")
                .reportMonth(reportPeriod)
                .syncedAt(Instant.now())
                .rawFileUrl(rawFileUrl)
                .fileChecksum(checksum)
                .rowCount(0)
                .status("succeeded")
                .build();
        reportImport = storeReportImportRepository.save(reportImport);

        // Parse CSV & Idempotent Upsert Metrics
        int parsedRows = parseAndUpsertMetrics(csvContent, publish, reportImport);

        if (parsedRows == 0) {
            storeReportImportRepository.delete(reportImport);
            throw new RuntimeException("Chưa có lượt tải mới nào để đồng bộ!");
        }

        reportImport.setRowCount(parsedRows);
        reportImport = storeReportImportRepository.save(reportImport);

        log.info("[MOCK SYNC DOWNLOADS] Synced {} rows for game {} package {} period {}", parsedRows, publish.getGame().getTitle(), publish.getPackageName(), reportPeriod);
        return mapToImportResponse(reportImport);
    }

    @Override
    @Transactional
    public void syncAllActiveGamesDownloads() {
        if (!Boolean.TRUE.equals(publisherConfig.getEnabled())) {
            log.info("[MOCK SCHEDULER] Daily sync skipped because publisher is disabled.");
            return;
        }

        List<ExternalPublish> activePublishes = externalPublishRepository.findAll().stream()
                .filter(p -> "GOOGLE_PLAY_MOCK".equalsIgnoreCase(p.getProvider())
                        && p.getPackageName() != null
                        && Boolean.TRUE.equals(p.getReportingEnabled()))
                .toList();

        for (ExternalPublish publish : activePublishes) {
            try {
                syncDownloadsForGame(publish.getId(), null);
            } catch (Exception e) {
                log.error("[MOCK SCHEDULER] Failed sync for game {}: {}", publish.getGame().getTitle(), e.getMessage());
            }
        }
    }

    @Override
    @Transactional
    public StoreRevenueStatementResponse executeDemoPayout(UUID externalPublishId, String periodKeyInput, UUID adminId) {
        ExternalPublish publish = externalPublishRepository.findById(externalPublishId)
                .orElseThrow(() -> new RuntimeException("External publish record not found"));

        if (publish.getPackageName() == null || publish.getPackageName().isBlank()) {
            throw new RuntimeException("Game chưa có Package Name để thực hiện demo payout");
        }

        Game game = publish.getGame();

        // Sync downloads for latest period if available
        try {
            syncDownloadsForGame(externalPublishId, adminId);
        } catch (Exception e) {
            log.info("[DEMO PAYOUT] Sync did not produce a new import: {}", e.getMessage());
        }

        // Find all imports for this game
        List<StoreReportImport> allImportsForGame = storeReportImportRepository
                .findByExternalPublish_Game_IdOrderBySyncedAtDesc(game.getId());

        // Find all import IDs that have already been paid out
        Set<UUID> paidImportIds = storeRevenueStatementRepository.findAll().stream()
                .filter(s -> s.getGame().getId().equals(game.getId()) && s.getSourceImport() != null)
                .map(s -> s.getSourceImport().getId())
                .collect(Collectors.toSet());

        // Filter imports that have NOT been paid out yet
        List<StoreReportImport> unpaidImports = allImportsForGame.stream()
                .filter(imp -> !paidImportIds.contains(imp.getId()))
                .collect(Collectors.toList());

        if (unpaidImports.isEmpty()) {
            throw new RuntimeException("Tất cả các đợt đồng bộ lượt tải của game này đã được hoàn tất hạch toán thanh toán trước đó! Vui lòng Sync Lượt Tải mới để tiếp tục.");
        }

        StoreReportImport reportImport = unpaidImports.get(0);
        Set<UUID> unpaidImportIds = unpaidImports.stream().map(StoreReportImport::getId).collect(Collectors.toSet());

        // Calculate period installs from DB metrics for ALL unpaid imports
        Long totalUnpaidInstalls = storeDailyInstallMetricRepository.findAll().stream()
                .filter(m -> m.getGame().getId().equals(game.getId()) 
                          && m.getSourceImport() != null 
                          && unpaidImportIds.contains(m.getSourceImport().getId()))
                .mapToLong(m -> m.getDailyUserInstalls() != null ? m.getDailyUserInstalls() : 0L)
                .sum();

        long periodInstalls = (totalUnpaidInstalls != null && totalUnpaidInstalls > 0) ? totalUnpaidInstalls : 100L;

        String periodKey;
        if (periodKeyInput != null && !periodKeyInput.isBlank()) {
            periodKey = periodKeyInput;
        } else if (unpaidImports.size() == 1) {
            periodKey = reportImport.getReportMonth();
        } else {
            StoreReportImport oldestUnpaid = unpaidImports.get(unpaidImports.size() - 1);
            periodKey = oldestUnpaid.getReportMonth() + " ~ " + reportImport.getReportMonth();
        }

        // Validate contract
        Optional<Contract> contractOpt = contractRepository.findFirstByGameId(game.getId());
        Contract contract = contractOpt.orElse(null);

        BigDecimal developerShareRate = BigDecimal.ZERO;
        if (contract != null && contract.getContractType() == ContractType.co_publishing && contract.getRevenueSplit() != null) {
            developerShareRate = new BigDecimal(contract.getRevenueSplit());
        }

        // Determine unit price of the game
        BigDecimal unitPrice = game.getPriceProposed();
        if (unitPrice == null || unitPrice.compareTo(BigDecimal.ZERO) <= 0) {
            unitPrice = new BigDecimal("99000"); // Default 99,000 VND
        }

        // Financial Calculation (15% Google Fee, 85% Net Proceeds, Contract Split)
        BigDecimal grossRevenue = unitPrice.multiply(BigDecimal.valueOf(periodInstalls));
        BigDecimal googleFeeRate = new BigDecimal("15.00");
        BigDecimal googleFeeAmount = grossRevenue.multiply(googleFeeRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal netStoreProceeds = grossRevenue.subtract(googleFeeAmount);

        BigDecimal developerEarnings = netStoreProceeds.multiply(developerShareRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal platformRetained = netStoreProceeds.subtract(developerEarnings);

        String externalPayoutId = "MOCK-GP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase() + "-" + publish.getPackageName();

        StoreRevenueStatement statement = StoreRevenueStatement.builder()
                .externalPublish(publish)
                .game(game)
                .sourceImport(reportImport)
                .provider("GOOGLE_PLAY_MOCK")
                .periodKey(periodKey)
                .externalPayoutId(externalPayoutId)
                .grossRevenue(grossRevenue)
                .googleFeeRate(googleFeeRate)
                .googleFeeAmount(googleFeeAmount)
                .netStoreProceeds(netStoreProceeds)
                .developerShareRate(developerShareRate)
                .developerEarnings(developerEarnings)
                .platformRetainedRevenue(platformRetained)
                .currency("VND")
                .status("paid")
                .settledAt(Instant.now())
                .build();
        statement = storeRevenueStatementRepository.save(statement);

        // 3. Credit Developer Wallet & Admin Wallet with Transaction records
        if (developerEarnings.compareTo(BigDecimal.ZERO) > 0) {
            User developer = game.getCreator();
            Wallet devWallet = walletService.getOrCreateWallet(developer);
            WalletBalancePolicy.creditSalesRevenue(devWallet, developerEarnings);
            walletRepository.save(devWallet);

            Transaction devTxn = new Transaction();
            devTxn.setWallet(devWallet);
            devTxn.setRelatedUser(userRepository.findById(adminId).orElse(null));
            devTxn.setGame(game);
            devTxn.setContract(contract);
            devTxn.setAmount(developerEarnings);
            devTxn.setType(TxnType.revenue_share);
            devTxn.setReferenceId(externalPayoutId + "-DEV");
            devTxn.setDescription("Doanh thu CH Play chia sẻ Tác giả (" + developerShareRate + "% Doanh thu thuần, kỳ " + periodKey + ")");
            transactionRepository.save(devTxn);
        }

        if (adminId != null && platformRetained.compareTo(BigDecimal.ZERO) > 0) {
            User adminUser = userRepository.findById(adminId).orElse(null);
            if (adminUser != null) {
                Wallet adminWallet = walletService.getOrCreateWallet(adminUser);
                WalletBalancePolicy.creditSalesRevenue(adminWallet, platformRetained);
                walletRepository.save(adminWallet);

                Transaction adminTxn = new Transaction();
                adminTxn.setWallet(adminWallet);
                adminTxn.setRelatedUser(game.getCreator());
                adminTxn.setGame(game);
                adminTxn.setContract(contract);
                adminTxn.setAmount(platformRetained);
                adminTxn.setType(TxnType.revenue_share);
                adminTxn.setReferenceId(externalPayoutId + "-PLATFORM");
                adminTxn.setDescription("Phần giữ lại của Sàn từ CH Play (kỳ " + periodKey + ")");
                transactionRepository.save(adminTxn);
            }
        }

        log.info("[MOCK PAYOUT SETTLED] Game: {}, Period: {}, Installs: {}, Gross: {}, Fee: {}, Net: {}, Dev: {}, Platform: {}",
                game.getTitle(), periodKey, periodInstalls, grossRevenue, googleFeeAmount, netStoreProceeds, developerEarnings, platformRetained);

        return mapToStatementResponse(statement);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoreReportImportResponse> getAllReportImports() {
        return storeReportImportRepository.findAllByOrderBySyncedAtDesc().stream()
                .map(this::mapToImportResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoreReportImportResponse> getReportImportsByGame(UUID gameId, UUID developerId) {
        verifyGameOwner(gameId, developerId);
        return storeReportImportRepository.findByExternalPublish_Game_IdOrderBySyncedAtDesc(gameId).stream()
                .map(this::mapToImportResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoreDailyMetricResponse> getAllDailyMetrics() {
        return storeDailyInstallMetricRepository.findAllByOrderByMetricDateDesc().stream()
                .map(this::mapToMetricResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoreDailyMetricResponse> getDailyMetricsByGame(UUID gameId, UUID developerId) {
        verifyGameOwner(gameId, developerId);
        return storeDailyInstallMetricRepository.findByGameIdOrderByMetricDateDesc(gameId).stream()
                .map(this::mapToMetricResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoreRevenueStatementResponse> getAllRevenueStatements() {
        return storeRevenueStatementRepository.findAllByOrderBySettledAtDesc().stream()
                .map(this::mapToStatementResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoreRevenueStatementResponse> getRevenueStatementsByGame(UUID gameId, UUID developerId) {
        verifyGameOwner(gameId, developerId);
        return storeRevenueStatementRepository.findByGameIdOrderBySettledAtDesc(gameId).stream()
                .map(this::mapToStatementResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public StoreRevenueSummaryResponse getStoreRevenueSummary() {
        List<StoreRevenueStatement> statements = storeRevenueStatementRepository.findAll();
        BigDecimal gross = statements.stream().map(StoreRevenueStatement::getGrossRevenue).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal fee = statements.stream().map(StoreRevenueStatement::getGoogleFeeAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal net = statements.stream().map(StoreRevenueStatement::getNetStoreProceeds).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal devPayable = statements.stream().map(StoreRevenueStatement::getDeveloperEarnings).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal platformRetained = statements.stream().map(StoreRevenueStatement::getPlatformRetainedRevenue).reduce(BigDecimal.ZERO, BigDecimal::add);

        long publishedGamesCount = externalPublishRepository.findAll().stream()
                .filter(p -> p.getPackageName() != null && Boolean.TRUE.equals(p.getReportingEnabled()))
                .count();

        Long totalInstalls = storeDailyInstallMetricRepository.findAll().stream()
                .mapToLong(m -> m.getDailyUserInstalls() != null ? m.getDailyUserInstalls() : 0L)
                .sum();

        return StoreRevenueSummaryResponse.builder()
                .totalGrossRevenue(gross)
                .totalGoogleFee(fee)
                .totalNetStoreProceeds(net)
                .totalDeveloperPayable(devPayable)
                .totalPlatformRetained(platformRetained)
                .totalPublishedGames(publishedGamesCount)
                .totalDailyUserInstalls(totalInstalls)
                .build();
    }

    @Override
    public byte[] getRawReportCsv(UUID importId, UUID userId, boolean isAdmin) {
        StoreReportImport reportImport = storeReportImportRepository.findById(importId)
                .orElseThrow(() -> new RuntimeException("Import record not found"));

        if (!isAdmin) {
            verifyGameOwner(reportImport.getExternalPublish().getGame().getId(), userId);
        }

        try {
            // Read stream from SeaweedFS
            String objectKey = seaweedFsService.extractObjectKey(reportImport.getRawFileUrl());
            if (objectKey == null) {
                objectKey = reportImport.getRawFileUrl();
            }
            return seaweedFsService.getObjectStream(objectKey).readAllBytes();
        } catch (Exception e) {
            throw new RuntimeException("Không thể đọc file CSV thô: " + e.getMessage());
        }
    }

    private int parseAndUpsertMetrics(String csvContent, ExternalPublish publish, StoreReportImport reportImport) {
        String[] lines = csvContent.split("\\r?\\n");
        if (lines.length <= 1) {
            return 0;
        }

        int count = 0;
        // Skip header line
        for (int i = 1; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isBlank()) continue;

            String[] cols = line.split(",");
            if (cols.length < 3) continue;

            String dateStr = cols[0].trim();
            String packageName = cols[1].trim();
            final String country;
            int installs;

            if (cols.length == 3) {
                country = "GLOBAL";
                installs = Integer.parseInt(cols[2].trim());
            } else {
                // Backward compatibility for 4-column CSV with country
                country = cols[2].trim();
                installs = Integer.parseInt(cols[3].trim());
            }

            LocalDate metricDate = LocalDate.parse(dateStr);

            Optional<StoreDailyInstallMetric> existingOpt = storeDailyInstallMetricRepository
                    .findByExternalPublishIdAndMetricDateAndCountryCode(publish.getId(), metricDate, country);

            StoreDailyInstallMetric metric = existingOpt.orElseGet(() -> StoreDailyInstallMetric.builder()
                    .externalPublish(publish)
                    .game(publish.getGame())
                    .metricDate(metricDate)
                    .countryCode(country)
                    .build());

            metric.setDailyUserInstalls(installs);
            metric.setSourceImport(reportImport);
            metric.setUpdatedAt(Instant.now());

            storeDailyInstallMetricRepository.save(metric);
            count++;
        }
        return count;
    }

    private void verifyGameOwner(UUID gameId, UUID userId) {
        ExternalPublish publish = externalPublishRepository.findAll().stream()
                .filter(p -> p.getGame().getId().equals(gameId))
                .findFirst()
                .orElse(null);
        if (publish == null) {
            return;
        }
        if (publish.getGame() != null && publish.getGame().getCreator() != null &&
                publish.getGame().getCreator().getId().equals(userId)) {
            return;
        }
        com.godotlaunch.backend.entity.User user = userRepository.findById(userId).orElse(null);
        if (user != null && user.getRole() != null) {
            String roleName = user.getRole().getName();
            if ("ADMIN".equalsIgnoreCase(roleName) || "ROLE_ADMIN".equalsIgnoreCase(roleName)) {
                return;
            }
        }
        throw new RuntimeException("Bạn không có quyền truy cập dữ liệu báo cáo của game này!");
    }

    private String calculateSha256(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return "UNKNOWN-HASH";
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExternalPublishResponse> getDeveloperStoreGames(UUID developerId, boolean isAdmin) {
        return externalPublishRepository.findAll().stream()
                .filter(p -> (isAdmin || (p.getGame() != null && p.getGame().getCreator() != null && p.getGame().getCreator().getId().equals(developerId))) && p.getPackageName() != null)
                .map(this::mapToPublishResponse)
                .collect(Collectors.toList());
    }

    private ExternalPublishResponse mapToPublishResponse(ExternalPublish p) {
        return ExternalPublishResponse.builder()
                .id(p.getId())
                .gameId(p.getGame().getId())
                .gameVersionId(p.getGameVersion() != null ? p.getGameVersion().getId() : null)
                .versionNumber(p.getGameVersion() != null ? p.getGameVersion().getVersionNumber() : null)
                .status(p.getStatus().name())
                .externalAppId(p.getExternalAppId())
                .storeUrl(p.getStoreUrl())
                .submittedAt(p.getSubmittedAt())
                .liveAt(p.getLiveAt())
                .rejectedReason(p.getRejectedReason())
                .provider(p.getProvider())
                .packageName(p.getPackageName())
                .reportingEnabled(p.getReportingEnabled())
                .publishedAt(p.getPublishedAt())
                .mockRegistrationId(p.getMockRegistrationId())
                .createdAt(p.getCreatedAt())
                .build();
    }

    private StoreReportImportResponse mapToImportResponse(StoreReportImport imp) {
        return StoreReportImportResponse.builder()
                .id(imp.getId())
                .provider(imp.getProvider())
                .externalPublishId(imp.getExternalPublish().getId())
                .gameTitle(imp.getExternalPublish().getGame().getTitle())
                .packageName(imp.getExternalPublish().getPackageName())
                .sourceObjectPath(imp.getSourceObjectPath())
                .reportMonth(imp.getReportMonth())
                .syncedAt(imp.getSyncedAt())
                .rawFileUrl(imp.getRawFileUrl())
                .fileChecksum(imp.getFileChecksum())
                .rowCount(imp.getRowCount())
                .status(imp.getStatus())
                .errorMessage(imp.getErrorMessage())
                .build();
    }

    private StoreDailyMetricResponse mapToMetricResponse(StoreDailyInstallMetric m) {
        return StoreDailyMetricResponse.builder()
                .id(m.getId())
                .externalPublishId(m.getExternalPublish().getId())
                .gameId(m.getGame().getId())
                .gameTitle(m.getGame().getTitle())
                .packageName(m.getExternalPublish().getPackageName())
                .metricDate(m.getMetricDate())
                .countryCode(m.getCountryCode())
                .dailyUserInstalls(m.getDailyUserInstalls())
                .build();
    }

    private StoreRevenueStatementResponse mapToStatementResponse(StoreRevenueStatement s) {
        return StoreRevenueStatementResponse.builder()
                .id(s.getId())
                .externalPublishId(s.getExternalPublish().getId())
                .gameId(s.getGame().getId())
                .gameTitle(s.getGame().getTitle())
                .packageName(s.getExternalPublish().getPackageName())
                .provider(s.getProvider())
                .periodKey(s.getPeriodKey())
                .externalPayoutId(s.getExternalPayoutId())
                .grossRevenue(s.getGrossRevenue())
                .googleFeeRate(s.getGoogleFeeRate())
                .googleFeeAmount(s.getGoogleFeeAmount())
                .netStoreProceeds(s.getNetStoreProceeds())
                .developerShareRate(s.getDeveloperShareRate())
                .developerEarnings(s.getDeveloperEarnings())
                .platformRetainedRevenue(s.getPlatformRetainedRevenue())
                .currency(s.getCurrency())
                .status(s.getStatus())
                .settledAt(s.getSettledAt())
                .sourceImportId(s.getSourceImport() != null ? s.getSourceImport().getId() : null)
                .rawCsvUrl(s.getSourceImport() != null ? s.getSourceImport().getRawFileUrl() : null)
                .build();
    }
}
