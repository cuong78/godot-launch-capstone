package com.godotlaunch.backend.config;

import com.godotlaunch.backend.dto.response.SourceProcessResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Gọi Python source-processing service: clone repo → virus scan → snapshot.
 * Cùng service với face/ocr (port 8001), endpoint /source/process.
 */
@Component
@Slf4j
public class SourceProcessingClient {

    @Value("${app.face-service.url:http://localhost:8001}")
    private String serviceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Clone + scan + snapshot repo.
     * @param token OAuth token developer (null nếu public repo)
     * @throws SourceProcessingException nếu clone fail / repo lỗi
     */
    public SourceProcessResult process(String repoUrl, String token, String branch) {
        String url = serviceUrl + "/source/process";

        Map<String, Object> body = new HashMap<>();
        body.put("repoUrl", repoUrl);
        if (token != null) body.put("token", token);
        if (branch != null && !branch.isBlank()) body.put("branch", branch);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            SourceProcessResult result = restTemplate.postForObject(
                    url, new HttpEntity<>(body, headers), SourceProcessResult.class);
            if (result == null) {
                throw new SourceProcessingException("Source service trả về response rỗng.");
            }
            return result;
        } catch (HttpClientErrorException e) {
            // 400/422: URL không hợp lệ, repo quá lớn, clone fail
            String detail = extractDetail(e.getResponseBodyAsString());
            log.warn("Source processing lỗi cho repo {}: {}", repoUrl, detail);
            throw new SourceProcessingException(detail);
        } catch (Exception e) {
            log.error("Không gọi được source-processing service", e);
            throw new SourceProcessingException("Không kết nối được dịch vụ xử lý source. Vui lòng thử lại.");
        }
    }

    private String extractDetail(String body) {
        try {
            if (body != null && body.contains("\"detail\":\"")) {
                int start = body.indexOf("\"detail\":\"") + 10;
                int end = body.indexOf("\"", start);
                if (start > 9 && end > start) return body.substring(start, end);
            }
        } catch (Exception ignored) {}
        return "Xử lý source code thất bại.";
    }

    /** Lỗi xử lý source — phân biệt với lỗi hệ thống khác. */
    public static class SourceProcessingException extends RuntimeException {
        public SourceProcessingException(String message) {
            super(message);
        }
    }
}
