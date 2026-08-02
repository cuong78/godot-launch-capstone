package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CreateAgreementVersionRequest;
import com.godotlaunch.backend.dto.response.AgreementVersionResponse;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.AgreementService;
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
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminAgreementControllerTest {

    @Mock
    private AgreementService agreementService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private AdminAgreementController adminAgreementController;

    private User admin;
    private String email;

    @BeforeEach
    void setUp() {
        email = "admin@godotlaunch.dev";
        admin = new User();
        admin.setId(UUID.randomUUID());
        admin.setEmail(email);
    }

    @Test
    @DisplayName("shouldListVersions_WhenCalled")
    void shouldListVersions_WhenCalled() {
        AgreementVersionResponse expected = new AgreementVersionResponse(UUID.randomUUID(), 1, "Content", true, null);
        when(agreementService.listVersions()).thenReturn(List.of(expected));

        ResponseEntity<ApiResponse<List<AgreementVersionResponse>>> response = adminAgreementController.listVersions();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).hasSize(1);
    }

    @Test
    @DisplayName("shouldCreateVersion_WhenAdminAuthorized")
    void shouldCreateVersion_WhenAdminAuthorized() {
        CreateAgreementVersionRequest request = new CreateAgreementVersionRequest();
        request.setContent("New Content");

        AgreementVersionResponse expected = new AgreementVersionResponse(UUID.randomUUID(), 2, "New Content", true, null);
        when(authentication.getName()).thenReturn(email);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(admin));
        when(agreementService.createNewVersion("New Content", admin.getId())).thenReturn(expected);

        ResponseEntity<ApiResponse<AgreementVersionResponse>> response = adminAgreementController.createVersion(request, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getVersion()).isEqualTo(2);
    }
}
