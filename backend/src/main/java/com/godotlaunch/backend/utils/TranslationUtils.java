package com.godotlaunch.backend.utils;

import com.godotlaunch.backend.dto.response.CategoryResponse;
import com.godotlaunch.backend.dto.response.TagResponse;
import com.godotlaunch.backend.dto.response.BannerResponse;
import com.godotlaunch.backend.entity.Category;
import com.godotlaunch.backend.entity.Tag;
import com.godotlaunch.backend.entity.Banner;
import org.springframework.context.i18n.LocaleContextHolder;

import java.util.Locale;

public class TranslationUtils {

    public static String getLanguage() {
        Locale locale = LocaleContextHolder.getLocale();
        return locale != null ? locale.getLanguage().toLowerCase() : "vi";
    }

    public static String resolve(String vi, String en, String ja, String fallback) {
        String lang = getLanguage();
        String val = switch (lang) {
            case "vi" -> vi;
            case "ja" -> ja;
            default -> en;
        };
        return (val != null && !val.trim().isEmpty()) ? val : fallback;
    }

    public static CategoryResponse mapCategory(Category category) {
        if (category == null) return null;
        String name = resolve(category.getNameVi(), category.getNameEn(), category.getNameJa(), category.getName());
        String description = resolve(category.getDescriptionVi(), category.getDescriptionEn(), category.getDescriptionJa(), category.getDescription());
        
        return CategoryResponse.builder()
                .id(category.getId())
                .name(name)
                .slug(category.getSlug())
                .description(description)
                .parentId(category.getParent() != null ? category.getParent().getId() : null)
                .type(category.getType())
                .defaultName(category.getName())
                .nameVi(category.getNameVi())
                .nameEn(category.getNameEn())
                .nameJa(category.getNameJa())
                .defaultDescription(category.getDescription())
                .descriptionVi(category.getDescriptionVi())
                .descriptionEn(category.getDescriptionEn())
                .descriptionJa(category.getDescriptionJa())
                .createdAt(category.getCreatedAt())
                .build();
    }

    public static TagResponse mapTag(Tag tag) {
        if (tag == null) return null;
        String name = resolve(tag.getNameVi(), tag.getNameEn(), tag.getNameJa(), tag.getName());
        
        return TagResponse.builder()
                .id(tag.getId())
                .name(name)
                .slug(tag.getSlug())
                .defaultName(tag.getName())
                .nameVi(tag.getNameVi())
                .nameEn(tag.getNameEn())
                .nameJa(tag.getNameJa())
                .build();
    }

    public static String resolveTagName(Tag tag) {
        if (tag == null) return null;
        return resolve(tag.getNameVi(), tag.getNameEn(), tag.getNameJa(), tag.getName());
    }

    public static BannerResponse mapBanner(Banner banner) {
        if (banner == null) return null;
        String title = resolve(banner.getTitleVi(), banner.getTitleEn(), banner.getTitleJa(), banner.getTitle());
        String description = resolve(banner.getDescriptionVi(), banner.getDescriptionEn(), banner.getDescriptionJa(), banner.getDescription());
        
        return BannerResponse.builder()
                .id(banner.getId())
                .title(title)
                .description(description)
                .imageUrl(banner.getImageUrl())
                .displayOrder(banner.getDisplayOrder())
                .createdAt(banner.getCreatedAt())
                .updatedAt(banner.getUpdatedAt())
                .build();
    }
}
