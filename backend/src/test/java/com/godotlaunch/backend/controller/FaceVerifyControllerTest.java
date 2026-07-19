package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.config.FaceServiceClient;
import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.FaceVerifyRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.security.Principal;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FaceVerifyControllerTest {

    @Mock
    private FaceServiceClient faceServiceClient;

    @Mock
    private UserRepository userRepository;

    @Mock
    private Principal principal;

    @InjectMocks
    private FaceVerifyController faceVerifyController;

    private User mockUser;
    private Role customerRole;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();

        customerRole = new Role();
        customerRole.setId(UUID.randomUUID());
        customerRole.setName("customer");

        mockUser = new User();
        mockUser.setId(userId);
        mockUser.setEmail("dev@example.com");
        mockUser.setRole(customerRole);
        mockUser.setGithubId("123456");
        mockUser.setFaceVerified(false);
    }

    @Test
    @DisplayName("Should return face verification status successfully")
    void shouldGetFaceVerifyStatus_Successfully() {
        // Arrange
        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));

        // Act
        ResponseEntity<ApiResponse<Map<String, Boolean>>> result = faceVerifyController.getFaceVerifyStatus(principal);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getData().get("faceVerified")).isFalse();
    }

    @Test
    @DisplayName("Should verify face and update faceVerified to true")
    void shouldVerifyFace_Successfully() {
        // Arrange
        FaceVerifyRequest request = new FaceVerifyRequest();
        request.setFaceImageBase64("base64-face-image-str");

        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));
        when(faceServiceClient.checkFace("base64-face-image-str")).thenReturn(new FaceServiceClient.FaceCheckResult(false, false));
        doNothing().when(faceServiceClient).registerFace(userId, "base64-face-image-str");
        when(userRepository.save(any(User.class))).thenReturn(mockUser);

        // Act
        ResponseEntity<ApiResponse<Map<String, Boolean>>> result = faceVerifyController.verifyFace(request, principal);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody().getData().get("faceVerified")).isTrue();
        assertThat(mockUser.isFaceVerified()).isTrue();

        verify(faceServiceClient, times(1)).registerFace(userId, "base64-face-image-str");
        verify(userRepository, times(1)).save(mockUser);
    }

    @Test
    @DisplayName("Should return true immediately if user is already face verified")
    void shouldReturnTrue_WhenAlreadyFaceVerified() {
        // Arrange
        mockUser.setFaceVerified(true);
        FaceVerifyRequest request = new FaceVerifyRequest();
        request.setFaceImageBase64("base64-face-image-str");

        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));

        // Act
        ResponseEntity<ApiResponse<Map<String, Boolean>>> result = faceVerifyController.verifyFace(request, principal);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody().getData().get("faceVerified")).isTrue();
        verify(faceServiceClient, never()).checkFace(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should throw FACE_DUPLICATE when faceServiceClient detects duplicate face")
    void shouldThrowException_WhenFaceIsDuplicate() {
        // Arrange
        FaceVerifyRequest request = new FaceVerifyRequest();
        request.setFaceImageBase64("duplicate-face");

        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));
        when(faceServiceClient.checkFace("duplicate-face")).thenReturn(new FaceServiceClient.FaceCheckResult(true, false));

        // Act & Assert
        assertThatThrownBy(() -> faceVerifyController.verifyFace(request, principal))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.FACE_DUPLICATE);
    }

    @Test
    @DisplayName("Should throw FACE_NOT_DETECTED when faceServiceClient throws FaceServiceException")
    void shouldThrowException_WhenFaceNotDetected() {
        // Arrange
        FaceVerifyRequest request = new FaceVerifyRequest();
        request.setFaceImageBase64("no-face-in-image");

        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));
        when(faceServiceClient.checkFace("no-face-in-image"))
                .thenThrow(new FaceServiceClient.FaceServiceException("Face not detected"));

        // Act & Assert
        assertThatThrownBy(() -> faceVerifyController.verifyFace(request, principal))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.FACE_NOT_DETECTED);
    }
}
