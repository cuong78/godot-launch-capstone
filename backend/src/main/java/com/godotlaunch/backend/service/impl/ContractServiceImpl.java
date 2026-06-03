//package com.godotlaunch.backend.service.impl;
//
//import com.godotlaunch.backend.dto.request.ContractRequest;
//import com.godotlaunch.backend.dto.response.ContractResponse;
//import com.godotlaunch.backend.entity.Contract;
//import com.godotlaunch.backend.entity.Game;
//import com.godotlaunch.backend.entity.User;
//import com.godotlaunch.backend.entity.enums.ContractStatus;
//import com.godotlaunch.backend.entity.enums.ContractType;
//import com.godotlaunch.backend.repository.ContractRepository;
//import com.godotlaunch.backend.repository.GameRepository;
//import com.godotlaunch.backend.repository.UserRepository;
//import com.godotlaunch.backend.service.AwsS3Service;
//import com.godotlaunch.backend.service.ContractService;
//import com.godotlaunch.backend.service.PdfGenerationService;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//import org.springframework.web.multipart.MultipartFile;
//
//import java.nio.charset.StandardCharsets;
//import java.security.MessageDigest;
//import java.time.Instant;
//import java.time.Duration;
//import java.util.*;
//import java.util.stream.Collectors;
//
//@Service
//public class ContractServiceImpl implements ContractService {
//
//    private final ContractRepository contractRepository;
//    private final GameRepository gameRepository;
//    private final UserRepository userRepository;
//    private final PdfGenerationService pdfGenerationService;
//    private final AwsS3Service awsS3Service;
//
//    public ContractServiceImpl(ContractRepository contractRepository, GameRepository gameRepository,
//                               UserRepository userRepository, PdfGenerationService pdfGenerationService,
//                               AwsS3Service awsS3Service) {
//        this.contractRepository = contractRepository;
//        this.gameRepository = gameRepository;
//        this.userRepository = userRepository;
//        this.pdfGenerationService = pdfGenerationService;
//        this.awsS3Service = awsS3Service;
//    }
//
//    @Override
//    @Transactional
//    public ContractResponse createOffer(ContractRequest request, UUID adminId) {
//        Game game = gameRepository.findById(request.getGameId())
//                .orElseThrow(() -> new RuntimeException("Game not found"));
//        User admin = userRepository.findById(adminId)
//                .orElseThrow(() -> new RuntimeException("Admin not found"));
//
//        Contract contract = new Contract();
//        contract.setGame(game);
//        contract.setSeller(game.getCreator());
//        contract.setBuyer(admin);
//        contract.setContractType(request.getContractType());
//        if (request.getContractType() == ContractType.co_publishing) {
//            contract.setRevenueSplit(request.getRevenueSplit());
//        } else {
//            contract.setLumpSumAmount(request.getLumpSumAmount());
//        }
//        contract.setDisputeResolutionClause(request.getDisputeResolutionClause());
//        contract.setAdditionalTerms(request.getAdditionalTerms());
//        contract.setBuyerRepresentative(request.getBuyerRepresentative());
//        contract.setBuyerPosition(request.getBuyerPosition());
//        contract.setSellerRepresentative(request.getSellerRepresentative());
//        contract.setSellerAddress(request.getSellerAddress());
//        contract.setSellerTaxCode(request.getSellerTaxCode());
//        contract.setStatus(ContractStatus.pending);
//
//        generateAndUploadPdf(contract, Instant.now());
//
//        contractRepository.save(contract);
//        return mapToResponse(contract);
//    }
//
//    @Override
//    public List<ContractResponse> getContractsByDeveloper(UUID developerId) {
//        return contractRepository.findBySellerId(developerId).stream()
//                .map(this::mapToResponse)
//                .collect(Collectors.toList());
//    }
//
//    @Override
//    public List<ContractResponse> getAllContracts() {
//        return contractRepository.findAll().stream()
//                .map(this::mapToResponse)
//                .collect(Collectors.toList());
//    }
//
//    @Override
//    public ContractResponse getContractById(UUID contractId) {
//        Contract contract = contractRepository.findById(contractId)
//                .orElseThrow(() -> new RuntimeException("Contract not found"));
//        return mapToResponse(contract);
//    }
//
//    @Override
//    @Transactional
//    public ContractResponse signByDeveloper(UUID contractId, UUID developerId, String signatureBase64) {
//        Contract contract = contractRepository.findById(contractId)
//                .orElseThrow(() -> new RuntimeException("Contract not found"));
//
//        if (!contract.getSeller().getId().equals(developerId)) {
//            throw new RuntimeException("Unauthorized to sign this contract");
//        }
//        if (contract.getStatus() != ContractStatus.pending) {
//            throw new RuntimeException("Contract is not in pending status");
//        }
//
//        contract.setSignedAtSeller(Instant.now());
//        contract.setSellerSignatureBase64(signatureBase64);
//        generateAndUploadPdf(contract, contract.getCreatedAt() != null ? contract.getCreatedAt() : Instant.now());
//        contractRepository.save(contract);
//        return mapToResponse(contract);
//    }
//
//    @Override
//    @Transactional
//    public ContractResponse signByAdmin(UUID contractId, UUID adminId, String signatureBase64) {
//        Contract contract = contractRepository.findById(contractId)
//                .orElseThrow(() -> new RuntimeException("Contract not found"));
//
//        if (contract.getSignedAtSeller() == null) {
//            throw new RuntimeException("Developer must sign first");
//        }
//        if (contract.getStatus() != ContractStatus.pending) {
//            throw new RuntimeException("Contract is not in pending status");
//        }
//
//        contract.setSignedAtBuyer(Instant.now());
//        contract.setBuyerSignatureBase64(signatureBase64);
//        contract.setStatus(ContractStatus.signed);
//        contract.setBuyer(userRepository.findById(adminId).orElseThrow());
//
//        generateAndUploadPdf(contract, contract.getCreatedAt() != null ? contract.getCreatedAt() : Instant.now());
//        contractRepository.save(contract);
//
//        // Execute Contract terms
//        Game game = contract.getGame();
//        if (contract.getContractType() == ContractType.co_publishing) {
//            // Note: In a full system, you might set a field on Game or leave it to be queried from Contract.
//            // game.setRevenueSplit(contract.getRevenueSplit());
//            // gameRepository.save(game);
//        } else if (contract.getContractType() == ContractType.full_acquisition) {
//            // Transfer ownership or set status
//            // game.setCreator(contract.getBuyer());
//            // gameRepository.save(game);
//        }
//
//        return mapToResponse(contract);
//    }
//
//    private ContractResponse mapToResponse(Contract contract) {
//        String publicPdfUrl = contract.getPdfUrl();
//        if (publicPdfUrl != null && publicPdfUrl.contains(".amazonaws.com/")) {
//            try {
//                String key = publicPdfUrl.substring(publicPdfUrl.indexOf(".com/") + 5);
//                publicPdfUrl = awsS3Service.generatePresignedGetUrl(key, Duration.ofMinutes(30));
//            } catch (Exception e) {
//                // Fallback to original URL
//            }
//        }
//        return ContractResponse.builder()
//                .id(contract.getId())
//                .gameId(contract.getGame().getId())
//                .gameTitle(contract.getGame().getTitle())
//                .sellerId(contract.getSeller().getId())
//                .sellerName(contract.getSeller().getUsername())
//                .buyerId(contract.getBuyer() != null ? contract.getBuyer().getId() : null)
//                .contractType(contract.getContractType())
//                .termsHash(contract.getTermsHash())
//                .pdfUrl(publicPdfUrl)
//                .status(contract.getStatus())
//                .revenueSplit(contract.getRevenueSplit())
//                .lumpSumAmount(contract.getLumpSumAmount())
//                .disputeResolutionClause(contract.getDisputeResolutionClause())
//                .additionalTerms(contract.getAdditionalTerms())
//                .buyerRepresentative(contract.getBuyerRepresentative())
//                .buyerPosition(contract.getBuyerPosition())
//                .sellerRepresentative(contract.getSellerRepresentative())
//                .sellerAddress(contract.getSellerAddress())
//                .sellerTaxCode(contract.getSellerTaxCode())
//                .signedAtSeller(contract.getSignedAtSeller())
//                .signedAtBuyer(contract.getSignedAtBuyer())
//                .sellerSignatureBase64(contract.getSellerSignatureBase64())
//                .buyerSignatureBase64(contract.getBuyerSignatureBase64())
//                .createdAt(contract.getCreatedAt())
//                .build();
//    }
//
//    private String computeSha256Hash(byte[] data) {
//        try {
//            MessageDigest digest = MessageDigest.getInstance("SHA-256");
//            byte[] encodedhash = digest.digest(data);
//            StringBuilder hexString = new StringBuilder(2 * encodedhash.length);
//            for (byte b : encodedhash) {
//                String hex = Integer.toHexString(0xff & b);
//                if (hex.length() == 1) {
//                    hexString.append('0');
//                }
//                hexString.append(hex);
//            }
//            return hexString.toString();
//        } catch (Exception e) {
//            throw new RuntimeException("Error computing hash", e);
//        }
//    }
//
//    private void generateAndUploadPdf(Contract contract, Instant effectiveDate) {
//        Game game = contract.getGame();
//        Map<String, Object> variables = new HashMap<>();
//        variables.put("date", effectiveDate.toString());
//        variables.put("developerName", game.getCreator().getUsername());
//
//        // Developer details (prioritize custom, fallback to database)
//        String devFullName = contract.getSellerRepresentative() != null && !contract.getSellerRepresentative().trim().isEmpty()
//                ? contract.getSellerRepresentative()
//                : (game.getCreator().getFullName() != null ? game.getCreator().getFullName() : game.getCreator().getUsername());
//
//        variables.put("developerFullName", devFullName);
//        variables.put("developerEmail", game.getCreator().getEmail());
//        variables.put("developerAddress", contract.getSellerAddress() != null ? contract.getSellerAddress() : "");
//        variables.put("developerTaxCode", contract.getSellerTaxCode() != null ? contract.getSellerTaxCode() : "");
//
//        variables.put("gameTitle", game.getTitle());
//        variables.put("contractType", contract.getContractType().name());
//        variables.put("revenueSplit", contract.getRevenueSplit() != null ? contract.getRevenueSplit() : 0);
//        variables.put("lumpSumAmount", contract.getLumpSumAmount() != null ? contract.getLumpSumAmount() : "");
//        variables.put("disputeResolutionClause", contract.getDisputeResolutionClause() != null ? contract.getDisputeResolutionClause() : "");
//        variables.put("additionalTerms", contract.getAdditionalTerms() != null ? contract.getAdditionalTerms() : "");
//        variables.put("contractId", contract.getId() != null ? contract.getId().toString() : "");
//        variables.put("contractIdShort", contract.getId() != null ? contract.getId().toString().substring(0, 8).toUpperCase() : "TEMP");
//
//        // Admin details (prioritize custom, fallback to database)
//        String adminFullName = contract.getBuyerRepresentative() != null && !contract.getBuyerRepresentative().trim().isEmpty()
//                ? contract.getBuyerRepresentative()
//                : (contract.getBuyer() != null && contract.getBuyer().getFullName() != null ? contract.getBuyer().getFullName() : "Godot Launch Admin");
//
//        String adminPosition = contract.getBuyerPosition() != null && !contract.getBuyerPosition().trim().isEmpty()
//                ? contract.getBuyerPosition()
//                : "Ban quản trị hệ thống / Authorized Representative";
//
//        String adminEmail = contract.getBuyer() != null ? contract.getBuyer().getEmail() : "admin@godotlaunch.com";
//
//        variables.put("adminFullName", adminFullName);
//        variables.put("adminPosition", adminPosition);
//        variables.put("adminEmail", adminEmail);
//
//        if (contract.getSignedAtSeller() != null) {
//            variables.put("signedAtSeller", contract.getSignedAtSeller().toString());
//        }
//        if (contract.getSignedAtBuyer() != null) {
//            variables.put("signedAtBuyer", contract.getSignedAtBuyer().toString());
//        }
//        variables.put("sellerSignatureBase64", contract.getSellerSignatureBase64() != null ? contract.getSellerSignatureBase64() : "");
//        variables.put("buyerSignatureBase64", contract.getBuyerSignatureBase64() != null ? contract.getBuyerSignatureBase64() : "");
//
//        byte[] pdfBytes = pdfGenerationService.generatePdfFromHtml("contract-template", variables);
//        String hash = computeSha256Hash(pdfBytes);
//        contract.setTermsHash(hash);
//
//        MultipartFile multipartFile = new MultipartFile() {
//            @Override public String getName() { return "contract.pdf"; }
//            @Override public String getOriginalFilename() { return "contract.pdf"; }
//            @Override public String getContentType() { return "application/pdf"; }
//            @Override public boolean isEmpty() { return pdfBytes == null || pdfBytes.length == 0; }
//            @Override public long getSize() { return pdfBytes.length; }
//            @Override public byte[] getBytes() { return pdfBytes; }
//            @Override public java.io.InputStream getInputStream() { return new java.io.ByteArrayInputStream(pdfBytes); }
//            @Override public void transferTo(java.io.File dest) throws java.io.IOException, IllegalStateException {
//                java.nio.file.Files.write(dest.toPath(), pdfBytes);
//            }
//        };
//        // Xóa file cũ trên S3 nếu đã tồn tại để tối ưu lưu trữ
//        if (contract.getPdfUrl() != null) {
//            try {
//                String oldUrl = contract.getPdfUrl();
//                String key = oldUrl.substring(oldUrl.indexOf(".com/") + 5);
//                awsS3Service.deleteObject(key);
//            } catch (Exception e) {
//                // Bỏ qua lỗi nếu file cũ không tồn tại
//            }
//        }
//
//        String pdfUrl = awsS3Service.uploadFile(multipartFile, "contracts");
//        contract.setPdfUrl(pdfUrl);
//    }
//}
