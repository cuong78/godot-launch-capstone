package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.SignInRequest;
import com.godotlaunch.backend.dto.request.SignUpRequest;
import com.godotlaunch.backend.dto.response.JwtAuthenticationResponse;
import com.godotlaunch.backend.dto.response.UserResponse;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.RoleRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.security.JwtProvider;
import com.godotlaunch.backend.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final AuthenticationManager authenticationManager;

    @Override
    @Transactional
    public UserResponse signUp(SignUpRequest request) {
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new AppException(ErrorCode.PASSWORDS_DO_NOT_MATCH);
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.DUPLICATE_EMAIL);
        }

        String requestedRole = request.getRoleName() != null ? request.getRoleName().trim().toLowerCase() : "player";
        if ("admin".equals(requestedRole)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        Role role = roleRepository.findByName(requestedRole)
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
        // Authenticate credentials using AuthenticationManager
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
