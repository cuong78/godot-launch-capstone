package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.GitHubLoginRequest;
import com.godotlaunch.backend.dto.request.GoogleLoginRequest;
import com.godotlaunch.backend.dto.request.SignInRequest;
import com.godotlaunch.backend.dto.request.SignUpRequest;
import com.godotlaunch.backend.dto.request.ForgotPasswordRequest;
import com.godotlaunch.backend.dto.request.ResetPasswordRequest;
import com.godotlaunch.backend.dto.request.SignupOtpRequest;
import com.godotlaunch.backend.dto.request.VerifyOtpRequest;
import com.godotlaunch.backend.dto.response.JwtAuthenticationResponse;
import com.godotlaunch.backend.dto.response.UserResponse;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.RoleRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.security.EncryptionUtils;
import com.godotlaunch.backend.security.JwtProvider;
import com.godotlaunch.backend.service.AuthService;
import com.godotlaunch.backend.service.OtpService;
import com.godotlaunch.backend.service.EmailService;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import com.godotlaunch.backend.entity.enums.ActorRole;
import com.godotlaunch.backend.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final AuthenticationManager authenticationManager;
    private final EncryptionUtils encryptionUtils;
    private final OtpService otpService;
    private final EmailService emailService;
    private final AuditLogService auditLogService;
    private final HttpServletRequest httpServletRequest;

    @Value("${app.security.oauth.google.client-id:}")
    private String googleClientId;

    @Value("${app.security.oauth.github.client-id:}")
    private String githubClientId;

    @Value("${app.security.oauth.github.client-secret:}")
    private String githubClientSecret;

    @Value("${app.security.recaptcha.secret-key:}")
    private String recaptchaSecretKey;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Override
    @Transactional
    public UserResponse signUp(SignUpRequest request) {
        verifyRecaptcha(request.getRecaptchaToken());

        boolean isOtpValid = otpService.validateOtp(request.getEmail(), request.getOtp());
        if (!isOtpValid) {
            throw new AppException(ErrorCode.INVALID_OTP);
        }

        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new AppException(ErrorCode.PASSWORDS_DO_NOT_MATCH);
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.DUPLICATE_EMAIL);
        }

        Role role = roleRepository.findByName("customer")
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setAvatarUrl(request.getAvatarUrl());
        user.setStatus("active");
        user.setRole(role);

        User savedUser = userRepository.save(user);

        otpService.invalidateOtp(request.getEmail());

        auditLogService.publish(
                savedUser.getId(),
                ActorRole.customer,
                AuditAction.user_registered,
                AuditTarget.user,
                savedUser.getId(),
                null,
                null,
                "User registered successfully: " + savedUser.getEmail(),
                getClientIp()
        );

        return mapToUserResponse(savedUser);
    }

    @Override
    @Transactional
    public JwtAuthenticationResponse signIn(SignInRequest request) {
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (Exception e) {
            User user = userRepository.findByEmail(request.getEmail()).orElse(null);
            UUID actorId = user != null ? user.getId() : null;
            ActorRole role = user != null ? mapToActorRole(user.getRole().getName()) : ActorRole.customer;

            auditLogService.publish(
                    actorId,
                    role,
                    AuditAction.user_login_failed,
                    AuditTarget.user,
                    actorId,
                    null,
                    null,
                    "Login failed: Invalid credentials for email: " + request.getEmail(),
                    getClientIp()
            );
            throw e;
        }

        SecurityContextHolder.getContext().setAuthentication(authentication);

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_CREDENTIALS));

        if ("banned".equalsIgnoreCase(user.getStatus())) {
            auditLogService.publish(
                    user.getId(),
                    mapToActorRole(user.getRole().getName()),
                    AuditAction.user_login_failed,
                    AuditTarget.user,
                    user.getId(),
                    null,
                    null,
                    "Login failed: User is banned. Email: " + user.getEmail(),
                    getClientIp()
            );
            throw new AppException(ErrorCode.USER_BANNED);
        }
        if ("inactive".equalsIgnoreCase(user.getStatus())) {
            auditLogService.publish(
                    user.getId(),
                    mapToActorRole(user.getRole().getName()),
                    AuditAction.user_login_failed,
                    AuditTarget.user,
                    user.getId(),
                    null,
                    null,
                    "Login failed: User is inactive. Email: " + user.getEmail(),
                    getClientIp()
            );
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }

        auditLogService.publish(
                user.getId(),
                mapToActorRole(user.getRole().getName()),
                AuditAction.user_login_success,
                AuditTarget.user,
                user.getId(),
                null,
                null,
                "User logged in successfully: " + user.getEmail(),
                getClientIp()
        );

        boolean rememberMe = request.getRememberMe() != null && request.getRememberMe();
        return buildSessionResponse(user, rememberMe);
    }

    /**
     * Tạo sessionSecret mới, lưu SHA-256(sessionSecret) vào DB, generate JWT.
     * Mỗi lần login → session mới → token cũ bị revoke tự động.
     */
    private JwtAuthenticationResponse buildSessionResponse(User user) {
        return buildSessionResponse(user, false);
    }

    @Override
    @Transactional
    public String refreshSession(User user) {
        return buildSessionResponse(user, false).getToken();
    }

    private JwtAuthenticationResponse buildSessionResponse(User user, boolean rememberMe) {
        String sessionSecret = UUID.randomUUID().toString();
        user.setSessionHash(JwtProvider.hashSessionSecret(sessionSecret));
        userRepository.save(user);

        String token = jwtProvider.generateToken(user.getEmail(), user.getId(), user.getRole().getName(), sessionSecret, rememberMe);
        return JwtAuthenticationResponse.builder()
                .token(token)
                .user(mapToUserResponse(user))
                .build();
    }

    @Override
    @Transactional
    public JwtAuthenticationResponse loginWithGoogle(GoogleLoginRequest request) {
        try {
            String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + request.getIdToken();
            RestTemplate restTemplate = new RestTemplate();
            Map<?, ?> response = restTemplate.getForObject(url, Map.class);
            
            if (response == null || response.get("error_description") != null) {
                throw new AppException(ErrorCode.INVALID_CREDENTIALS);
            }

            // Verify Google Client ID if configured
            if (StringUtils.hasText(googleClientId)) {
                String aud = (String) response.get("aud");
                if (aud == null || !aud.equals(googleClientId)) {
                    log.error("Google token audience mismatch. Expected: {}, Got: {}", googleClientId, aud);
                    throw new AppException(ErrorCode.INVALID_CREDENTIALS);
                }
            }

            String email = (String) response.get("email");
            String fullName = (String) response.get("name");
            String picture = (String) response.get("picture");

            if (email == null) {
                throw new AppException(ErrorCode.INVALID_CREDENTIALS);
            }

            User user = userRepository.findByEmail(email).orElseGet(() -> {
                Role customerRole = roleRepository.findByName("customer")
                        .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));

                User newUser = new User();
                newUser.setEmail(email);
                newUser.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
                newUser.setFullName(fullName != null ? fullName : email.split("@")[0]);
                newUser.setAvatarUrl(picture);
                newUser.setStatus("active");
                newUser.setRole(customerRole);
                return userRepository.save(newUser);
            });

            if ("banned".equalsIgnoreCase(user.getStatus())) {
                auditLogService.publish(
                        user.getId(),
                        mapToActorRole(user.getRole().getName()),
                        AuditAction.user_login_failed,
                        AuditTarget.user,
                        user.getId(),
                        null,
                        null,
                        "Google login failed: User is banned. Email: " + user.getEmail(),
                        getClientIp()
                );
                throw new AppException(ErrorCode.USER_BANNED);
            }
            if ("inactive".equalsIgnoreCase(user.getStatus())) {
                auditLogService.publish(
                        user.getId(),
                        mapToActorRole(user.getRole().getName()),
                        AuditAction.user_login_failed,
                        AuditTarget.user,
                        user.getId(),
                        null,
                        null,
                        "Google login failed: User is inactive. Email: " + user.getEmail(),
                        getClientIp()
                );
                throw new AppException(ErrorCode.INVALID_CREDENTIALS);
            }

            auditLogService.publish(
                    user.getId(),
                    mapToActorRole(user.getRole().getName()),
                    AuditAction.user_login_success,
                    AuditTarget.user,
                    user.getId(),
                    null,
                    null,
                    "User logged in successfully via Google: " + user.getEmail(),
                    getClientIp()
            );

            boolean rememberMe = request.getRememberMe() != null && request.getRememberMe();
            return buildSessionResponse(user, rememberMe);

        } catch (AppException ae) {
            throw ae;
        } catch (Exception e) {
            log.error("Exception during Google Authentication", e);
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }
    }

    @Override
    @Transactional
    public JwtAuthenticationResponse loginWithGitHub(GitHubLoginRequest request) {
        try {
            RestTemplate restTemplate = new RestTemplate();

            // 1. Exchange code for access token
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("client_id", githubClientId);
            requestBody.put("client_secret", githubClientSecret);
            requestBody.put("code", request.getCode());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

            HttpEntity<Map<String, String>> httpEntity = new HttpEntity<>(requestBody, headers);

            Map<?, ?> tokenResponse = restTemplate.postForObject(
                    "https://github.com/login/oauth/access_token",
                    httpEntity,
                    Map.class
            );

            if (tokenResponse == null || tokenResponse.get("access_token") == null) {
                log.error("GitHub access token exchange failed: {}", tokenResponse);
                throw new AppException(ErrorCode.INVALID_CREDENTIALS);
            }

            String accessToken = (String) tokenResponse.get("access_token");

            // 2. Fetch user profile
            HttpHeaders profileHeaders = new HttpHeaders();
            profileHeaders.setBearerAuth(accessToken);
            profileHeaders.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
            HttpEntity<Void> profileEntity = new HttpEntity<>(profileHeaders);

            Map<?, ?> profileResponse = restTemplate.exchange(
                    "https://api.github.com/user",
                    HttpMethod.GET,
                    profileEntity,
                    Map.class
            ).getBody();

            if (profileResponse == null || profileResponse.get("id") == null) {
                throw new AppException(ErrorCode.INVALID_CREDENTIALS);
            }

            String githubId = String.valueOf(profileResponse.get("id"));
            String githubUsername = (String) profileResponse.get("login");
            String fullName = (String) profileResponse.get("name");
            String avatarUrl = (String) profileResponse.get("avatar_url");
            String email = (String) profileResponse.get("email");

            // 3. Fallback to query primary email if private
            if (email == null) {
                try {
                    List<?> emailsResponse = restTemplate.exchange(
                            "https://api.github.com/user/emails",
                            HttpMethod.GET,
                            profileEntity,
                            List.class
                    ).getBody();

                    if (emailsResponse != null) {
                        for (Object obj : emailsResponse) {
                            if (obj instanceof Map) {
                                Map<?, ?> emailMap = (Map<?, ?>) obj;
                                Boolean primary = (Boolean) emailMap.get("primary");
                                if (primary != null && primary) {
                                    email = (String) emailMap.get("email");
                                    break;
                                }
                            }
                        }
                    }
                } catch (Exception ex) {
                    log.warn("Failed to retrieve primary email from GitHub", ex);
                }
            }

            if (email == null) {
                email = (githubUsername != null ? githubUsername : githubId) + "@users.noreply.github.com";
            }

            final String finalEmail = email;

            // 4. Find or Link User
            // Lưu ý: KHÔNG còn tự nâng role lên developer ở bước link GitHub nữa.
            // Role chỉ được nâng sau GitHub + Face Verify + KYC + payout hợp lệ,
            // xem KycController.setupBank(). User cũ đã là developer/admin từ trước
            // giữ nguyên role (không có bước hạ cấp).
            User user = userRepository.findByGithubId(githubId)
                    .orElseGet(() -> {
                        User userByEmail = userRepository.findByEmail(finalEmail)
                                .orElseGet(() -> {
                                    Role customerRole = roleRepository.findByName("customer")
                                            .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));

                                    User newUser = new User();
                                    newUser.setEmail(finalEmail);
                                    newUser.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
                                    newUser.setFullName(fullName != null ? fullName : githubUsername);
                                    newUser.setAvatarUrl(avatarUrl);
                                    newUser.setStatus("active");
                                    newUser.setRole(customerRole);
                                    return newUser;
                                });

                        userByEmail.setGithubId(githubId);
                        userByEmail.setGithubUsername(githubUsername);

                        return userByEmail;
                    });

            user.setGithubTokenEnc(encryptionUtils.encrypt(accessToken));
            user.setGithubLinkedAt(Instant.now());

            User savedUser = userRepository.save(user);

            if ("banned".equalsIgnoreCase(savedUser.getStatus())) {
                auditLogService.publish(
                        savedUser.getId(),
                        mapToActorRole(savedUser.getRole().getName()),
                        AuditAction.user_login_failed,
                        AuditTarget.user,
                        savedUser.getId(),
                        null,
                        null,
                        "GitHub login failed: User is banned. Email: " + savedUser.getEmail(),
                        getClientIp()
                );
                throw new AppException(ErrorCode.USER_BANNED);
            }
            if ("inactive".equalsIgnoreCase(savedUser.getStatus())) {
                auditLogService.publish(
                        savedUser.getId(),
                        mapToActorRole(savedUser.getRole().getName()),
                        AuditAction.user_login_failed,
                        AuditTarget.user,
                        savedUser.getId(),
                        null,
                        null,
                        "GitHub login failed: User is inactive. Email: " + savedUser.getEmail(),
                        getClientIp()
                );
                throw new AppException(ErrorCode.INVALID_CREDENTIALS);
            }

            auditLogService.publish(
                    savedUser.getId(),
                    mapToActorRole(savedUser.getRole().getName()),
                    AuditAction.user_login_success,
                    AuditTarget.user,
                    savedUser.getId(),
                    null,
                    null,
                    "User logged in successfully via GitHub: " + savedUser.getEmail(),
                    getClientIp()
            );

            boolean rememberMe = request.getRememberMe() != null && request.getRememberMe();
            return buildSessionResponse(savedUser, rememberMe);

        } catch (AppException ae) {
            throw ae;
        } catch (Exception e) {
            log.error("Exception during GitHub Authentication", e);
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }
    }

    @Override
    public void requestPasswordReset(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        String otp = otpService.generateOtp(user.getEmail());
        emailService.sendOtpEmail(user.getEmail(), otp);
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new AppException(ErrorCode.PASSWORDS_DO_NOT_MATCH);
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        boolean isOtpValid = otpService.validateOtp(user.getEmail(), request.getOtp());
        if (!isOtpValid) {
            throw new AppException(ErrorCode.INVALID_OTP);
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        otpService.invalidateOtp(user.getEmail());
    }

    @Override
    public void requestSignupOtp(SignupOtpRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.DUPLICATE_EMAIL);
        }

        String otp = otpService.generateOtp(request.getEmail());
        emailService.sendSignupOtpEmail(request.getEmail(), otp);
    }

    @Override
    public void verifySignupOtp(VerifyOtpRequest request) {
        boolean isOtpValid = otpService.validateOtp(request.getEmail(), request.getOtp());
        if (!isOtpValid) {
            throw new AppException(ErrorCode.INVALID_OTP);
        }
    }

    @Override
    @Transactional
    public void logout(String email) {
        // Xóa sessionHash → token cũ không còn match DB → bị revoke ngay
        userRepository.findByEmail(email).ifPresent(user -> {
            user.setSessionHash(null);
            userRepository.save(user);

            // Log logout event
            auditLogService.publish(
                    user.getId(),
                    mapToActorRole(user.getRole().getName()),
                    AuditAction.user_logged_out,
                    AuditTarget.user,
                    user.getId(),
                    null,
                    null,
                    "User logged out successfully: " + user.getEmail(),
                    getClientIp()
            );
        });
    }

    private void verifyRecaptcha(String token) {
        if (isLocalDevRecaptchaBypass(token)) {
            log.info("Skipping reCAPTCHA verification for local development bypass token");
            return;
        }
        if (!StringUtils.hasText(recaptchaSecretKey)) {
            log.warn("reCAPTCHA secret key not configured, skipping verification");
            return;
        }
        try {
            RestTemplate restTemplate = new RestTemplate();
            String url = "https://www.google.com/recaptcha/api/siteverify"
                    + "?secret=" + recaptchaSecretKey
                    + "&response=" + token;
            Map<?, ?> result = restTemplate.postForObject(url, null, Map.class);
            if (result == null || !Boolean.TRUE.equals(result.get("success"))) {
                throw new AppException(ErrorCode.INVALID_RECAPTCHA);
            }
        } catch (AppException ae) {
            throw ae;
        } catch (Exception e) {
            log.error("reCAPTCHA verification error", e);
            throw new AppException(ErrorCode.INVALID_RECAPTCHA);
        }
    }

    private boolean isLocalDevRecaptchaBypass(String token) {
        if (!"local-dev-bypass".equals(token)) {
            return false;
        }

        String serverName = httpServletRequest.getServerName();
        return isLocalHost(serverName) || isLocalHost(frontendUrl);
    }

    private boolean isLocalHost(String value) {
        if (!StringUtils.hasText(value)) {
            return false;
        }

        String normalized = value.toLowerCase(Locale.ROOT);
        return normalized.contains("localhost") || normalized.contains("127.0.0.1");
    }

    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getEmail())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .roleName(user.getRole().getName())
                .status(user.getStatus())
                .avatarUrl(user.getAvatarUrl())
                .preferredLanguage(StringUtils.hasText(user.getPreferredLanguage())
                         ? user.getPreferredLanguage().trim().toLowerCase(Locale.ROOT)
                         : "vi")
                .bankName(user.getBankName())
                .bankAccount(user.getBankAccount())
                .bankAccountHolder(user.getBankAccountHolder())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private String getClientIp() {
        try {
            String ip = httpServletRequest.getHeader("X-Forwarded-For");
            if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                ip = httpServletRequest.getHeader("Proxy-Client-IP");
            }
            if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                ip = httpServletRequest.getRemoteAddr();
            }
            if (ip != null && ip.contains(",")) {
                ip = ip.split(",")[0].trim();
            }
            return ip;
        } catch (Exception e) {
            return null;
        }
    }

    private ActorRole mapToActorRole(String roleName) {
        if (roleName == null) return ActorRole.customer;
        switch (roleName.trim().toLowerCase()) {
            case "admin":
                return ActorRole.admin;
            case "developer":
                return ActorRole.developer;
            case "customer":
            default:
                return ActorRole.customer;
        }
    }
}
