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
 * banklookup.net Account Lookup API — tra tên chủ tài khoản THẬT từ ngân
 * hàng, dùng mã "code" ngân hàng (vd "VCB", "MB" — xem
 * https://api.banklookup.net/bank/list, khác BIN NAPAS) + số tài khoản.
 * Credential (x-api-key/x-api-secret) hoàn toàn khác VietQR Host2Host (tạo QR
 * nhận tiền) đã có sẵn ở nơi khác trong hệ thống — không dùng chung.
 *
 * Đổi từ VietQR.io (api.vietqr.io/v2/lookup) sang banklookup.net vì gói Free
 * của VietQR.io ngừng hỗ trợ Account Lookup từ 20/08/2024 (API trả
 * code=47 "The Free Plan will no longer support...").
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

    @Value("${app.vietqr.lookup.base-url:https://api.banklookup.net}")
    private String baseUrl;

    @Value("${app.vietqr.lookup.client-id:}")
    private String apiKey;

    @Value("${app.vietqr.lookup.api-key:}")
    private String apiSecret;

    public boolean isConfigured() {
        return StringUtils.hasText(apiKey) && StringUtils.hasText(apiSecret);
    }

    /**
     * Trả về tên chủ tài khoản thật theo mã ngân hàng (banklookup.net "code",
     * KHÔNG phải BIN — xem {@link com.godotlaunch.backend.util.BankBinResolver#resolveLookupCode})
     * + số tài khoản, hoặc empty nếu chưa cấu hình / API báo không hợp lệ /
     * lỗi kết nối. Không bao giờ throw ra ngoài — caller tự quyết định
     * fallback.
     */
    public Optional<String> lookupAccountName(String bankCode, String accountNumber) {
        if (!isConfigured()) {
            log.debug("Bank account lookup skipped: credential not configured.");
            return Optional.empty();
        }
        if (!StringUtils.hasText(bankCode)) {
            log.debug("Bank account lookup skipped: bank code not resolved.");
            return Optional.empty();
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-api-key", apiKey);
            headers.set("x-api-secret", apiSecret);

            Map<String, Object> body = Map.of(
                    "bank", bankCode,
                    "account", accountNumber
            );

            var response = restTemplate.exchange(
                    baseUrl,
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    Map.class
            );

            Map<?, ?> responseBody = response.getBody();
            if (responseBody == null) {
                return Optional.empty();
            }

            // banklookup.net trả {"code":200,"success":true,"data":{...},"msg":"..."}
            // (đối chiếu theo response mẫu của /bank/list — cùng nhà cung cấp).
            Object success = responseBody.get("success");
            boolean isSuccess = Boolean.TRUE.equals(success)
                    || "200".equals(String.valueOf(responseBody.get("code")));
            if (!isSuccess) {
                log.info("Bank account lookup returned non-success code={} msg={}",
                        responseBody.get("code"), responseBody.get("msg"));
                return Optional.empty();
            }

            Optional<String> accountName = extractAccountName(responseBody.get("data"));
            if (accountName.isEmpty()) {
                log.info("Bank account lookup succeeded but no account name field found. Raw response: {}", responseBody);
            }
            return accountName;
        } catch (RestClientException ex) {
            log.warn("Bank account lookup failed (fail-soft, not blocking): {}", ex.getMessage());
            return Optional.empty();
        } catch (Exception ex) {
            log.warn("Bank account lookup unexpected error (fail-soft, not blocking): {}", ex.getMessage());
            return Optional.empty();
        }
    }

    // Response thật của endpoint lookup chưa được xác nhận bằng tài liệu chính
    // thức (banklookup.net không public docs chi tiết) — thử nhiều tên field
    // phổ biến để không vỡ khi provider dùng snake_case hay tên khác.
    private Optional<String> extractAccountName(Object data) {
        if (!(data instanceof Map<?, ?> dataMap)) {
            return Optional.empty();
        }
        for (String key : new String[]{"accountName", "account_name", "name", "ownerName", "owner_name"}) {
            Object value = dataMap.get(key);
            if (value instanceof String s && StringUtils.hasText(s)) {
                return Optional.of(s.trim());
            }
        }
        return Optional.empty();
    }
}
