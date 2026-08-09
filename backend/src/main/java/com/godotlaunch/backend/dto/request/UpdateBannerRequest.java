package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateBannerRequest {

    @NotBlank
    @Size(max = 200)
    private String title;

    private String titleVi;
    private String titleEn;
    private String titleJa;

    @NotBlank
    @Size(max = 1000)
    private String description;

    private String descriptionVi;
    private String descriptionEn;
    private String descriptionJa;

    @NotBlank
    private String imageUrl;

    @NotNull
    @PositiveOrZero
    private Integer displayOrder;
}
