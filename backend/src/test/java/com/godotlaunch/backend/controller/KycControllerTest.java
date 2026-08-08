package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.BankSetupRequest;
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
    @DisplayName("Should confirm identity KYC without saving bank or upgrading role")
    void shouldConfirmIdentityKyc_WithoutSavingBankOrUpgradingRole() {
        // Arrange
        KycConfirmRequest request = new KycConfirmRequest();
        request.setDocumentType("cccd");
        request.setFullName("Nguyễn Văn Đạt");
        request.setIdNumber("012345678901");
        request.setAddress("Hanoi, Vietnam");
        request.setDateOfBirth("01/01/1990");

        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));
        when(bannedIdentityRepository.existsByKycIdNumber("012345678901")).thenReturn(false);
        when(userRepository.existsByKycIdNumberAndIdNot("012345678901", userId)).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(mockUser);

        // Act
        ResponseEntity<ApiResponse<KycStatusResponse>> result = kycController.confirmKyc(request, principal);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody().getData().isKycVerified()).isTrue();
        assertThat(result.getBody().getData().getToken()).isNull();
        assertThat(mockUser.getRole()).isEqualTo(customerRole);
        assertThat(mockUser.getBankName()).isNull();
        assertThat(mockUser.getBankAccount()).isNull();
        assertThat(mockUser.getBankAccountHolder()).isNull();

        verify(userRepository, times(1)).save(mockUser);
        verifyNoInteractions(authService);
    }

    @Test
    @DisplayName("Should require complete bank information at payout setup")
    void shouldThrowException_WhenBankInfoIsMissing() {
        mockUser.setKycVerified(true);
        mockUser.setKycFullName("Nguyễn Văn Đạt");
        BankSetupRequest request = validBankRequest();
        request.setBankAccountHolder(" ");

        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));

        assertThatThrownBy(() -> kycController.setupBank(request, principal))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.BANK_INFO_REQUIRED);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should reject a bank holder that does not match the KYC name")
    void shouldThrowException_WhenBankHolderDoesNotMatchKycName() {
        mockUser.setKycVerified(true);
        mockUser.setKycFullName("Nguyễn Văn Đạt");
        BankSetupRequest request = validBankRequest();
        request.setBankAccountHolder("TRAN VAN B");

        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));

        assertThatThrownBy(() -> kycController.setupBank(request, principal))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.BANK_NAME_MISMATCH);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should reject an invalid bank account format")
    void shouldThrowException_WhenBankAccountFormatIsInvalid() {
        mockUser.setKycVerified(true);
        mockUser.setKycFullName("Nguyễn Văn Đạt");
        BankSetupRequest request = validBankRequest();
        request.setBankAccount("ABC 123");

        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));

        assertThatThrownBy(() -> kycController.setupBank(request, principal))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.BANK_ACCOUNT_INVALID);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should reject a bank outside the supported payout list")
    void shouldThrowException_WhenBankNameIsInvalid() {
        mockUser.setKycVerified(true);
        mockUser.setKycFullName("Nguyễn Văn Đạt");
        BankSetupRequest request = validBankRequest();
        request.setBankName("Unknown Bank");

        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));

        assertThatThrownBy(() -> kycController.setupBank(request, principal))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.BANK_NAME_INVALID);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should reject a bank account from the banned identity list")
    void shouldThrowException_WhenBankAccountIsBanned() {
        mockUser.setKycVerified(true);
        mockUser.setKycFullName("Nguyễn Văn Đạt");
        BankSetupRequest request = validBankRequest();

        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));
        when(bannedIdentityRepository.existsByBankAccount("19034567890123")).thenReturn(true);

        assertThatThrownBy(() -> kycController.setupBank(request, principal))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.IDENTITY_BANNED);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should reject a bank account already used by another user")
    void shouldThrowException_WhenBankAccountIsDuplicate() {
        mockUser.setKycVerified(true);
        mockUser.setKycFullName("Nguyễn Văn Đạt");
        BankSetupRequest request = validBankRequest();

        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));
        when(userRepository.existsByBankAccountAndIdNot("19034567890123", userId)).thenReturn(true);

        assertThatThrownBy(() -> kycController.setupBank(request, principal))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.BANK_ACCOUNT_DUPLICATE);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should set bank once and upgrade role after all onboarding checks")
    void shouldSetupBank_AndUpgradeRoleToDeveloper() {
        mockUser.setKycVerified(true);
        mockUser.setKycFullName("Nguyễn Văn Đạt");
        BankSetupRequest request = validBankRequest();

        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));
        when(roleRepository.findByName("developer")).thenReturn(Optional.of(developerRole));
        when(userRepository.save(any(User.class))).thenReturn(mockUser);
        when(authService.refreshSession(mockUser)).thenReturn("new-developer-jwt-token");

        ResponseEntity<ApiResponse<KycStatusResponse>> result = kycController.setupBank(request, principal);

        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getData().getToken()).isEqualTo("new-developer-jwt-token");
        assertThat(mockUser.getRole()).isEqualTo(developerRole);
        assertThat(mockUser.getBankName()).isEqualTo("Vietcombank");
        assertThat(mockUser.getBankAccount()).isEqualTo("19034567890123");
        assertThat(mockUser.getBankAccountHolder()).isEqualTo("NGUYEN VAN DAT");

        verify(userRepository).save(mockUser);
        verify(authService).refreshSession(mockUser);
    }

    @Test
    @DisplayName("Should reject bank setup when KYC is not complete")
    void shouldThrowException_WhenKycIsNotComplete() {
        BankSetupRequest request = validBankRequest();

        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));

        assertThatThrownBy(() -> kycController.setupBank(request, principal))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.KYC_VERIFY_REQUIRED);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should reject changing bank after it has already been set")
    void shouldThrowException_WhenBankIsAlreadySet() {
        mockUser.setKycVerified(true);
        mockUser.setKycFullName("Nguyễn Văn Đạt");
        mockUser.setBankName("Vietcombank");
        mockUser.setBankAccount("19034567890123");
        mockUser.setBankAccountHolder("NGUYEN VAN DAT");

        when(principal.getName()).thenReturn("dev@example.com");
        when(userRepository.findWithRoleByEmail("dev@example.com")).thenReturn(Optional.of(mockUser));

        assertThatThrownBy(() -> kycController.setupBank(validBankRequest(), principal))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.BANK_INFO_ALREADY_SET);

        verify(userRepository, never()).save(any(User.class));
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

    private KycConfirmRequest validKycRequest() {
        KycConfirmRequest request = new KycConfirmRequest();
        request.setDocumentType("cccd");
        request.setFullName("Nguyễn Văn Đạt");
        request.setIdNumber("012345678901");
        request.setAddress("Hanoi, Vietnam");
        request.setDateOfBirth("01/01/1990");
        return request;
    }

    private BankSetupRequest validBankRequest() {
        BankSetupRequest request = new BankSetupRequest();
        request.setBankName("Vietcombank");
        request.setBankAccount("19034567890123");
        request.setBankAccountHolder("NGUYEN VAN DAT");
        return request;
    }
}
