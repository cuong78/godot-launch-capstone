package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.ApproveWithdrawalRequest;
import com.godotlaunch.backend.dto.request.CreateWithdrawalRequest;
import com.godotlaunch.backend.dto.request.RejectWithdrawalRequest;
import com.godotlaunch.backend.dto.request.ReviewWithdrawalRequest;
import com.godotlaunch.backend.dto.response.DeveloperWalletSummaryResponse;
import com.godotlaunch.backend.dto.response.WithdrawalDetailResponse;
import com.godotlaunch.backend.dto.response.WithdrawalResponse;
import com.godotlaunch.backend.entity.Transaction;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Wallet;
import com.godotlaunch.backend.entity.WithdrawalRequest;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import com.godotlaunch.backend.entity.enums.TxnStatus;
import com.godotlaunch.backend.entity.enums.TxnType;
import com.godotlaunch.backend.entity.enums.WithdrawalStatus;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.TransactionRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.WalletRepository;
import com.godotlaunch.backend.repository.WithdrawalRequestRepository;
import com.godotlaunch.backend.service.AuditLogService;
import com.godotlaunch.backend.service.WithdrawalRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Instant;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WithdrawalRequestServiceImpl implements WithdrawalRequestService {

    private static final String DEFAULT_CURRENCY = "VND";
    private static final Set<WithdrawalStatus> RESERVED_STATUSES = EnumSet.of(
            WithdrawalStatus.pending,
            WithdrawalStatus.processing
    );
    private static final Set<TxnType> REVENUE_TXN_TYPES = EnumSet.of(
            TxnType.source_code_purchase,
            TxnType.asset_purchase,
            TxnType.revenue_share
    );
    private static final Map<String, String> BANK_CODE_MAP = createBankCodeMap();

    private final WithdrawalRequestRepository withdrawalRequestRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional(readOnly = true)
    public DeveloperWalletSummaryResponse getDeveloperWalletSummary(String email) {
        User developer = getUserByEmail(email);
        Wallet wallet = getOrCreateWallet(developer);
        WalletMetrics metrics = buildWalletMetrics(developer, wallet);
        return mapWalletSummary(developer, wallet, metrics);
    }

    @Override
    @Transactional
    public WithdrawalDetailResponse createDeveloperWithdrawal(CreateWithdrawalRequest request, String email) {
        User developer = getUserByEmail(email);
        Wallet wallet = getOrCreateLockedWallet(developer);

        WalletMetrics beforeMetrics = buildWalletMetrics(developer, wallet);
        if (request.getAmount().compareTo(beforeMetrics.availableBalance()) > 0) {
            throw new AppException(ErrorCode.INSUFFICIENT_BALANCE);
        }

        WithdrawalRequest withdrawal = new WithdrawalRequest();
        withdrawal.setUser(developer);
        withdrawal.setWallet(wallet);
        withdrawal.setAmount(request.getAmount());
        withdrawal.setCurrency(DEFAULT_CURRENCY);
        withdrawal.setBankName(request.getBankName().trim());
        withdrawal.setBankAccount(request.getBankAccount().trim());
        withdrawal.setAccountHolder(request.getAccountHolder().trim());
        withdrawal.setStatus(WithdrawalStatus.pending);

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

        WalletMetrics afterMetrics = buildWalletMetrics(developer, wallet);
        log.info("Created withdrawal request {} for user {} with amount={}", saved.getId(), developer.getId(), request.getAmount());
        return mapToDetailResponse(saved, wallet, afterMetrics);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WithdrawalResponse> getDeveloperWithdrawals(String email) {
        User developer = getUserByEmail(email);
        return withdrawalRequestRepository.findByUserIdOrderByCreatedAtDesc(developer.getId()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public WithdrawalDetailResponse getDeveloperWithdrawalDetail(UUID id, String email) {
        User requester = getUserByEmail(email);
        WithdrawalRequest withdrawal = getWithdrawal(id);

        if (!isAdmin(requester) && !withdrawal.getUser().getId().equals(requester.getId())) {
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
    @Transactional(readOnly = true)
    public WithdrawalDetailResponse getAdminWithdrawalDetail(UUID id) {
        WithdrawalRequest withdrawal = getWithdrawal(id);
        Wallet wallet = getOrCreateWallet(withdrawal.getUser());
        WalletMetrics metrics = buildWalletMetrics(withdrawal.getUser(), wallet);
        return mapToDetailResponse(withdrawal, wallet, metrics);
    }

    @Override
    @Transactional
    public WithdrawalDetailResponse markWithdrawalProcessing(UUID requestId, String adminEmail) {
        User admin = getUserByEmail(adminEmail);
        WithdrawalRequest withdrawal = getWithdrawalForUpdate(requestId);

        if (withdrawal.getStatus() != WithdrawalStatus.pending) {
            throw new AppException(ErrorCode.INVALID_WITHDRAWAL_STATUS);
        }

        WithdrawalStatus previousStatus = withdrawal.getStatus();
        withdrawal.setStatus(WithdrawalStatus.processing);
        withdrawal.setProcessedBy(admin);

        WithdrawalRequest updated = withdrawalRequestRepository.save(withdrawal);
        auditLogService.publishAuto(
                AuditAction.withdrawal_processing,
                AuditTarget.withdrawal_request,
                updated.getId(),
                Map.of("status", previousStatus.name()),
                Map.of("status", updated.getStatus().name()),
                "Admin marked withdrawal as processing."
        );

        Wallet wallet = getOrCreateWallet(updated.getUser());
        WalletMetrics metrics = buildWalletMetrics(updated.getUser(), wallet);
        return mapToDetailResponse(updated, wallet, metrics);
    }

    @Override
    @Transactional
    public WithdrawalDetailResponse completeWithdrawal(UUID requestId, ApproveWithdrawalRequest request, String adminEmail) {
        User admin = getUserByEmail(adminEmail);
        WithdrawalRequest withdrawal = getWithdrawalForUpdate(requestId);

        if (withdrawal.getStatus() == WithdrawalStatus.pending) {
            withdrawal.setStatus(WithdrawalStatus.processing);
            withdrawal.setProcessedBy(admin);
            auditLogService.publishAuto(
                    AuditAction.withdrawal_processing,
                    AuditTarget.withdrawal_request,
                    withdrawal.getId(),
                    Map.of("status", WithdrawalStatus.pending.name()),
                    Map.of("status", WithdrawalStatus.processing.name()),
                    "Admin marked withdrawal as processing while completing."
            );
        }

        if (withdrawal.getStatus() != WithdrawalStatus.processing) {
            throw new AppException(ErrorCode.INVALID_WITHDRAWAL_STATUS);
        }

        Wallet wallet = getOrCreateLockedWallet(withdrawal.getUser());
        if (wallet.getBalance().compareTo(withdrawal.getAmount()) < 0) {
            throw new AppException(ErrorCode.INSUFFICIENT_BALANCE);
        }

        String transferReference = resolveTransferReference(withdrawal, request != null ? request.getTransferReference() : null);

        wallet.setBalance(wallet.getBalance().subtract(withdrawal.getAmount()));
        walletRepository.save(wallet);

        Transaction transaction = new Transaction();
        transaction.setWallet(wallet);
        transaction.setRelatedUser(admin);
        transaction.setGame(null);
        transaction.setAmount(withdrawal.getAmount().negate());
        transaction.setPlatformCommission(BigDecimal.ZERO);
        transaction.setNetAmount(withdrawal.getAmount().negate());
        transaction.setType(TxnType.withdrawal);
        transaction.setStatus(TxnStatus.completed);
        transaction.setReferenceId(transferReference);

        Transaction savedTransaction = transactionRepository.save(transaction);

        WithdrawalStatus previousStatus = withdrawal.getStatus();
        withdrawal.setTransaction(savedTransaction);
        withdrawal.setTransferReference(transferReference);
        withdrawal.setStatus(WithdrawalStatus.completed);
        withdrawal.setProcessedBy(admin);
        withdrawal.setProcessedAt(Instant.now());
        withdrawal.setRemark(firstNonBlank(request != null ? request.getRemark() : null, withdrawal.getRemark()));

        WithdrawalRequest updated = withdrawalRequestRepository.save(withdrawal);

        auditLogService.publishAuto(
                AuditAction.withdrawal_completed,
                AuditTarget.withdrawal_request,
                updated.getId(),
                Map.of("status", previousStatus.name()),
                Map.of(
                        "status", updated.getStatus().name(),
                        "transferReference", updated.getTransferReference(),
                        "transactionId", savedTransaction.getId()
                ),
                "Admin completed a withdrawal transfer."
        );

        WalletMetrics metrics = buildWalletMetrics(updated.getUser(), wallet);
        return mapToDetailResponse(updated, wallet, metrics);
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
        withdrawal.setProcessedBy(admin);
        withdrawal.setProcessedAt(Instant.now());
        withdrawal.setRemark(request.getRemark().trim());

        WithdrawalRequest updated = withdrawalRequestRepository.save(withdrawal);

        auditLogService.publishAuto(
                AuditAction.withdrawal_rejected,
                AuditTarget.withdrawal_request,
                updated.getId(),
                Map.of("status", previousStatus.name()),
                Map.of("status", updated.getStatus().name(), "remark", updated.getRemark()),
                "Admin rejected a withdrawal request."
        );

        Wallet wallet = getOrCreateWallet(updated.getUser());
        WalletMetrics metrics = buildWalletMetrics(updated.getUser(), wallet);
        return mapToDetailResponse(updated, wallet, metrics);
    }

    @Override
    @Transactional
    public WithdrawalDetailResponse reviewWithdrawalRequest(UUID requestId, ReviewWithdrawalRequest request, String adminEmail) {
        if (request.isApprove()) {
            return completeWithdrawal(requestId, new ApproveWithdrawalRequest(null, null), adminEmail);
        }
        return rejectWithdrawal(requestId, new RejectWithdrawalRequest(request.getRejectReason()), adminEmail);
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
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
                    Wallet newWallet = new Wallet();
                    newWallet.setUser(user);
                    newWallet.setBalance(BigDecimal.ZERO);
                    newWallet.setCurrency(DEFAULT_CURRENCY);
                    return walletRepository.save(newWallet);
                });

        return normalizeWalletCurrency(wallet);
    }

    private Wallet getOrCreateLockedWallet(User user) {
        Wallet wallet = walletRepository.findByUserIdWithLock(user.getId())
                .orElseGet(() -> {
                    Wallet newWallet = new Wallet();
                    newWallet.setUser(user);
                    newWallet.setBalance(BigDecimal.ZERO);
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
        BigDecimal pendingBalance = safeAmount(
                withdrawalRequestRepository.sumAmountByUserIdAndStatusIn(developer.getId(), RESERVED_STATUSES)
        );
        BigDecimal totalRevenue = safeAmount(
                transactionRepository.sumNetAmountByWalletIdAndTypeInAndStatus(wallet.getId(), REVENUE_TXN_TYPES, TxnStatus.completed)
        );
        BigDecimal availableBalance = wallet.getBalance().subtract(pendingBalance);
        if (availableBalance.compareTo(BigDecimal.ZERO) < 0) {
            availableBalance = BigDecimal.ZERO;
        }

        return new WalletMetrics(
                safeAmount(wallet.getBalance()),
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
                .bankName(withdrawal.getBankName())
                .bankAccount(withdrawal.getBankAccount())
                .accountHolder(withdrawal.getAccountHolder())
                .transferReference(resolveTransferReference(withdrawal, null))
                .status(withdrawal.getStatus())
                .processedById(withdrawal.getProcessedBy() != null ? withdrawal.getProcessedBy().getId() : null)
                .processedByFullName(withdrawal.getProcessedBy() != null ? withdrawal.getProcessedBy().getFullName() : null)
                .processedAt(withdrawal.getProcessedAt())
                .remark(withdrawal.getRemark())
                .createdAt(withdrawal.getCreatedAt())
                .updatedAt(withdrawal.getUpdatedAt())
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
                .bankName(withdrawal.getBankName())
                .bankAccount(withdrawal.getBankAccount())
                .accountHolder(withdrawal.getAccountHolder())
                .transferReference(resolveTransferReference(withdrawal, null))
                .status(withdrawal.getStatus())
                .processedById(withdrawal.getProcessedBy() != null ? withdrawal.getProcessedBy().getId() : null)
                .processedByFullName(withdrawal.getProcessedBy() != null ? withdrawal.getProcessedBy().getFullName() : null)
                .processedAt(withdrawal.getProcessedAt())
                .remark(withdrawal.getRemark())
                .createdAt(withdrawal.getCreatedAt())
                .updatedAt(withdrawal.getUpdatedAt())
                .walletBalance(metrics.walletBalance())
                .availableBalance(metrics.availableBalance())
                .pendingBalance(metrics.pendingBalance())
                .totalRevenue(metrics.totalRevenue())
                .qrPayload(qrPayload)
                .standardQrImageUrl(standardQrImageUrl)
                .preferredQrImageUrl(preferredQrImageUrl != null ? preferredQrImageUrl : standardQrImageUrl)
                .build();
    }

    private String buildTransferReference(UUID withdrawalId) {
        return "GLWD-" + withdrawalId.toString().replace("-", "").substring(0, 10).toUpperCase(Locale.ROOT);
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
                + "Bank: " + withdrawal.getBankName() + "\n"
                + "Account: " + withdrawal.getBankAccount() + "\n"
                + "Holder: " + withdrawal.getAccountHolder() + "\n"
                + "Amount: " + withdrawal.getAmount().setScale(0, RoundingMode.HALF_UP).toPlainString() + " VND\n"
                + "Reference: " + resolveTransferReference(withdrawal, null);
    }

    private String buildPreferredQrImageUrl(WithdrawalRequest withdrawal) {
        String bankCode = resolveBankCode(withdrawal.getBankName());
        if (bankCode == null) {
            return null;
        }

        String accountNumber = withdrawal.getBankAccount().replaceAll("\\s+", "");
        String amount = withdrawal.getAmount().setScale(0, RoundingMode.HALF_UP).toPlainString();
        String info = urlEncode(resolveTransferReference(withdrawal, null));
        String accountName = urlEncode(withdrawal.getAccountHolder());
        return "https://img.vietqr.io/image/" + bankCode + "-" + accountNumber
                + "-compact2.png?amount=" + amount
                + "&addInfo=" + info
                + "&accountName=" + accountName;
    }

    private String buildStandardQrImageUrl(String qrPayload) {
        return "https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=" + urlEncode(qrPayload);
    }

    private String resolveBankCode(String bankName) {
        String normalized = normalizeBankName(bankName);
        for (Map.Entry<String, String> entry : BANK_CODE_MAP.entrySet()) {
            if (normalized.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return null;
    }

    private String normalizeBankName(String bankName) {
        String normalized = Normalizer.normalize(bankName == null ? "" : bankName, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
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

    private BigDecimal safeAmount(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private boolean isAdmin(User user) {
        return user.getRole() != null && "admin".equalsIgnoreCase(user.getRole().getName());
    }

    private static Map<String, String> createBankCodeMap() {
        Map<String, String> map = new LinkedHashMap<>();
        map.put("VIETCOMBANK", "970436");
        map.put("VCB", "970436");
        map.put("BIDV", "970418");
        map.put("VIETINBANK", "970415");
        map.put("AGRIBANK", "970405");
        map.put("TECHCOMBANK", "970407");
        map.put("MBBANK", "970422");
        map.put("MBBANK", "970422");
        map.put("MB", "970422");
        map.put("ACB", "970416");
        map.put("SACOMBANK", "970403");
        map.put("VPBANK", "970432");
        map.put("TPBANK", "970423");
        map.put("OCB", "970448");
        map.put("SHB", "970443");
        map.put("HDBANK", "970437");
        return map;
    }

    private record WalletMetrics(
            BigDecimal walletBalance,
            BigDecimal availableBalance,
            BigDecimal pendingBalance,
            BigDecimal totalRevenue
    ) {
    }
}
