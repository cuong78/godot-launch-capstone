package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.request.ContractRequest;
import com.godotlaunch.backend.dto.response.ContractResponse;
import com.godotlaunch.backend.entity.Contract;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.enums.ContractStatus;
import com.godotlaunch.backend.entity.enums.ContractType;
import com.godotlaunch.backend.repository.ContractRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.AwsS3Service;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import com.godotlaunch.backend.service.AuditLogService;
import com.godotlaunch.backend.service.ContractService;
import com.godotlaunch.backend.service.EmailService;
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
    private final AwsS3Service awsS3Service;
    private final EmailService emailService;
    private final AuditLogService auditLogService;

    public ContractServiceImpl(ContractRepository contractRepository, GameRepository gameRepository,
                               UserRepository userRepository,
                               AwsS3Service awsS3Service, EmailService emailService,
                               AuditLogService auditLogService) {
        this.contractRepository = contractRepository;
        this.gameRepository = gameRepository;
        this.userRepository = userRepository;
        this.awsS3Service = awsS3Service;
        this.emailService = emailService;
        this.auditLogService = auditLogService;
    }

    @Override
    @Transactional
    public ContractResponse createOffer(ContractRequest request, UUID adminId) {
        Game game = gameRepository.findById(request.getGameId())
                .orElseThrow(() -> new RuntimeException("Game not found"));
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        // Cancel any existing active contracts for this game and check if we are re-issuing
        boolean isReIssued = false;
        List<Contract> activeContracts = contractRepository.findByGameId(request.getGameId());
        for (Contract c : activeContracts) {
            if (c.getStatus() == ContractStatus.pending || c.getStatus() == ContractStatus.negotiating || c.getStatus() == ContractStatus.re_issued) {
                if (c.getStatus() == ContractStatus.negotiating || c.getStatus() == ContractStatus.re_issued) {
                    isReIssued = true;
                }
                c.setStatus(ContractStatus.cancelled);
                contractRepository.save(c);
            }
        }

        Contract contract = new Contract();
        contract.setGame(game);
        contract.setSeller(game.getCreator());
        contract.setContractType(request.getContractType());
        if (request.getContractType() == ContractType.co_publishing) {
            contract.setRevenueSplit(request.getRevenueSplit());
        } else {
            contract.setLumpSumAmount(request.getLumpSumAmount());
        }
        contract.setDisputeResolutionClause(request.getDisputeResolutionClause());
        contract.setAdditionalTerms(request.getAdditionalTerms());
        contract.setBuyerRepresentative(request.getBuyerRepresentative());
        contract.setBuyerPosition(request.getBuyerPosition());
        contract.setSellerRepresentative(request.getSellerRepresentative());
        contract.setSellerAddress(request.getSellerAddress());
        contract.setSellerTaxCode(request.getSellerTaxCode());
        contract.setStatus(isReIssued ? ContractStatus.re_issued : ContractStatus.pending);

        if (request.getBuyerSignatureBase64() == null || request.getBuyerSignatureBase64().trim().isEmpty()) {
            throw new RuntimeException("Chữ ký của Admin là bắt buộc");
        }
        contract.setBuyerSignatureBase64(request.getBuyerSignatureBase64());
        contract.setSignedAtBuyer(Instant.now());

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

        auditLogService.publishAuto(
                AuditAction.contract_created,
                AuditTarget.contract,
                contract.getId(),
                null,
                contract.getStatus().name(),
                "Contract proposed by Admin for game: " + game.getTitle()
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
        if (contract.getStatus() != ContractStatus.pending && contract.getStatus() != ContractStatus.re_issued) {
            throw new RuntimeException("Contract is not in pending or re-issued status");
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

        // Update game status to published
        Game game = contract.getGame();
        game.setStatus(com.godotlaunch.backend.entity.enums.GameStatus.published);
        gameRepository.save(game);

        auditLogService.publishAuto(
                AuditAction.contract_signed,
                AuditTarget.contract,
                contract.getId(),
                null,
                contract.getStatus().name(),
                "Contract fully signed by developer (seller) for game: " + contract.getGame().getTitle()
        );

        auditLogService.publishAuto(
                AuditAction.game_published,
                AuditTarget.game,
                game.getId(),
                com.godotlaunch.backend.entity.enums.GameStatus.pending.name(),
                com.godotlaunch.backend.entity.enums.GameStatus.published.name(),
                "Game '" + game.getTitle() + "' published (contract fully signed by developer)."
        );

        return mapToResponse(contract);
    }

    @Override
    @Transactional
    public ContractResponse signByAdmin(UUID contractId, UUID adminId, String signatureBase64) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Contract not found"));

        if (contract.getSignedAtSeller() == null) {
            throw new RuntimeException("Developer must sign first");
        }
        if (contract.getStatus() != ContractStatus.pending && contract.getStatus() != ContractStatus.re_issued) {
            throw new RuntimeException("Contract is not in pending or re-issued status");
        }

        contract.setSignedAtBuyer(Instant.now());
        contract.setBuyerSignatureBase64(signatureBase64);
        contract.setStatus(ContractStatus.signed);

        contractRepository.save(contract);

        // Execute Contract terms
        Game game = contract.getGame();
        // Update game status to published when contract is fully signed
        game.setStatus(com.godotlaunch.backend.entity.enums.GameStatus.published);
        gameRepository.save(game);

        auditLogService.publishAuto(
                AuditAction.contract_signed,
                AuditTarget.contract,
                contract.getId(),
                null,
                contract.getStatus().name(),
                "Contract signed by admin (buyer) and fully executed for game: " + contract.getGame().getTitle()
        );

        auditLogService.publishAuto(
                AuditAction.game_published,
                AuditTarget.game,
                game.getId(),
                com.godotlaunch.backend.entity.enums.GameStatus.approved.name(),
                com.godotlaunch.backend.entity.enums.GameStatus.published.name(),
                "Game '" + game.getTitle() + "' published (contract countersigned by admin)."
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
        if (contract.getStatus() != ContractStatus.pending && contract.getStatus() != ContractStatus.re_issued) {
            throw new RuntimeException("Contract is not in pending or re-issued status");
        }

        contract.setStatus(ContractStatus.negotiating);
        contract.setRejectionReason(rejectionReason);
        
        Game game = contract.getGame();
        game.setStatus(com.godotlaunch.backend.entity.enums.GameStatus.pending);
        gameRepository.save(game);

        contractRepository.save(contract);
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
                publicPdfUrl = awsS3Service.generatePresignedGetUrl(key, Duration.ofMinutes(30));
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
                .disputeResolutionClause(contract.getDisputeResolutionClause())
                .additionalTerms(contract.getAdditionalTerms())
                .buyerRepresentative(contract.getBuyerRepresentative())
                .buyerPosition(contract.getBuyerPosition())
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
