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
import java.util.Optional;

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
    @Test
    void getAll_ShouldReturnSortedList() {
        when(tagRepository.findAllByOrderByNameAsc()).thenReturn(java.util.List.of(tag));

        java.util.List<TagResponse> responses = tagService.getAll();

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getName()).isEqualTo("Godot Engine");
    }

    @Test
    void search_ShouldReturnMatchedList() {
        when(tagRepository.search(eq("godot"), any())).thenReturn(java.util.List.of(tag));

        java.util.List<TagResponse> responses = tagService.search("godot", 5);

        assertThat(responses).hasSize(1);
    }

    @Test
    void update_ShouldModifyAndSave_WhenValid() {
        when(tagRepository.findById(tagId)).thenReturn(Optional.of(tag));
        when(tagRepository.findByName("Godot Engine")).thenReturn(Optional.empty());
        when(tagRepository.findBySlug("godot-engine")).thenReturn(Optional.empty());
        when(tagRepository.save(any(Tag.class))).thenReturn(tag);

        TagResponse response = tagService.update(tagId, request);

        assertThat(response).isNotNull();
        verify(tagRepository).save(any(Tag.class));
    }

    @Test
    void update_ShouldThrowException_WhenTagNotFound() {
        when(tagRepository.findById(tagId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tagService.update(tagId, request))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TAG_NOT_FOUND);
    }

    @Test
    void delete_ShouldRemove_WhenTagExists() {
        when(tagRepository.existsById(tagId)).thenReturn(true);

        tagService.delete(tagId);

        verify(tagRepository).deleteById(tagId);
    }

    @Test
    void delete_ShouldThrowException_WhenTagNotFound() {
        when(tagRepository.existsById(tagId)).thenReturn(false);

        assertThatThrownBy(() -> tagService.delete(tagId))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TAG_NOT_FOUND);
    }
}
