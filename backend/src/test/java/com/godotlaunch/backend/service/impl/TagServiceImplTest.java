package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.TagRequest;
import com.godotlaunch.backend.dto.response.TagResponse;
import com.godotlaunch.backend.entity.Tag;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.TagRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TagServiceImplTest {

    @Mock
    private TagRepository tagRepository;

    @InjectMocks
    private TagServiceImpl tagService;

    private TagRequest request;
    private Tag tag;
    private UUID tagId;

    @BeforeEach
    void setUp() {
        tagId = UUID.randomUUID();
        request = new TagRequest();
        request.setName("Godot Engine");
        request.setSlug("godot-engine");

        tag = new Tag();
        tag.setId(tagId);
        tag.setName("Godot Engine");
        tag.setSlug("godot-engine");
    }

    @Test
    @DisplayName("Should successfully create tag with unique name and slug")
    void create_UTCID01_Success() {
        when(tagRepository.existsByName(request.getName())).thenReturn(false);
        when(tagRepository.existsBySlug(request.getSlug())).thenReturn(false);
        when(tagRepository.save(any(Tag.class))).thenReturn(tag);

        TagResponse response = tagService.create(request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(tagId);
        assertThat(response.getName()).isEqualTo("Godot Engine");
        assertThat(response.getSlug()).isEqualTo("godot-engine");
        verify(tagRepository, times(1)).save(any(Tag.class));
    }

    @Test
    @DisplayName("Should throw TAG_ALREADY_EXISTS when tag name already exists")
    void create_UTCID02_TagAlreadyExistsByName() {
        when(tagRepository.existsByName(request.getName())).thenReturn(true);

        assertThatThrownBy(() -> tagService.create(request))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TAG_ALREADY_EXISTS);

        verify(tagRepository, never()).save(any(Tag.class));
    }

    @Test
    @DisplayName("Should throw TAG_ALREADY_EXISTS when tag slug already exists")
    void create_UTCID03_TagAlreadyExistsBySlug() {
        when(tagRepository.existsByName(request.getName())).thenReturn(false);
        when(tagRepository.existsBySlug(request.getSlug())).thenReturn(true);

        assertThatThrownBy(() -> tagService.create(request))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TAG_ALREADY_EXISTS);

        verify(tagRepository, never()).save(any(Tag.class));
    }
}
