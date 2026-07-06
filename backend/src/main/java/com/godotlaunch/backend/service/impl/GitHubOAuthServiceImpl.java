package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.config.GitHubOAuthConfig;
import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.response.GitHubTokenResponse;
import com.godotlaunch.backend.dto.response.GitHubUserProfile;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.RoleRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.security.JwtProvider;
import com.godotlaunch.backend.service.EncryptionService;
import com.godotlaunch.backend.service.GitHubOAuthService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GitHubOAuthServiceImpl implements GitHubOAuthService {

    private final GitHubOAuthConfig githubConfig;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final JwtProvider jwtProvider;
    private final EncryptionService encryptionService;
    private final WebClient webClient;
    private final PasswordEncoder passwordEncoder;

    @Override
    public String buildAuthorizationUrl(HttpSession session) {
        String state = UUID.randomUUID().toString();
        session.setAttribute("github_oauth_state", state);
        // scope user:email — KHÔNG xin 'repo' (token rộng).
        // Private repo dùng mô hình bot: user mời godotlaunch-bot → bot clone.
        String redirectUri = githubConfig.getRedirectUri() != null
                ? githubConfig.getRedirectUri()
                : "http://localhost:8080/api/v1/auth/github/callback";
        return "https://github.com/login/oauth/authorize"
                + "?client_id=" + githubConfig.getClientId()
                + "&scope=user:email"
                + "&state=" + state
                + "&redirect_uri=" + redirectUri
                + "&prompt=select_account";
    }

    @Override
    @Transactional
    public String handleCallback(String code, String state, HttpSession session) {
        String storedState = (String) session.getAttribute("github_oauth_state");
        if (storedState == null || !storedState.equals(state)) {
            throw new AppException(ErrorCode.GITHUB_AUTH_FAILED);
        }
        session.removeAttribute("github_oauth_state");

        if (code == null || code.trim().isEmpty()) {
            throw new AppException(ErrorCode.GITHUB_TOKEN_EXCHANGE_FAILED);
        }

        // Step 1: Exchange code for access token
        GitHubTokenResponse tokenResponse;
        try {
            tokenResponse = webClient.post()
                    .uri("https://github.com/login/oauth/access_token")
                    .header("Accept", "application/json")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of(
                            "client_id", githubConfig.getClientId(),
                            "client_secret", githubConfig.getClientSecret(),
                            "code", code
                    ))
                    .retrieve()
                    .bodyToMono(GitHubTokenResponse.class)
                    .block();
        } catch (Exception e) {
            throw new AppException(ErrorCode.GITHUB_TOKEN_EXCHANGE_FAILED);
        }

        if (tokenResponse == null || tokenResponse.getAccessToken() == null) {
            throw new AppException(ErrorCode.GITHUB_TOKEN_EXCHANGE_FAILED);
        }

        String accessToken = tokenResponse.getAccessToken();

        // Step 2: Fetch GitHub user profile
        GitHubUserProfile profile;
        try {
            profile = webClient.get()
                    .uri("https://api.github.com/user")
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Accept", "application/vnd.github+json")
                    .retrieve()
                    .bodyToMono(GitHubUserProfile.class)
                    .block();
        } catch (Exception e) {
            throw new AppException(ErrorCode.GITHUB_AUTH_FAILED);
        }

        if (profile == null || profile.getId() == null) {
            throw new AppException(ErrorCode.GITHUB_AUTH_FAILED);
        }

        String encryptedToken = encryptionService.encrypt(accessToken);

        // Check if this is a Link Flow
        String linkingUserEmail = (String) session.getAttribute("github_linking_user_email");
        if (linkingUserEmail != null) {
            // STEP 1: Validate role (only customer can link/upgrade)
            User currentUser = userRepository.findByEmail(linkingUserEmail)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            if ("admin".equalsIgnoreCase(currentUser.getRole().getName())
                    || "developer".equalsIgnoreCase(currentUser.getRole().getName())) {
                throw new AppException(ErrorCode.ACCESS_DENIED);
            }

            // STEP 2: Fetch GitHub primary email (primary=true AND verified=true)
            String githubPrimaryEmail = null;
            try {
                List<Map<String, Object>> emailsList = webClient.get()
                        .uri("https://api.github.com/user/emails")
                        .header("Authorization", "Bearer " + accessToken)
                        .header("Accept", "application/vnd.github+json")
                        .retrieve()
                        .bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {})
                        .block();

                if (emailsList != null) {
                    for (Map<String, Object> emailObj : emailsList) {
                        Boolean primary = (Boolean) emailObj.get("primary");
                        Boolean verified = (Boolean) emailObj.get("verified");
                        if (Boolean.TRUE.equals(primary) && Boolean.TRUE.equals(verified)) {
                            githubPrimaryEmail = (String) emailObj.get("email");
                            break;
                        }
                    }
                }
            } catch (Exception e) {
                throw new AppException(ErrorCode.GITHUB_EMAIL_REQUIRED);
            }

            if (githubPrimaryEmail == null || githubPrimaryEmail.trim().isEmpty()) {
                throw new AppException(ErrorCode.GITHUB_EMAIL_REQUIRED);
            }

            // STEP 3: Validate email match (case-insensitive)
            if (!githubPrimaryEmail.equalsIgnoreCase(linkingUserEmail)) {
                throw new AppException(ErrorCode.GITHUB_EMAIL_MISMATCH);
            }

            // STEP 4: Check GitHub ID not already linked to another account
            Optional<User> existingLinkedUser = userRepository.findByGithubId(profile.getId());
            if (existingLinkedUser.isPresent() && !existingLinkedUser.get().getId().equals(currentUser.getId())) {
                User oldUser = existingLinkedUser.get();
                if ("active".equalsIgnoreCase(oldUser.getStatus())) {
                    throw new AppException(ErrorCode.GITHUB_ALREADY_LINKED);
                } else {
                    // If the old account is not active (inactive/soft-deleted), we free up the github link
                    oldUser.setGithubId(null);
                    oldUser.setGithubUsername(null);
                    oldUser.setGithubTokenEnc(null);
                    oldUser.setGithubLinkedAt(null);
                    userRepository.saveAndFlush(oldUser);
                }
            }

            // STEP 5: Update current user
            // Lưu ý: KHÔNG còn tự nâng role lên developer ở đây nữa — role chỉ được
            // nâng khi đủ cả 3 điều kiện (GitHub + Face Verify + KYC), xem
            // KycController.confirmKyc(). Role vẫn là customer sau bước link này
            // (prepareLinkSession() ở trên đã đảm bảo chỉ customer mới gọi tới đây).
            currentUser.setGithubId(profile.getId());
            currentUser.setGithubUsername(profile.getLogin());
            currentUser.setGithubTokenEnc(encryptedToken);
            currentUser.setGithubLinkedAt(Instant.now());

            userRepository.save(currentUser);

            // STEP 6: Clear session
            session.removeAttribute("github_linking_user_email");

            // STEP 7: Issue new JWT with role=developer
            String sessionSecret = UUID.randomUUID().toString();
            currentUser.setSessionHash(JwtProvider.hashSessionSecret(sessionSecret));
            userRepository.save(currentUser);
            return jwtProvider.generateToken(currentUser.getEmail(), currentUser.getId(), currentUser.getRole().getName(), sessionSecret);
        }

        // Fetch emails list fallback if profile email is not public
        String email = profile.getEmail();
        if (email == null || email.trim().isEmpty()) {
            try {
                List<Map<String, Object>> emailsList = webClient.get()
                        .uri("https://api.github.com/user/emails")
                        .header("Authorization", "Bearer " + accessToken)
                        .header("Accept", "application/vnd.github+json")
                        .retrieve()
                        .bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {})
                        .block();

                if (emailsList != null) {
                    for (Map<String, Object> emailObj : emailsList) {
                        Boolean primary = (Boolean) emailObj.get("primary");
                        Boolean verified = (Boolean) emailObj.get("verified");
                        if (Boolean.TRUE.equals(primary) && Boolean.TRUE.equals(verified)) {
                            email = (String) emailObj.get("email");
                            break;
                        }
                    }
                    if (email == null || email.trim().isEmpty()) {
                        for (Map<String, Object> emailObj : emailsList) {
                            Boolean verified = (Boolean) emailObj.get("verified");
                            if (Boolean.TRUE.equals(verified)) {
                                email = (String) emailObj.get("email");
                                break;
                            }
                        }
                    }
                    if ((email == null || email.trim().isEmpty()) && !emailsList.isEmpty()) {
                        email = (String) emailsList.get(0).get("email");
                    }
                }
            } catch (Exception e) {
                // Keep email null to let it fail validation below
            }
        }

        // Step 3: Validate email
        if (email == null || email.trim().isEmpty()) {
            throw new AppException(ErrorCode.GITHUB_EMAIL_REQUIRED);
        }

        // Step 4: Upsert user
        Optional<User> userByGithub = userRepository.findByGithubId(profile.getId());
        User user;
        boolean isNewUser = false;

        // Lưu ý: KHÔNG còn tự nâng role lên developer ở các nhánh dưới đây nữa — role
        // chỉ được nâng khi đủ cả 3 điều kiện (GitHub + Face Verify + KYC), xem
        // KycController.confirmKyc(). User cũ đã là developer/admin từ trước giữ nguyên
        // role (không có bước hạ cấp); user mới/chưa nâng role thì giữ customer.
        if (userByGithub.isPresent()) {
            // CASE 1: github_id exists in DB
            user = userByGithub.get();
            user.setGithubUsername(profile.getLogin());
            user.setGithubTokenEnc(encryptedToken);
            user.setGithubLinkedAt(Instant.now());
            if ("banned".equals(user.getStatus())) {
                throw new AppException(ErrorCode.USER_BANNED);
            }
            user = userRepository.save(user);
        } else {
            Optional<User> userByEmail = userRepository.findByEmail(email);
            if (userByEmail.isPresent()) {
                // CASE 2: github_id NOT exists, but email matches existing user
                user = userByEmail.get();
                user.setGithubId(profile.getId());
                user.setGithubUsername(profile.getLogin());
                user.setGithubTokenEnc(encryptedToken);
                user.setGithubLinkedAt(Instant.now());
                if ("banned".equals(user.getStatus())) {
                    throw new AppException(ErrorCode.USER_BANNED);
                }
                user = userRepository.save(user);
            } else {
                // CASE 3: github_id NOT exists, email NOT exists -> Create new user
                user = new User();
                user.setEmail(email);
                user.setFullName(profile.getName() != null && !profile.getName().trim().isEmpty() ? profile.getName() : profile.getLogin());
                user.setAvatarUrl(profile.getAvatarUrl());
                user.setGithubId(profile.getId());
                user.setGithubUsername(profile.getLogin());
                user.setGithubTokenEnc(encryptedToken);
                user.setGithubLinkedAt(Instant.now());
                user.setStatus("active");

                String randomPassword = UUID.randomUUID().toString();
                user.setPasswordHash(passwordEncoder.encode(randomPassword));

                Role customerRole = roleRepository.findByName("customer")
                        .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
                user.setRole(customerRole);

                user = userRepository.save(user);
                isNewUser = true;
            }
        }

        // Step 5: Generate JWT với sessionSecret để hỗ trợ revoke
        String sessionSecret = UUID.randomUUID().toString();
        user.setSessionHash(JwtProvider.hashSessionSecret(sessionSecret));
        userRepository.save(user);
        return jwtProvider.generateToken(user.getEmail(), user.getId(), user.getRole().getName(), sessionSecret);
    }

    @Override
    @Transactional(readOnly = true)
    public String prepareLinkSession(String email, HttpSession session) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if ("admin".equalsIgnoreCase(user.getRole().getName()) || "developer".equalsIgnoreCase(user.getRole().getName())) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        session.setAttribute("github_linking_user_email", email);
        return "http://localhost:8080/api/v1/auth/github?action=link";
    }
}
