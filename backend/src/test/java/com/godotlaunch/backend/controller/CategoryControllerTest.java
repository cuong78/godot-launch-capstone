package com.godotlaunch.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.dto.request.CategoryRequest;
import com.godotlaunch.backend.dto.response.CategoryResponse;
import com.godotlaunch.backend.security.JwtAuthenticationFilter;
import com.godotlaunch.backend.service.CategoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Collections;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CategoryController.class)
public class CategoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CategoryService categoryService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    private CategoryResponse categoryResponse;
    private CategoryRequest categoryRequest;
    private UUID categoryId;

    @BeforeEach
    void setUp() {
        categoryId = UUID.randomUUID();
        categoryResponse = CategoryResponse.builder()
                .id(categoryId)
                .name("Action Games")
                .slug("action-games")
                .description("Action genre")
                .parentId(null)
                .createdAt(Instant.now())
                .build();

        categoryRequest = new CategoryRequest();
        categoryRequest.setName("Action Games");
        categoryRequest.setSlug("action-games");
        categoryRequest.setDescription("Action genre");
    }

    @Test
    void getAllCategories_ShouldReturnList_WhenPublic() throws Exception {
        when(categoryService.getAllCategories()).thenReturn(Collections.singletonList(categoryResponse));

        mockMvc.perform(get("/api/v1/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(categoryId.toString()))
                .andExpect(jsonPath("$.data[0].name").value("Action Games"))
                .andExpect(jsonPath("$.message").value("Categories retrieved successfully"));

        verify(categoryService, times(1)).getAllCategories();
    }

    @Test
    void getCategoryById_ShouldReturnCategory_WhenPublic() throws Exception {
        when(categoryService.getCategoryById(categoryId)).thenReturn(categoryResponse);

        mockMvc.perform(get("/api/v1/categories/{id}", categoryId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(categoryId.toString()))
                .andExpect(jsonPath("$.message").value("Category retrieved successfully"));

        verify(categoryService, times(1)).getCategoryById(categoryId);
    }

    @Test
    @WithMockUser(authorities = "ROLE_ADMIN")
    void createCategory_ShouldCreateCategory_WhenAdmin() throws Exception {
        when(categoryService.createCategory(any(CategoryRequest.class))).thenReturn(categoryResponse);

        mockMvc.perform(post("/api/v1/categories")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(categoryRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Action Games"));

        verify(categoryService, times(1)).createCategory(any(CategoryRequest.class));
    }

    @Test
    void createCategory_ShouldReturnForbidden_WhenAnonymous() throws Exception {
        mockMvc.perform(post("/api/v1/categories")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(categoryRequest)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "ROLE_PLAYER")
    void createCategory_ShouldReturnForbidden_WhenNotAdmin() throws Exception {
        mockMvc.perform(post("/api/v1/categories")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(categoryRequest)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "ROLE_ADMIN")
    void updateCategory_ShouldUpdate_WhenAdmin() throws Exception {
        when(categoryService.updateCategory(eq(categoryId), any(CategoryRequest.class))).thenReturn(categoryResponse);

        mockMvc.perform(put("/api/v1/categories/{id}", categoryId)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(categoryRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Action Games"));

        verify(categoryService, times(1)).updateCategory(eq(categoryId), any(CategoryRequest.class));
    }

    @Test
    @WithMockUser(authorities = "ROLE_ADMIN")
    void createCategory_ShouldReturn400_WhenValidationFails() throws Exception {
        CategoryRequest invalidRequest = new CategoryRequest();

        mockMvc.perform(post("/api/v1/categories")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errors.name").exists())
                .andExpect(jsonPath("$.errors.slug").exists());
    }
}
