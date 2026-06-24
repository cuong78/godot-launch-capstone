package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.service.EncryptionService;
import com.godotlaunch.backend.service.GitHubRepoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.net.URI;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class GitHubRepoServiceImpl implements GitHubRepoService {

    private final EncryptionService encryptionService;
    private final WebClient webClient;

    @Override
    public void verifyOwnership(User user, String repoUrl) {
        if (user.getGithubUsername() == null || user.getGithubTokenEnc() == null) {
            throw new AppException(ErrorCode.GITHUB_NOT_LINKED);
        }
        if (repoUrl == null || repoUrl.isBlank()) {
            throw new AppException(ErrorCode.REPO_URL_REQUIRED);
        }

        String[] ownerRepo = parseOwnerRepo(repoUrl);
        String owner = ownerRepo[0];
        String repo = ownerRepo[1];
        String token = getDecryptedToken(user);

        // Gọi GitHub API lấy metadata repo
        Map<String, Object> repoData;
        try {
            repoData = webClient.get()
                    .uri(URI.create("https://api.github.com/repos/" + owner + "/" + repo))
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/vnd.github+json")
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();
        } catch (Exception e) {
            log.warn("Không lấy được metadata repo {}/{}: {}", owner, repo, e.getMessage());
            throw new AppException(ErrorCode.REPO_NOT_FOUND);
        }

        if (repoData == null) {
            throw new AppException(ErrorCode.REPO_NOT_FOUND);
        }

        // 1. Owner phải khớp github_username của user
        @SuppressWarnings("unchecked")
        Map<String, Object> ownerObj = (Map<String, Object>) repoData.get("owner");
        String repoOwnerLogin = ownerObj != null ? (String) ownerObj.get("login") : null;
        if (repoOwnerLogin == null
                || !repoOwnerLogin.equalsIgnoreCase(user.getGithubUsername())) {
            throw new AppException(ErrorCode.REPO_OWNER_MISMATCH);
        }

        // 2. Không chấp nhận fork
        if (Boolean.TRUE.equals(repoData.get("fork"))) {
            throw new AppException(ErrorCode.REPO_IS_FORK);
        }
    }

    @Override
    public String getDecryptedToken(User user) {
        if (user.getGithubTokenEnc() == null) {
            return null;
        }
        return encryptionService.decrypt(user.getGithubTokenEnc());
    }

    /** Parse "https://github.com/owner/repo(.git)" → [owner, repo]. */
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
