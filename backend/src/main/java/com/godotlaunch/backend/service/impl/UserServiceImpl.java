package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import com.godotlaunch.backend.service.AuditLogService;
import com.godotlaunch.backend.dto.request.AdminCreateUserRequest;
import com.godotlaunch.backend.dto.request.AdminUpdateUserRequest;
import com.godotlaunch.backend.dto.request.UpdateProfileRequest;
import com.godotlaunch.backend.dto.response.GitHubStatusResponse;
import com.godotlaunch.backend.dto.response.JwtAuthenticationResponse;
import com.godotlaunch.backend.dto.response.UserResponse;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.RoleRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.security.JwtProvider;
import com.godotlaunch.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final JwtProvider jwtProvider;

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToUserResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return mapToUserResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return mapToUserResponse(user);
    }

    @Override
    @Transactional
    public UserResponse createUser(AdminCreateUserRequest request) {
        // Validate email uniqueness
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.DUPLICATE_EMAIL);
        }

        // Fetch and validate role
        Role role = roleRepository.findByName(request.getRoleName().trim().toLowerCase())
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());

        String status = request.getStatus();
        if (StringUtils.hasText(status)) {
            user.setStatus(status.trim().toLowerCase());
        } else {
            user.setStatus("active");
        }

        user.setRole(role);

        User savedUser = userRepository.save(user);
        return mapToUserResponse(savedUser);
    }

    @Override
    @Transactional
    public UserResponse updateUser(UUID id, AdminUpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        String oldRole = user.getRole().getName();
        String oldStatus = user.getStatus();
        String nextEmail = request.getEmail().trim();

        if (!user.getEmail().equalsIgnoreCase(nextEmail) && userRepository.existsByEmail(nextEmail)) {
            throw new AppException(ErrorCode.DUPLICATE_EMAIL);
        }

        // Fetch and validate role
        Role role = roleRepository.findByName(request.getRoleName().trim().toLowerCase())
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));

        user.setFullName(request.getFullName());
        user.setEmail(nextEmail);
        user.setRole(role);
        user.setStatus(request.getStatus().trim().toLowerCase());

        if (StringUtils.hasText(request.getPassword())) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        if (StringUtils.hasText(request.getAvatarUrl())) {
            user.setAvatarUrl(request.getAvatarUrl());
        }

        User updatedUser = userRepository.save(user);

        // Ghi nhận Audit Log
        if (!oldRole.equalsIgnoreCase(role.getName())) {
            auditLogService.publishAuto(
                    AuditAction.user_role_changed,
                    AuditTarget.user,
                    user.getId(),
                    oldRole,
                    role.getName(),
                    "User role changed from " + oldRole + " to " + role.getName() + " for " + user.getEmail()
            );
        }

        if (!oldStatus.equalsIgnoreCase(user.getStatus())) {
            String reasonSuffix = StringUtils.hasText(request.getBanReason())
                    ? ". Reason: " + request.getBanReason().trim()
                    : "";

            if ("inactive".equalsIgnoreCase(user.getStatus()) || "banned".equalsIgnoreCase(user.getStatus())) {
                auditLogService.publishAuto(
                        AuditAction.user_banned,
                        AuditTarget.user,
                        user.getId(),
                        oldStatus,
                        user.getStatus(),
                        "User account status changed to " + user.getStatus() + " for " + user.getEmail() + reasonSuffix
                );
            } else if ("active".equalsIgnoreCase(user.getStatus())
                    && ("inactive".equalsIgnoreCase(oldStatus) || "banned".equalsIgnoreCase(oldStatus))) {
                auditLogService.publishAuto(
                        AuditAction.user_unbanned,
                        AuditTarget.user,
                        user.getId(),
                        oldStatus,
                        user.getStatus(),
                        "User account status changed to active (unbanned) for " + user.getEmail()
                );
            }
        }

        return mapToUserResponse(updatedUser);
    }

    @Override
    @Transactional
    public void deleteUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // If already soft-deleted (status = 'inactive' and email contains '_deleted_'), do nothing
        if ("inactive".equalsIgnoreCase(user.getStatus()) && user.getEmail().contains("_deleted_")) {
            return;
        }

        String oldStatus = user.getStatus();

        // Soft delete: status = 'inactive' (to satisfy status check constraints)
        // and suffix email to free it up for future registration
        String originalEmail = user.getEmail();
        long timestamp = System.currentTimeMillis();

        user.setStatus("inactive");
        user.setEmail(originalEmail + "_deleted_" + timestamp);

        userRepository.save(user);

        // Ghi nhận Audit Log
        auditLogService.publishAuto(
                AuditAction.user_banned,
                AuditTarget.user,
                user.getId(),
                oldStatus,
                "inactive",
                "User account soft-deleted / banned. Email changed from: " + originalEmail
        );
    }

    @Override
    @Transactional
    public UserResponse updateMyProfile(String email, UpdateProfileRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        String oldAvatar = user.getAvatarUrl();
        String oldName = user.getFullName();

        user.setFullName(request.getFullName());
        user.setAvatarUrl(request.getAvatarUrl());

        if (StringUtils.hasText(request.getPassword())) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        User updatedUser = userRepository.save(user);

        // Ghi nhận Audit Log
        String note = "Cập nhật thông tin tài khoản.";
        if (oldAvatar == null && request.getAvatarUrl() != null) {
            note = "Người dùng tải lên ảnh đại diện mới.";
        } else if (oldAvatar != null && !oldAvatar.equals(request.getAvatarUrl())) {
            note = "Người dùng thay đổi ảnh đại diện.";
        }

        auditLogService.publishAuto(
                AuditAction.user_profile_updated,
                AuditTarget.user,
                user.getId(),
                oldName,
                request.getFullName(),
                note
        );

        return mapToUserResponse(updatedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> searchUsersByName(String query, String excludeEmail) {
        if (!org.springframework.util.StringUtils.hasText(query)) {
            return List.of();
        }
        return userRepository.findByFullNameContainingIgnoreCaseAndStatus(query.trim(), "active").stream()
                .filter(user -> !user.getEmail().equalsIgnoreCase(excludeEmail))
                .map(this::mapToUserResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public GitHubStatusResponse getGitHubStatus(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        return GitHubStatusResponse.builder()
                .linked(user.getGithubId() != null)
                .githubUsername(user.getGithubUsername())
                .githubLinkedAt(user.getGithubLinkedAt())
                .build();
    }

    @Override
    @Transactional
    public JwtAuthenticationResponse unlinkGitHub(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (!"developer".equalsIgnoreCase(user.getRole().getName())) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        Role customerRole = roleRepository.findByName("customer")
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
        user.setRole(customerRole);

        user.setGithubId(null);
        user.setGithubUsername(null);
        user.setGithubTokenEnc(null);
        user.setGithubLinkedAt(null);

        userRepository.save(user);

        // Generate new JWT with customer role
        String sessionSecret = UUID.randomUUID().toString();
        user.setSessionHash(JwtProvider.hashSessionSecret(sessionSecret));
        userRepository.save(user);

        String token = jwtProvider.generateToken(user.getEmail(), user.getId(), user.getRole().getName(), sessionSecret);
        return JwtAuthenticationResponse.builder()
                .token(token)
                .user(mapToUserResponse(user))
                .build();
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
                .createdAt(user.getCreatedAt())
                .build();
    }
}
