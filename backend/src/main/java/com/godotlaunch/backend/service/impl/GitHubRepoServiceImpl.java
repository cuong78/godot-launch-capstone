package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.config.GitHubOAuthConfig;
import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.service.GitHubRepoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class GitHubRepoServiceImpl implements GitHubRepoService {

    private final GitHubOAuthConfig githubConfig;
    private final WebClient webClient;

    @Override
    public void verifyOwnership(User user, String repoUrl) {
        if (user.getGithubUsername() == null) {
            throw new AppException(ErrorCode.GITHUB_NOT_LINKED);
        }
        if (repoUrl == null || repoUrl.isBlank()) {
            throw new AppException(ErrorCode.REPO_URL_REQUIRED);
        }

        String[] ownerRepo = parseOwnerRepo(repoUrl);
        String urlOwner = ownerRepo[0];

        // TẦNG 1 — so owner trong URL với github_username (KHÔNG cần API).
        // Chặn ngay user A submit repo của user B, KỂ CẢ repo private chưa cấp quyền bot.
        // Đây là check QUAN TRỌNG NHẤT về chống đánh cắp — chạy TRƯỚC mọi thứ.
        if (!urlOwner.equalsIgnoreCase(user.getGithubUsername())) {
            throw new AppException(ErrorCode.REPO_OWNER_MISMATCH);
        }

        // TẦNG 2 — verify qua GitHub API (chỉ khi đọc được metadata: public / bot có quyền).
        // Private chưa cấp quyền → API 404 → bỏ qua tầng này (tầng 1 đã chặn owner sai rồi).
        Map<String, Object> repoData = fetchRepoMetadata(urlOwner, ownerRepo[1]);
        if (repoData != null) {
            @SuppressWarnings("unchecked")
            Map<String, Object> ownerObj = (Map<String, Object>) repoData.get("owner");
            String repoOwnerLogin = ownerObj != null ? (String) ownerObj.get("login") : null;
            // double-check owner thật từ API (phòng URL bị giả mạo redirect)
            if (repoOwnerLogin != null
                    && !repoOwnerLogin.equalsIgnoreCase(user.getGithubUsername())) {
                throw new AppException(ErrorCode.REPO_OWNER_MISMATCH);
            }
            // Không chấp nhận fork
            if (Boolean.TRUE.equals(repoData.get("fork"))) {
                throw new AppException(ErrorCode.REPO_IS_FORK);
            }
        }
    }

    @Override
    public RepoAccess checkAccess(String repoUrl) {
        String[] ownerRepo = parseOwnerRepo(repoUrl);
        Map<String, Object> repoData = fetchRepoMetadata(ownerRepo[0], ownerRepo[1]);
        if (repoData != null) {
            // Fetch được metadata → public, hoặc private mà bot đã có quyền
            boolean isPrivate = Boolean.TRUE.equals(repoData.get("private"));
            return isPrivate ? RepoAccess.PRIVATE_GRANTED : RepoAccess.PUBLIC;
        }
        // Fallback khi GitHub REST API bị rate-limit / lỗi tạm thời:
        // repo page public vẫn truy cập được trực tiếp qua github.com/{owner}/{repo}.
        if (isPublicRepoPageAccessible(ownerRepo[0], ownerRepo[1])) {
            return RepoAccess.PUBLIC;
        }
        // Không fetch được (404). GitHub trả 404 cho CẢ "repo không tồn tại" lẫn
        // "private mà bot chưa có quyền". Thử fetch lại KHÔNG token để phân biệt:
        Map<String, Object> publicData = fetchRepoMetadataNoAuth(ownerRepo[0], ownerRepo[1]);
        if (publicData != null) {
            // Không token vẫn thấy → public (nhánh hiếm: bot token lỗi)
            return RepoAccess.PUBLIC;
        }
        // Cả có token lẫn không token đều 404 → private chưa cấp quyền, HOẶC không tồn tại.
        // Vì luồng submit đã verifyOwnership trước (owner khớp) nên coi là private chưa cấp quyền.
        return RepoAccess.PRIVATE_NO_ACCESS;
    }

    @Override
    public boolean acceptBotInvitation(String repoUrl) {
        String botToken = githubConfig.getBotToken();
        if (botToken == null || botToken.isBlank()) {
            log.warn("GITHUB_BOT_TOKEN chưa cấu hình — không thể accept invitation");
            return false;
        }
        String[] ownerRepo = parseOwnerRepo(repoUrl);
        String fullName = (ownerRepo[0] + "/" + ownerRepo[1]).toLowerCase();

        try {
            // Lấy danh sách pending invitations của bot
            List<Map<String, Object>> invitations = webClient.get()
                    .uri("https://api.github.com/user/repository_invitations")
                    .header("Authorization", "Bearer " + botToken)
                    .header("Accept", "application/vnd.github+json")
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {})
                    .block();

            if (invitations == null) return false;

            for (Map<String, Object> inv : invitations) {
                @SuppressWarnings("unchecked")
                Map<String, Object> repo = (Map<String, Object>) inv.get("repository");
                String invFullName = repo != null ? (String) repo.get("full_name") : null;
                if (invFullName != null && invFullName.equalsIgnoreCase(fullName)) {
                    Object invId = inv.get("id");
                    // Accept invitation
                    webClient.patch()
                            .uri("https://api.github.com/user/repository_invitations/" + invId)
                            .header("Authorization", "Bearer " + botToken)
                            .header("Accept", "application/vnd.github+json")
                            .retrieve()
                            .toBodilessEntity()
                            .block();
                    log.info("Bot đã accept invitation cho repo {}", fullName);
                    return true;
                }
            }
            // Không có invitation pending → có thể bot đã là collaborator rồi
            return checkAccess(repoUrl) == RepoAccess.PRIVATE_GRANTED;
        } catch (Exception e) {
            log.warn("Lỗi khi accept bot invitation cho {}: {}", fullName, e.getMessage());
            return false;
        }
    }

    @Override
    public String getCloneToken(String repoUrl) {
        RepoAccess access = checkAccess(repoUrl);
        if (access == RepoAccess.PUBLIC) {
            return null; // public — clone không cần token
        }
        // private — dùng bot token
        return githubConfig.getBotToken();
    }

    @Override
    public String getBotUsername() {
        return githubConfig.getBotUsername();
    }

    // ── helpers ──────────────────────────────────────────────

    /** Gọi GitHub API lấy metadata repo bằng BOT token (để thấy được private repo bot có quyền). */
    private Map<String, Object> fetchRepoMetadata(String owner, String repo) {
        try {
            WebClient.RequestHeadersSpec<?> req = webClient.get()
                    .uri(URI.create("https://api.github.com/repos/" + owner + "/" + repo))
                    .header("Accept", "application/vnd.github+json");
            String botToken = githubConfig.getBotToken();
            if (botToken != null && !botToken.isBlank()) {
                req = req.header("Authorization", "Bearer " + botToken);
            }
            return req.retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();
        } catch (Exception e) {
            // 404: repo private mà bot chưa có quyền, hoặc repo không tồn tại
            return null;
        }
    }

    /** Fetch metadata KHÔNG token — chỉ thấy public repo. Dùng để phân biệt public vs private. */
    private Map<String, Object> fetchRepoMetadataNoAuth(String owner, String repo) {
        try {
            return webClient.get()
                    .uri(URI.create("https://api.github.com/repos/" + owner + "/" + repo))
                    .header("Accept", "application/vnd.github+json")
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Fallback nhẹ để nhận diện public repo khi GitHub REST API bị rate-limit.
     * Repo private / repo không tồn tại đều không truy cập được bằng anonymous browser request.
     */
    private boolean isPublicRepoPageAccessible(String owner, String repo) {
        try {
            return Boolean.TRUE.equals(
                    webClient.get()
                            .uri(URI.create("https://github.com/" + owner + "/" + repo))
                            .exchangeToMono(response -> Mono.just(response.statusCode().is2xxSuccessful()))
                            .block()
            );
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public java.util.Map<String, Object> getRepoMetadata(String repoUrl) {
        if (repoUrl == null || repoUrl.isBlank()) return null;
        try {
            String[] ownerRepo = parseOwnerRepo(repoUrl);
            java.util.Map<String, Object> data = fetchRepoMetadata(ownerRepo[0], ownerRepo[1]);
            if (data == null) {
                data = fetchRepoMetadataNoAuth(ownerRepo[0], ownerRepo[1]);
            }
            return data;
        } catch (Exception e) {
            log.warn("Không thể fetch metadata cho repo {}: {}", repoUrl, e.getMessage());
            return null;
        }
    }

    private String[] parseOwnerRepo(String repoUrl) {
        try {
            URI uri = URI.create(repoUrl.trim().replaceAll("/$", ""));
            if (uri.getHost() == null || !uri.getHost().contains("github.com")) {
                throw new AppException(ErrorCode.REPO_URL_REQUIRED);
            }
            String[] parts = uri.getPath().replaceAll("^/", "").split("/");
            if (parts.length < 2) {
                throw new AppException(ErrorCode.REPO_URL_REQUIRED);
            }
            return new String[]{parts[0], parts[1].replace(".git", "")};
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.REPO_URL_REQUIRED);
        }
    }
}
