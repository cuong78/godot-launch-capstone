package com.godotlaunch.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.List;
import java.util.UUID;

@Component
@Slf4j
public class FaceServiceClient {

    @Value("${app.ai-service.url:http://localhost:8001}")
    private String faceServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Kiểm tra khuôn mặt có trùng với tài khoản đã đăng ký không.
     * @return true nếu trùng (duplicate — kể cả banned), false nếu hợp lệ
     * @throws FaceServiceException nếu không tìm thấy mặt hoặc service lỗi
     */
    public boolean isDuplicateFace(String imageBase64) {
        return checkFace(imageBase64).isDuplicate();
    }

    /**
     * Kiểm tra khuôn mặt: trùng thường (duplicate) hay trùng với danh tính đã
     * bị cấm (banned) — 2 trạng thái khác nhau, banned phải chặn cứng không
     * cho verify lại, khác với duplicate thường (báo lỗi, có thể do nhầm ảnh).
     * @throws FaceServiceException nếu không tìm thấy mặt hoặc service lỗi
     */
    public FaceCheckResult checkFace(String imageBase64) {
        try {
            String url = faceServiceUrl + "/face/check";
            Map<String, String> body = Map.of("imageBase64", imageBase64);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, HttpMethod.POST,
                new HttpEntity<>(body),
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            Map<String, Object> result = response.getBody();

            if (result == null) {
                throw new FaceServiceException("Face service trả về response rỗng.");
            }
            boolean isDuplicate = Boolean.TRUE.equals(result.get("isDuplicate"));
            boolean isBanned = Boolean.TRUE.equals(result.get("isBanned"));
            return new FaceCheckResult(isDuplicate, isBanned);

        } catch (FaceServiceException e) {
            throw e;
        } catch (HttpClientErrorException e) {
            // 422: không tìm thấy mặt trong ảnh
            String detail = extractDetail(e.getResponseBodyAsString());
            throw new FaceServiceException(detail);
        } catch (Exception e) {
            log.error("Face service unavailable: {}", e.getMessage());
            // Fail open: nếu service down thì vẫn cho đăng ký
            return new FaceCheckResult(false, false);
        }
    }

    public record FaceCheckResult(boolean isDuplicate, boolean isBanned) {}

    public FaceLivenessResult verifyLiveness(UUID userId, String challengeId,
                                             List<Map<String, Object>> frames) {
        try {
            String url = faceServiceUrl + "/face/liveness/verify";
            Map<String, Object> body = Map.of(
                    "userId", userId.toString(),
                    "challengeId", challengeId,
                    "frames", frames
            );
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.POST, new HttpEntity<>(body),
                    new ParameterizedTypeReference<Map<String, Object>>() {});
            Map<String, Object> result = response.getBody();
            if (result == null) {
                throw new FaceServiceException("AI service trả về response rỗng.");
            }
            return new FaceLivenessResult(
                    Boolean.TRUE.equals(result.get("success")),
                    Boolean.TRUE.equals(result.get("isDuplicate")),
                    Boolean.TRUE.equals(result.get("isBanned")),
                    String.valueOf(result.getOrDefault("message", ""))
            );
        } catch (FaceServiceException exception) {
            throw exception;
        } catch (HttpClientErrorException exception) {
            throw new FaceServiceException(extractDetail(exception.getResponseBodyAsString()));
        } catch (Exception exception) {
            log.error("AI service unavailable during liveness verification: {}", exception.getMessage());
            throw new FaceServiceUnavailableException("AI service unavailable.");
        }
    }

    public record FaceLivenessResult(boolean success, boolean isDuplicate,
                                     boolean isBanned, String message) {}

    /**
     * Lưu face embedding sau khi user đã được tạo thành công.
     * Fail silently nếu service down (không block signup).
     */
    public void registerFace(UUID userId, String imageBase64) {
        try {
            String url = faceServiceUrl + "/face/register";
            Map<String, String> body = Map.of(
                "userId", userId.toString(),
                "imageBase64", imageBase64
            );
            restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(body),
                new ParameterizedTypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.error("Failed to register face for user {}: {}", userId, e.getMessage());
        }
    }

    /**
     * Xóa face embedding khi user bị xóa (GDPR compliance).
     */
    public void deleteFace(UUID userId) {
        try {
            String url = faceServiceUrl + "/face/" + userId;
            restTemplate.delete(url);
        } catch (Exception e) {
            log.error("Failed to delete face for user {}: {}", userId, e.getMessage());
        }
    }

    /**
     * Copy face embedding hiện có của user sang banned_identities khi ban.
     * Fail-soft: không throw để không chặn luồng resolve dispute nếu
     * face-service down (embedding gốc vẫn còn, có thể ban lại thủ công sau).
     */
    public void banFace(UUID userId, String reason) {
        try {
            String url = faceServiceUrl + "/face/ban/" + userId;
            Map<String, String> body = Map.of("reason", reason);
            restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(body),
                new ParameterizedTypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.error("Failed to ban face for user {}: {}", userId, e.getMessage());
        }
    }

    private String extractDetail(String body) {
        try {
            if (body != null && body.contains("detail")) {
                int start = body.indexOf("\"detail\":\"") + 10;
                int end = body.indexOf("\"", start);
                if (start > 9 && end > start) return body.substring(start, end);
            }
        } catch (Exception ignored) {}
        return "Không thể xác thực khuôn mặt. Vui lòng thử lại.";
    }

    public static class FaceServiceException extends RuntimeException {
        public FaceServiceException(String message) {
            super(message);
        }
    }

    public static class FaceServiceUnavailableException extends FaceServiceException {
        public FaceServiceUnavailableException(String message) {
            super(message);
        }
    }
}
