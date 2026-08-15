package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateAgreementVersionRequest {

    @NotBlank
    private String content;

    @jakarta.validation.constraints.NotNull
    private com.godotlaunch.backend.entity.enums.AgreementType type = com.godotlaunch.backend.entity.enums.AgreementType.DEVELOPER_ONBOARDING;
}
