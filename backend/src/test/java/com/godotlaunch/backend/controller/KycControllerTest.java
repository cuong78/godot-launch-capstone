package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.KycConfirmRequest;
import com.godotlaunch.backend.dto.request.KycOcrRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.KycOcrResponse;
import com.godotlaunch.backend.dto.response.KycStatusResponse;
import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.BannedIdentityRepository;
import com.godotlaunch.backend.repository.RoleRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.AuthService;
import com.godotlaunch.backend.service.SeaweedFsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;
import java.util.Map;
import java.util.HashMap;

import java.security.Principal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class KycControllerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private BannedIdentityRepository bannedIdentityRepository;

    @Mock
    private AuthService authService;

    @Mock
    private SeaweedFsService seaweedFsService;

    @Mock
    private Principal principal;

    @InjectMocks
    private KycController kycController;

    private User mockUser;
    private Role customerRole;
    private Role developerRole;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();

        customerRole = new Role();
        customerRole.setId(UUID.randomUUID());
        customerRole.setName("customer");

        developerRole = new Role();
        developerRole.setId(UUID.randomUUID());
        developerRole.setName("developer");

        mockUser = new User();
        mockUser.setId(userId);
        mockUser.setEmail("dev@example.com");
        mockUser.setRole(customerRole);
        mockUser.setGithubId("123456");
        mockUser.setFaceVerified(true);
        mockUser.setKycVerified(false);
    }

    @Test
    @DisplayName("Should get KYC status successfully when user is eligible")
    void shouldGetKycStatus_Successfully() {
        // Arrange
        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));

        // Act
        ResponseEntity<ApiResponse<KycStatusResponse>> result = kycController.getKycStatus(principal);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getData().isKycVerified()).isFalse();
    }

    @Test
    @DisplayName("Should throw GITHUB_NOT_LINKED when user is not linked to GitHub and not a developer")
    void shouldThrowException_WhenNotGithubLinkedNorDeveloper() {
        // Arrange
        mockUser.setGithubId(null);
        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));

        // Act & Assert
        assertThatThrownBy(() -> kycController.getKycStatus(principal))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.GITHUB_NOT_LINKED);
    }

    @Test
    @DisplayName("Should confirm KYC and upgrade role to developer when all 3 conditions met")
    void shouldConfirmKyc_AndUpgradeRoleToDeveloper() {
        // Arrange
        KycConfirmRequest request = new KycConfirmRequest();
        request.setDocumentType("CCCD");
        request.setFullName("Nguyen Van A");
        request.setIdNumber("012345678901");
        request.setAddress("Hanoi, Vietnam");
        request.setDateOfBirth("01/01/1990");

        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));
        when(bannedIdentityRepository.existsByKycIdNumber("012345678901")).thenReturn(false);
        when(userRepository.existsByKycIdNumberAndIdNot("012345678901", userId)).thenReturn(false);
        when(roleRepository.findByName("developer")).thenReturn(Optional.of(developerRole));
        when(userRepository.save(any(User.class))).thenReturn(mockUser);
        when(authService.refreshSession(mockUser)).thenReturn("new-developer-jwt-token");

        // Act
        ResponseEntity<ApiResponse<KycStatusResponse>> result = kycController.confirmKyc(request, principal);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody().getData().isKycVerified()).isTrue();
        assertThat(result.getBody().getData().getToken()).isEqualTo("new-developer-jwt-token");
        assertThat(mockUser.getRole()).isEqualTo(developerRole);

        verify(userRepository, times(1)).save(mockUser);
        verify(authService, times(1)).refreshSession(mockUser);
    }

    @Test
    @DisplayName("Should throw KYC_ID_NUMBER_DUPLICATE when ID number belongs to another user")
    void shouldThrowException_WhenIdNumberIsDuplicate() {
        // Arrange
        KycConfirmRequest request = new KycConfirmRequest();
        request.setIdNumber("012345678901");

        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));
        when(bannedIdentityRepository.existsByKycIdNumber("012345678901")).thenReturn(false);
        when(userRepository.existsByKycIdNumberAndIdNot("012345678901", userId)).thenReturn(true);

        // Act & Assert
        assertThatThrownBy(() -> kycController.confirmKyc(request, principal))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.KYC_ID_NUMBER_DUPLICATE);
    }

    @Test
    @DisplayName("Should return existing KYC status if user is already KYC verified")
    void shouldReturnExistingStatus_WhenAlreadyKycVerified() {
        // Arrange
        mockUser.setKycVerified(true);
        KycConfirmRequest request = new KycConfirmRequest();
        request.setIdNumber("012345678901");

        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));

        // Act
        ResponseEntity<ApiResponse<KycStatusResponse>> result = kycController.confirmKyc(request, principal);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should throw IDENTITY_BANNED when KYC ID number belongs to banned list")
    void shouldThrowException_WhenIdentityIsBanned() {
        KycConfirmRequest request = new KycConfirmRequest();
        request.setIdNumber("banned-id-number");

        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));
        when(bannedIdentityRepository.existsByKycIdNumber("banned-id-number")).thenReturn(true);

        assertThatThrownBy(() -> kycController.confirmKyc(request, principal))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.IDENTITY_BANNED);
    }

    @Test
    @DisplayName("Should perform OCR document successfully")
    void shouldOcrDocument_Successfully() {
        KycOcrRequest request = new KycOcrRequest();
        request.setImageBase64("base-64-image");
        request.setDocumentType("CCCD");

        RestTemplate restTemplateMock = mock(RestTemplate.class);
        ReflectionTestUtils.setField(kycController, "restTemplate", restTemplateMock);

        Map<String, Object> ocrData = Map.of(
                "documentType", "CCCD",
                "idNumber", "012345678901",
                "fullName", "Nguyen Van A",
                "dateOfBirth", "01/01/1990",
                "address", "Hanoi"
        );

        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));
        when(restTemplateMock.exchange(
                anyString(), eq(HttpMethod.POST), any(HttpEntity.class), any(ParameterizedTypeReference.class)
        )).thenReturn(new ResponseEntity<>(ocrData, HttpStatus.OK));

        ResponseEntity<ApiResponse<KycOcrResponse>> response = kycController.ocrDocument(request, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getIdNumber()).isEqualTo("012345678901");
    }
}
