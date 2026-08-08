package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.AdminCreateUserRequest;
import com.godotlaunch.backend.dto.request.AdminUpdateUserRequest;
import com.godotlaunch.backend.dto.request.UpdateLanguagePreferenceRequest;
import com.godotlaunch.backend.dto.request.UpdateProfileRequest;
import com.godotlaunch.backend.dto.response.GitHubStatusResponse;
import com.godotlaunch.backend.dto.response.JwtAuthenticationResponse;
import com.godotlaunch.backend.dto.response.LanguagePreferenceResponse;
import com.godotlaunch.backend.dto.response.UserResponse;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.RoleRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.security.JwtProvider;
import com.godotlaunch.backend.service.AuditLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();

        developerRole = new Role();
        developerRole.setId(UUID.randomUUID());
        developerRole.setName("developer");

        customerRole = new Role();
        customerRole.setId(UUID.randomUUID());
        customerRole.setName("customer");

        mockUser = new User();
        mockUser.setId(userId);
        mockUser.setEmail("test@example.com");
        mockUser.setFullName("Test User");
        mockUser.setRole(developerRole);
        mockUser.setStatus("active");
        mockUser.setGithubId("123456");
        mockUser.setGithubUsername("testgithub");
        mockUser.setGithubTokenEnc("encrypted-token");
    }

    @Test
    @DisplayName("Should return all users")
    void shouldGetAllUsers_Successfully() {
        // Arrange
        when(userRepository.findAll()).thenReturn(List.of(mockUser));

        // Act
        List<UserResponse> result = userService.getAllUsers();

        // Assert
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmail()).isEqualTo("test@example.com");
    }

    @Test
    @DisplayName("Should get user by ID when present")
    void shouldGetUserById_Successfully() {
        // Arrange
        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));

        // Act
        UserResponse result = userService.getUserById(userId);

        // Assert
        assertThat(result.getId()).isEqualTo(userId);
    }

    @Test
    @DisplayName("Should throw USER_NOT_FOUND when user ID does not exist")
    void shouldThrowException_WhenUserIdNotFound() {
        // Arrange
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> userService.getUserById(userId))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.USER_NOT_FOUND);
    }

    @Test
    @DisplayName("Should create user for admin successfully")
    void shouldCreateUser_Successfully() {
        // Arrange
        AdminCreateUserRequest req = new AdminCreateUserRequest();
        req.setEmail("new@example.com");
        req.setPassword("pass123");
        req.setFullName("New User");
        req.setRoleName("customer");

        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(roleRepository.findByName("customer")).thenReturn(Optional.of(customerRole));
        when(passwordEncoder.encode("pass123")).thenReturn("encoded-pass");
        when(userRepository.save(any(User.class))).thenReturn(mockUser);

        // Act
        UserResponse result = userService.createUser(req);

        // Assert
        assertThat(result).isNotNull();
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Should update user profile and trigger audit log for role change")
    void shouldUpdateUser_WithRoleChangeAuditLog() {
        // Arrange
        AdminUpdateUserRequest req = new AdminUpdateUserRequest();
        req.setEmail("test@example.com");
        req.setFullName("Updated Name");
        req.setRoleName("customer");
        req.setStatus("banned");
        req.setBanReason("Violation of TOS");

        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));
        when(roleRepository.findByName("customer")).thenReturn(Optional.of(customerRole));
        when(userRepository.save(any(User.class))).thenReturn(mockUser);

        // Act
        UserResponse result = userService.updateUser(userId, req);

        // Assert
        assertThat(result).isNotNull();
        verify(auditLogService, times(1)).publishAuto(eq(com.godotlaunch.backend.entity.enums.AuditAction.user_role_changed), any(), any(), any(), any(), any());
        verify(auditLogService, times(1)).publishAuto(eq(com.godotlaunch.backend.entity.enums.AuditAction.user_banned), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Should soft delete user by suffixing email and setting status inactive")
    void shouldDeleteUser_SoftDelete() {
        // Arrange
        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));

        // Act
        userService.deleteUser(userId);

        // Assert
        assertThat(mockUser.getStatus()).isEqualTo("inactive");
        assertThat(mockUser.getEmail()).contains("test@example.com_deleted_");
        verify(userRepository, times(1)).save(mockUser);
        verify(auditLogService, times(1)).publishAuto(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Should update current user profile")
    void shouldUpdateMyProfile_Successfully() {
        // Arrange
        mockUser.setBankName("Vietcombank");
        mockUser.setBankAccount("19034567890123");
        mockUser.setBankAccountHolder("TEST USER");
        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setFullName("New Full Name");
        req.setAvatarUrl("http://avatar/new.png");
        req.setPassword("newpass123");

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(mockUser));
        when(passwordEncoder.encode("newpass123")).thenReturn("encoded_newpass");
        when(userRepository.save(any(User.class))).thenReturn(mockUser);

        // Act
        UserResponse result = userService.updateMyProfile("test@example.com", req);

        // Assert
        assertThat(result).isNotNull();
        assertThat(mockUser.getFullName()).isEqualTo("New Full Name");
        assertThat(mockUser.getAvatarUrl()).isEqualTo("http://avatar/new.png");
        assertThat(mockUser.getBankName()).isEqualTo("Vietcombank");
        assertThat(mockUser.getBankAccount()).isEqualTo("19034567890123");
        assertThat(mockUser.getBankAccountHolder()).isEqualTo("TEST USER");
    }

    @Test
    @DisplayName("Should search active users by name excluding current user email")
    void shouldSearchUsersByName_Successfully() {
        // Arrange
        when(userRepository.findByFullNameContainingIgnoreCaseAndStatus("John", "active"))
                .thenReturn(List.of(mockUser));

        // Act
        List<UserResponse> result = userService.searchUsersByName("John", "other@example.com");

        // Assert
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("Should get GitHub status response for user")
    void shouldGetGitHubStatus_Successfully() {
        // Arrange
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(mockUser));

        // Act
        GitHubStatusResponse status = userService.getGitHubStatus("test@example.com");

        // Assert
        assertThat(status.isLinked()).isTrue();
        assertThat(status.getGithubUsername()).isEqualTo("testgithub");
    }

    @Test
    @DisplayName("Should unlink GitHub account when user is developer")
    void shouldUnlinkGitHub_Successfully_WhenDeveloper() {
        // Arrange
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(mockUser));
        when(roleRepository.findByName("customer")).thenReturn(Optional.of(customerRole));
        when(userRepository.save(any(User.class))).thenReturn(mockUser);
        when(jwtProvider.generateToken(any(), any(), any(), any())).thenReturn("mocked-jwt-token");

        // Act
        JwtAuthenticationResponse response = userService.unlinkGitHub("test@example.com");

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("mocked-jwt-token");
        assertThat(mockUser.getRole()).isEqualTo(customerRole);
        assertThat(mockUser.getGithubId()).isNull();
    }

    @Test
    @DisplayName("Should update language preference")
    void shouldUpdateLanguagePreference_Successfully() {
        // Arrange
        UpdateLanguagePreferenceRequest req = new UpdateLanguagePreferenceRequest();
        req.setLanguage("en");

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(mockUser));
        when(userRepository.save(any(User.class))).thenReturn(mockUser);

        // Act
        LanguagePreferenceResponse resp = userService.updateLanguagePreference("test@example.com", req);

        // Assert
        assertThat(resp.getPreferredLanguage()).isEqualTo("en");
    }

    @Test
    void shouldThrowException_WhenUnlinkGitHub_AndNotDeveloper() {
        mockUser.setRole(customerRole);
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(mockUser));

        assertThatThrownBy(() -> userService.unlinkGitHub("test@example.com"))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACCESS_DENIED);
    }

    @Test
    void shouldGetLanguagePreference_Successfully() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(mockUser));

        LanguagePreferenceResponse resp = userService.getLanguagePreference("test@example.com");

        assertThat(resp.getPreferredLanguage()).isEqualTo("vi");
    }

    @Test
    void shouldReturnEmptyList_WhenSearchUsersWithEmptyQuery() {
        List<UserResponse> result = userService.searchUsersByName("", "test@example.com");
        assertThat(result).isEmpty();
    }

    @Test
    void shouldReturnEmpty_WhenDeleteUserAlreadyDeleted() {
        mockUser.setStatus("inactive");
        mockUser.setEmail("test@example.com_deleted_12345");
        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));

        userService.deleteUser(userId);

        verify(userRepository, never()).save(any());
    }

    @Test
    void shouldThrowException_WhenCreateUserDuplicateEmail() {
        AdminCreateUserRequest req = new AdminCreateUserRequest();
        req.setEmail("test@example.com");

        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.createUser(req))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.DUPLICATE_EMAIL);
    }

    @Test
    void shouldThrowException_WhenUpdateUserDuplicateEmail() {
        AdminUpdateUserRequest req = new AdminUpdateUserRequest();
        req.setEmail("other@example.com");

        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));
        when(userRepository.existsByEmail("other@example.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.updateUser(userId, req))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.DUPLICATE_EMAIL);
    }
}
