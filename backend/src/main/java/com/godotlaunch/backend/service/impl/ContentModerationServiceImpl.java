//package com.godotlaunch.backend.service.impl;
//
//import com.fasterxml.jackson.databind.ObjectMapper;
//import com.godotlaunch.backend.config.AiReviewClient;
//import com.godotlaunch.backend.entity.MediaContentFlag;
//import com.godotlaunch.backend.repository.MediaContentFlagRepository;
//import com.godotlaunch.backend.service.ContentModerationService;
//import lombok.RequiredArgsConstructor;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.scheduling.annotation.Async;
//import org.springframework.stereotype.Service;
//
//import java.util.List;
//import java.util.Map;
//import java.util.UUID;
//
///**
// * Quét NSFW tự động sau khi developer upload media.
// * Chạy async — không chặn response upload. Fail-soft toàn bộ.
// * Chỉ lưu record khi ảnh bị FLAG (nsfw_score >= threshold).
// */
//@Service
//@RequiredArgsConstructor
//@Slf4j
//public class ContentModerationServiceImpl implements ContentModerationService {
//
//    private final AiReviewClient aiReviewClient;
//    private final MediaContentFlagRepository flagRepository;
//    private final ObjectMapper objectMapper;
//
//    @Override
//    @Async
//    public void scanMediaAsync(String mediaUrl, String mediaType,
//                               String ownerType, UUID ownerId, String ownerName) {
//        if (mediaUrl == null || mediaUrl.isBlank()) return;
//
//        try {
//            Map<String, Object> result = aiReviewClient.scanNsfwByUrls(List.of(mediaUrl));
//            if (result == null) {
//                log.debug("NSFW scan bỏ qua (service down): {}", mediaUrl);
//                return;
//            }
//
//            boolean skipped = Boolean.TRUE.equals(result.get("skipped"));
//            if (skipped) {
//                log.debug("NSFW scan bị skip: {}", result.get("reason"));
//                return;
//            }
//
//            boolean flagged = Boolean.TRUE.equals(result.get("flagged"));
//            double nsfwScore = result.get("maxNsfwScore") instanceof Number n ? n.doubleValue() : 0.0;
//
//            // Chỉ lưu khi có dấu hiệu NSFW (score > 0.3 hoặc flagged)
//            if (!flagged && nsfwScore < 0.3) return;
//
//            MediaContentFlag flag = new MediaContentFlag();
//            flag.setMediaUrl(mediaUrl);
//            flag.setMediaType(mediaType);
//            flag.setOwnerType(ownerType);
//            flag.setOwnerId(ownerId);
//            flag.setOwnerName(ownerName);
//            flag.setNsfwScore(nsfwScore);
//            flag.setFlagged(flagged);
//            flag.setStatus(flagged ? "pending" : "approved");  // score thấp → auto-approve
//
//            try {
//                Object perImage = result.get("perImage");
//                if (perImage != null) {
//                    flag.setFlagDetails(objectMapper.writeValueAsString(perImage));
//                }
//            } catch (Exception ignored) {}
//
//            flagRepository.save(flag);
//            log.info("NSFW scan: {} — score={}, flagged={}, url={}",
//                    ownerType, nsfwScore, flagged, mediaUrl);
//
//        } catch (Exception e) {
//            log.warn("NSFW scan lỗi (fail-soft): {} — {}", mediaUrl, e.getMessage());
//        }
//    }
//}
