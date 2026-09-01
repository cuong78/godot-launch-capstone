package com.godotlaunch.backend.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Service
@Slf4j
public class GooglePlayMockClient {

    private final WebClient webClient;

    @Value("${app.google-play.mock-url:http://localhost:8082}")
    private String mockServerUrl;

    public GooglePlayMockClient(WebClient webClient) {
        this.webClient = webClient != null ? webClient : WebClient.create();
    }

    public Map<String, Object> registerApp(String packageName) {
        try {
            return webClient.post()
                    .uri(mockServerUrl + "/internal/v1/apps")
                    .bodyValue(Map.of("packageName", packageName))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception e) {
            log.error("Lỗi khi đăng ký app với Google Play Mock container: {}", e.getMessage());
            throw new RuntimeException("Không thể kết nối với Mock Google Play container: " + e.getMessage());
        }
    }

    public String fetchInstallReportCsv(String packageName, String startDate, String endDate) {
        try {
            String uri = mockServerUrl + "/internal/v1/reports/installs/" + packageName + "?startDate=" + startDate + "&endDate=" + endDate;
            return webClient.get()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
        } catch (Exception e) {
            log.error("Lỗi khi tải CSV report từ Google Play Mock container cho {} (từ {} đến {}): {}", packageName, startDate, endDate, e.getMessage());
            throw new RuntimeException("Không thể tải report CSV từ Mock container: " + e.getMessage());
        }
    }

    public String fetchInstallReportCsv(String packageName, String yyyyMM) {
        try {
            return webClient.get()
                    .uri(mockServerUrl + "/internal/v1/reports/installs/" + packageName + "/" + yyyyMM + "?dimension=overview")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
        } catch (Exception e) {
            log.error("Lỗi khi tải CSV report từ Google Play Mock container cho {}: {}", packageName, e.getMessage());
            throw new RuntimeException("Không thể tải report CSV từ Mock container: " + e.getMessage());
        }
    }

    public Map<String, Object> fetchPayoutStatement(String packageName, String periodKey) {
        return fetchPayoutStatement(packageName, periodKey, 10L, new java.math.BigDecimal("100000"));
    }

    public Map<String, Object> fetchPayoutStatement(String packageName, String periodKey, long totalInstalls, java.math.BigDecimal unitPrice) {
        try {
            java.util.Map<String, Object> body = new java.util.HashMap<>();
            body.put("packageName", packageName);
            body.put("periodKey", periodKey);
            body.put("totalInstalls", totalInstalls);
            body.put("unitPrice", unitPrice != null ? unitPrice.doubleValue() : 99000);

            return webClient.post()
                    .uri(mockServerUrl + "/internal/v1/payouts")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception e) {
            log.error("Lỗi khi lấy payout statement từ Google Play Mock container cho {}: {}", packageName, e.getMessage());
            throw new RuntimeException("Không thể lấy Payout statement từ Mock container: " + e.getMessage());
        }
    }
}
