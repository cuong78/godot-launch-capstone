package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.ContractRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.ContractResponse;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.enums.ContractStatus;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.ContractService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContractControllerTest {

    @Mock
    private ContractService contractService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private ContractController contractController;

    private User mockUser;
    private UUID contractId;
    private ContractResponse contractResponse;

    @BeforeEach
    void setUp() {
        mockUser = new User();
        mockUser.setId(UUID.randomUUID());
        mockUser.setEmail("dev@godotlaunch.dev");

        contractId = UUID.randomUUID();
        contractResponse = ContractResponse.builder()
                .id(contractId)
                .status(ContractStatus.pending)
                .gameId(UUID.randomUUID())
                .sellerId(mockUser.getId())
                .build();
    }

    @Test
    @DisplayName("shouldCreateOffer_WhenAdmin")
    void shouldCreateOffer_WhenAdmin() {
        // Arrange
        ContractRequest request = new ContractRequest();
        when(authentication.getName()).thenReturn(mockUser.getEmail());
        when(userRepository.findByEmail(mockUser.getEmail())).thenReturn(Optional.of(mockUser));
        when(contractService.createOffer(any(ContractRequest.class), eq(mockUser.getId()))).thenReturn(contractResponse);

        // Act
        ResponseEntity<ApiResponse<ContractResponse>> response = contractController.createOffer(request, authentication);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getId()).isEqualTo(contractId);
        verify(contractService, times(1)).createOffer(request, mockUser.getId());
    }

    @Test
    @DisplayName("shouldGetMyContracts_WhenAuthenticated")
    void shouldGetMyContracts_WhenAuthenticated() {
        // Arrange
        when(authentication.getName()).thenReturn(mockUser.getEmail());
        when(userRepository.findByEmail(mockUser.getEmail())).thenReturn(Optional.of(mockUser));
        when(contractService.getContractsByDeveloper(mockUser.getId())).thenReturn(List.of(contractResponse));

        // Act
        ResponseEntity<ApiResponse<List<ContractResponse>>> response = contractController.getMyContracts(authentication);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).hasSize(1);
    }

    @Test
    @DisplayName("shouldGetAllContracts_WhenAdmin")
    void shouldGetAllContracts_WhenAdmin() {
        // Arrange
        when(contractService.getAllContracts()).thenReturn(List.of(contractResponse));

        // Act
        ResponseEntity<ApiResponse<List<ContractResponse>>> response = contractController.getAllContracts();

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).hasSize(1);
    }

    @Test
    @DisplayName("shouldGetContractById_WhenContractExists")
    void shouldGetContractById_WhenContractExists() {
        // Arrange
        when(contractService.getContractById(contractId)).thenReturn(contractResponse);

        // Act
        ResponseEntity<ApiResponse<ContractResponse>> response = contractController.getContractById(contractId);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getId()).isEqualTo(contractId);
    }

    @Test
    @DisplayName("shouldSignByDeveloper_WhenDeveloperSign")
    void shouldSignByDeveloper_WhenDeveloperSign() {
        // Arrange
        Map<String, String> body = Map.of(
                "signatureBase64", "sig-data",
                "sellerRepresentative", "John Doe",
                "sellerAddress", "123 Main St",
                "sellerTaxCode", "111222"
        );
        when(authentication.getName()).thenReturn(mockUser.getEmail());
        when(userRepository.findByEmail(mockUser.getEmail())).thenReturn(Optional.of(mockUser));
        when(contractService.signByDeveloper(eq(contractId), eq(mockUser.getId()), eq("sig-data"), eq("John Doe"), eq("123 Main St"), eq("111222"))).thenReturn(contractResponse);

        // Act
        ResponseEntity<ApiResponse<ContractResponse>> response = contractController.signByDeveloper(contractId, body, authentication);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(contractService, times(1)).signByDeveloper(contractId, mockUser.getId(), "sig-data", "John Doe", "123 Main St", "111222");
    }

    @Test
    @DisplayName("shouldRejectByDeveloper_WhenDeveloperRejects")
    void shouldRejectByDeveloper_WhenDeveloperRejects() {
        // Arrange
        Map<String, String> body = Map.of("rejectionReason", "Invalid terms");
        when(authentication.getName()).thenReturn(mockUser.getEmail());
        when(userRepository.findByEmail(mockUser.getEmail())).thenReturn(Optional.of(mockUser));
        when(contractService.rejectByDeveloper(contractId, mockUser.getId(), "Invalid terms")).thenReturn(contractResponse);

        // Act
        ResponseEntity<ApiResponse<ContractResponse>> response = contractController.rejectByDeveloper(contractId, body, authentication);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(contractService, times(1)).rejectByDeveloper(contractId, mockUser.getId(), "Invalid terms");
    }

    @Test
    @DisplayName("shouldRejectByDeveloper_ReturnError_WhenExceptionThrown")
    void shouldRejectByDeveloper_ReturnError_WhenExceptionThrown() {
        // Arrange
        when(authentication.getName()).thenReturn(mockUser.getEmail());
        when(userRepository.findByEmail(mockUser.getEmail())).thenThrow(new RuntimeException("DB down"));

        // Act
        ResponseEntity<ApiResponse<ContractResponse>> response = contractController.rejectByDeveloper(contractId, null, authentication);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody().getMessage()).contains("Lỗi Server");
    }
}
