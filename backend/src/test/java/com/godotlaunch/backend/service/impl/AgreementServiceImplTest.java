package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.response.AgreementAcceptanceStatusResponse;
import com.godotlaunch.backend.dto.response.AgreementVersionResponse;
import com.godotlaunch.backend.entity.AgreementVersion;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.UserAgreementAcceptance;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.AgreementVersionRepository;
import com.godotlaunch.backend.repository.UserAgreementAcceptanceRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.PlatformSettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AgreementServiceImplTest {

    @Mock
    private AgreementVersionRepository agreementVersionRepository;

    @Mock
    private UserAgreementAcceptanceRepository userAgreementAcceptanceRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PlatformSettingsService platformSettingsService;

    @InjectMocks
    private AgreementServiceImpl agreementService;

    private UUID agreementId;
    private AgreementVersion activeVersion;
    private User user;

    @BeforeEach
    void setUp() {
        agreementId = UUID.randomUUID();
        activeVersion = new AgreementVersion();
        activeVersion.setId(agreementId);
        activeVersion.setVersion(1);
        activeVersion.setContent("Commission {{commissionRate}} and Share {{revenueSharePercent}}");
        activeVersion.setActive(true);

        user = new User();
        user.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("shouldGetActiveAgreement_WhenExists")
    void shouldGetActiveAgreement_WhenExists() {
        when(agreementVersionRepository.findByIsActiveTrue()).thenReturn(Optional.of(activeVersion));
        when(platformSettingsService.getPlatformCommissionRate()).thenReturn(new BigDecimal("10"));

        AgreementVersionResponse response = agreementService.getActiveAgreement();

        assertThat(response.getId()).isEqualTo(agreementId);
        assertThat(response.getContent()).contains("Commission 10 and Share 90");
    }

    @Test
    @DisplayName("shouldThrowException_WhenActiveAgreementNotFound")
    void shouldThrowException_WhenActiveAgreementNotFound() {
        when(agreementVersionRepository.findByIsActiveTrue()).thenReturn(Optional.empty());

        assertThatThrownBy(() -> agreementService.getActiveAgreement())
                .isInstanceOf(AppException.class);
    }

    @Test
    @DisplayName("shouldListVersions_WhenRequested")
    void shouldListVersions_WhenRequested() {
        when(agreementVersionRepository.findAllByOrderByVersionDesc()).thenReturn(List.of(activeVersion));

        List<AgreementVersionResponse> list = agreementService.listVersions();

        assertThat(list).hasSize(1);
    }

    @Test
    @DisplayName("shouldCreateNewVersion_WhenAdminRequest")
    void shouldCreateNewVersion_WhenAdminRequest() {
        when(agreementVersionRepository.findByIsActiveTrue()).thenReturn(Optional.of(activeVersion));
        when(agreementVersionRepository.findTopByOrderByVersionDesc()).thenReturn(Optional.of(activeVersion));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(agreementVersionRepository.save(any(AgreementVersion.class))).thenAnswer(i -> i.getArgument(0));

        AgreementVersionResponse response = agreementService.createNewVersion("New Content", user.getId());

        assertThat(response.getVersion()).isEqualTo(2);
        verify(agreementVersionRepository, times(1)).save(activeVersion);
    }

    @Test
    @DisplayName("shouldGetAcceptanceStatus_WhenAccepted")
    void shouldGetAcceptanceStatus_WhenAccepted() {
        when(agreementVersionRepository.findByIsActiveTrue()).thenReturn(Optional.of(activeVersion));
        when(userAgreementAcceptanceRepository.existsByUserIdAndAgreementVersionId(user.getId(), activeVersion.getId()))
                .thenReturn(true);

        AgreementAcceptanceStatusResponse response = agreementService.getAcceptanceStatus(user.getId());

        assertThat(response.isAccepted()).isTrue();
    }

    @Test
    @DisplayName("shouldAcceptActiveAgreement_WhenNotAcceptedYet")
    void shouldAcceptActiveAgreement_WhenNotAcceptedYet() {
        when(agreementVersionRepository.findByIsActiveTrue()).thenReturn(Optional.of(activeVersion));
        when(userAgreementAcceptanceRepository.existsByUserIdAndAgreementVersionId(user.getId(), activeVersion.getId()))
                .thenReturn(false);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        AgreementAcceptanceStatusResponse response = agreementService.acceptActiveAgreement(user.getId());

        assertThat(response.isAccepted()).isTrue();
        verify(userAgreementAcceptanceRepository, times(1)).save(any(UserAgreementAcceptance.class));
    }
}
