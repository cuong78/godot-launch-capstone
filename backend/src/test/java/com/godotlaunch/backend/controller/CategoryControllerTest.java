package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CategoryRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.CategoryResponse;
import com.godotlaunch.backend.service.CategoryService;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryControllerTest {

    @Mock
    private CategoryService categoryService;

    @InjectMocks
    private CategoryController categoryController;

    private UUID categoryId;
    private CategoryResponse categoryResponse;

    @BeforeEach
    void setUp() {
        categoryId = UUID.randomUUID();
        categoryResponse = CategoryResponse.builder()
                .id(categoryId)
                .name("Action")
                .slug("action")
                .type("game")
                .build();
    }

    @Test
    @DisplayName("shouldCreateCategory_WhenValidRequest")
    void shouldCreateCategory_WhenValidRequest() {
        // Arrange
        CategoryRequest request = new CategoryRequest();
        request.setName("Action");
        request.setSlug("action");
        request.setType("game");

        when(categoryService.createCategory(any(CategoryRequest.class))).thenReturn(categoryResponse);

        // Act
        ResponseEntity<ApiResponse<CategoryResponse>> response = categoryController.createCategory(request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getData().getName()).isEqualTo("Action");
        verify(categoryService, times(1)).createCategory(request);
    }

    @Test
    @DisplayName("shouldUpdateCategory_WhenValidRequest")
    void shouldUpdateCategory_WhenValidRequest() {
        // Arrange
        CategoryRequest request = new CategoryRequest();
        request.setName("Action RPG");
        request.setSlug("action-rpg");
        request.setType("game");

        CategoryResponse updatedResp = CategoryResponse.builder()
                .id(categoryId)
                .name("Action RPG")
                .slug("action-rpg")
                .type("game")
                .build();

        when(categoryService.updateCategory(eq(categoryId), any(CategoryRequest.class))).thenReturn(updatedResp);

        // Act
        ResponseEntity<ApiResponse<CategoryResponse>> response = categoryController.updateCategory(categoryId, request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getName()).isEqualTo("Action RPG");
        verify(categoryService, times(1)).updateCategory(categoryId, request);
    }

    @Test
    @DisplayName("shouldGetAllCategories_WhenTypeFilterProvidedOrNull")
    void shouldGetAllCategories_WhenTypeFilterProvidedOrNull() {
        // Arrange
        when(categoryService.getCategoriesByType("game")).thenReturn(List.of(categoryResponse));
        when(categoryService.getAllCategories()).thenReturn(List.of(categoryResponse));

        // Act - filtered
        ResponseEntity<ApiResponse<List<CategoryResponse>>> filtered = categoryController.getAllCategories("game");
        // Act - all
        ResponseEntity<ApiResponse<List<CategoryResponse>>> all = categoryController.getAllCategories(null);

        // Assert
        assertThat(filtered.getBody().getData()).hasSize(1);
        assertThat(all.getBody().getData()).hasSize(1);
        verify(categoryService, times(1)).getCategoriesByType("game");
        verify(categoryService, times(1)).getAllCategories();
    }

    @Test
    @DisplayName("shouldGetCategoryById_WhenExists")
    void shouldGetCategoryById_WhenExists() {
        // Arrange
        when(categoryService.getCategoryById(categoryId)).thenReturn(categoryResponse);

        // Act
        ResponseEntity<ApiResponse<CategoryResponse>> response = categoryController.getCategoryById(categoryId);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getId()).isEqualTo(categoryId);
        verify(categoryService, times(1)).getCategoryById(categoryId);
    }

    @Test
    @DisplayName("shouldDeleteCategory_WhenValidId")
    void shouldDeleteCategory_WhenValidId() {
        // Arrange
        doNothing().when(categoryService).deleteCategory(categoryId);

        // Act
        ResponseEntity<ApiResponse<Void>> response = categoryController.deleteCategory(categoryId);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(categoryService, times(1)).deleteCategory(categoryId);
    }
}
