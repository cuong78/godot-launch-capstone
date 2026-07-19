package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.AdminCreateUserRequest;
import com.godotlaunch.backend.dto.request.AdminUpdateUserRequest;
import com.godotlaunch.backend.dto.request.UpdateLanguagePreferenceRequest;
import com.godotlaunch.backend.dto.request.UpdateProfileRequest;
import com.godotlaunch.backend.dto.response.*;
import com.godotlaunch.backend.service.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.security.Principal;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserService userService;

    @Mock
    private Principal principal;

    @InjectMocks
    private UserController userController;

    private UserResponse mockUserResponse;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        mockUserResponse = UserResponse.builder()
                .id(userId)
                .email("user@example.com")
                .fullName("Test User")
                .roleName("customer")
                .status("active")
                .preferredLanguage("vi")
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Should search users by name successfully")
    void shouldSearchUsers_Successfully() {
        // Arrange
        when(principal.getName()).thenReturn("caller@example.com");
        when(userService.searchUsersByName("John", "caller@example.com")).thenReturn(List.of(mockUserResponse));

        // Act
        ResponseEntity<ApiResponse<List<UserResponse>>> result = userController.searchUsers("John", principal);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getData()).hasSize(1);
    }

    @Test
    @DisplayName("Should get current user profile successfully")
    void shouldGetCurrentUser_Successfully() {
        // Arrange
        when(principal.getName()).thenReturn("user@example.com");
        when(userService.getUserByEmail("user@example.com")).thenReturn(mockUserResponse);

        // Act
        ResponseEntity<ApiResponse<UserResponse>> result = userController.getCurrentUser(principal);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody().getData().getEmail()).isEqualTo("user@example.com");
    }

    @Test
    @DisplayName("Should update current user profile successfully")
    void shouldUpdateCurrentUser_Successfully() {
        // Arrange
        UpdateProfileRequest updateRequest = new UpdateProfileRequest();
        updateRequest.setFullName("Updated Name");
        when(principal.getName()).thenReturn("user@example.com");
        when(userService.updateMyProfile("user@example.com", updateRequest)).thenReturn(mockUserResponse);

        // Act
        ResponseEntity<ApiResponse<UserResponse>> result = userController.updateCurrentUser(principal, updateRequest);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(userService, times(1)).updateMyProfile("user@example.com", updateRequest);
    }

    @Test
    @DisplayName("Should get current user language preference")
    void shouldGetCurrentUserLanguagePreference_Successfully() {
        // Arrange
        when(principal.getName()).thenReturn("user@example.com");
        when(userService.getLanguagePreference("user@example.com"))
                .thenReturn(new LanguagePreferenceResponse("en"));

        // Act
        ResponseEntity<ApiResponse<LanguagePreferenceResponse>> result = userController.getCurrentUserLanguagePreference(principal);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody().getData().getPreferredLanguage()).isEqualTo("en");
    }

    @Test
    @DisplayName("Should update current user language preference")
    void shouldUpdateCurrentUserLanguagePreference_Successfully() {
        // Arrange
        UpdateLanguagePreferenceRequest req = new UpdateLanguagePreferenceRequest();
        req.setLanguage("en");
        when(principal.getName()).thenReturn("user@example.com");
        when(userService.updateLanguagePreference("user@example.com", req))
                .thenReturn(new LanguagePreferenceResponse("en"));

        // Act
        ResponseEntity<ApiResponse<LanguagePreferenceResponse>> result = userController.updateCurrentUserLanguagePreference(principal, req);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody().getData().getPreferredLanguage()).isEqualTo("en");
    }

    @Test
    @DisplayName("Should get all users for admin")
    void shouldGetAllUsers_Successfully() {
        // Arrange
        when(userService.getAllUsers()).thenReturn(List.of(mockUserResponse));

        // Act
        ResponseEntity<ApiResponse<List<UserResponse>>> result = userController.getAllUsers();

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody().getData()).hasSize(1);
    }

    @Test
    @DisplayName("Should get user by ID when current user is the profile owner")
    void shouldGetUserById_Successfully_WhenOwner() {
        // Arrange
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "user@example.com", null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_CUSTOMER")));
        SecurityContextHolder.getContext().setAuthentication(auth);

        when(principal.getName()).thenReturn("user@example.com");
        when(userService.getUserById(userId)).thenReturn(mockUserResponse);

        // Act
        ResponseEntity<ApiResponse<UserResponse>> result = userController.getUserById(userId, principal);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody().getData().getId()).isEqualTo(userId);
    }

    @Test
    @DisplayName("Should throw AccessDeniedException when getting user by ID for different non-admin user")
    void shouldThrowAccessDenied_WhenNotOwnerNorAdmin() {
        // Arrange
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "other@example.com", null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_CUSTOMER")));
        SecurityContextHolder.getContext().setAuthentication(auth);

        when(principal.getName()).thenReturn("other@example.com");
        when(userService.getUserById(userId)).thenReturn(mockUserResponse);

        // Act & Assert
        assertThatThrownBy(() -> userController.getUserById(userId, principal))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("Should create user for admin with CREATED status")
    void shouldCreateUser_Successfully() {
        // Arrange
        AdminCreateUserRequest createReq = new AdminCreateUserRequest();
        createReq.setEmail("new@example.com");
        createReq.setPassword("password123");
        createReq.setFullName("New User");
        createReq.setRoleName("customer");

        when(userService.createUser(createReq)).thenReturn(mockUserResponse);

        // Act
        ResponseEntity<ApiResponse<UserResponse>> result = userController.createUser(createReq);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        verify(userService, times(1)).createUser(createReq);
    }

    @Test
    @DisplayName("Should update user by admin successfully")
    void shouldUpdateUser_Successfully() {
        // Arrange
        AdminUpdateUserRequest updateReq = new AdminUpdateUserRequest();
        updateReq.setEmail("user@example.com");
        updateReq.setFullName("Updated Name");
        updateReq.setRoleName("developer");
        updateReq.setStatus("active");

        when(userService.updateUser(eq(userId), any(AdminUpdateUserRequest.class))).thenReturn(mockUserResponse);

        // Act
        ResponseEntity<ApiResponse<UserResponse>> result = userController.updateUser(userId, updateReq);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(userService, times(1)).updateUser(userId, updateReq);
    }

    @Test
    @DisplayName("Should delete user by admin successfully")
    void shouldDeleteUser_Successfully() {
        // Arrange
        doNothing().when(userService).deleteUser(userId);

        // Act
        ResponseEntity<ApiResponse<Void>> result = userController.deleteUser(userId);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(userService, times(1)).deleteUser(userId);
    }

    @Test
    @DisplayName("Should get GitHub status for current user")
    void shouldGetGitHubStatus_Successfully() {
        // Arrange
        GitHubStatusResponse statusResp = GitHubStatusResponse.builder()
                .linked(true)
                .githubUsername("devuser")
                .build();
        when(principal.getName()).thenReturn("user@example.com");
        when(userService.getGitHubStatus("user@example.com")).thenReturn(statusResp);

        // Act
        ResponseEntity<ApiResponse<GitHubStatusResponse>> result = userController.getGitHubStatus(principal);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody().getData().isLinked()).isTrue();
    }

    @Test
    @DisplayName("Should unlink GitHub account successfully")
    void shouldUnlinkGitHub_Successfully() {
        // Arrange
        JwtAuthenticationResponse jwtResp = JwtAuthenticationResponse.builder()
                .token("new-customer-jwt")
                .user(mockUserResponse)
                .build();
        when(principal.getName()).thenReturn("user@example.com");
        when(userService.unlinkGitHub("user@example.com")).thenReturn(jwtResp);

        // Act
        ResponseEntity<ApiResponse<JwtAuthenticationResponse>> result = userController.unlinkGitHub(principal);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody().getData().getToken()).isEqualTo("new-customer-jwt");
    }
}
