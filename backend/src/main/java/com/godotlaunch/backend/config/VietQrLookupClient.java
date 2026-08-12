package com.godotlaunch.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Optional;

/**
 * VietQR.io Account Lookup API (api.vietqr.io/v2/lookup) — tra tên chủ tài
 * khoản THẬT từ ngân hàng, dùng bin + accountNumber. Credential
 * (x-client-id/x-api-key) HOÀN TOÀN KHÁC với VietQR Host2Host (tạo QR nhận
 * tiền) đã có sẵn ở nơi khác trong hệ thống — không dùng chung.
 *
 * Fail-soft theo thiết kế: nếu chưa cấu hình credential, hoặc API lỗi/
 * timeout, trả về Optional.empty() thay vì throw — luồng setup-bank vẫn
 * phải chạy được bằng cách so khớp tên user tự nhập với KYC (lớp bảo vệ
 * chính, không đổi), lookup chỉ là lớp xác thực BỔ SUNG khi khả dụng.
 */
@Component
@Slf4j
public class VietQrLookupClient {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.vietqr.lookup.base-url:https://api.vietqr.io/v2}")
    private String baseUrl;

    @Value("${app.vietqr.lookup.client-id:}")
    private String clientId;

    @Value("${app.vietqr.lookup.api-key:}")
    private String apiKey;

    public boolean isConfigured() {
        return StringUtils.hasText(clientId) && StringUtils.hasText(apiKey);
    }

    /**
     * Trả về tên chủ tài khoản thật theo ngân hàng (bin) + số tài khoản, hoặc
     * empty nếu chưa cấu hình / API báo không hợp lệ / lỗi kết nối. Không bao
     * giờ throw ra ngoài — caller tự quyết định fallback.
     */
    public Optional<String> lookupAccountName(String bin, String accountNumber) {
        if (!isConfigured()) {
            log.debug("VietQR lookup skipped: credential not configured.");
            return Optional.empty();
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-client-id", clientId);
            headers.set("x-api-key", apiKey);

            Map<String, Object> body = Map.of(
                    "bin", Long.parseLong(bin),
                    "accountNumber", accountNumber
            );

            var response = restTemplate.exchange(
                    baseUrl + "/lookup",
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    Map.class
            );

            Map<?, ?> responseBody = response.getBody();
            if (responseBody == null) {
                return Optional.empty();
            }

            Object code = responseBody.get("code");
            if (!"00".equals(String.valueOf(code))) {
                log.info("VietQR lookup returned non-success code={} desc={}", code, responseBody.get("desc"));
                return Optional.empty();
            }

            Object data = responseBody.get("data");
            if (data instanceof Map<?, ?> dataMap) {
                Object accountName = dataMap.get("accountName");
                if (accountName instanceof String s && StringUtils.hasText(s)) {
                    return Optional.of(s.trim());
                }
            }
            return Optional.empty();
        } catch (NumberFormatException ex) {
            log.warn("VietQR lookup skipped: invalid bin '{}'.", bin);
            return Optional.empty();
        } catch (RestClientException ex) {
            log.warn("VietQR lookup failed (fail-soft, not blocking): {}", ex.getMessage());
            return Optional.empty();
        } catch (Exception ex) {
            log.warn("VietQR lookup unexpected error (fail-soft, not blocking): {}", ex.getMessage());
            return Optional.empty();
        }
    }
}
