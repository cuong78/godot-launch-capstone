package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.response.AgreementAcceptanceStatusResponse;
import com.godotlaunch.backend.dto.response.AgreementVersionResponse;
import com.godotlaunch.backend.entity.AgreementVersion;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.UserAgreementAcceptance;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.AgreementVersionRepository;
import com.godotlaunch.backend.repository.UserAgreementAcceptanceRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.AgreementService;
import com.godotlaunch.backend.service.PlatformSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AgreementServiceImpl implements AgreementService {

    private final AgreementVersionRepository agreementVersionRepository;
    private final UserAgreementAcceptanceRepository userAgreementAcceptanceRepository;
    private final UserRepository userRepository;
    private final PlatformSettingsService platformSettingsService;

    @Override
    @Transactional(readOnly = true)
    public AgreementVersionResponse getActiveAgreement(com.godotlaunch.backend.entity.enums.AgreementType type) {
        AgreementVersion active = agreementVersionRepository.findByAgreementTypeAndIsActiveTrue(type)
                .orElseThrow(() -> new AppException(ErrorCode.AGREEMENT_VERSION_NOT_FOUND));
        return mapToResponse(active, true);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AgreementVersionResponse> listVersions(com.godotlaunch.backend.entity.enums.AgreementType type) {
        return agreementVersionRepository.findAllByAgreementTypeOrderByVersionDesc(type).stream()
                .map(v -> mapToResponse(v, false))
                .toList();
    }

    @Override
    @Transactional
    public AgreementVersionResponse createNewVersion(com.godotlaunch.backend.entity.enums.AgreementType type, String content, UUID adminUserId) {
        agreementVersionRepository.findByAgreementTypeAndIsActiveTrue(type).ifPresent(previous -> {
            previous.setActive(false);
            agreementVersionRepository.save(previous);
        });

        int nextVersion = agreementVersionRepository.findTopByAgreementTypeOrderByVersionDesc(type)
                .map(v -> v.getVersion() + 1)
                .orElse(1);

        User admin = userRepository.findById(adminUserId).orElseThrow();

        AgreementVersion newVersion = new AgreementVersion();
        newVersion.setVersion(nextVersion);
        newVersion.setAgreementType(type);
        newVersion.setContent(content);
        newVersion.setActive(true);
        newVersion.setCreatedBy(admin);

        return mapToResponse(agreementVersionRepository.save(newVersion), false);
    }

    @Override
    @Transactional(readOnly = true)
    public AgreementAcceptanceStatusResponse getAcceptanceStatus(com.godotlaunch.backend.entity.enums.AgreementType type, UUID userId) {
        AgreementVersion active = agreementVersionRepository.findByAgreementTypeAndIsActiveTrue(type)
                .orElseThrow(() -> new AppException(ErrorCode.AGREEMENT_VERSION_NOT_FOUND));

        boolean accepted = userAgreementAcceptanceRepository
                .existsByUserIdAndAgreementVersionId(userId, active.getId());

        if (!accepted) {
            return new AgreementAcceptanceStatusResponse(false, null, null);
        }

        return new AgreementAcceptanceStatusResponse(true, active.getVersion(), null);
    }

    @Override
    @Transactional
    public AgreementAcceptanceStatusResponse acceptActiveAgreement(com.godotlaunch.backend.entity.enums.AgreementType type, UUID userId) {
        AgreementVersion active = agreementVersionRepository.findByAgreementTypeAndIsActiveTrue(type)
                .orElseThrow(() -> new AppException(ErrorCode.AGREEMENT_VERSION_NOT_FOUND));

        boolean alreadyAccepted = userAgreementAcceptanceRepository
                .existsByUserIdAndAgreementVersionId(userId, active.getId());

        if (!alreadyAccepted) {
            User user = userRepository.findById(userId).orElseThrow();
            UserAgreementAcceptance acceptance = new UserAgreementAcceptance();
            acceptance.setUser(user);
            acceptance.setAgreementVersion(active);
            userAgreementAcceptanceRepository.save(acceptance);
        }

        return new AgreementAcceptanceStatusResponse(true, active.getVersion(), null);
    }

    private AgreementVersionResponse mapToResponse(AgreementVersion version, boolean substitutePlaceholders) {
        String content = version.getContent();
        if (substitutePlaceholders) {
            content = applyPlaceholders(content);
        }
        return new AgreementVersionResponse(
                version.getId(),
                version.getVersion(),
                content,
                version.getAgreementType(),
                version.isActive(),
                version.getCreatedAt()
        );
    }

    private String applyPlaceholders(String content) {
        BigDecimal commissionRate = platformSettingsService.getPlatformCommissionRate();
        BigDecimal revenueShare = BigDecimal.valueOf(100).subtract(commissionRate);
        return content
                .replace("{{commissionRate}}", commissionRate.stripTrailingZeros().toPlainString())
                .replace("{{revenueSharePercent}}", revenueShare.stripTrailingZeros().toPlainString());
    }
}
