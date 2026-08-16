package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.request.ContractRequest;
import com.godotlaunch.backend.dto.response.ContractAiSuggestionResponse;
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
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ContractServiceImpl implements ContractService {

    private final ContractRepository contractRepository;
    private final GameRepository gameRepository;
    private final UserRepository userRepository;
    private final SeaweedFsService seaweedFsService;
    private final EmailService emailService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;
    private final WebClient webClient;

    @Value("${DEEPSEEK_API_KEY:}")
    private String deepseekApiKey;

    @Value("${DEEPSEEK_API_URL:https://api.deepseek.com/v1}")
    private String deepseekApiUrl;

    @Value("${DEEPSEEK_MODEL:deepseek-chat}")
    private String deepseekModel;

    public ContractServiceImpl(ContractRepository contractRepository, GameRepository gameRepository,
                               UserRepository userRepository,
                               SeaweedFsService seaweedFsService, EmailService emailService,
                               AuditLogService auditLogService, NotificationService notificationService,
                               ObjectMapper objectMapper, WebClient webClient) {
        this.contractRepository = contractRepository;
        this.gameRepository = gameRepository;
        this.userRepository = userRepository;
        this.seaweedFsService = seaweedFsService;
        this.emailService = emailService;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
        this.webClient = webClient;
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

        // Ghi lại "bản chào trước" ngay trước khi ghi đè — chỉ khi record đã tồn
        // tại từ trước (không phải lần tạo offer đầu tiên) — để Developer thấy
        // được điểm khác biệt so với bản admin từng gửi (xem getContractById()/
        // ContractResponse.previousOfferSnapshot).
        if (contract.getId() != null) {
            contract.setPreviousOfferSnapshot(buildOfferSnapshotJson(contract));
        }

        contract.setSeller(game.getCreator());
        contract.setContractType(request.getContractType());
        if (request.getContractType() == ContractType.co_publishing) {
            contract.setRevenueSplit(request.getRevenueSplit());
            contract.setLumpSumAmount(null);
        } else {
            // Admin luôn được tự chỉnh giá trọn gói qua request.getLumpSumAmount() —
            // KHÔNG còn tự động khoá theo game.getPriceProposed() (bug cũ: admin
            // không có cách nào sửa giá khác với giá developer đề xuất, trừ phi
            // đang trong luồng thương lượng). Nếu admin để trống, fallback về giá
            // developer đề xuất cho tiện — không bắt buộc phải nhập lại từ đầu.
            String rawAmount = request.getLumpSumAmount();
            if (rawAmount == null || rawAmount.isBlank()) {
                if (game.getPriceProposed() != null) {
                    rawAmount = game.getPriceProposed().compareTo(java.math.BigDecimal.ZERO) == 0
                            ? "0 VND"
                            : String.format("%,d VND", game.getPriceProposed().longValue());
                }
            } else if (!rawAmount.toLowerCase().contains("vnd") && !rawAmount.toLowerCase().contains("vnđ")) {
                try {
                    String clean = rawAmount.replaceAll("[^0-9]", "");
                    if (!clean.isEmpty()) {
                        long parsedVal = Long.parseLong(clean);
                        rawAmount = String.format("%,d VND", parsedVal);
                    }
                } catch (Exception e) {
                    // fallback: giữ nguyên rawAmount gốc nếu không parse được
                }
            }
            contract.setLumpSumAmount(rawAmount);
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
    public ContractAiSuggestionResponse suggestContractTerms(UUID gameId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        if (deepseekApiKey == null || deepseekApiKey.isBlank()) {
            return ContractAiSuggestionResponse.builder()
                    .unavailable(true)
                    .reasoning("Chưa cấu hình DEEPSEEK_API_KEY trong file backend/.env để gợi ý hợp đồng.")
                    .build();
        }

        String prompt = buildContractSuggestionPrompt(game);
        try {
            String rawJson = callDeepSeekForJson(prompt);
            JsonNode node = objectMapper.readTree(extractJsonBlock(rawJson));

            String typeStr = node.path("contractType").asText("full_acquisition");
            ContractType suggestedType = "co_publishing".equalsIgnoreCase(typeStr)
                    ? ContractType.co_publishing
                    : ContractType.full_acquisition;

            ContractAiSuggestionResponse.ContractAiSuggestionResponseBuilder builder =
                    ContractAiSuggestionResponse.builder()
                            .suggestedContractType(suggestedType)
                            .reasoning(node.path("reasoning").asText(""))
                            .unavailable(false);

            if (suggestedType == ContractType.co_publishing) {
                short split = (short) Math.max(0, Math.min(100, node.path("revenueSplit").asInt(70)));
                builder.suggestedRevenueSplit(split);
            } else {
                long amount = Math.max(0, node.path("lumpSumAmount").asLong(0));
                builder.suggestedLumpSumAmount(java.math.BigDecimal.valueOf(amount));
            }

            return builder.build();
        } catch (Exception e) {
            log.warn("Lỗi khi lấy gợi ý hợp đồng từ AI cho game {}: {}", gameId, e.getMessage());
            return ContractAiSuggestionResponse.builder()
                    .unavailable(true)
                    .reasoning("Không thể lấy gợi ý từ AI lúc này. Vui lòng tự nhập điều khoản hoặc thử lại sau.")
                    .build();
        }
    }

    private String buildContractSuggestionPrompt(Game game) {
        String category = game.getCategory() != null ? game.getCategory().getName() : "Không rõ";
        String description = game.getDescription() != null && !game.getDescription().isBlank()
                ? game.getDescription() : "Không có mô tả";
        String proposedPrice = game.getPriceProposed() != null
                ? String.format("%,d VND", game.getPriceProposed().longValue())
                : "Chưa đề xuất";

        return String.format("""
                Bạn là Trợ lý AI tư vấn hợp đồng phát hành cho sàn phân phối game GodotLaunch.
                Hãy phân tích thông tin game dưới đây và đề xuất LOẠI HỢP ĐỒNG phát hành phù hợp nhất,
                kèm mức giá/tỷ lệ chia doanh thu tương ứng.

                THÔNG TIN GAME:
                - Tên game: %s
                - Thể loại: %s
                - Mô tả: %s
                - Giá developer đề xuất (nếu bán trên marketplace): %s
                - Số lượt tải hiện tại: %d

                HAI LOẠI HỢP ĐỒNG CÓ THỂ CHỌN:
                1. full_acquisition (Mua đứt trọn gói): Platform trả 1 lần duy nhất, sở hữu toàn bộ game.
                   Phù hợp với game nhỏ, đã hoàn thiện, ít cần cập nhật lâu dài, hoặc developer muốn nhận tiền ngay.
                2. co_publishing (Đồng phát hành - chia doanh thu): Developer vẫn giữ quyền sở hữu, nhận % doanh thu
                   theo thời gian. Phù hợp với game có tiềm năng doanh thu dài hạn, cần developer tiếp tục cập nhật,
                   hoặc game đã có lượng người chơi/lượt tải tốt cho thấy tiềm năng thương mại lâu dài.

                YÊU CẦU ĐẦU RA: CHỈ trả về đúng 1 khối JSON hợp lệ (không thêm markdown, không thêm giải thích
                ngoài JSON), theo đúng cấu trúc sau:
                {
                  "contractType": "full_acquisition" hoặc "co_publishing",
                  "lumpSumAmount": <số nguyên VND, chỉ điền nếu contractType là full_acquisition, ước tính hợp lý dựa trên giá đề xuất và tiềm năng game>,
                  "revenueSplit": <số nguyên 0-100, chỉ điền nếu contractType là co_publishing, là % developer nhận>,
                  "reasoning": "<giải thích ngắn gọn 2-3 câu bằng tiếng Việt lý do đề xuất mức trên>"
                }
                """,
                game.getTitle(), category, description, proposedPrice,
                game.getDownloadCount() != null ? game.getDownloadCount() : 0);
    }

    /** DeepSeek đôi khi bọc JSON trong ```json ... ``` — tách phần JSON thuần trước khi parse. */
    private String extractJsonBlock(String raw) {
        if (raw == null) return "{}";
        String trimmed = raw.trim();
        int start = trimmed.indexOf('{');
        int end = trimmed.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return trimmed.substring(start, end + 1);
        }
        return trimmed;
    }

    private String callDeepSeekForJson(String prompt) {
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
        throw new RuntimeException("Không nhận được phản hồi hợp lệ từ DeepSeek API.");
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
        boolean isCancellation = rejectionReason != null && rejectionReason.trim().startsWith("[HỦY HỢP ĐỒNG]");
        if (isCancellation) {
            game.setStatus(GameStatus.rejected);
        } else {
            game.setStatus(GameStatus.pending);
        }
        gameRepository.save(game);

        contractRepository.save(contract);

        User developer = game.getCreator();
        String actionStr = isCancellation ? "đã từ chối/hủy không ký hợp đồng" : "yêu cầu thương lượng lại hợp đồng";
        for (User adminUser : userRepository.findByRole_NameIgnoreCase("admin")) {
            notificationService.createAndSendNotification(
                    adminUser, developer, NotificationType.SELLER_RESPONSE,
                    "Developer " + actionStr + " cho game '" + game.getTitle() + "': " + rejectionReason,
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
                .updatedAt(contract.getUpdatedAt())
                .previousOfferSnapshot(contract.getPreviousOfferSnapshot())
                .build();
    }

    /**
     * Snapshot tối giản các field admin thường sửa qua lại (loại hợp đồng,
     * giá/%) — KHÔNG bao gồm chữ ký/thông tin định danh, vì mục đích chỉ là
     * hiển thị "bản trước khác bản này ở đâu" cho Developer, không phải lưu
     * trữ pháp lý đầy đủ.
     */
    private String buildOfferSnapshotJson(Contract contract) {
        try {
            Map<String, Object> snapshot = new LinkedHashMap<>();
            snapshot.put("contractType", contract.getContractType() != null ? contract.getContractType().name() : null);
            snapshot.put("revenueSplit", contract.getRevenueSplit());
            snapshot.put("lumpSumAmount", contract.getLumpSumAmount());
            snapshot.put("capturedAt", Instant.now().toString());
            return objectMapper.writeValueAsString(snapshot);
        } catch (Exception e) {
            // Không để lỗi serialize chặn luồng chào hợp đồng chính — bỏ qua snapshot lần này.
            return null;
        }
    }

}
