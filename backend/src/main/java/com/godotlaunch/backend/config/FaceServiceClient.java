package com.godotlaunch.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.UUID;

@Component
@Slf4j
public class FaceServiceClient {

    @Value("${app.face-service.url:http://localhost:8001}")
    private String faceServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Kiểm tra khuôn mặt có trùng với tài khoản đã đăng ký không.
     * @return true nếu trùng (duplicate), false nếu hợp lệ
     * @throws FaceServiceException nếu không tìm thấy mặt hoặc service lỗi
     */
    public boolean isDuplicateFace(String imageBase64) {
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
            return Boolean.TRUE.equals(result.get("isDuplicate"));

        } catch (FaceServiceException e) {
            throw e;
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            // 422: không tìm thấy mặt trong ảnh
            String detail = extractDetail(e.getResponseBodyAsString());
            throw new FaceServiceException(detail);
        } catch (Exception e) {
            log.error("Face service unavailable: {}", e.getMessage());
            // Fail open: nếu service down thì vẫn cho đăng ký
            return false;
        }
    }

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
}
