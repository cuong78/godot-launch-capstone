package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateLanguagePreferenceRequest {

    @NotBlank(message = "Language is required")
    @Pattern(regexp = "^(vi|en|ja)$", message = "Language must be one of: vi, en, ja")
    private String language;
}
