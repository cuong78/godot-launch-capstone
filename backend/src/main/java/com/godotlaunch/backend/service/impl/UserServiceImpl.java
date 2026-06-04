package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.AdminCreateUserRequest;
import com.godotlaunch.backend.dto.request.AdminUpdateUserRequest;
import com.godotlaunch.backend.dto.response.UserResponse;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.RoleRepository;
import com.godotlaunch.backend.repository.UserRepository;
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

        // Fetch and validate role
        Role role = roleRepository.findByName(request.getRoleName().trim().toLowerCase())
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));

        user.setFullName(request.getFullName());
        user.setRole(role);
        user.setStatus(request.getStatus().trim().toLowerCase());

        if (StringUtils.hasText(request.getPassword())) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        if (StringUtils.hasText(request.getAvatarUrl())) {
            user.setAvatarUrl(request.getAvatarUrl());
        }

        User updatedUser = userRepository.save(user);
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

        // Soft delete: status = 'inactive' (to satisfy status check constraints)
        // and suffix email to free it up for future registration
        String originalEmail = user.getEmail();
        long timestamp = System.currentTimeMillis();

        user.setStatus("inactive");
        user.setEmail(originalEmail + "_deleted_" + timestamp);

        userRepository.save(user);
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
