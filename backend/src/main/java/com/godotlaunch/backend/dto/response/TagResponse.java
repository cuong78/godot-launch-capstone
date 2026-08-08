package com.godotlaunch.backend.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class TagResponse {
    private UUID id;
    private String name;
    private String slug;
    private String defaultName;
    private String nameVi;
    private String nameEn;
    private String nameJa;
}
