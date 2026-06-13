package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.*;
import com.godotlaunch.backend.dto.response.ChatReactionResponse;
import com.godotlaunch.backend.dto.response.CommunityChatResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface CommunityChatService {

    CommunityChatResponse createPost(String email, CreatePostRequest request);

    Page<CommunityChatResponse> getPosts(UUID gameId, Pageable pageable);

    CommunityChatResponse getPost(UUID id);

    CommunityChatResponse updatePost(String email, UUID id, UpdatePostRequest request);

    void deletePost(String email, UUID id);

    CommunityChatResponse addComment(String email, UUID id, CreateCommentRequest request);

    Page<CommunityChatResponse> getComments(UUID id, Pageable pageable);

    ChatReactionResponse reactToPost( UUID id, CreateReactionRequest request);

    void removeReaction(String email, UUID id);

    CommunityChatResponse sharePost(String email, UUID id, SharePostRequest request);
}
