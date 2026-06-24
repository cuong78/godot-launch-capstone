package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.response.JwtAuthenticationResponse;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.RoleRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.security.JwtProvider;
import com.godotlaunch.backend.service.AuditLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private JwtProvider jwtProvider;

    @InjectMocks
    private UserServiceImpl userService;

    private User mockUser;
    private Role developerRole;
    private Role customerRole;

    @BeforeEach
    void setUp() {
        developerRole = new Role();
        developerRole.setId(UUID.randomUUID());
        developerRole.setName("developer");
        developerRole.setDescription("Developer Role");

        customerRole = new Role();
        customerRole.setId(UUID.randomUUID());
        customerRole.setName("customer");
        customerRole.setDescription("Customer Role");

        mockUser = new User();
        mockUser.setId(UUID.randomUUID());
        mockUser.setEmail("test@example.com");
        mockUser.setFullName("Test User");
        mockUser.setRole(developerRole);
        mockUser.setGithubId("123456");
        mockUser.setGithubUsername("testgithub");
        mockUser.setGithubTokenEnc("encrypted-token");
    }

    @Test
    void unlinkGitHub_ShouldClearGitHubFieldsAndDowngradeRoleToCustomer_WhenUserIsDeveloper() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(mockUser));
        when(roleRepository.findByName("customer")).thenReturn(Optional.of(customerRole));
        when(userRepository.save(any(User.class))).thenReturn(mockUser);
        when(jwtProvider.generateToken(any(), any(), any(), any())).thenReturn("mocked-jwt-token");

        JwtAuthenticationResponse response = userService.unlinkGitHub("test@example.com");

        assertNotNull(response);
        assertEquals("mocked-jwt-token", response.getToken());
        assertEquals("customer", response.getUser().getRoleName());
        assertNull(mockUser.getGithubId());
        assertNull(mockUser.getGithubUsername());
        assertNull(mockUser.getGithubTokenEnc());
        assertNull(mockUser.getGithubLinkedAt());
        assertEquals(customerRole, mockUser.getRole());

        verify(userRepository, times(1)).findByEmail("test@example.com");
        verify(roleRepository, times(1)).findByName("customer");
        verify(userRepository, times(2)).save(mockUser);
    }

    @Test
    void unlinkGitHub_ShouldThrowAppException_WhenUserNotFound() {
        when(userRepository.findByEmail("nonexistent@example.com")).thenReturn(Optional.empty());

        AppException exception = assertThrows(AppException.class, () -> {
            userService.unlinkGitHub("nonexistent@example.com");
        });

        assertEquals(ErrorCode.USER_NOT_FOUND, exception.getErrorCode());
        verify(userRepository, times(1)).findByEmail("nonexistent@example.com");
        verify(roleRepository, never()).findByName(any());
    }

    @Test
    void unlinkGitHub_ShouldThrowAppException_WhenUserIsNotDeveloper() {
        mockUser.setRole(customerRole);
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(mockUser));

        AppException exception = assertThrows(AppException.class, () -> {
            userService.unlinkGitHub("test@example.com");
        });

        assertEquals(ErrorCode.ACCESS_DENIED, exception.getErrorCode());
        verify(userRepository, times(1)).findByEmail("test@example.com");
        verify(roleRepository, never()).findByName(any());
    }
}
