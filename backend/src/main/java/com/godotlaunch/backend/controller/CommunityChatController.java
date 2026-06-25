package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.*;
import com.godotlaunch.backend.dto.response.*;
import com.godotlaunch.backend.service.CommunityChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/community/posts")
@RequiredArgsConstructor
@Tag(name = "Community", description = "Community post, comment, reaction and share APIs")
public class CommunityChatController {

    private final CommunityChatService communityChatService;

    @PostMapping
    @Operation(summary = "Create a new post", description = "Publishes a new community post, optionally attaching up to 10 media files (images/videos).")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<CommunityChatResponse>> createPost(
            @Valid @RequestBody CreatePostRequest request,
            Principal principal) {
        CommunityChatResponse response = communityChatService.createPost(principal.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Post created successfully."));
    }

    @GetMapping
    @Operation(summary = "Get community feed", description = "Retrieves a paginated list of top-level community posts, optionally filtered by a specific game.")
    public ResponseEntity<ApiResponse<Page<CommunityChatResponse>>> getPosts(
            @RequestParam(value = "game_id", required = false) UUID gameId,
            Pageable pageable) {
        Page<CommunityChatResponse> response = communityChatService.getPosts(gameId, pageable);
        return ResponseEntity.ok(ApiResponse.success(response, "Community feed retrieved successfully."));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get post details", description = "Retrieves details of a single active community post by its ID.")
    public ResponseEntity<ApiResponse<CommunityChatResponse>> getPost(@PathVariable UUID id) {
        CommunityChatResponse response = communityChatService.getPost(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Post details retrieved successfully."));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update post message", description = "Updates the text message of an existing post. Only the sender of the post is authorized to perform this action.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<CommunityChatResponse>> updatePost(
            @PathVariable UUID id,
            @Valid @RequestBody UpdatePostRequest request,
            Principal principal) {
        CommunityChatResponse response = communityChatService.updatePost(principal.getName(), id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Post updated successfully."));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Soft delete post", description = "Marks a post as deleted. Authorized for the sender or platform administrators.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<String>> deletePost(@PathVariable UUID id, Principal principal) {
        communityChatService.deletePost(principal.getName(), id);
        return ResponseEntity.ok(ApiResponse.success("Post deleted successfully.", "Post has been deleted successfully."));
    }

    @PostMapping("/{id}/comments")
    @Operation(summary = "Add a comment", description = "Adds a comment to an active community post, optionally attaching up to 10 media files.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<CommunityChatResponse>> addComment(
            @PathVariable UUID id,
            @Valid @RequestBody CreateCommentRequest request,
            Principal principal) {
        CommunityChatResponse response = communityChatService.addComment(principal.getName(), id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Comment added successfully."));
    }

    @GetMapping("/{id}/comments")
    @Operation(summary = "Get post comments", description = "Retrieves a paginated list of active comments for a specific post.")
    public ResponseEntity<ApiResponse<Page<CommunityChatResponse>>> getComments(
            @PathVariable UUID id,
            Pageable pageable) {
        Page<CommunityChatResponse> response = communityChatService.getComments(id, pageable);
        return ResponseEntity.ok(ApiResponse.success(response, "Comments retrieved successfully."));
    }

    @PostMapping("/{id}/reactions")
    @Operation(summary = "React to a post", description = "Adds or updates a user's reaction (like, love, haha, etc.) to a post.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<ChatReactionResponse>> reactToPost(
            @PathVariable UUID id,
            @Valid @RequestBody CreateReactionRequest request,
            Principal principal
            ) {
        ChatReactionResponse response = communityChatService.reactToPost(principal.getName(), id, request);
        if (response.isNew()) {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success(response, "Reaction added successfully."));
        } else {
            return ResponseEntity.ok(ApiResponse.success(response, "Reaction updated successfully."));
        }
    }

    @DeleteMapping("/{id}/reactions")
    @Operation(summary = "Remove reaction", description = "Removes a user's reaction from a post.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<String>> removeReaction(@PathVariable UUID id, Principal principal) {
        communityChatService.removeReaction(principal.getName(), id);
        return ResponseEntity.ok(ApiResponse.success("Reaction removed successfully.", "Reaction removed successfully."));
    }

    @GetMapping("/{id}/reactions")
    @Operation(summary = "Get post reactions", description = "Retrieves all reactions for a post.")
    public ResponseEntity<ApiResponse<List<ChatReactionResponse>>> getPostReactions(@PathVariable UUID id) {
        List<ChatReactionResponse> responses = communityChatService.getReactions(id);
        return ResponseEntity.ok(ApiResponse.success(responses, "Reactions retrieved successfully."));
    }

    @PostMapping("/{id}/share")
    @Operation(summary = "Share a post", description = "Shares an existing community post, creating a new post referencing the original.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<CommunityChatResponse>> sharePost(
            @PathVariable UUID id,
            @Valid @RequestBody SharePostRequest request,
            Principal principal) {
        CommunityChatResponse response = communityChatService.sharePost(principal.getName(), id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Post shared successfully."));
    }
}
