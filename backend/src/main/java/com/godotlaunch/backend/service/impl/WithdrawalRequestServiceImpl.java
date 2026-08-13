package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.ApproveWithdrawalRequest;
import com.godotlaunch.backend.dto.request.CreateWithdrawalRequest;
import com.godotlaunch.backend.dto.request.PayoutGatewayCreateRequest;
import com.godotlaunch.backend.dto.request.RejectWithdrawalRequest;
import com.godotlaunch.backend.dto.projection.ProductSalesRow;
import com.godotlaunch.backend.dto.response.DeveloperSalesStatsResponse;
import com.godotlaunch.backend.dto.response.DeveloperWalletSummaryResponse;
import com.godotlaunch.backend.dto.response.PayoutGatewayBalanceResponse;
import com.godotlaunch.backend.dto.response.PayoutGatewayCreateResponse;
import com.godotlaunch.backend.dto.response.ProductSalesResponse;
import com.godotlaunch.backend.dto.response.WithdrawalDetailResponse;
import com.godotlaunch.backend.dto.response.WithdrawalResponse;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Wallet;
import com.godotlaunch.backend.entity.WithdrawalRequest;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import com.godotlaunch.backend.entity.enums.DisputeStatus;
import com.godotlaunch.backend.entity.enums.TxnType;
import com.godotlaunch.backend.entity.enums.WithdrawalStatus;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.DisputeRepository;
import com.godotlaunch.backend.repository.TransactionRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.WalletRepository;
import com.godotlaunch.backend.repository.WithdrawalRequestRepository;
import com.godotlaunch.backend.repository.PayoutGateway;
import com.godotlaunch.backend.scheduler.WithdrawalPayoutSyncScheduler;
import com.godotlaunch.backend.security.EncryptionUtils;
import com.godotlaunch.backend.service.AuditLogService;
import com.godotlaunch.backend.service.NotificationService;
import com.godotlaunch.backend.entity.enums.NotificationType;
import org.springframework.data.domain.PageRequest;
import com.godotlaunch.backend.service.PlatformSettingsService;
import com.godotlaunch.backend.service.PaymentService;
import com.godotlaunch.backend.entity.enums.PaymentStatus;
import com.godotlaunch.backend.service.WithdrawalRequestService;
import com.godotlaunch.backend.util.BankBinResolver;
import com.godotlaunch.backend.service.WithdrawalStatusSynchronizer;
import com.godotlaunch.backend.util.WalletBalancePolicy;
import java.util.Collections;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class WithdrawalRequestServiceImpl implements WithdrawalRequestService {

    private static final String DEFAULT_CURRENCY = "VND";
    private static final BigDecimal MINIMUM_WITHDRAWAL_AMOUNT = new BigDecimal("10000");
    private static final List<String> PAYOUT_CATEGORY = List.of("payment");
    private static final Set<String> PAYOUT_IMMEDIATE_FAILURE_STATUSES = Set.of("FAILED", "REJECTED", "CANCELLED");
    private static final Set<WithdrawalStatus> RESERVED_STATUSES = EnumSet.of(
            WithdrawalStatus.pending,
            WithdrawalStatus.processing,
            WithdrawalStatus.approved
    );
    private static final Set<TxnType> SALES_REVENUE_TXN_TYPES = EnumSet.of(
            TxnType.source_code_purchase,
            TxnType.asset_purchase,
            TxnType.revenue_share
    );

    private final WithdrawalRequestRepository withdrawalRequestRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final DisputeRepository disputeRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final PayoutGateway payoutGateway;
    private final EncryptionUtils encryptionUtils;
    private final WithdrawalStatusSynchronizer withdrawalStatusSynchronizer;
    private final PlatformSettingsService platformSettingsService;
    private final WithdrawalPayoutSyncScheduler withdrawalPayoutSyncScheduler;
    private final PaymentService paymentService;

    @Override
    @Transactional
    public DeveloperWalletSummaryResponse getDeveloperWalletSummary(String email) {
        User developer = getUserByEmail(email);
        assertWalletSelfServiceUser(developer);
        Wallet wallet = getOrCreateWallet(developer);
        WalletMetrics metrics = buildWalletMetrics(developer, wallet);
        return mapWalletSummary(developer, wallet, metrics);
    }

    @Override
    @Transactional
    public DeveloperSalesStatsResponse getDeveloperSalesStats(String email) {
        User developer = getUserByEmail(email);
        assertDeveloper(developer);
        Wallet wallet = getOrCreateWallet(developer);

        long totalUnitsSold = transactionRepository.countByWalletIdAndType(wallet.getId(), TxnType.revenue_share);
        BigDecimal totalRevenue = safeAmount(
                transactionRepository.sumAmountByWalletIdAndTypeIn(wallet.getId(), EnumSet.of(TxnType.revenue_share))
        );

        Map<UUID, Map<PaymentStatus, Long>> statusStats = paymentService.getPaymentStatusStatsBySeller(developer.getId());

        List<ProductSalesResponse> products = Stream.concat(
                        transactionRepository.sumAssetSalesByWalletIdAndType(wallet.getId(), TxnType.revenue_share)
                                .stream().map(row -> mapProductRow(row, "ASSET", statusStats)),
                        transactionRepository.sumGameSalesByWalletIdAndType(wallet.getId(), TxnType.revenue_share)
                                .stream().map(row -> mapProductRow(row, "GAME", statusStats)))
                .sorted(Comparator.comparing(ProductSalesResponse::getRevenue).reversed())
                .collect(Collectors.toList());

        return DeveloperSalesStatsResponse.builder()
                .developerId(developer.getId())
                .developerEmail(developer.getEmail())
                .developerFullName(developer.getFullName())
                .currency(DEFAULT_CURRENCY)
                .totalUnitsSold(totalUnitsSold)
                .totalRevenue(totalRevenue)
                .products(products)
                .build();
    }

    private ProductSalesResponse mapProductRow(ProductSalesRow row, String productType, Map<UUID, Map<PaymentStatus, Long>> statusStats) {
        Map<PaymentStatus, Long> counts = statusStats.getOrDefault(row.productId(), Collections.emptyMap());
        long pendingCount = counts.getOrDefault(PaymentStatus.PENDING, 0L) + counts.getOrDefault(PaymentStatus.PROCESSING, 0L);
        long failedCount = counts.getOrDefault(PaymentStatus.FAILED, 0L);
        long cancelledCount = counts.getOrDefault(PaymentStatus.CANCELLED, 0L);
        long expiredCount = counts.getOrDefault(PaymentStatus.EXPIRED, 0L);

        return ProductSalesResponse.builder()
                .productId(row.productId())
                .productType(productType)
                .title(row.title())
                .thumbnailUrl(row.thumbnailUrl())
                .unitsSold(row.unitsSold() == null ? 0 : row.unitsSold())
                .revenue(row.revenue() == null ? BigDecimal.ZERO : row.revenue())
                .pendingCount(pendingCount)
                .failedCount(failedCount)
                .cancelledCount(cancelledCount)
                .expiredCount(expiredCount)
                .build();
    }

    @Override
    @Transactional
    public WithdrawalDetailResponse createDeveloperWithdrawal(CreateWithdrawalRequest request, String email) {
        User developer = getUserByEmail(email);
        assertWalletSelfServiceUser(developer);
        BigDecimal requestedAmount = validateWithdrawalAmount(request);
        Wallet wallet = getOrCreateLockedWallet(developer);

        WalletMetrics beforeMetrics = buildWalletMetrics(developer, wallet);
        if (requestedAmount.compareTo(beforeMetrics.walletBalance()) > 0) {
            throw new AppException(ErrorCode.INSUFFICIENT_BALANCE);
        }
        if (requestedAmount.compareTo(beforeMetrics.availableBalance()) > 0) {
            throw new AppException(ErrorCode.WITHDRAWAL_EXCEEDS_REVENUE);
        }

        WithdrawalRequest withdrawal = new WithdrawalRequest();
        withdrawal.setUser(developer);
        withdrawal.setWallet(wallet);
        withdrawal.setAmount(requestedAmount);
        withdrawal.setCurrency(DEFAULT_CURRENCY);
        withdrawal.setStatus(WithdrawalStatus.pending);
        withdrawal.setRemark(buildRemarkSection("Developer note", request.getNote()));

        WithdrawalRequest saved = withdrawalRequestRepository.save(withdrawal);
        saved.setTransferReference(buildTransferReference(saved.getId()));
        saved = withdrawalRequestRepository.save(saved);

        auditLogService.publishAuto(
                AuditAction.withdrawal_created,
                AuditTarget.withdrawal_request,
                saved.getId(),
                null,
                Map.of(
                        "amount", saved.getAmount(),
                        "status", saved.getStatus().name(),
                        "transferReference", saved.getTransferReference()
                ),
                "Developer submitted a withdrawal request."
        );

        try {
            List<User> admins = userRepository.findAdminsOrderByCreatedAtAsc(PageRequest.of(0, 10));
            for (User admin : admins) {
                notificationService.createAndSendNotification(
                        admin,
                        developer,
                        NotificationType.WITHDRAWAL_REQUEST,
                        "Nhà phát triển " + (developer.getFullName() != null ? developer.getFullName() : developer.getEmail()) + " vừa gửi yêu cầu rút " + saved.getAmount().setScale(0, RoundingMode.HALF_UP).toPlainString() + " VNĐ.",
                        saved.getId().toString()
                );
            }
        } catch (Exception ex) {
            log.warn("Lỗi gửi thông báo withdrawal request tới admin: {}", ex.getMessage());
        }

        WalletMetrics afterMetrics = buildWalletMetrics(developer, wallet);
        log.info("Created withdrawal request {} for user {} with amount={}", saved.getId(), developer.getId(), requestedAmount);
        return mapToDetailResponse(saved, wallet, afterMetrics);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WithdrawalResponse> getDeveloperWithdrawals(String email) {
        User developer = getUserByEmail(email);
        assertWalletSelfServiceUser(developer);
        return withdrawalRequestRepository.findByUserIdOrderByCreatedAtDesc(developer.getId()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public WithdrawalDetailResponse getDeveloperWithdrawalDetail(UUID id, String email) {
        User requester = getUserByEmail(email);
        assertWalletSelfServiceUser(requester);
        WithdrawalRequest withdrawal = getWithdrawal(id);

        if (!withdrawal.getUser().getId().equals(requester.getId())) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        Wallet wallet = getOrCreateWallet(withdrawal.getUser());
        WalletMetrics metrics = buildWalletMetrics(withdrawal.getUser(), wallet);
        return mapToDetailResponse(withdrawal, wallet, metrics);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WithdrawalResponse> getAdminWithdrawals() {
        return withdrawalRequestRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public WithdrawalDetailResponse getAdminWithdrawalDetail(UUID id) {
        WithdrawalRequest withdrawal = getWithdrawal(id);
        Wallet wallet = getOrCreateWallet(withdrawal.getUser());
        WalletMetrics metrics = buildWalletMetrics(withdrawal.getUser(), wallet);
        return mapToDetailResponse(withdrawal, wallet, metrics);
    }

    @Override
    @Transactional
    public WithdrawalDetailResponse approveWithdrawal(UUID requestId, ApproveWithdrawalRequest request, String adminEmail) {
        // adminEmail == null: gọi tự động bởi WithdrawalAutoPayoutScheduler sau cooling-off period,
        // không phải hành động admin — không có user để lookup.
        WithdrawalRequest withdrawal = getWithdrawalForUpdate(requestId);

        boolean isLegacyApprovedWithoutPayout =
                withdrawal.getStatus() == WithdrawalStatus.approved
                        && !StringUtils.hasText(withdrawal.getPayosPayoutId());

        if (withdrawal.getStatus() != WithdrawalStatus.pending && !isLegacyApprovedWithoutPayout) {
            throw new AppException(ErrorCode.INVALID_WITHDRAWAL_STATUS);
        }

        if (adminEmail == null && isHeldByDispute(withdrawal)) {
            throw new AppException(ErrorCode.INVALID_WITHDRAWAL_STATUS);
        }

        // The request was reserved when it was created, but dispute refunds or
        // legacy data may have reduced the revenue bucket afterward. Re-check
        // every reserved request before sending real money to PayOS.
        Wallet lockedWallet = getOrCreateLockedWallet(withdrawal.getUser());
        WalletMetrics reservedMetrics = buildWalletMetrics(withdrawal.getUser(), lockedWallet);
        if (reservedMetrics.pendingBalance().compareTo(reservedMetrics.walletBalance()) > 0) {
            throw new AppException(ErrorCode.INSUFFICIENT_BALANCE);
        }
        if (reservedMetrics.pendingBalance().compareTo(reservedMetrics.withdrawableBalance()) > 0) {
            throw new AppException(ErrorCode.WITHDRAWAL_EXCEEDS_REVENUE);
        }

        String transferReference = resolveTransferReference(withdrawal, request != null ? request.getTransferReference() : null);
        PayoutGatewayBalanceResponse payoutBalance = payoutGateway.getBalance();
        if (payoutBalance.getBalance().compareTo(withdrawal.getAmount()) < 0) {
            throw new AppException(ErrorCode.INSUFFICIENT_PAYOUT_BALANCE);
        }

        PayoutGatewayCreateResponse payoutResponse;
        try {
            payoutResponse = payoutGateway.createPayout(buildPayoutCreateRequest(withdrawal, transferReference));
        } catch (AppException createEx) {
            // createPayout() có thể đã gọi PayOS thành công (tiền đã chuyển) nhưng lỗi xảy ra
            // trước khi ta nhận được response hợp lệ (timeout, response bất thường...). Tra cứu lại
            // theo referenceId (= withdrawal.id, cố định) để tránh mất dấu payout PayOS đã tạo thật.
            payoutResponse = payoutGateway.findPayoutByReferenceId(withdrawal.getId().toString())
                    .orElseThrow(() -> createEx);
            log.warn(
                    "createPayout() failed locally but a payout already exists on PayOS for withdrawal {} (payoutId={}). Reconciled instead of failing.",
                    withdrawal.getId(),
                    payoutResponse.getPayoutId()
            );
        }
        if (hasImmediatePayoutFailure(payoutResponse.getStatus())) {
            throw new AppException(ErrorCode.PAYOUT_CREATE_FAILED);
        }

        WithdrawalStatus previousStatus = withdrawal.getStatus();
        withdrawal.setStatus(WithdrawalStatus.processing);
        withdrawal.setProcessedAt(Instant.now());
        withdrawal.setTransferReference(transferReference);
        withdrawal.setPayosPayoutId(payoutResponse.getPayoutId());
        withdrawal.setPayosReferenceId(payoutResponse.getReferenceId());
        withdrawal.setPayosStatus(payoutResponse.getStatus());
        withdrawal.setPayosCreatedAt(payoutResponse.getCreatedAt());
        withdrawal.setRemark(mergeRemarkSections(
                withdrawal.getRemark(),
                "Admin approval note",
                request != null ? request.getRemark() : null
        ));

        WithdrawalRequest updated = withdrawalRequestRepository.save(withdrawal);

        auditLogService.publishAuto(
                AuditAction.withdrawal_processing,
                AuditTarget.withdrawal_request,
                updated.getId(),
                Map.of("status", previousStatus.name()),
                Map.of(
                        "status", updated.getStatus().name(),
                        "transferReference", updated.getTransferReference(),
                        "payosPayoutId", Objects.requireNonNullElse(updated.getPayosPayoutId(), ""),
                        "payosReferenceId", Objects.requireNonNullElse(updated.getPayosReferenceId(), ""),
                        "payosStatus", Objects.requireNonNullElse(updated.getPayosStatus(), ""),
                        "remark", Objects.requireNonNullElse(updated.getRemark(), "")
                ),
                adminEmail != null
                        ? "Admin created a PayOS payout order and moved the withdrawal into processing."
                        : "System auto-created a PayOS payout order after the cooling-off period elapsed."
        );

        // Withdrawal vừa chuyển sang processing — đảm bảo vòng lặp poll PayOS đang chạy
        // (tự bật nếu đang tắt, no-op nếu đã chạy sẵn cho withdrawal khác).
        //
        // QUAN TRỌNG: phải đợi transaction NÀY commit xong mới được gọi ensureRunning().
        // scheduleWithFixedDelay chạy tick() đầu tiên GẦN NHƯ NGAY LẬP TỨC trên thread khác
        // (không đợi delay) — nếu gọi thẳng ở đây, tick() có thể query DB TRƯỚC KHI status
        // "processing" vừa set được commit (save() chỉ flush trong transaction, chưa commit
        // tới khi method này return). Nếu withdrawal này là bản ghi processing duy nhất lúc
        // đó, tick() thấy danh sách rỗng -> tự dừng polling ngay -> trạng thái treo mãi ở
        // "processing" dù PayOS đã xử lý xong (đã xảy ra thực tế, xem lịch sử thay đổi này).
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    withdrawalPayoutSyncScheduler.ensureRunning();
                }
            });
        } else {
            withdrawalPayoutSyncScheduler.ensureRunning();
        }

        try {
            notificationService.createAndSendNotification(
                    updated.getUser(),
                    null,
                    NotificationType.WITHDRAWAL_RESULT,
                    "Yêu cầu rút " + updated.getAmount().setScale(0, RoundingMode.HALF_UP).toPlainString() + " VNĐ của bạn đã được phê duyệt và đang xử lý chuyển khoản.",
                    updated.getId().toString()
            );
        } catch (Exception ex) {
            log.warn("Lỗi gửi thông báo approve withdrawal: {}", ex.getMessage());
        }

        Wallet wallet = getOrCreateWallet(updated.getUser());
        WalletMetrics metrics = buildWalletMetrics(updated.getUser(), wallet);
        return mapToDetailResponse(updated, wallet, metrics);
    }

    @Override
    @Transactional
    public WithdrawalDetailResponse syncWithdrawalStatus(UUID requestId, String adminEmail) {
        WithdrawalRequest synchronizedWithdrawal = withdrawalStatusSynchronizer.synchronize(requestId, adminEmail);
        Wallet wallet = getOrCreateWallet(synchronizedWithdrawal.getUser());
        WalletMetrics metrics = buildWalletMetrics(synchronizedWithdrawal.getUser(), wallet);
        return mapToDetailResponse(synchronizedWithdrawal, wallet, metrics);
    }

    @Override
    @Transactional
    public WithdrawalDetailResponse rejectWithdrawal(UUID requestId, RejectWithdrawalRequest request, String adminEmail) {
        User admin = getUserByEmail(adminEmail);
        WithdrawalRequest withdrawal = getWithdrawalForUpdate(requestId);

        if (withdrawal.getStatus() != WithdrawalStatus.pending && withdrawal.getStatus() != WithdrawalStatus.processing) {
            throw new AppException(ErrorCode.INVALID_WITHDRAWAL_STATUS);
        }

        if (request == null || !StringUtils.hasText(request.getRemark())) {
            throw new AppException(ErrorCode.REJECT_REASON_REQUIRED);
        }

        WithdrawalStatus previousStatus = withdrawal.getStatus();
        withdrawal.setStatus(WithdrawalStatus.rejected);
        withdrawal.setProcessedAt(Instant.now());
        withdrawal.setRemark(mergeRemarkSections(withdrawal.getRemark(), "Admin rejection reason", request.getRemark()));

        WithdrawalRequest updated = withdrawalRequestRepository.save(withdrawal);

        auditLogService.publishAuto(
                AuditAction.withdrawal_rejected,
                AuditTarget.withdrawal_request,
                updated.getId(),
                Map.of("status", previousStatus.name()),
                Map.of("status", updated.getStatus().name(), "remark", updated.getRemark()),
                "Admin rejected a withdrawal request."
        );

        try {
            notificationService.createAndSendNotification(
                    updated.getUser(),
                    admin,
                    NotificationType.WITHDRAWAL_RESULT,
                    "Yêu cầu rút " + updated.getAmount().setScale(0, RoundingMode.HALF_UP).toPlainString() + " VNĐ của bạn đã bị từ chối." + (request != null && StringUtils.hasText(request.getRemark()) ? " Lý do: " + request.getRemark() : ""),
                    updated.getId().toString()
            );
        } catch (Exception ex) {
            log.warn("Lỗi gửi thông báo reject withdrawal: {}", ex.getMessage());
        }

        Wallet wallet = getOrCreateWallet(updated.getUser());
        WalletMetrics metrics = buildWalletMetrics(updated.getUser(), wallet);
        return mapToDetailResponse(updated, wallet, metrics);
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private void assertWalletSelfServiceUser(User user) {
        String roleName = user.getRole() != null ? user.getRole().getName() : null;
        if (!"developer".equalsIgnoreCase(roleName) && !"customer".equalsIgnoreCase(roleName)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
    }

    private void assertDeveloper(User user) {
        String roleName = user.getRole() != null ? user.getRole().getName() : null;
        if (!"developer".equalsIgnoreCase(roleName)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
    }

    private WithdrawalRequest getWithdrawal(UUID id) {
        return withdrawalRequestRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.WITHDRAWAL_REQUEST_NOT_FOUND));
    }

    private WithdrawalRequest getWithdrawalForUpdate(UUID id) {
        return withdrawalRequestRepository.findByIdWithLock(id)
                .orElseThrow(() -> new AppException(ErrorCode.WITHDRAWAL_REQUEST_NOT_FOUND));
    }

    private Wallet getOrCreateWallet(User user) {
        Wallet wallet = walletRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    User lockedUser = userRepository.findByIdWithLock(user.getId())
                            .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

                    Wallet concurrentlyCreated = walletRepository.findByUserId(lockedUser.getId()).orElse(null);
                    if (concurrentlyCreated != null) {
                        return concurrentlyCreated;
                    }

                    Wallet newWallet = new Wallet();
                    newWallet.setUser(lockedUser);
                    newWallet.setBalance(BigDecimal.ZERO);
                    newWallet.setWithdrawableBalance(BigDecimal.ZERO);
                    newWallet.setCurrency(DEFAULT_CURRENCY);
                    return walletRepository.save(newWallet);
                });

        return normalizeWalletCurrency(wallet);
    }

    private Wallet getOrCreateLockedWallet(User user) {
        Wallet wallet = walletRepository.findByUserIdWithLock(user.getId())
                .orElseGet(() -> {
                    User lockedUser = userRepository.findByIdWithLock(user.getId())
                            .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

                    Wallet concurrentlyCreated = walletRepository.findByUserIdWithLock(lockedUser.getId()).orElse(null);
                    if (concurrentlyCreated != null) {
                        return concurrentlyCreated;
                    }

                    Wallet newWallet = new Wallet();
                    newWallet.setUser(lockedUser);
                    newWallet.setBalance(BigDecimal.ZERO);
                    newWallet.setWithdrawableBalance(BigDecimal.ZERO);
                    newWallet.setCurrency(DEFAULT_CURRENCY);
                    walletRepository.saveAndFlush(newWallet);
                    return walletRepository.findByUserIdWithLock(user.getId())
                            .orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND));
                });

        return normalizeWalletCurrency(wallet);
    }

    private Wallet normalizeWalletCurrency(Wallet wallet) {
        if (!DEFAULT_CURRENCY.equalsIgnoreCase(wallet.getCurrency())) {
            wallet.setCurrency(DEFAULT_CURRENCY);
            return walletRepository.save(wallet);
        }
        return wallet;
    }

    private WalletMetrics buildWalletMetrics(User developer, Wallet wallet) {
        WalletBalancePolicy.validateInvariant(wallet);
        BigDecimal pendingBalance = safeAmount(
                withdrawalRequestRepository.sumAmountByUserIdAndStatusIn(developer.getId(), RESERVED_STATUSES)
        ).max(BigDecimal.ZERO);
        BigDecimal totalRevenue = safeAmount(
                transactionRepository.sumPositiveAmountByWalletIdAndTypeIn(wallet.getId(), SALES_REVENUE_TXN_TYPES)
        );
        BigDecimal withdrawableBalance = WalletBalancePolicy.withdrawableBalance(wallet);
        BigDecimal restrictedBalance = WalletBalancePolicy.restrictedBalance(wallet);
        BigDecimal availableBalance = WalletBalancePolicy.availableForWithdrawal(wallet, pendingBalance);

        return new WalletMetrics(
                safeAmount(wallet.getBalance()),
                withdrawableBalance,
                restrictedBalance,
                safeAmount(availableBalance),
                pendingBalance,
                totalRevenue
        );
    }

    private DeveloperWalletSummaryResponse mapWalletSummary(User developer, Wallet wallet, WalletMetrics metrics) {
        return DeveloperWalletSummaryResponse.builder()
                .walletId(wallet.getId())
                .developerId(developer.getId())
                .developerEmail(developer.getEmail())
                .developerFullName(developer.getFullName())
                .currency(DEFAULT_CURRENCY)
                .walletBalance(metrics.walletBalance())
                .withdrawableBalance(metrics.withdrawableBalance())
                .restrictedBalance(metrics.restrictedBalance())
                .availableBalance(metrics.availableBalance())
                .pendingBalance(metrics.pendingBalance())
                .totalRevenue(metrics.totalRevenue())
                .updatedAt(wallet.getUpdatedAt())
                .build();
    }

    private WithdrawalResponse mapToResponse(WithdrawalRequest withdrawal) {
        return WithdrawalResponse.builder()
                .id(withdrawal.getId())
                .developerId(withdrawal.getUser().getId())
                .developerEmail(withdrawal.getUser().getEmail())
                .developerFullName(withdrawal.getUser().getFullName())
                .walletId(withdrawal.getWallet().getId())
                .amount(withdrawal.getAmount())
                .currency(firstNonBlank(withdrawal.getCurrency(), DEFAULT_CURRENCY))
                .bankName(withdrawal.getUser().getBankName())
                .bankAccount(decryptBankAccount(withdrawal))
                .accountHolder(withdrawal.getUser().getBankAccountHolder())
                .transferReference(resolveTransferReference(withdrawal, null))
                .payosPayoutId(withdrawal.getPayosPayoutId())
                .payosReferenceId(withdrawal.getPayosReferenceId())
                .payosStatus(withdrawal.getPayosStatus())
                .payosCreatedAt(withdrawal.getPayosCreatedAt())
                .status(withdrawal.getStatus())
                .processedAt(withdrawal.getProcessedAt())
                .remark(withdrawal.getRemark())
                .createdAt(withdrawal.getCreatedAt())
                .updatedAt(withdrawal.getUpdatedAt())
                .autoPayoutEligibleAt(computeAutoPayoutEligibleAt(withdrawal))
                .heldByDispute(isHeldByDispute(withdrawal))
                .build();
    }

    private WithdrawalDetailResponse mapToDetailResponse(WithdrawalRequest withdrawal, Wallet wallet, WalletMetrics metrics) {
        String qrPayload = buildQrPayload(withdrawal);
        String preferredQrImageUrl = buildPreferredQrImageUrl(withdrawal);
        String standardQrImageUrl = buildStandardQrImageUrl(qrPayload);

        return WithdrawalDetailResponse.builder()
                .id(withdrawal.getId())
                .developerId(withdrawal.getUser().getId())
                .developerEmail(withdrawal.getUser().getEmail())
                .developerFullName(withdrawal.getUser().getFullName())
                .walletId(wallet.getId())
                .amount(withdrawal.getAmount())
                .currency(firstNonBlank(withdrawal.getCurrency(), DEFAULT_CURRENCY))
                .bankName(withdrawal.getUser().getBankName())
                .bankAccount(decryptBankAccount(withdrawal))
                .accountHolder(withdrawal.getUser().getBankAccountHolder())
                .transferReference(resolveTransferReference(withdrawal, null))
                .payosPayoutId(withdrawal.getPayosPayoutId())
                .payosReferenceId(withdrawal.getPayosReferenceId())
                .payosStatus(withdrawal.getPayosStatus())
                .payosCreatedAt(withdrawal.getPayosCreatedAt())
                .status(withdrawal.getStatus())
                .processedAt(withdrawal.getProcessedAt())
                .remark(withdrawal.getRemark())
                .createdAt(withdrawal.getCreatedAt())
                .updatedAt(withdrawal.getUpdatedAt())
                .autoPayoutEligibleAt(computeAutoPayoutEligibleAt(withdrawal))
                .heldByDispute(isHeldByDispute(withdrawal))
                .walletBalance(metrics.walletBalance())
                .withdrawableBalance(metrics.withdrawableBalance())
                .restrictedBalance(metrics.restrictedBalance())
                .availableBalance(metrics.availableBalance())
                .pendingBalance(metrics.pendingBalance())
                .totalRevenue(metrics.totalRevenue())
                .qrPayload(qrPayload)
                .standardQrImageUrl(standardQrImageUrl)
                .preferredQrImageUrl(preferredQrImageUrl != null ? preferredQrImageUrl : standardQrImageUrl)
                .build();
    }

    private Instant computeAutoPayoutEligibleAt(WithdrawalRequest withdrawal) {
        if (withdrawal.getStatus() != WithdrawalStatus.pending || withdrawal.getCreatedAt() == null) {
            return null;
        }
        short holdDays = platformSettingsService.getWithdrawalHoldDays();
        return withdrawal.getCreatedAt().plus(holdDays, ChronoUnit.DAYS);
    }

    private boolean isHeldByDispute(WithdrawalRequest withdrawal) {
        if (withdrawal.getStatus() != WithdrawalStatus.pending) {
            return false;
        }
        return withdrawal.getUser().getLockedForDispute() != null
                || disputeRepository.existsByReportedSellerIdAndStatus(
                        withdrawal.getUser().getId(),
                        DisputeStatus.open
                );
    }

    private BigDecimal validateWithdrawalAmount(CreateWithdrawalRequest request) {
        if (request == null || request.getAmount() == null
                || request.getAmount().compareTo(MINIMUM_WITHDRAWAL_AMOUNT) < 0) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }
        return request.getAmount();
    }

    private String buildTransferReference(UUID withdrawalId) {
        return "GLWD-" + withdrawalId.toString().replace("-", "").substring(0, 10).toUpperCase(Locale.ROOT);
    }

    private PayoutGatewayCreateRequest buildPayoutCreateRequest(WithdrawalRequest withdrawal, String transferReference) {
        return PayoutGatewayCreateRequest.builder()
                .withdrawalRequestId(withdrawal.getId())
                .amount(withdrawal.getAmount())
                .currency(firstNonBlank(withdrawal.getCurrency(), DEFAULT_CURRENCY))
                .bankName(withdrawal.getUser().getBankName())
                .bankAccount(decryptBankAccount(withdrawal).replaceAll("\\s+", ""))
                .accountHolder(withdrawal.getUser().getBankAccountHolder())
                .toBankBin(resolveBankCodeOrThrow(withdrawal.getUser().getBankName()))
                .categories(PAYOUT_CATEGORY)
                .transferReference(transferReference)
                .description(buildPayoutDescription(withdrawal))
                .build();
    }

    private String buildPayoutDescription(WithdrawalRequest withdrawal) {
        String compactId = withdrawal.getId().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
        return "Withdrawal #" + compactId;
    }

    private String buildRemarkSection(String label, String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return label + ": " + value.trim();
    }

    private String mergeRemarkSections(String existingRemark, String newLabel, String newValue) {
        String newSection = buildRemarkSection(newLabel, newValue);
        if (!StringUtils.hasText(existingRemark)) {
            return newSection;
        }
        if (!StringUtils.hasText(newSection)) {
            return existingRemark.trim();
        }
        return existingRemark.trim() + "\n" + newSection;
    }

    private String resolveTransferReference(WithdrawalRequest withdrawal, String overrideReference) {
        String chosen = firstNonBlank(overrideReference, withdrawal.getTransferReference());
        if (chosen != null) {
            return chosen;
        }
        return buildTransferReference(withdrawal.getId());
    }

    private String buildQrPayload(WithdrawalRequest withdrawal) {
        return "GodotLaunch Withdrawal\n"
                + "Bank: " + withdrawal.getUser().getBankName() + "\n"
                + "Account: " + decryptBankAccount(withdrawal) + "\n"
                + "Holder: " + withdrawal.getUser().getBankAccountHolder() + "\n"
                + "Amount: " + withdrawal.getAmount().setScale(0, RoundingMode.HALF_UP).toPlainString() + " VND\n"
                + "Reference: " + resolveTransferReference(withdrawal, null);
    }

    private String buildPreferredQrImageUrl(WithdrawalRequest withdrawal) {
        String bankCode = resolveBankCode(withdrawal.getUser().getBankName());
        if (bankCode == null) {
            return null;
        }

        String accountNumber = decryptBankAccount(withdrawal).replaceAll("\\s+", "");
        String amount = withdrawal.getAmount().setScale(0, RoundingMode.HALF_UP).toPlainString();
        String info = urlEncode(resolveTransferReference(withdrawal, null));
        String accountName = urlEncode(withdrawal.getUser().getBankAccountHolder());
        return "https://img.vietqr.io/image/" + bankCode + "-" + accountNumber
                + "-compact2.png?amount=" + amount
                + "&addInfo=" + info
                + "&accountName=" + accountName;
    }

    private String buildStandardQrImageUrl(String qrPayload) {
        return "https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=" + urlEncode(qrPayload);
    }

    private String resolveBankCode(String bankName) {
        return BankBinResolver.resolve(bankName);
    }

    private String resolveBankCodeOrThrow(String bankName) {
        String bankCode = resolveBankCode(bankName);
        if (!StringUtils.hasText(bankCode)) {
            throw new AppException(ErrorCode.PAYOUT_BANK_BIN_NOT_SUPPORTED);
        }
        return bankCode;
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return null;
    }

    private boolean hasImmediatePayoutFailure(String status) {
        return status != null && PAYOUT_IMMEDIATE_FAILURE_STATUSES.contains(status.trim().toUpperCase(Locale.ROOT));
    }

    private BigDecimal safeAmount(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String encryptBankAccount(String plainBankAccount) {
        return encryptionUtils.encrypt(plainBankAccount);
    }

    private String decryptBankAccount(WithdrawalRequest withdrawal) {
        return withdrawal.getUser().getBankAccount() != null ? withdrawal.getUser().getBankAccount() : "";
    }

    private boolean isAdmin(User user) {
        return user.getRole() != null && "admin".equalsIgnoreCase(user.getRole().getName());
    }

    private record WalletMetrics(
            BigDecimal walletBalance,
            BigDecimal withdrawableBalance,
            BigDecimal restrictedBalance,
            BigDecimal availableBalance,
            BigDecimal pendingBalance,
            BigDecimal totalRevenue
    ) {
    }
}
