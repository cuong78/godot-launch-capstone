package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.GitHubLoginRequest;
import com.godotlaunch.backend.dto.request.GoogleLoginRequest;
import com.godotlaunch.backend.dto.request.SignInRequest;
import com.godotlaunch.backend.dto.request.SignUpRequest;
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

    @Value("${app.security.oauth.google.client-id:}")
    private String googleClientId;

    @Value("${app.security.oauth.github.client-id:}")
    private String githubClientId;

    @Value("${app.security.oauth.github.client-secret:}")
    private String githubClientSecret;

    @Override
    @Transactional
    public UserResponse signUp(SignUpRequest request) {
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new AppException(ErrorCode.PASSWORDS_DO_NOT_MATCH);
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.DUPLICATE_EMAIL);
        }

        Role role = roleRepository.findByName("player")
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setStatus("active");
        user.setRole(role);

        User savedUser = userRepository.save(user);

        return mapToUserResponse(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public JwtAuthenticationResponse signIn(SignInRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_CREDENTIALS));

        if ("banned".equalsIgnoreCase(user.getStatus())) {
            throw new AppException(ErrorCode.USER_BANNED);
        }
        if ("inactive".equalsIgnoreCase(user.getStatus())) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }

        String token = jwtProvider.generateToken(user.getEmail(), user.getId(), user.getRole().getName());

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
                Role playerRole = roleRepository.findByName("player")
                        .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));

                User newUser = new User();
                newUser.setEmail(email);
                newUser.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
                newUser.setFullName(fullName != null ? fullName : email.split("@")[0]);
                newUser.setAvatarUrl(picture);
                newUser.setStatus("active");
                newUser.setRole(playerRole);
                return userRepository.save(newUser);
            });

            if ("banned".equalsIgnoreCase(user.getStatus())) {
                throw new AppException(ErrorCode.USER_BANNED);
            }
            if ("inactive".equalsIgnoreCase(user.getStatus())) {
                throw new AppException(ErrorCode.INVALID_CREDENTIALS);
            }

            String token = jwtProvider.generateToken(user.getEmail(), user.getId(), user.getRole().getName());
            return JwtAuthenticationResponse.builder()
                    .token(token)
                    .user(mapToUserResponse(user))
                    .build();

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
            User user = userRepository.findByGithubId(githubId)
                    .orElseGet(() -> {
                        User userByEmail = userRepository.findByEmail(finalEmail)
                                .orElseGet(() -> {
                                    Role playerRole = roleRepository.findByName("player")
                                            .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));

                                    User newUser = new User();
                                    newUser.setEmail(finalEmail);
                                    newUser.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
                                    newUser.setFullName(fullName != null ? fullName : githubUsername);
                                    newUser.setAvatarUrl(avatarUrl);
                                    newUser.setStatus("active");
                                    newUser.setRole(playerRole);
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
                throw new AppException(ErrorCode.USER_BANNED);
            }
            if ("inactive".equalsIgnoreCase(savedUser.getStatus())) {
                throw new AppException(ErrorCode.INVALID_CREDENTIALS);
            }

            String token = jwtProvider.generateToken(savedUser.getEmail(), savedUser.getId(), savedUser.getRole().getName());
            return JwtAuthenticationResponse.builder()
                    .token(token)
                    .user(mapToUserResponse(savedUser))
                    .build();

        } catch (AppException ae) {
            throw ae;
        } catch (Exception e) {
            log.error("Exception during GitHub Authentication", e);
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }
    }

    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getEmail())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .roleName(user.getRole().getName())
                .status(user.getStatus())
                .build();
    }
}
