package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.request.ContractRequest;
import com.godotlaunch.backend.dto.response.ContractResponse;
import com.godotlaunch.backend.entity.Contract;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.enums.ContractStatus;
import com.godotlaunch.backend.entity.enums.ContractType;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.entity.enums.NotificationType;
import com.godotlaunch.backend.repository.ContractRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.SeaweedFsService;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import com.godotlaunch.backend.service.AuditLogService;
import com.godotlaunch.backend.service.ContractService;
import com.godotlaunch.backend.service.EmailService;
import com.godotlaunch.backend.service.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ContractServiceImpl implements ContractService {

    private final ContractRepository contractRepository;
    private final GameRepository gameRepository;
    private final UserRepository userRepository;
    private final SeaweedFsService seaweedFsService;
    private final EmailService emailService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    public ContractServiceImpl(ContractRepository contractRepository, GameRepository gameRepository,
                               UserRepository userRepository,
                               SeaweedFsService seaweedFsService, EmailService emailService,
                               AuditLogService auditLogService, NotificationService notificationService) {
        this.contractRepository = contractRepository;
        this.gameRepository = gameRepository;
        this.userRepository = userRepository;
        this.seaweedFsService = seaweedFsService;
        this.emailService = emailService;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional
    public ContractResponse createOffer(ContractRequest request, UUID adminId) {
        Game game = gameRepository.findById(request.getGameId())
                .orElseThrow(() -> new RuntimeException("Game not found"));
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        if (request.getBuyerSignatureBase64() == null || request.getBuyerSignatureBase64().trim().isEmpty()) {
            throw new RuntimeException("Chữ ký của Admin (Bên mua) là bắt buộc khi tạo hợp đồng");
        }

        // 1 game chỉ có đúng 1 contract row (UNIQUE(game_id)) — chào lại điều khoản mới
        // phải SỬA TRỰC TIẾP row hiện có, không insert mới (tránh vỡ constraint).
        Contract contract = contractRepository.findFirstByGameId(request.getGameId())
                .orElseGet(() -> {
                    Contract c = new Contract();
                    c.setGame(game);
                    return c;
                });

        contract.setSeller(game.getCreator());
        contract.setContractType(request.getContractType());
        if (request.getContractType() == ContractType.co_publishing) {
            contract.setRevenueSplit(request.getRevenueSplit());
            contract.setLumpSumAmount(null);
        } else {
            contract.setLumpSumAmount(request.getLumpSumAmount());
            contract.setRevenueSplit(null);
        }
        contract.setSellerRepresentative(request.getSellerRepresentative());
        contract.setSellerAddress(request.getSellerAddress());
        contract.setSellerTaxCode(request.getSellerTaxCode());

        // Vòng chào giá mới — xoá phản hồi/chữ ký của vòng trước
        contract.setRejectionReason(null);
        contract.setSellerSignatureBase64(null);
        contract.setSignedAtSeller(null);

        // Admin ký ngay lúc soạn hợp đồng
        contract.setBuyerSignatureBase64(request.getBuyerSignatureBase64());
        contract.setSignedAtBuyer(Instant.now());

        contract.setStatus(ContractStatus.pending);
        contract.setTermsHash("N/A");
        contract.setPdfUrl("");

        contractRepository.save(contract);

        // Send email to developer
        try {
            emailService.sendGameStatusNotification(
                    game.getCreator().getEmail(),
                    game.getTitle(),
                    "CONTRACT PROPOSED",
                    "A publishing contract has been proposed for your game. Please visit your developer dashboard to review and sign the contract."
            );
        } catch (Exception e) {
            // log warning but don't fail transaction
        }

        notificationService.createAndSendNotification(
                game.getCreator(), admin, NotificationType.CONTRACT_OFFERED,
                "Bạn có hợp đồng mới cần xem xét cho game '" + game.getTitle() + "'",
                contract.getId().toString()
        );

        auditLogService.publishAuto(
                AuditAction.contract_created,
                AuditTarget.contract,
                contract.getId(),
                null,
                contract.getStatus().name(),
                "Contract proposed (and signed) by Admin for game: " + game.getTitle()
        );

        return mapToResponse(contract);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ContractResponse> getContractsByDeveloper(UUID developerId) {
        return contractRepository.findBySellerId(developerId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ContractResponse> getAllContracts() {
        return contractRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ContractResponse getContractById(UUID contractId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Contract not found"));
        return mapToResponse(contract);
    }

    @Override
    @Transactional
    public ContractResponse signByDeveloper(UUID contractId, UUID developerId, String signatureBase64,
                                             String sellerRepresentative, String sellerAddress, String sellerTaxCode) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Contract not found"));

        if (!contract.getSeller().getId().equals(developerId)) {
            throw new RuntimeException("Unauthorized to sign this contract");
        }
        if (contract.getStatus() != ContractStatus.pending) {
            throw new RuntimeException("Contract is not in pending status");
        }

        if (signatureBase64 == null || signatureBase64.trim().isEmpty()) {
            throw new RuntimeException("Chữ ký của Developer là bắt buộc");
        }

        if (sellerRepresentative != null && !sellerRepresentative.trim().isEmpty()) {
            contract.setSellerRepresentative(sellerRepresentative);
        }
        if (sellerAddress != null && !sellerAddress.trim().isEmpty()) {
            contract.setSellerAddress(sellerAddress);
        }
        if (sellerTaxCode != null && !sellerTaxCode.trim().isEmpty()) {
            contract.setSellerTaxCode(sellerTaxCode);
        }

        // Validate required fields are not blank
        if (contract.getSellerRepresentative() == null || contract.getSellerRepresentative().trim().isEmpty()) {
            throw new RuntimeException("Họ tên đại diện Bên B là bắt buộc");
        }
        if (contract.getSellerAddress() == null || contract.getSellerAddress().trim().isEmpty()) {
            throw new RuntimeException("Địa chỉ thường trú là bắt buộc");
        }

        contract.setSignedAtSeller(Instant.now());
        contract.setSellerSignatureBase64(signatureBase64);
        contract.setStatus(ContractStatus.signed);
        contractRepository.save(contract);

        // Hợp đồng ký xong CHƯA publish — chỉ mở khoá bước "Upload build" để admin
        // đẩy game lên Google Play (xem docs/diagram/2 push-game-sequence.puml).
        Game game = contract.getGame();
        GameStatus previousStatus = game.getStatus();
        game.setStatus(GameStatus.awaiting_store_build);
        gameRepository.save(game);

        User developer = game.getCreator();
        for (User adminUser : userRepository.findByRole_NameIgnoreCase("admin")) {
            notificationService.createAndSendNotification(
                    adminUser, developer, NotificationType.SELLER_RESPONSE,
                    "Developer đã ký hợp đồng cho game '" + game.getTitle() + "' — sẵn sàng upload build lên Google Play",
                    contract.getId().toString()
            );
        }

        auditLogService.publishAuto(
                AuditAction.contract_signed,
                AuditTarget.contract,
                contract.getId(),
                null,
                contract.getStatus().name(),
                "Contract fully signed by developer (seller) for game: " + contract.getGame().getTitle()
        );

        auditLogService.publishAuto(
                AuditAction.game_updated,
                AuditTarget.game,
                game.getId(),
                previousStatus.name(),
                GameStatus.awaiting_store_build.name(),
                "Game '" + game.getTitle() + "' chờ admin upload build lên Google Play (contract đã ký)."
        );

        return mapToResponse(contract);
    }

    @Override
    @Transactional
    public ContractResponse rejectByDeveloper(UUID contractId, UUID developerId, String rejectionReason) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Contract not found"));

        if (!contract.getSeller().getId().equals(developerId)) {
            throw new RuntimeException("Unauthorized to reject this contract");
        }
        if (contract.getStatus() != ContractStatus.pending) {
            throw new RuntimeException("Contract is not in pending status");
        }

        contract.setStatus(ContractStatus.cancelled);
        contract.setRejectionReason(rejectionReason);

        Game game = contract.getGame();
        game.setStatus(GameStatus.pending);
        gameRepository.save(game);

        contractRepository.save(contract);

        User developer = game.getCreator();
        for (User adminUser : userRepository.findByRole_NameIgnoreCase("admin")) {
            notificationService.createAndSendNotification(
                    adminUser, developer, NotificationType.SELLER_RESPONSE,
                    "Developer từ chối hợp đồng cho game '" + game.getTitle() + "': " + rejectionReason,
                    contract.getId().toString()
            );
        }

        auditLogService.publishAuto(
                AuditAction.contract_cancelled,
                AuditTarget.contract,
                contract.getId(),
                null,
                contract.getStatus().name(),
                "Contract rejected by developer for game: " + contract.getGame().getTitle() + ". Reason: " + rejectionReason
        );

        return mapToResponse(contract);
    }

    private ContractResponse mapToResponse(Contract contract) {
        String publicPdfUrl = contract.getPdfUrl();
        if (publicPdfUrl != null && publicPdfUrl.contains(".amazonaws.com/")) {
            try {
                String key = publicPdfUrl.substring(publicPdfUrl.indexOf(".com/") + 5);
                publicPdfUrl = seaweedFsService.generatePresignedGetUrl(key, Duration.ofMinutes(30));
            } catch (Exception e) {
                // Fallback to original URL
            }
        }
        return ContractResponse.builder()
                .id(contract.getId())
                .gameId(contract.getGame().getId())
                .gameTitle(contract.getGame().getTitle())
                .sellerId(contract.getSeller().getId())
                .sellerName(contract.getSeller().getFullName() != null ? contract.getSeller().getFullName() : contract.getSeller().getEmail())
                .sellerEmail(contract.getSeller().getEmail())
                .contractType(contract.getContractType())
                .termsHash(contract.getTermsHash())
                .pdfUrl(publicPdfUrl)
                .status(contract.getStatus())
                .revenueSplit(contract.getRevenueSplit())
                .lumpSumAmount(contract.getLumpSumAmount())
                .disputeResolutionClause(null)
                .additionalTerms(null)
                .buyerRepresentative(null)
                .buyerPosition(null)
                .sellerRepresentative(contract.getSellerRepresentative())
                .sellerAddress(contract.getSellerAddress())
                .sellerTaxCode(contract.getSellerTaxCode())
                .signedAtSeller(contract.getSignedAtSeller())
                .signedAtBuyer(contract.getSignedAtBuyer())
                .sellerSignatureBase64(contract.getSellerSignatureBase64())
                .buyerSignatureBase64(contract.getBuyerSignatureBase64())
                .rejectionReason(contract.getRejectionReason())
                .createdAt(contract.getCreatedAt())
                .build();
    }

}
