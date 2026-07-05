package com.godotlaunch.backend.config;

import com.godotlaunch.backend.dto.response.AiReviewResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Gọi Python AI review service (port 8001), endpoint /ai/review.
 * Multimodal: clone code → rule-based + DeepSeek; frame video + ảnh → CLIP + NSFW.
 * Cùng pattern với SourceProcessingClient / FaceServiceClient.
 */
@Component
@Slf4j
public class AiReviewClient {

    @Value("${app.face-service.url:http://localhost:8001}")
    private String serviceUrl;

    private final RestTemplate restTemplate;

    public AiReviewClient() {
        // AI review nặng (clone + model inference) → timeout dài hơn các call thường
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);          // 10s kết nối
        factory.setReadTimeout(5 * 60_000);         // 5 phút đọc
        this.restTemplate = new RestTemplate(factory);
    }

    /**
     * Chạy AI review. Fail-soft ở tầng gọi: nếu service lỗi → trả null, caller bỏ qua
     * (không chặn luồng submit — AI chỉ là đề xuất phụ trợ).
     *
     * @param contentType    "code" | "asset"
     * @param repoUrl        repo để clone (code); null nếu asset
     * @param token          OAuth/bot token (private repo); null nếu public
     * @param branch         nhánh; null = default
     * @param videoUrl       URL video intro → cắt frame; null nếu không có
     * @param screenshotUrls URL các ảnh đã upload → CLIP + NSFW
     * @param tags           danh sách các tags được chọn bởi developer
     */
    public AiReviewResult review(String contentType, String repoUrl, String token, String branch,
                                 String title, String description, String category,
                                 String videoUrl, List<String> screenshotUrls, List<String> tags) {
        String url = serviceUrl + "/ai/review";

        Map<String, Object> body = new HashMap<>();
        body.put("contentType", contentType == null ? "code" : contentType);
        if (repoUrl != null) body.put("repoUrl", repoUrl);
        if (token != null) body.put("token", token);
        if (branch != null && !branch.isBlank()) body.put("branch", branch);
        body.put("title", title == null ? "" : title);
        body.put("description", description == null ? "" : description);
        if (category != null) body.put("category", category);
        if (videoUrl != null) body.put("videoUrl", videoUrl);
        body.put("screenshotUrls", screenshotUrls == null ? List.of() : screenshotUrls);
        body.put("tags", tags == null ? List.of() : tags);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            AiReviewResult result = restTemplate.postForObject(
                    url, new HttpEntity<>(body, headers), AiReviewResult.class);
            if (result == null) {
                log.warn("AI review trả về response rỗng cho {}", title);
            }
            return result;
        } catch (Exception e) {
            log.error("Không gọi được AI review service cho '{}': {}", title, e.getMessage());
            return null;  // fail-soft — không chặn submit
        }
    }
}
