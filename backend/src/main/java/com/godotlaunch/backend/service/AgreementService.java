package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.response.AgreementAcceptanceStatusResponse;
import com.godotlaunch.backend.dto.response.AgreementVersionResponse;

import java.util.List;
import java.util.UUID;

public interface AgreementService {

    AgreementVersionResponse getActiveAgreement(com.godotlaunch.backend.entity.enums.AgreementType type);

    List<AgreementVersionResponse> listVersions(com.godotlaunch.backend.entity.enums.AgreementType type);

    AgreementVersionResponse createNewVersion(com.godotlaunch.backend.entity.enums.AgreementType type, String content, UUID adminUserId);

    AgreementAcceptanceStatusResponse getAcceptanceStatus(com.godotlaunch.backend.entity.enums.AgreementType type, UUID userId);

    AgreementAcceptanceStatusResponse acceptActiveAgreement(com.godotlaunch.backend.entity.enums.AgreementType type, UUID userId);
}
