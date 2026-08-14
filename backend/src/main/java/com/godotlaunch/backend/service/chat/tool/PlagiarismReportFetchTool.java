package com.godotlaunch.backend.service.chat.tool;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.PlagiarismFlag;
import com.godotlaunch.backend.entity.SourceSnapshot;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.PlagiarismFlagRepository;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class PlagiarismReportFetchTool {

    private final GameRepository gameRepository;
    private final SourceSnapshotRepository sourceSnapshotRepository;
    private final PlagiarismFlagRepository plagiarismFlagRepository;
    private final ObjectMapper objectMapper;

    public String fetchPlagiarismReport(String gameIdStr, String userId, String roleName) {
        try {
            UUID gameId = UUID.fromString(gameIdStr);
            Game game = gameRepository.findById(gameId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm với ID: " + gameIdStr));

            // Kiểm tra phân quyền truy cập game
            boolean isAdmin = "admin".equalsIgnoreCase(roleName) || "ROLE_ADMIN".equalsIgnoreCase(roleName);
            if (!isAdmin && (game.getCreator() == null || !game.getCreator().getId().toString().equals(userId))) {
                return "{\"error\": \"Bạn không có quyền truy cập báo cáo đạo văn của sản phẩm này.\"}";
            }

            Optional<SourceSnapshot> latestSnapshotOpt = sourceSnapshotRepository.findFirstByGameIdOrderByCreatedAtDesc(game.getId());
            if (latestSnapshotOpt.isEmpty()) {
                return "{\"message\": \"Sản phẩm chưa từng qua quét kiểm tra mã nguồn (Chưa có Source Snapshot).\"}";
            }

            SourceSnapshot latestSnapshot = latestSnapshotOpt.get();
            List<PlagiarismFlag> flags = plagiarismFlagRepository.findBySourceSnapshotIdOrderBySimilarityScoreDesc(latestSnapshot.getId());

            Map<String, Object> report = new HashMap<>();
            report.put("gameId", game.getId().toString());
            report.put("gameTitle", game.getTitle());
            report.put("snapshotId", latestSnapshot.getId().toString());
            report.put("totalFlagsDetected", flags.size());

            if (flags.isEmpty()) {
                report.put("status", "CLEAN");
                report.put("summary", "Mã nguồn sạch, không phát hiện vi phạm bản quyền hay trùng lặp code với bất kỳ dự án nào trên sàn.");
            } else {
                double maxSimilarity = flags.stream().mapToDouble(PlagiarismFlag::getSimilarityScore).max().orElse(0.0);
                report.put("maxSimilarityScorePercent", Math.round(maxSimilarity * 100.0) / 100.0);
                report.put("status", maxSimilarity >= 0.85 ? "HIGH_RISK_PLAGIARISM" : "SUSPICIOUS_SIMILARITY");

                List<Map<String, Object>> flagDetails = flags.stream().map(flag -> {
                    Map<String, Object> detail = new HashMap<>();
                    detail.put("flagId", flag.getId().toString());
                    detail.put("similarityScorePercent", Math.round(flag.getSimilarityScore() * 100.0) / 100.0);
                    detail.put("matchedGameTitle", flag.getMatchedGame() != null ? flag.getMatchedGame().getTitle() : "N/A");
                    detail.put("matchedGameId", flag.getMatchedGame() != null ? flag.getMatchedGame().getId().toString() : null);
                    detail.put("sourceModelName", flag.getCodeEmbedding() != null ? flag.getCodeEmbedding().getModelName() : "N/A");
                    detail.put("matchedModelName", flag.getMatchedCodeEmbedding() != null ? flag.getMatchedCodeEmbedding().getModelName() : "N/A");
                    detail.put("reviewedByAdmin", flag.isReviewedByAdmin());
                    return detail;
                }).collect(Collectors.toList());

                report.put("detectedFlags", flagDetails);
            }

            log.info("Lấy thành công báo cáo đạo văn cho gameId {}. Total flags: {}", gameIdStr, flags.size());
            return objectMapper.writeValueAsString(report);

        } catch (Exception e) {
            log.error("Lỗi khi đọc báo cáo đạo văn gameId {}: {}", gameIdStr, e.getMessage());
            return "{\"error\": \"Lỗi truy xuất báo cáo đạo văn: " + e.getMessage().replace("\"", "'") + "\"}";
        }
    }
}
