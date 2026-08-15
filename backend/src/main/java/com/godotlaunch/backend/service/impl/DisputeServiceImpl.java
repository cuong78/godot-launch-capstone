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
import com.godotlaunch.backend.entity.SourceSnapshot;
import com.godotlaunch.backend.entity.PlagiarismFlag;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import com.godotlaunch.backend.repository.PlagiarismFlagRepository;
import com.godotlaunch.backend.service.GitHubRepoService;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.beans.factory.annotation.Value;
import com.godotlaunch.backend.repository.BannedIdentityRepository;
import com.godotlaunch.backend.repository.DisputeRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.RoleRepository;
import com.godotlaunch.backend.repository.TransactionRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.WalletRepository;
import com.godotlaunch.backend.repository.OrderRepository;
import com.godotlaunch.backend.repository.WithdrawalRequestRepository;
import com.godotlaunch.backend.entity.Order;
import com.godotlaunch.backend.entity.enums.NotificationType;
import com.godotlaunch.backend.security.JwtProvider;
import com.godotlaunch.backend.service.AuditLogService;
import com.godotlaunch.backend.service.DisputeService;
import com.godotlaunch.backend.service.NotificationService;
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
    private final NotificationService notificationService;
    private final SourceSnapshotRepository sourceSnapshotRepository;
    private final PlagiarismFlagRepository plagiarismFlagRepository;
    private final GitHubRepoService gitHubRepoService;
    private final WebClient webClient;
    private final OrderRepository orderRepository;
    private final WithdrawalRequestRepository withdrawalRequestRepository;

    @Value("${DEEPSEEK_API_KEY:}")
    private String deepseekApiKey;

    @Value("${DEEPSEEK_API_URL:https://api.deepseek.com/v1}")
    private String deepseekApiUrl;

    @Value("${DEEPSEEK_MODEL:deepseek-chat}")
    private String deepseekModel;

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

        // Notify reporter, seller and admin
        try {
            // 1. Notify reporter (B)
            notificationService.createAndSendNotification(
                    reporter,
                    reporter,
                    NotificationType.PLAGIARISM_ALERT,
                    "Khiếu nại bản quyền của bạn cho game '" + game.getTitle() + "' đã được gửi thành công. Sản phẩm đã bị tạm gỡ để phục vụ điều tra.",
                    saved.getId().toString()
            );

            // 2. Notify reported seller (A)
            notificationService.createAndSendNotification(
                    seller,
                    reporter,
                    NotificationType.PLAGIARISM_ALERT,
                    "Sản phẩm '" + game.getTitle() + "' của bạn bị tố cáo vi phạm bản quyền và đã bị tạm gỡ. Vui lòng chuẩn bị bằng chứng đối chiếu.",
                    saved.getId().toString()
            );

            // 3. Notify admins
            List<User> admins = userRepository.findByRole_NameIgnoreCase("admin");
            for (User ad : admins) {
                notificationService.createAndSendNotification(
                        ad,
                        reporter,
                        NotificationType.PLAGIARISM_ALERT,
                        "Có khiếu nại bản quyền mới được gửi cho sản phẩm '" + game.getTitle() + "' bởi " + reporter.getEmail(),
                        saved.getId().toString()
                );
            }
        } catch (Exception e) {
            log.error("Failed to send dispute notifications: {}", e.getMessage(), e);
        }

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
                // TH3: A đạo nhái → Ban A hoặc khóa quyền
                if (request.isBanUser()) {
                    banSeller(dispute.getReportedSeller(), "copyright_theft");
                } else {
                    lockSellerForRefund(dispute.getReportedSeller(), dispute);
                }

                // Tự động hoàn trả tiền tạm giữ (escrow/holding) trong vòng 5 ngày cho tất cả người mua game
                BigDecimal totalRefunded = autoRefundRecentBuyers(dispute, admin);
                dispute.setRefundAmount(totalRefunded);
                dispute.setRefundConfirmedAt(Instant.now());
                dispute.setRefundDeadline(null);
                
                // Notify seller (A)
                notificationService.createAndSendNotification(
                        dispute.getReportedSeller(),
                        admin,
                        NotificationType.PLAGIARISM_ALERT,
                        "Bạn bị kết luận vi phạm bản quyền cho game '" + dispute.getGame().getTitle() + "'. Hệ thống đã tự động hoàn trả toàn bộ số tiền mua game trong thời hạn 5 ngày qua về ví của người mua.",
                        dispute.getId().toString()
                );
                // Notify reporter (B)
                notificationService.createAndSendNotification(
                        dispute.getReporter(),
                        admin,
                        NotificationType.PLAGIARISM_ALERT,
                        "Khiếu nại bản quyền của bạn cho game '" + dispute.getGame().getTitle() + "' đã được chấp nhận và giải quyết thành công.",
                        dispute.getId().toString()
                );

                safeNotify(dispute.getReportedSeller().getId(),
                        "Bạn bị kết luận vi phạm bản quyền. Hệ thống đã tự động hoàn tiền tạm giữ của người mua.");
                safeNotify(dispute.getReporter().getId(),
                        "Khiếu nại của bạn được chấp nhận.");
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

                // Notify reporter (B)
                String repMessage = spamCount >= SPAM_REPORT_LIMIT || request.isBanUser()
                        ? "Khiếu nại của bạn cho game '" + dispute.getGame().getTitle() + "' được kết luận là vu cáo. Bạn đã vu cáo quá " + SPAM_REPORT_LIMIT + " lần và tài khoản bị cấm."
                        : "Khiếu nại của bạn cho game '" + dispute.getGame().getTitle() + "' được kết luận là vu cáo. Vu cáo nhiều lần sẽ bị cấm tài khoản.";
                notificationService.createAndSendNotification(
                        dispute.getReporter(),
                        admin,
                        NotificationType.PLAGIARISM_ALERT,
                        repMessage,
                        dispute.getId().toString()
                );
                // Notify seller (A)
                notificationService.createAndSendNotification(
                        dispute.getReportedSeller(),
                        admin,
                        NotificationType.PLAGIARISM_ALERT,
                        "Khiếu nại bản quyền đối với game '" + dispute.getGame().getTitle() + "' đã được bác bỏ. Sản phẩm của bạn đã được khôi phục hoạt động.",
                        dispute.getId().toString()
                );
            }
            case "resolved_inconclusive" -> {
                // TH1: không kết luận được → khôi phục sản phẩm, không phạt ai
                restoreProduct(dispute);
                
                // Notify seller (A)
                notificationService.createAndSendNotification(
                        dispute.getReportedSeller(),
                        admin,
                        NotificationType.PLAGIARISM_ALERT,
                        "Khiếu nại bản quyền đối với game '" + dispute.getGame().getTitle() + "' không đủ căn cứ kết luận. Sản phẩm của bạn đã được khôi phục hoạt động.",
                        dispute.getId().toString()
                );
                // Notify reporter (B)
                notificationService.createAndSendNotification(
                        dispute.getReporter(),
                        admin,
                        NotificationType.PLAGIARISM_ALERT,
                        "Khiếu nại bản quyền của bạn cho game '" + dispute.getGame().getTitle() + "' không đủ căn cứ kết luận. Sản phẩm đã được khôi phục hoạt động.",
                        dispute.getId().toString()
                );

                safeNotify(dispute.getReportedSeller().getId(),
                        "Khiếu nại đã được điều tra nhưng không đủ căn cứ. Sản phẩm được khôi phục.");
            }
            default -> throw new AppException(ErrorCode.BAD_REQUEST);
        }

        return toResponse(disputeRepository.save(dispute));
    }

    private BigDecimal autoRefundRecentBuyers(Dispute dispute, User admin) {
        short holdDays = platformSettingsService.getWithdrawalHoldDays();
        Instant cutoff = Instant.now().minus(holdDays, ChronoUnit.DAYS);
        List<Order> orders = orderRepository.findByGameIdAndPurchasedAtAfter(dispute.getGame().getId(), cutoff);
        if (orders.isEmpty()) {
            return BigDecimal.ZERO;
        }

        BigDecimal totalRefunded = BigDecimal.ZERO;
        User platformAdmin = userRepository.findByEmail("admin@godotlaunch.com")
                .orElseGet(() -> userRepository.findAdminsOrderByCreatedAtAsc(org.springframework.data.domain.PageRequest.of(0, 1)).stream()
                        .findFirst()
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND)));

        for (Order order : orders) {
            // Check if already refunded
            UUID buyerWalletId = walletRepository.findByUserId(order.getBuyer().getId()).map(w -> w.getId()).orElse(null);
            if (buyerWalletId == null) continue;

            String refId = "REFUND_GAME_AUTO:" + order.getId();
            boolean alreadyRefunded = transactionRepository.existsByWalletIdAndTypeAndReferenceId(
                    buyerWalletId,
                    TxnType.refund,
                    refId
            );
            if (alreadyRefunded) {
                continue;
            }

            try {
                // Lock wallets
                Map<UUID, Wallet> locked = lockWallets(order.getBuyer(), dispute.getReportedSeller(), platformAdmin);
                Wallet lockedBuyer = locked.get(order.getBuyer().getId());
                Wallet lockedSeller = locked.get(dispute.getReportedSeller().getId());
                Wallet lockedPlatform = locked.get(platformAdmin.getId());

                BigDecimal price = order.getPricePaid();
                BigDecimal platformCommission = price
                        .multiply(platformSettingsService.getPlatformCommissionRate())
                        .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
                BigDecimal sellerRevenue = price.subtract(platformCommission);

                // Calculate debit amounts safely to prevent balance invariant violation (balance >= 0)
                BigDecimal sellerDebit = sellerRevenue.min(lockedSeller.getBalance());
                if (sellerDebit.compareTo(BigDecimal.ZERO) > 0) {
                    WalletBalancePolicy.debitSellerRefund(lockedSeller, sellerDebit);
                }

                BigDecimal platformDebit = price.subtract(sellerDebit);
                if (platformDebit.compareTo(BigDecimal.ZERO) > 0) {
                    WalletBalancePolicy.debitSellerRefund(lockedPlatform, platformDebit);
                }

                WalletBalancePolicy.creditRestricted(lockedBuyer, price);

                // Save wallets
                walletRepository.save(lockedBuyer);
                walletRepository.save(lockedSeller);
                walletRepository.save(lockedPlatform);

                // Save transaction records
                Transaction txnSeller = new Transaction();
                txnSeller.setWallet(lockedSeller);
                txnSeller.setRelatedUser(order.getBuyer());
                txnSeller.setGame(dispute.getGame());
                txnSeller.setAmount(sellerDebit.negate());
                txnSeller.setType(TxnType.refund);
                txnSeller.setReferenceId(refId);
                txnSeller.setOrder(order);
                txnSeller.setDescription("Automatic refund debit seller revenue for plagiarism verdict");
                transactionRepository.save(txnSeller);

                Transaction txnPlatform = new Transaction();
                txnPlatform.setWallet(lockedPlatform);
                txnPlatform.setRelatedUser(order.getBuyer());
                txnPlatform.setGame(dispute.getGame());
                txnPlatform.setAmount(platformDebit.negate());
                txnPlatform.setType(TxnType.refund);
                txnPlatform.setReferenceId(refId);
                txnPlatform.setOrder(order);
                txnPlatform.setDescription("Automatic refund debit platform commission for plagiarism verdict");
                transactionRepository.save(txnPlatform);

                Transaction txnBuyer = new Transaction();
                txnBuyer.setWallet(lockedBuyer);
                txnBuyer.setRelatedUser(dispute.getReportedSeller());
                txnBuyer.setGame(dispute.getGame());
                txnBuyer.setAmount(price);
                txnBuyer.setType(TxnType.refund);
                txnBuyer.setReferenceId(refId);
                txnBuyer.setOrder(order);
                txnBuyer.setDescription("Automatic refund credit full game price to buyer for plagiarism verdict");
                transactionRepository.save(txnBuyer);

                // Notify buyer
                notificationService.createAndSendNotification(
                        order.getBuyer(),
                        admin,
                        NotificationType.PLAGIARISM_ALERT,
                        "Sản phẩm '" + dispute.getGame().getTitle() + "' đã bị gỡ bỏ do vi phạm bản quyền. Số tiền " + price + " VND đã được hoàn lại vào ví của bạn.",
                        dispute.getId().toString()
                );

                totalRefunded = totalRefunded.add(price);
            } catch (Exception e) {
                log.error("Lỗi khi tự động hoàn tiền cho đơn hàng {}: {}", order.getId(), e.getMessage(), e);
            }
        }
        return totalRefunded;
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

    @Override
    @Transactional(readOnly = true)
    public String getAiAnalysis(UUID disputeId) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new AppException(ErrorCode.DISPUTE_NOT_FOUND));

        // 1. Fetch GitHub metadata for B
        String gitInfo = "Không thể truy cập dữ liệu GitHub của B.";
        String evidenceRepoOwner = null;
        if (dispute.getEvidenceRepoUrl() != null && !dispute.getEvidenceRepoUrl().isBlank()) {
            Map<String, Object> repoMeta = gitHubRepoService.getRepoMetadata(dispute.getEvidenceRepoUrl());
            if (repoMeta != null) {
                if (repoMeta.get("owner") != null && repoMeta.get("owner") instanceof Map) {
                    evidenceRepoOwner = (String) ((Map<?, ?>) repoMeta.get("owner")).get("login");
                }
                gitInfo = String.format("- Ngày tạo Repo: %s\n- Cập nhật lần cuối: %s\n- Chủ sở hữu Repo: %s",
                        repoMeta.get("created_at"),
                        repoMeta.get("pushed_at"),
                        evidenceRepoOwner != null ? evidenceRepoOwner : "N/A");
            }
        }

        // Check ownership warnings
        StringBuilder warningBuilder = new StringBuilder();
        String reportedGameRepo = dispute.getGame().getGithubRepoUrl();
        String sellerGithub = dispute.getReportedSeller().getGithubUsername();
        String reporterGithub = dispute.getReporter().getGithubUsername();

        // Warning 1: Evidence Repo matches Reported Game's Repo URL
        if (reportedGameRepo != null && !reportedGameRepo.isBlank() && dispute.getEvidenceRepoUrl() != null) {
            String cleanReported = reportedGameRepo.trim().toLowerCase().replaceAll("/$", "").replace(".git", "");
            String cleanEvidence = dispute.getEvidenceRepoUrl().trim().toLowerCase().replaceAll("/$", "").replace(".git", "");
            if (cleanReported.equals(cleanEvidence)) {
                warningBuilder.append("- CẢNH BÁO CỰC KỲ NGHIÊM TRỌNG: Đường dẫn repository bằng chứng do Người tố cáo (B) cung cấp trùng khớp 100% với Repository của chính Game (A) đang bị tố cáo. Đây là hành vi lấy chính repo của đối phương để tố cáo ngược!\n");
            }
        }

        // Warning 2: Repository Owner comparison with B's githubUsername
        if (evidenceRepoOwner != null) {
            if (reporterGithub != null && !reporterGithub.isBlank()) {
                if (!evidenceRepoOwner.equalsIgnoreCase(reporterGithub)) {
                    warningBuilder.append(String.format("- CẢNH BÁO: Chủ sở hữu của repository bằng chứng trên GitHub là '%s', nhưng tài khoản GitHub liên kết của Người tố cáo (B) trên hệ thống là '%s'. Thông tin sở hữu không trùng khớp!\n", evidenceRepoOwner, reporterGithub));
                }
            } else {
                warningBuilder.append(String.format("- CẢNH BÁO: Người tố cáo (B) chưa thực hiện liên kết tài khoản GitHub trên hệ thống. Chủ sở hữu thực sự của repo bằng chứng này trên GitHub là '%s'.\n", evidenceRepoOwner));
            }
            
            // Warning 3: Evidence Repo Owner matches Seller's githubUsername
            if (sellerGithub != null && !sellerGithub.isBlank() && evidenceRepoOwner.equalsIgnoreCase(sellerGithub)) {
                warningBuilder.append(String.format("- CẢNH BÁO CỰC KỲ NGHIÊM TRỌNG: Chủ sở hữu của repo bằng chứng này trên GitHub là '%s', trùng khớp với tài khoản GitHub của chính Seller (A) bị tố cáo!\n", evidenceRepoOwner));
            }
        }
        String ownershipWarnings = warningBuilder.length() > 0 ? warningBuilder.toString() : "- Không phát hiện điểm bất thường về quyền sở hữu repository bằng chứng.";

        // 2. Fetch Plagiarism flags for A
        StringBuilder flagsInfo = new StringBuilder();
        SourceSnapshot latestSnapshot = sourceSnapshotRepository.findFirstByGameIdOrderByCreatedAtDesc(dispute.getGame().getId())
                .orElse(null);
        if (latestSnapshot != null) {
            List<PlagiarismFlag> flags = plagiarismFlagRepository.findBySourceSnapshotIdOrderBySimilarityScoreDesc(latestSnapshot.getId());
            if (!flags.isEmpty()) {
                flagsInfo.append("Các nghi vấn trùng lặp code phát hiện bởi hệ thống AST/MinHash:\n");
                for (PlagiarismFlag flag : flags) {
                    flagsInfo.append(String.format("- Game trùng khớp: %s (Creator: %s), Độ tương đồng: %.2f%%\n",
                            flag.getMatchedGame().getTitle(),
                            flag.getMatchedGame().getCreator().getEmail(),
                            flag.getSimilarityScore() * 100));
                }
            } else {
                flagsInfo.append("Hệ thống AST/MinHash tự động không tìm thấy sự trùng lặp code bất thường nào với các game khác trên sàn.\n");
            }
        }

        // 3. Construct the prompt
        String prompt = String.format("""
                Bạn là Trợ lý AI Kiểm duyệt của sàn Godot Launch. Hãy phân tích đơn khiếu nại bản quyền (dispute) dưới đây và đưa ra "Báo cáo phân tích & Đề xuất phán quyết" chi tiết cho Quản trị viên (Admin).
                
                QUY TẮC QUAN TRỌNG VỀ NGÔN NGỮ & ĐỊNH DẠNG:
                1. TUYỆT ĐỐI KHÔNG sử dụng các từ khóa kỹ thuật database như 'resolved_seller_fault', 'resolved_reporter_fault', 'resolved_inconclusive' trong nội dung báo cáo. Admin là quản trị viên hệ thống, hãy dùng các thuật ngữ nghiệp vụ rõ ràng bằng tiếng Việt:
                   - Thay vì 'resolved_seller_fault' hãy ghi rõ: "Trường hợp 3: Lỗi thuộc về Người bán (Seller vi phạm bản quyền)"
                   - Thay vì 'resolved_reporter_fault' hãy ghi rõ: "Trường hợp 2: Lỗi thuộc về Người tố cáo (Reporter vu khống)"
                   - Thay vì 'resolved_inconclusive' hãy ghi rõ: "Trường hợp 1: Không đủ căn cứ để kết luận"
                2. Trình bày báo cáo rõ ràng, mạch lạc, trang trọng và nghiêm túc phù hợp với đồ án tốt nghiệp chuyên nghiệp.
                3. TUYỆT ĐỐI KHÔNG sử dụng các ký tự định dạng thô như dấu sao đơn `*` hoặc cặp dấu sao kép `**` để bôi đậm/in nghiêng. Không sử dụng dấu gạch nối liên tiếp như '--' hay '---' để làm đường kẻ ngăn cách.
                4. Sử dụng dấu xuống dòng thụt lề để phân tách các tiêu đề. Các danh sách liệt kê đầu dòng phải bắt đầu bằng ký tự dấu gạch ngang '-' tiêu chuẩn (ví dụ: '- Ý 1') để hệ thống tự động render chấm tròn UI đẹp mắt.
                
                THÔNG TIN VỤ VIỆC:
                - ID Khiếu nại: %s
                - Game bị tố cáo (A): %s (Tác giả: %s, Đăng tải ngày: %s)
                - Người tố cáo (B): %s (Email: %s)
                - Lý do tố cáo của B: %s
                - Đường dẫn bằng chứng (GitHub repo gốc của B): %s
                - Ghi chú bằng chứng của B: %s
                
                DỮ LIỆU GITHUB CỦA B:
                %s
                
                DỮ LIỆU ĐỐI CHIẾU HỆ THỐNG (ĐỘ TƯƠNG ĐỒNG CODE):
                %s

                DỮ LIỆU ĐỐI CHIẾU SỞ HỮU GITHUB:
                %s
                
                LUỒNG QUYẾT ĐỊNH & TIÊU CHÍ (Yêu cầu tuân thủ nghiêm ngặt):
                BƯỚC 1: Kiểm tra độ tương đồng mã nguồn (Code Similarity Check):
                - Nếu độ tương đồng >= 90%%: Khả năng đạo nhái cực cao. Chuyển sang Bước 2 để xem mốc thời gian và tính chính danh của chủ sở hữu.
                - Nếu độ tương đồng từ 70%% đến 90%%: Nghi vấn có sử dụng chung boilerplate hoặc clone một phần. Chuyển sang Bước 2.
                - Nếu độ tương đồng < 70%%: Code khác biệt đáng kể. Đề xuất ngay Trường hợp 1 hoặc Trường hợp 2 trừ khi B có bằng chứng phi mã nguồn khác thuyết phục.
                
                BƯỚC 2: Đối chiếu mốc thời gian và chủ sở hữu (Timeline & Ownership Check):
                - Nếu repo bằng chứng của B thực chất là sở hữu của Seller A hoặc trùng với repo gốc của game A -> B ăn cắp repo để vu cáo. Đề xuất: Trường hợp 2 (Reporter vu cáo / Reporter vu khống).
                - Nếu chủ sở hữu repo của B trên GitHub không khớp với tài khoản GitHub đã liên kết của B trên hệ thống -> Báo cáo thiếu tính chính danh. Cần phân tích kỹ xem B có phải là tác giả thực sự hay không, hoặc đề xuất Trường hợp 1 (Không đủ căn cứ) hoặc Trường hợp 2 (Reporter vu cáo).
                - Nếu B tạo repo GitHub trước khi A đăng game, độ tương đồng code cao, và repo thực sự thuộc quyền sở hữu của B -> A vi phạm. Đề xuất: Trường hợp 3 (Seller vi phạm thật / Seller vi phạm bản quyền).
                - Nếu A đăng game trước khi B tạo repo GitHub -> B vu khống. Đề xuất: Trường hợp 2 (Reporter vu cáo).
                - Nếu không rõ ràng -> Đề xuất: Trường hợp 1 (Không đủ căn cứ).
                
                NHIỆM VỤ CỦA BẠN:
                Hãy phân tích kỹ và viết báo cáo bằng tiếng Việt gồm:
                1. Đánh giá khả năng vi phạm mã nguồn và tính chính danh của bằng chứng (chủ sở hữu repo có thực sự là Người tố cáo B không).
                2. Phân tích chi tiết các điểm đáng nghi ngờ về mốc thời gian và quyền sở hữu.
                3. Đề xuất phán quyết cuối cùng (Chọn rõ Trường hợp 1, 2, hoặc 3).
                4. Giải thích ngắn gọn lý do tại sao nên chọn trường hợp đó.
                """,
                dispute.getId(),
                dispute.getGame().getTitle(),
                dispute.getReportedSeller().getEmail(),
                dispute.getGame().getCreatedAt().toString(),
                dispute.getReporter().getFullName(),
                dispute.getReporter().getEmail(),
                dispute.getReason(),
                dispute.getEvidenceRepoUrl() != null ? dispute.getEvidenceRepoUrl() : "Không cung cấp",
                dispute.getEvidenceNote() != null ? dispute.getEvidenceNote() : "Không có",
                gitInfo,
                flagsInfo.toString(),
                ownershipWarnings
        );

        return callDeepSeek(prompt);
    }

    private String callDeepSeek(String prompt) {
        if (deepseekApiKey == null || deepseekApiKey.isBlank()) {
            return "Chưa cấu hình DEEPSEEK_API_KEY trong file backend/.env để phân tích.";
        }
        try {
            Map<String, Object> body = Map.of(
                "model", deepseekModel,
                "messages", List.of(
                    Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.2
            );

            Map<String, Object> response = webClient.post()
                    .uri(deepseekApiUrl + "/chat/completions")
                    .header("Authorization", "Bearer " + deepseekApiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

            if (response != null && response.containsKey("choices")) {
                List<?> choices = (List<?>) response.get("choices");
                if (!choices.isEmpty()) {
                    Map<?, ?> choice = (Map<?, ?>) choices.get(0);
                    Map<?, ?> message = (Map<?, ?>) choice.get("message");
                    return (String) message.get("content");
                }
            }
            return "Không nhận được phản hồi hợp lệ từ DeepSeek API.";
        } catch (Exception e) {
            log.error("Lỗi khi kết nối tới DeepSeek API: {}", e.getMessage(), e);
            return "Lỗi kết nối DeepSeek: " + e.getMessage();
        }
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
