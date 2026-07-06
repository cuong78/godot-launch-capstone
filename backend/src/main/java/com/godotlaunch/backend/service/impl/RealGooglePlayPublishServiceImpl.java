package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.entity.ExternalPublish;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.GameVersion;
import com.godotlaunch.backend.entity.enums.ExtStatus;
import com.godotlaunch.backend.repository.ExternalPublishRepository;
import com.godotlaunch.backend.service.GooglePlayPublishService;
import com.google.auth.oauth2.GoogleCredentials;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.io.FileInputStream;
import java.time.Instant;
import java.util.Collections;
import java.util.Map;

/**
 * Đẩy build lên Google Play thật qua Google Play Developer API (androidpublisher).
 * Gọi thẳng REST endpoint bằng RestTemplate (không dùng generated client) — cần:
 *   - app.google-play.service-account-path: file JSON service account (Play Console)
 *   - app.google-play.package-name: package name app đã đăng ký trong Play Console
 * Trình tự (xem docs/diagram/2 push-game-sequence.puml):
 *   POST /edits → PUT /edits/{id}/bundles (upload AAB) → PUT /edits/{id}/listings → POST /edits/{id}:commit
 */
@Service
@ConditionalOnProperty(name = "app.google-play.mock", havingValue = "false")
@Slf4j
public class RealGooglePlayPublishServiceImpl implements GooglePlayPublishService {

    private static final String SCOPE = "https://www.googleapis.com/auth/androidpublisher";
    private static final String API_BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";
    private static final String UPLOAD_BASE = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications";

    private final ExternalPublishRepository externalPublishRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.google-play.service-account-path:}")
    private String serviceAccountPath;

    @Value("${app.google-play.package-name:}")
    private String packageName;

    public RealGooglePlayPublishServiceImpl(ExternalPublishRepository externalPublishRepository) {
        this.externalPublishRepository = externalPublishRepository;
    }

    @Override
    @Transactional
    public ExternalPublish publishGameToStore(GameVersion version) {
        Game game = version.getGame();
        ExternalPublish publish = new ExternalPublish();
        publish.setGame(game);
        publish.setGameVersion(version);
        publish.setStatus(ExtStatus.pending);

        try {
            String accessToken = fetchAccessToken();
            HttpHeaders authHeaders = new HttpHeaders();
            authHeaders.setBearerAuth(accessToken);
            authHeaders.setContentType(MediaType.APPLICATION_JSON);

            // 1. Tạo edit session
            Map<?, ?> editResp = restTemplate.postForObject(
                    API_BASE + "/" + packageName + "/edits",
                    new HttpEntity<>(authHeaders), Map.class);
            String editId = editResp != null ? String.valueOf(editResp.get("id")) : null;
            if (editId == null) throw new IllegalStateException("Không tạo được edit session trên Google Play");

            // 2. Upload bundle (AAB) — tải file từ storage về rồi upload lên Google Play
            HttpHeaders uploadHeaders = new HttpHeaders();
            uploadHeaders.setBearerAuth(accessToken);
            uploadHeaders.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            byte[] bundleBytes = downloadBundle(version.getFileUrl());
            restTemplate.exchange(
                    UPLOAD_BASE + "/" + packageName + "/edits/" + editId + "/bundles?uploadType=media",
                    HttpMethod.POST, new HttpEntity<>(bundleBytes, uploadHeaders), Map.class);

            // 3. Cập nhật listing (title/description) từ Game entity
            Map<String, Object> listingBody = Map.of(
                    "title", game.getTitle(),
                    "fullDescription", game.getDescription() == null ? "" : game.getDescription()
            );
            restTemplate.exchange(
                    API_BASE + "/" + packageName + "/edits/" + editId + "/listings/en-US",
                    HttpMethod.PUT, new HttpEntity<>(listingBody, authHeaders), Map.class);

            // 4. Commit edit — submit chính thức
            restTemplate.postForObject(
                    API_BASE + "/" + packageName + "/edits/" + editId + ":commit",
                    new HttpEntity<>(authHeaders), Map.class);

            publish.setStatus(ExtStatus.submitted);
            publish.setExternalAppId(packageName);
            publish.setSubmittedAt(Instant.now());
            log.info("Đã submit game {} version {} lên Google Play (package={})",
                    game.getId(), version.getVersionNumber(), packageName);
        } catch (Exception e) {
            log.error("Lỗi submit game {} lên Google Play: {}", game.getId(), e.getMessage());
            publish.setStatus(ExtStatus.rejected);
            publish.setRejectedReason("Lỗi gọi Google Play API: " + e.getMessage());
        }

        return externalPublishRepository.save(publish);
    }

    @Override
    @Transactional
    public void checkReviewStatus(ExternalPublish publish) {
        // Google Play Developer API (androidpublisher) không có endpoint kiểm tra trực tiếp
        // "review đã xong chưa" — cách đáng tin cậy nhất mà không cần thêm Reporting API là
        // kiểm tra chính trang Play Store công khai của app đã hiển thị hay chưa.
        String checkUrl = "https://play.google.com/store/apps/details?id=" + publish.getExternalAppId();
        try {
            restTemplate.getForEntity(checkUrl, String.class);
            publish.setStatus(ExtStatus.live);
            publish.setLiveAt(Instant.now());
            publish.setStoreUrl(checkUrl);
            log.info("Game {} version {} đã live trên Google Play: {}",
                    publish.getGame().getId(), publish.getGameVersion().getVersionNumber(), checkUrl);
        } catch (Exception e) {
            log.debug("Game {} vẫn đang chờ Google Play duyệt (chưa thấy trang store công khai)",
                    publish.getGame().getId());
            // vẫn "submitted" — chưa có kết quả cuối, không đổi gì
        }
    }

    private String fetchAccessToken() throws Exception {
        try (FileInputStream in = new FileInputStream(serviceAccountPath)) {
            GoogleCredentials credentials = GoogleCredentials.fromStream(in)
                    .createScoped(Collections.singleton(SCOPE));
            credentials.refreshIfExpired();
            return credentials.getAccessToken().getTokenValue();
        }
    }

    private byte[] downloadBundle(String fileUrl) {
        return restTemplate.getForObject(fileUrl, byte[].class);
    }
}
