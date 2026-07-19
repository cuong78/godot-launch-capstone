package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.response.AgreementAcceptanceStatusResponse;
import com.godotlaunch.backend.dto.response.AgreementVersionResponse;

import java.util.List;
import java.util.UUID;

public interface AgreementService {

    AgreementVersionResponse getActiveAgreement();

    List<AgreementVersionResponse> listVersions();

    AgreementVersionResponse createNewVersion(String content, UUID adminUserId);

    AgreementAcceptanceStatusResponse getAcceptanceStatus(UUID userId);

    AgreementAcceptanceStatusResponse acceptActiveAgreement(UUID userId);
}
