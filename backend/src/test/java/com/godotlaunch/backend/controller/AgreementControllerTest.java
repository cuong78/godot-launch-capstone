package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.AgreementAcceptanceStatusResponse;
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

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AgreementControllerTest {

    @Mock
    private AgreementService agreementService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private AgreementController agreementController;

    private User user;
    private String email;

    @BeforeEach
    void setUp() {
        email = "user@godotlaunch.dev";
        user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
    }

    @Test
    @DisplayName("shouldGetActive_WhenCalled")
    void shouldGetActive_WhenCalled() {
        AgreementVersionResponse expected = new AgreementVersionResponse(UUID.randomUUID(), 1, "Content", true, null);
        when(agreementService.getActiveAgreement()).thenReturn(expected);

        ResponseEntity<ApiResponse<AgreementVersionResponse>> response = agreementController.getActive();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getVersion()).isEqualTo(1);
    }

    @Test
    @DisplayName("shouldGetAcceptanceStatus_WhenAuthenticated")
    void shouldGetAcceptanceStatus_WhenAuthenticated() {
        AgreementAcceptanceStatusResponse status = new AgreementAcceptanceStatusResponse(true, 1, null);
        when(authentication.getName()).thenReturn(email);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(agreementService.getAcceptanceStatus(user.getId())).thenReturn(status);

        ResponseEntity<ApiResponse<AgreementAcceptanceStatusResponse>> response = agreementController.getAcceptanceStatus(authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().isAccepted()).isTrue();
    }

    @Test
    @DisplayName("shouldAcceptAgreement_WhenCalled")
    void shouldAcceptAgreement_WhenCalled() {
        AgreementAcceptanceStatusResponse status = new AgreementAcceptanceStatusResponse(true, 1, null);
        when(authentication.getName()).thenReturn(email);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(agreementService.acceptActiveAgreement(user.getId())).thenReturn(status);

        ResponseEntity<ApiResponse<AgreementAcceptanceStatusResponse>> response = agreementController.accept(authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().isAccepted()).isTrue();
    }
}
