package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.TagResponse;
import com.godotlaunch.backend.entity.Tag;
import com.godotlaunch.backend.service.TagService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TagControllerTest {

    @Mock
    private TagService tagService;

    @InjectMocks
    private TagController tagController;

    private TagResponse tag1;
    private TagResponse tag2;

    @BeforeEach
    void setUp() {
        tag1 = TagResponse.builder()
                .id(UUID.randomUUID())
                .name("2D")
                .slug("2d")
                .build();

        tag2 = TagResponse.builder()
                .id(UUID.randomUUID())
                .name("Physics")
                .slug("physics")
                .build();
    }

    @Test
    @DisplayName("shouldGetAllTags_SortedByNameAsc")
    void shouldGetAllTags_SortedByNameAsc() {
        // Arrange
        when(tagService.getAll()).thenReturn(List.of(tag1, tag2));

        // Act
        ResponseEntity<ApiResponse<List<TagResponse>>> response = tagController.getAllTags();

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).hasSize(2);
        assertThat(response.getBody().getData().get(0).getName()).isEqualTo("2D");
        assertThat(response.getBody().getData().get(1).getName()).isEqualTo("Physics");
        verify(tagService, times(1)).getAll();
    }
}
