package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.CreateDisputeRequest;
import com.godotlaunch.backend.dto.request.ResolveDisputeRequest;
import com.godotlaunch.backend.dto.response.DisputeResponse;
import com.godotlaunch.backend.entity.Dispute;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.MarketplaceItem;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.DisputeRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.MarketplaceItemRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.BannedIdentityService;
import com.godotlaunch.backend.service.DisputeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DisputeServiceImpl implements DisputeService {

    private final DisputeRepository disputeRepository;
    private final UserRepository userRepository;
    private final GameRepository gameRepository;
    private final MarketplaceItemRepository marketplaceItemRepository;
    private final BannedIdentityService bannedIdentityService;

    private static final int REFUND_DAYS = 5;
    private static final int SPAM_REPORT_LIMIT = 3;

    @Override
    @Transactional
    public DisputeResponse createDispute(CreateDisputeRequest request, String reporterEmail) {
        User reporter = userRepository.findByEmail(reporterEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (request.getGameId() == null && request.getMarketplaceItemId() == null) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }

        Dispute dispute = new Dispute();
        dispute.setReporter(reporter);
        dispute.setReason(request.getReason());
        dispute.setEvidenceRepoUrl(request.getEvidenceRepoUrl());
        dispute.setEvidenceNote(request.getEvidenceNote());
        dispute.setStatus("open");

        User seller;
        // Xác định sản phẩm + seller (A) + auto-suspend
        if (request.getGameId() != null) {
            Game game = gameRepository.findById(request.getGameId())
                    .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));
            seller = game.getCreator();
            dispute.setGame(game);
            // Auto-suspend: gỡ game khỏi store ngay
            game.setStatus(GameStatus.rejected);
            gameRepository.save(game);
        } else {
            MarketplaceItem item = marketplaceItemRepository.findById(request.getMarketplaceItemId())
                    .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));
            seller = item.getSeller();
            dispute.setMarketplaceItem(item);
            item.setStatus(ItemStatus.removed);
            marketplaceItemRepository.save(item);
        }

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
        dispute.setStatus(resolution);
        dispute.setResolutionNote(request.getResolutionNote());
        dispute.setResolvedBy(admin);
        dispute.setResolvedAt(Instant.now());

        switch (resolution) {
            case "resolved_seller_fault" -> {
                // TH3: A đạo nhái → A hoàn tiền 5 ngày + ban A
                dispute.setRefundAmount(request.getRefundAmount());
                dispute.setRefundDeadline(Instant.now().plus(REFUND_DAYS, ChronoUnit.DAYS));
                if (request.isBanUser()) {
                    banSeller(dispute.getReportedSeller(), "copyright_theft");
                }
                safeNotify(dispute.getReportedSeller().getId(),
                        "Bạn bị kết luận vi phạm bản quyền. Hoàn trả " + request.getRefundAmount()
                                + " trong " + REFUND_DAYS + " ngày, nếu không sẽ bị xử lý pháp lý.");
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
        } else if (dispute.getMarketplaceItem() != null) {
            MarketplaceItem item = dispute.getMarketplaceItem();
            item.setStatus(ItemStatus.active);
            marketplaceItemRepository.save(item);
        }
    }

    private void banSeller(User seller, String reason) {
        seller.setStatus("banned");
        userRepository.save(seller);
        bannedIdentityService.banUser(seller, reason);
    }

    private void banReporter(User reporter, String reason) {
        reporter.setStatus("banned");
        userRepository.save(reporter);
        bannedIdentityService.banUser(reporter, reason);
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
                .gameId(d.getGame() != null ? d.getGame().getId() : null)
                .gameTitle(d.getGame() != null ? d.getGame().getTitle() : null)
                .marketplaceItemId(d.getMarketplaceItem() != null ? d.getMarketplaceItem().getId() : null)
                .marketplaceItemTitle(d.getMarketplaceItem() != null ? d.getMarketplaceItem().getTitle() : null)
                .reason(d.getReason())
                .evidenceRepoUrl(d.getEvidenceRepoUrl())
                .evidenceNote(d.getEvidenceNote())
                .status(d.getStatus())
                .resolutionNote(d.getResolutionNote())
                .refundAmount(d.getRefundAmount())
                .refundDeadline(d.getRefundDeadline())
                .createdAt(d.getCreatedAt())
                .resolvedAt(d.getResolvedAt())
                .build();
    }
}
