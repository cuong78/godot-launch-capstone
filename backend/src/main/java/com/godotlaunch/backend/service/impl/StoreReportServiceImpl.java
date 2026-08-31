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
        return syncDownloadsForGame(externalPublishId, null, adminId);
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

        String yyyyMM = targetYyyyMM;
        if (yyyyMM == null || yyyyMM.isBlank() || !yyyyMM.matches("\\d{6}")) {
            Optional<StoreReportImport> latestOpt = storeReportImportRepository
                    .findByExternalPublish_Game_IdOrderBySyncedAtDesc(publish.getGame().getId())
                    .stream()
                    .filter(imp -> imp.getReportMonth() != null && imp.getReportMonth().matches("\\d{4}-\\d{2}"))
                    .findFirst();

            if (latestOpt.isPresent()) {
                String[] parts = latestOpt.get().getReportMonth().split("-");
                int y = Integer.parseInt(parts[0]);
                int m = Integer.parseInt(parts[1]);
                YearMonth nextYm = YearMonth.of(y, m).plusMonths(1);
                yyyyMM = nextYm.format(DateTimeFormatter.ofPattern("yyyyMM"));
            } else {
                yyyyMM = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
            }
        }

        int year = Integer.parseInt(yyyyMM.substring(0, 4));
        int month = Integer.parseInt(yyyyMM.substring(4, 6));
        String reportMonth = String.format("%04d-%02d", year, month);

        String sourceObjectPath = "stats/installs/installs_" + publish.getPackageName() + "_" + yyyyMM + "_country.csv";

        String csvContent = googlePlayMockClient.fetchInstallReportCsv(publish.getPackageName(), yyyyMM);

        byte[] csvBytes = csvContent.getBytes(StandardCharsets.UTF_8);
        String checksum = calculateSha256(csvBytes);

        // Upload raw CSV to SeaweedFS
        String objectKey = "reports/installs/" + publish.getPackageName() + "/" + yyyyMM + "_" + UUID.randomUUID() + ".csv";
        String rawFileUrl = seaweedFsService.uploadStream(new ByteArrayInputStream(csvBytes), objectKey, "text/csv");

        // Save import history record
        StoreReportImport reportImport = StoreReportImport.builder()
                .provider("GOOGLE_PLAY_MOCK")
                .externalPublish(publish)
                .sourceObjectPath(sourceObjectPath)
                .reportMonth(reportMonth)
                .syncedAt(Instant.now())
                .rawFileUrl(rawFileUrl)
                .fileChecksum(checksum)
                .rowCount(0)
                .status("succeeded")
                .build();
        reportImport = storeReportImportRepository.save(reportImport);

        // Parse CSV & Idempotent Upsert Metrics
        int parsedRows = parseAndUpsertMetrics(csvContent, publish, reportImport);

        reportImport.setRowCount(parsedRows);
        storeReportImportRepository.save(reportImport);

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
    public StoreRevenueStatementResponse executeDemoPayout(UUID externalPublishId, String periodKey, UUID adminId) {
        ExternalPublish publish = externalPublishRepository.findById(externalPublishId)
                .orElseGet(() -> externalPublishRepository.findFirstByGame_IdOrderByCreatedAtDesc(externalPublishId)
                        .orElseThrow(() -> new RuntimeException("Chưa tìm thấy bản ghi xuất bản Google Play cho game này. Vui lòng bấm Kích hoạt Mock trước!")));

        if (publish.getPackageName() == null || publish.getPackageName().isBlank()) {
            throw new RuntimeException("Game chưa có Package Name để thực hiện demo payout");
        }

        Game game = publish.getGame();

        // Validate contract (Optional for payout calculation)
        Optional<Contract> contractOpt = contractRepository.findFirstByGameId(game.getId());
        Contract contract = contractOpt.orElse(null);

        BigDecimal developerShareRate = BigDecimal.ZERO;
        if (contract != null && contract.getContractType() == ContractType.co_publishing && contract.getRevenueSplit() != null) {
            developerShareRate = new BigDecimal(contract.getRevenueSplit());
        }

        if (periodKey == null || periodKey.isBlank()) {
            periodKey = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyyMM")) + "-demo-01";
        }

        // Extract target month (YYYYMM) from periodKey
        String yyyyMM = null;
        int targetYear = 0;
        int targetMonth = 0;

        java.util.regex.Matcher m6 = java.util.regex.Pattern.compile("(\\d{4})(\\d{2})").matcher(periodKey);
        java.util.regex.Matcher m7 = java.util.regex.Pattern.compile("(\\d{4})-(\\d{2})").matcher(periodKey);

        if (m6.find()) {
            targetYear = Integer.parseInt(m6.group(1));
            targetMonth = Integer.parseInt(m6.group(2));
            yyyyMM = String.format("%04d%02d", targetYear, targetMonth);
        } else if (m7.find()) {
            targetYear = Integer.parseInt(m7.group(1));
            targetMonth = Integer.parseInt(m7.group(2));
            yyyyMM = String.format("%04d%02d", targetYear, targetMonth);
        } else {
            YearMonth ym = YearMonth.now();
            targetYear = ym.getYear();
            targetMonth = ym.getMonthValue();
            yyyyMM = ym.format(DateTimeFormatter.ofPattern("yyyyMM"));
        }

        // Determine unit price of the game (from priceProposed)
        BigDecimal unitPrice = game.getPriceProposed();
        if (unitPrice == null || unitPrice.compareTo(BigDecimal.ZERO) <= 0) {
            unitPrice = new BigDecimal("99000"); // Default 99,000 VND for demo
        }

        // Calculate installs for this target month
        LocalDate startDate = LocalDate.of(targetYear, Math.min(Math.max(targetMonth, 1), 12), 1);
        LocalDate endDate = startDate.plusMonths(1).minusDays(1);

        Long periodInstalls = storeDailyInstallMetricRepository.sumDailyUserInstallsByGameIdAndDateRange(game.getId(), startDate, endDate);

        if (periodInstalls == null || periodInstalls == 0) {
            try {
                // Auto-sync installs for the target month from mock Google Play
                syncDownloadsForGame(externalPublishId, yyyyMM, adminId);
                periodInstalls = storeDailyInstallMetricRepository.sumDailyUserInstallsByGameIdAndDateRange(game.getId(), startDate, endDate);
            } catch (Exception e) {
                log.warn("Auto-sync downloads failed for month {} game {}: {}", yyyyMM, game.getTitle(), e.getMessage());
            }
        }

        if (periodInstalls == null || periodInstalls == 0) {
            periodInstalls = 100L; // Fallback 100 installs for demo
        }

        // Calculate Gross Revenue dynamically for THIS PERIOD = Period Installs * Unit Price
        BigDecimal grossRevenue = unitPrice.multiply(BigDecimal.valueOf(periodInstalls));

        // Fetch payout statement from mock container with periodInstalls and unitPrice
        Map<String, Object> payoutStatementMap = googlePlayMockClient.fetchPayoutStatement(publish.getPackageName(), periodKey, periodInstalls, unitPrice);
        String externalPayoutId = (String) payoutStatementMap.get("externalPayoutId");

        // Financial Calculation (15% Google Fee, 85% Net Proceeds, Contract Split)
        BigDecimal googleFeeRate = new BigDecimal("15.00");
        BigDecimal googleFeeAmount = grossRevenue.multiply(googleFeeRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal netStoreProceeds = grossRevenue.subtract(googleFeeAmount);

        BigDecimal developerEarnings = netStoreProceeds.multiply(developerShareRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal platformRetained = netStoreProceeds.subtract(developerEarnings);

        // Check if statement already exists -> Reject duplicate payout to prevent double-crediting
        Optional<StoreRevenueStatement> existingOpt = storeRevenueStatementRepository.findByExternalPayoutId(externalPayoutId);
        if (existingOpt.isPresent()) {
            throw new RuntimeException("Kỳ thanh toán (Period Key) '" + periodKey + "' đã được hạch toán và chuyển tiền thành công trước đó! Vui lòng nhập Period Key mới (ví dụ: đổi thành đợt tiếp theo như " + periodKey + "-02) để thực hiện Payout.");
        }

        StoreRevenueStatement statement = StoreRevenueStatement.builder()
                .externalPublish(publish)
                .game(game)
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

        // Credit Developer Wallet & Record Transaction if developerShareRate > 0
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
            devTxn.setReferenceId(externalPayoutId);
            devTxn.setDescription("Google Play Mock Revenue Share (" + developerShareRate + "% of Net Store Proceeds " + netStoreProceeds + " VND)");
            transactionRepository.save(devTxn);
        }

        log.info("[MOCK PAYOUT SETTLED] Game: {}, Gross: {}, Fee: {}, Net: {}, DevEarnings: {}, PlatformRetained: {}",
                game.getTitle(), grossRevenue, googleFeeAmount, netStoreProceeds, developerEarnings, platformRetained);

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
            if (cols.length < 4) continue;

            String dateStr = cols[0].trim();
            String packageName = cols[1].trim();
            String country = cols[2].trim();
            int installs = Integer.parseInt(cols[3].trim());

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
                .build();
    }
}
