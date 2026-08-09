package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.config.FaceServiceClient;
import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.CreateDisputeRequest;
import com.godotlaunch.backend.dto.request.ResolveDisputeRequest;
import com.godotlaunch.backend.dto.response.DisputeResponse;
import com.godotlaunch.backend.entity.BannedIdentity;
import com.godotlaunch.backend.entity.Dispute;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.Transaction;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Wallet;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
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
import com.godotlaunch.backend.security.JwtProvider;
import com.godotlaunch.backend.service.AuditLogService;
import com.godotlaunch.backend.service.DisputeService;
import com.godotlaunch.backend.service.PlatformSettingsService;
import com.godotlaunch.backend.util.WalletBalancePolicy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DisputeServiceImpl implements DisputeService {

    private final DisputeRepository disputeRepository;
    private final UserRepository userRepository;
    private final GameRepository gameRepository;
    private final BannedIdentityRepository bannedIdentityRepository;
    private final FaceServiceClient faceServiceClient;
    private final RoleRepository roleRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final PlatformSettingsService platformSettingsService;
    private final AuditLogService auditLogService;

    private static final int SPAM_REPORT_LIMIT = 3;
    private static final String DEFAULT_CURRENCY = "VND";

    @Override
    @Transactional
    public DisputeResponse createDispute(CreateDisputeRequest request, String reporterEmail) {
        User reporter = userRepository.findByEmail(reporterEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (request.getGameId() == null) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }

        Dispute dispute = new Dispute();
        dispute.setReporter(reporter);
        dispute.setReason(request.getReason());
        dispute.setEvidenceRepoUrl(request.getEvidenceRepoUrl());
        dispute.setEvidenceNote(request.getEvidenceNote());
        dispute.setStatus(DisputeStatus.open);

        // Dispute chỉ cho game: xác định seller (A) + auto-suspend game
        Game game = gameRepository.findById(request.getGameId())
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));
        User seller = game.getCreator();
        dispute.setGame(game);
        // Auto-suspend: gỡ game khỏi store ngay
        game.setStatus(GameStatus.rejected);
        gameRepository.save(game);

        // Không cho tự tố chính mình
        if (seller.getId().equals(reporter.getId())) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }
        dispute.setReportedSeller(seller);

        Dispute saved = disputeRepository.save(dispute);

        // Notify admin + seller (không email — dùng notification nội bộ)
        safeNotify(seller.getId(),
                "Sản phẩm của bạn bị tố vi phạm bản quyền và đã tạm gỡ. Chờ admin điều tra.");

        return toResponse(saved);
    }

    @Override
    @Transactional
    public DisputeResponse resolveDispute(UUID disputeId, ResolveDisputeRequest request, String adminEmail) {
        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new AppException(ErrorCode.DISPUTE_NOT_FOUND));

        String resolution = request.getResolution();
        dispute.setStatus(DisputeStatus.valueOf(resolution));
        dispute.setResolutionNote(request.getResolutionNote());
        dispute.setResolvedAt(Instant.now());

        switch (resolution) {
            case "resolved_seller_fault" -> {
                // TH3: A đạo nhái → A hoàn tiền N ngày (admin config) + ban A hoặc khóa chờ hoàn
                validateRefundAmount(request.getRefundAmount());
                int refundDays = platformSettingsService.getRefundDeadlineDays();
                dispute.setRefundAmount(request.getRefundAmount());
                dispute.setRefundDeadline(Instant.now().plus(refundDays, ChronoUnit.DAYS));
                if (request.isBanUser()) {
                    banSeller(dispute.getReportedSeller(), "copyright_theft");
                } else {
                    // Tiền đã có thể rời platform (withdrawal đã completed) — hệ thống không
                    // đóng băng được khoản đó, chỉ khóa toàn bộ quyền developer trong platform
                    // cho tới khi admin xác nhận đã nhận đủ tiền hoàn qua confirmRefund().
                    lockSellerForRefund(dispute.getReportedSeller(), dispute);
                }
                safeNotify(dispute.getReportedSeller().getId(),
                        "Bạn bị kết luận vi phạm bản quyền. Hoàn trả " + request.getRefundAmount()
                                + " trong " + refundDays + " ngày, nếu không sẽ bị xử lý pháp lý.");
                safeNotify(dispute.getReporter().getId(),
                        "Khiếu nại của bạn được chấp nhận. Bạn sẽ được hoàn tiền sau khi xử lý.");
            }
            case "resolved_reporter_fault" -> {
                // TH2: B vu cáo → khôi phục sản phẩm + đếm spam, ban nếu quá ngưỡng
                restoreProduct(dispute);
                long spamCount = disputeRepository.countByReporterIdAndStatus(
                        dispute.getReporter().getId(), "resolved_reporter_fault");
                if (spamCount >= SPAM_REPORT_LIMIT || request.isBanUser()) {
                    banReporter(dispute.getReporter(), "spam_report");
                    safeNotify(dispute.getReporter().getId(),
                            "Bạn đã vu cáo quá " + SPAM_REPORT_LIMIT + " lần và bị cấm.");
                } else {
                    safeNotify(dispute.getReporter().getId(),
                            "Khiếu nại của bạn bị bác. Vu cáo nhiều lần sẽ bị cấm tài khoản.");
                }
            }
            case "resolved_inconclusive" -> {
                // TH1: không kết luận được → khôi phục sản phẩm, không phạt ai
                restoreProduct(dispute);
                safeNotify(dispute.getReportedSeller().getId(),
                        "Khiếu nại đã được điều tra nhưng không đủ căn cứ. Sản phẩm được khôi phục.");
            }
            default -> throw new AppException(ErrorCode.BAD_REQUEST);
        }

        return toResponse(disputeRepository.save(dispute));
    }

    @Override
    @Transactional
    public DisputeResponse confirmRefund(UUID disputeId, String adminEmail) {
        userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        Dispute dispute = disputeRepository.findByIdWithLock(disputeId)
                .orElseThrow(() -> new AppException(ErrorCode.DISPUTE_NOT_FOUND));

        if (dispute.getStatus() != DisputeStatus.resolved_seller_fault || dispute.getRefundConfirmedAt() != null) {
            throw new AppException(ErrorCode.INVALID_DISPUTE_STATUS);
        }

        User seller = dispute.getReportedSeller();
        User reporter = dispute.getReporter();
        BigDecimal refundAmount = dispute.getRefundAmount();
        validateRefundAmount(refundAmount);

        Map<UUID, Wallet> lockedWallets = lockWallets(seller, reporter);
        Wallet sellerWallet = lockedWallets.get(seller.getId());
        if (WalletBalancePolicy.balance(sellerWallet).compareTo(refundAmount) < 0) {
            throw new AppException(ErrorCode.REFUND_AMOUNT_NOT_MET);
        }

        Wallet reporterWallet = lockedWallets.get(reporter.getId());

        WalletBalancePolicy.debitSellerRefund(sellerWallet, refundAmount);
        walletRepository.save(sellerWallet);
        // Incoming dispute money is restitution, not a new sale.
        WalletBalancePolicy.creditRestricted(reporterWallet, refundAmount);
        walletRepository.save(reporterWallet);

        Transaction outgoing = new Transaction();
        outgoing.setWallet(sellerWallet);
        outgoing.setRelatedUser(reporter);
        outgoing.setGame(dispute.getGame());
        outgoing.setAmount(refundAmount.negate());
        outgoing.setType(TxnType.refund);
        outgoing.setReferenceId("DISPUTE_REFUND:" + dispute.getId());
        outgoing.setDescription("Hoàn tiền tranh chấp bản quyền #" + dispute.getId());
        transactionRepository.save(outgoing);

        Transaction incoming = new Transaction();
        incoming.setWallet(reporterWallet);
        incoming.setRelatedUser(seller);
        incoming.setGame(dispute.getGame());
        incoming.setAmount(refundAmount);
        incoming.setType(TxnType.refund);
        incoming.setReferenceId("DISPUTE_REFUND:" + dispute.getId());
        incoming.setDescription("Nhận hoàn tiền tranh chấp bản quyền #" + dispute.getId());
        transactionRepository.save(incoming);

        dispute.setRefundConfirmedAt(Instant.now());
        Dispute saved = disputeRepository.save(dispute);

        // Chỉ mở lại role nếu chính dispute này là lý do khóa (tránh mở nhầm khi
        // seller còn đang bị khóa bởi 1 dispute khác — giới hạn: chỉ track được
        // dispute gây khóa gần nhất do lockedForDispute là single FK).
        if (seller.getLockedForDispute() != null && dispute.getId().equals(seller.getLockedForDispute().getId())) {
            unlockSellerRole(seller);
        }

        auditLogService.publishAuto(
                AuditAction.dispute_refund_confirmed,
                AuditTarget.user,
                seller.getId(),
                Map.of("refundConfirmedAt", "null"),
                Map.of("refundConfirmedAt", saved.getRefundConfirmedAt().toString(), "refundAmount", refundAmount.toString()),
                "Admin confirmed the seller refunded the disputed amount."
        );

        safeNotify(seller.getId(), "Admin đã xác nhận bạn hoàn tiền đầy đủ. Quyền developer đã được mở lại.");
        safeNotify(reporter.getId(), "Bạn đã nhận được khoản hoàn tiền " + refundAmount + " từ tranh chấp bản quyền.");

        return toResponse(saved);
    }

    /**
     * Gọi từ DisputeRefundEnforcementScheduler khi seller không hoàn tiền đúng
     * hạn refundDeadline — ban vĩnh viễn qua cơ chế identity-ban đã có sẵn.
     */
    @Override
    @Transactional
    public void banOverdueSeller(UUID disputeId) {
        Dispute dispute = disputeRepository.findByIdWithLock(disputeId)
                .orElseThrow(() -> new AppException(ErrorCode.DISPUTE_NOT_FOUND));

        // Re-check after locking because confirmRefund() may have completed
        // after the scheduler selected this row but before enforcement began.
        if (dispute.getStatus() != DisputeStatus.resolved_seller_fault
                || dispute.getRefundConfirmedAt() != null
                || dispute.getRefundDeadline() == null
                || !dispute.getRefundDeadline().isBefore(Instant.now())) {
            return;
        }

        User seller = dispute.getReportedSeller();

        if ("banned".equalsIgnoreCase(seller.getStatus())) {
            return;
        }

        banSeller(seller, "refund_overdue");
        safeNotify(dispute.getReporter().getId(),
                "Seller đã bị cấm do không hoàn tiền đúng hạn. Nếu cần, vui lòng liên hệ admin để được hỗ trợ theo đuổi pháp lý.");
    }

    @Override
    @Transactional(readOnly = true)
    public List<DisputeResponse> getAllDisputes() {
        return disputeRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<DisputeResponse> getMyReportedDisputes(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return disputeRepository.findByReporterIdOrderByCreatedAtDesc(user.getId())
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DisputeResponse getDispute(UUID disputeId) {
        return toResponse(disputeRepository.findById(disputeId)
                .orElseThrow(() -> new AppException(ErrorCode.DISPUTE_NOT_FOUND)));
    }

    // ── helpers ──────────────────────────────────────────────

    private void restoreProduct(Dispute dispute) {
        if (dispute.getGame() != null) {
            Game game = dispute.getGame();
            game.setStatus(GameStatus.published);
            gameRepository.save(game);
        }
    }

    private void banSeller(User seller, String reason) {
        banUser(seller, reason);
    }

    private void banReporter(User reporter, String reason) {
        banUser(reporter, reason);
    }

    private void banUser(User user, String reason) {
        user.setStatus("banned");
        userRepository.save(user);

        BannedIdentity banned = new BannedIdentity();
        banned.setUserId(user.getId());
        banned.setKycIdNumber(user.getKycIdNumber());
        banned.setBankAccount(user.getBankAccount());
        banned.setReason(reason);
        bannedIdentityRepository.save(banned);

        faceServiceClient.banFace(user.getId(), reason);
    }

    /**
     * Khóa toàn bộ quyền developer của seller trong lúc chờ hoàn tiền TH3
     * (tiền đã rời platform, hệ thống không đóng băng được khoản đó — chỉ
     * khóa được các hoạt động seller làm trong platform: rút tiền, đăng
     * sản phẩm mới, tạo dispute mới...). Hạ role về customer để tận dụng
     * toàn bộ @PreAuthorize role-check hiện có, không cần cờ isLocked riêng.
     */
    private void lockSellerForRefund(User seller, Dispute dispute) {
        if (seller.getLockedForDispute() != null) {
            // Đã bị khóa bởi dispute khác trước đó — giữ nguyên, không ghi đè
            // để không mất dấu dispute gốc gây khóa.
            log.warn("Seller {} already locked for dispute {}, skip locking for new dispute {}",
                    seller.getId(), seller.getLockedForDispute().getId(), dispute.getId());
            return;
        }

        Role customerRole = roleRepository.findByName("customer")
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
        String previousRole = seller.getRole() != null ? seller.getRole().getName() : null;

        seller.setRole(customerRole);
        seller.setLockedForDispute(dispute);
        // Hết hiệu lực JWT hiện có ngay, buộc re-login để nhận role mới.
        seller.setSessionHash(JwtProvider.hashSessionSecret(UUID.randomUUID().toString()));
        userRepository.save(seller);

        auditLogService.publishAuto(
                AuditAction.dispute_seller_locked,
                AuditTarget.user,
                seller.getId(),
                Map.of("role", previousRole != null ? previousRole : ""),
                Map.of("role", "customer", "lockedForDisputeId", dispute.getId().toString()),
                "Seller locked to customer role pending refund confirmation."
        );
    }

    /** Ngược lại của lockSellerForRefund() — gọi khi admin confirmRefund(). */
    private void unlockSellerRole(User seller) {
        Role developerRole = roleRepository.findByName("developer")
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
        seller.setRole(developerRole);
        seller.setLockedForDispute(null);
        seller.setSessionHash(JwtProvider.hashSessionSecret(UUID.randomUUID().toString()));
        userRepository.save(seller);
    }

    private Wallet getOrCreateWalletWithLock(User user) {
        return walletRepository.findByUserIdWithLock(user.getId())
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
                    return walletRepository.save(newWallet);
                });
    }

    private void validateRefundAmount(BigDecimal refundAmount) {
        if (refundAmount == null || refundAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.REFUND_AMOUNT_INVALID);
        }
    }

    private Map<UUID, Wallet> lockWallets(User... users) {
        Map<UUID, User> usersById = new LinkedHashMap<>();
        for (User user : users) {
            usersById.put(user.getId(), user);
        }

        Map<UUID, Wallet> walletsByUserId = new LinkedHashMap<>();
        usersById.keySet().stream().sorted().forEach(userId ->
                walletsByUserId.put(userId, getOrCreateWalletWithLock(usersById.get(userId)))
        );
        return walletsByUserId;
    }

    private void safeNotify(UUID userId, String message) {
        // P1: log thông báo. Notification nội bộ (bảng notifications) wire ở bước sau.
        log.info("[Dispute notify] user={} msg={}", userId, message);
    }

    private DisputeResponse toResponse(Dispute d) {
        return DisputeResponse.builder()
                .id(d.getId())
                .reporterId(d.getReporter().getId())
                .reporterEmail(d.getReporter().getEmail())
                .reportedSellerId(d.getReportedSeller().getId())
                .reportedSellerEmail(d.getReportedSeller().getEmail())
                .gameId(d.getGame().getId())
                .gameTitle(d.getGame().getTitle())
                .reason(d.getReason())
                .evidenceRepoUrl(d.getEvidenceRepoUrl())
                .evidenceNote(d.getEvidenceNote())
                .status(d.getStatus() != null ? d.getStatus().name() : null)
                .resolutionNote(d.getResolutionNote())
                .refundAmount(d.getRefundAmount())
                .refundDeadline(d.getRefundDeadline())
                .refundConfirmedAt(d.getRefundConfirmedAt())
                .createdAt(d.getCreatedAt())
                .resolvedAt(d.getResolvedAt())
                .build();
    }
}
