package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.*;
import com.godotlaunch.backend.dto.response.*;
import com.godotlaunch.backend.entity.*;
import com.godotlaunch.backend.entity.enums.ChatMediaType;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.*;
import com.godotlaunch.backend.service.CommunityChatService;
import com.godotlaunch.backend.service.NotificationService;
import com.godotlaunch.backend.entity.enums.NotificationType;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommunityChatServiceImpl implements CommunityChatService {

    private final UserRepository userRepository;
    private final GameRepository gameRepository;
    private final CommunityChatRepository communityChatRepository;
    private final ChatMediaRepository chatMediaRepository;
    private final ChatReactionRepository chatReactionRepository;
    private final UserIpLogRepository userIpLogRepository;
    private final HttpServletRequest httpServletRequest;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public CommunityChatResponse createPost(String email, CreatePostRequest request) {
        User currentUser = getCurrentUser(email);

        List<String> mediaUrls = request.getMediaUrls();
        if (mediaUrls != null && mediaUrls.size() > 10) {
            throw new AppException(ErrorCode.MEDIA_LIMIT_EXCEEDED);
        }

        Game game = null;
        if (request.getGameId() != null) {
            game = gameRepository.findById(request.getGameId())
                    .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));
        }

        CommunityChat post = new CommunityChat();
        post.setSender(currentUser);
        post.setGame(game);
        post.setMessage(request.getMessage());
        post.setReactionCount(0);
        post.setCommentCount(0);
        post.setShareCount(0);
        post.setEdited(false);
        post.setDeleted(false);
        post.setCreatedAt(java.time.Instant.now());
        post.setUpdatedAt(java.time.Instant.now());

        post = communityChatRepository.save(post);

        if (mediaUrls != null && !mediaUrls.isEmpty()) {
            for (int i = 0; i < mediaUrls.size(); i++) {
                String url = mediaUrls.get(i);
                ChatMedia mediaEntity = new ChatMedia();
                mediaEntity.setChat(post);
                mediaEntity.setUrl(url);
                mediaEntity.setDisplayOrder((short) i);

                String lowerUrl = url.toLowerCase();
                if (lowerUrl.endsWith(".mp4") || lowerUrl.endsWith(".mov") || lowerUrl.endsWith(".webm") || lowerUrl.startsWith("data:video/")) {
                    mediaEntity.setMediaType(ChatMediaType.video);
                } else {
                    mediaEntity.setMediaType(ChatMediaType.image);
                }
                chatMediaRepository.save(mediaEntity);
            }
        }

        logIp(currentUser, "post_chat");

        return mapToResponse(post);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CommunityChatResponse> getPosts(UUID gameId, Pageable pageable) {
        Page<CommunityChat> posts = communityChatRepository.findFeed(gameId, pageable);
        return posts.map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public CommunityChatResponse getPost(UUID id) {
        CommunityChat post = communityChatRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.CHAT_NOT_FOUND));
        return mapToResponse(post);
    }

    @Override
    @Transactional
    public CommunityChatResponse updatePost(String email, UUID id, UpdatePostRequest request) {
        CommunityChat post = communityChatRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CHAT_NOT_FOUND));
        if (post.isDeleted()) {
            throw new AppException(ErrorCode.CHAT_ALREADY_DELETED);
        }

        User currentUser = getCurrentUser(email);
        validateOwnership(post, currentUser, false); // Owner only

        post.setMessage(request.getMessage());
        post.setEdited(true);
        post.setUpdatedAt(java.time.Instant.now());

        CommunityChat updated = communityChatRepository.save(post);
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public void deletePost(String email, UUID id) {
        CommunityChat post = communityChatRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CHAT_NOT_FOUND));
        if (post.isDeleted()) {
            throw new AppException(ErrorCode.CHAT_ALREADY_DELETED);
        }

        User currentUser = getCurrentUser(email);
        validateOwnership(post, currentUser, true); // Owner or Admin

        post.setDeleted(true);
        communityChatRepository.save(post);
    }

    @Override
    @Transactional
    public CommunityChatResponse addComment(String email, UUID id, CreateCommentRequest request) {
        CommunityChat parentPost = communityChatRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CHAT_NOT_FOUND));
        if (parentPost.isDeleted()) {
            throw new AppException(ErrorCode.CHAT_ALREADY_DELETED);
        }

        User currentUser = getCurrentUser(email);

        List<String> mediaUrls = request.getMediaUrls();
        if (mediaUrls != null && mediaUrls.size() > 10) {
            throw new AppException(ErrorCode.MEDIA_LIMIT_EXCEEDED);
        }

        CommunityChat comment = new CommunityChat();
        comment.setSender(currentUser);
        comment.setParentMessage(parentPost);
        comment.setGame(parentPost.getGame());
        comment.setMessage(request.getMessage());
        comment.setReactionCount(0);
        comment.setCommentCount(0);
        comment.setShareCount(0);
        comment.setEdited(false);
        comment.setDeleted(false);
        comment.setCreatedAt(java.time.Instant.now());
        comment.setUpdatedAt(java.time.Instant.now());

        comment = communityChatRepository.save(comment);

        if (mediaUrls != null && !mediaUrls.isEmpty()) {
            for (int i = 0; i < mediaUrls.size(); i++) {
                String url = mediaUrls.get(i);
                ChatMedia mediaEntity = new ChatMedia();
                mediaEntity.setChat(comment);
                mediaEntity.setUrl(url);
                mediaEntity.setDisplayOrder((short) i);

                String lowerUrl = url.toLowerCase();
                if (lowerUrl.endsWith(".mp4") || lowerUrl.endsWith(".mov") || lowerUrl.endsWith(".webm") || lowerUrl.startsWith("data:video/")) {
                    mediaEntity.setMediaType(ChatMediaType.video);
                } else {
                    mediaEntity.setMediaType(ChatMediaType.image);
                }
                chatMediaRepository.save(mediaEntity);
            }
        }

        parentPost.setCommentCount(parentPost.getCommentCount() + 1);
        communityChatRepository.save(parentPost);

        logIp(currentUser, "post_chat");

        notificationService.createAndSendNotification(
                parentPost.getSender(),
                currentUser,
                NotificationType.COMMENT,
                currentUser.getFullName() + " commented on your post: " + comment.getMessage(),
                parentPost.getId().toString()
        );

        return mapToResponse(comment);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CommunityChatResponse> getComments(UUID id, Pageable pageable) {
        CommunityChat parentPost = communityChatRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CHAT_NOT_FOUND));
        if (parentPost.isDeleted()) {
            throw new AppException(ErrorCode.CHAT_NOT_FOUND);
        }

        Page<CommunityChat> comments = communityChatRepository.findByParentMessageIdAndIsDeletedFalse(id, pageable);
        return comments.map(this::mapToResponse);
    }

    @Override
    @Transactional
    public ChatReactionResponse reactToPost(String email, UUID id, CreateReactionRequest request) {
        CommunityChat post = communityChatRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CHAT_NOT_FOUND));
        if (post.isDeleted()) {
            throw new AppException(ErrorCode.CHAT_ALREADY_DELETED);
        }

        User currentUser = getCurrentUser(email);

        ChatReaction reaction;
        boolean isNew = false;

        var existingOpt = chatReactionRepository.findByChatIdAndUserId(id, currentUser.getId());

        if (existingOpt.isEmpty()) {
            // CASE 1: User has NOT reacted before
            reaction = new ChatReaction();
            reaction.setChat(post);
            reaction.setUser(currentUser);
            reaction.setReactionType(request.getReactionType());
            reaction = chatReactionRepository.save(reaction);
            isNew = true;

            post.setReactionCount(post.getReactionCount() + 1);
            communityChatRepository.save(post);

            notificationService.createAndSendNotification(
                    post.getSender(),
                    currentUser,
                    NotificationType.REACTION,
                    currentUser.getFullName() + " liked your post.",
                    post.getId().toString()
            );
        } else {
            reaction = existingOpt.get();
            if (!reaction.getReactionType().equals(request.getReactionType())) {
                // CASE 2: User HAS reacted before + reaction_type is DIFFERENT
                reaction.setReactionType(request.getReactionType());
                reaction = chatReactionRepository.save(reaction);
            }
            // CASE 3: User HAS reacted before + reaction_type is SAME -> Do nothing
        }

        ChatReactionResponse response = mapToReactionResponse(reaction);
        response.setNew(isNew);
        return response;
    }

    @Override
    @Transactional
    public void removeReaction(String email, UUID id) {
        CommunityChat post = communityChatRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CHAT_NOT_FOUND));
        if (post.isDeleted()) {
            throw new AppException(ErrorCode.CHAT_ALREADY_DELETED);
        }

        User currentUser = getCurrentUser(email);

        ChatReaction reaction = chatReactionRepository.findByChatIdAndUserId(id, currentUser.getId())
                .orElseThrow(() -> new AppException(ErrorCode.REACTION_NOT_FOUND));

        chatReactionRepository.delete(reaction);

        post.setReactionCount(Math.max(0, post.getReactionCount() - 1));
        communityChatRepository.save(post);
    }

    @Override
    @Transactional
    public CommunityChatResponse sharePost(String email, UUID id, SharePostRequest request) {
        CommunityChat originalPost = communityChatRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CHAT_NOT_FOUND));
        if (originalPost.isDeleted()) {
            throw new AppException(ErrorCode.CHAT_ALREADY_DELETED);
        }

        User currentUser = getCurrentUser(email);

        CommunityChat shared = new CommunityChat();
        shared.setSender(currentUser);
        shared.setOriginalChat(originalPost);
        shared.setGame(originalPost.getGame());
        shared.setMessage(request.getMessage() != null ? request.getMessage() : "");
        shared.setReactionCount(0);
        shared.setCommentCount(0);
        shared.setShareCount(0);
        shared.setEdited(false);
        shared.setDeleted(false);
        shared.setCreatedAt(java.time.Instant.now());
        shared.setUpdatedAt(java.time.Instant.now());

        shared = communityChatRepository.save(shared);

        originalPost.setShareCount(originalPost.getShareCount() + 1);
        communityChatRepository.save(originalPost);

        notificationService.createAndSendNotification(
                originalPost.getSender(),
                currentUser,
                NotificationType.SHARE,
                currentUser.getFullName() + " shared your post.",
                originalPost.getId().toString()
        );

        return mapToResponse(shared);
    }

    // --- Private Helper Methods ---

    private User getCurrentUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private void validateOwnership(CommunityChat chat, User currentUser, boolean allowAdmin) {
        boolean isOwner = chat.getSender().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole().getName().equals("admin");
        if (!isOwner && (!allowAdmin || !isAdmin)) {
            throw new AppException(ErrorCode.CHAT_ACCESS_DENIED);
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }

    private void logIp(User user, String action) {
        String ipAddress = getClientIp(httpServletRequest);
        String userAgent = httpServletRequest.getHeader("User-Agent");
        UserIpLog log = UserIpLog.builder()
                .user(user)
                .ipAddress(ipAddress)
                .action(action)
                .userAgent(userAgent)
                .build();
        userIpLogRepository.save(log);
    }

    private CommunityChatResponse mapToResponse(CommunityChat chat) {
        if (chat == null) {
            return null;
        }

        List<ChatMedia> media = chatMediaRepository.findByChatIdOrderByDisplayOrderAsc(chat.getId());
        List<CommunityChatResponse.ChatMediaResponse> mediaFiles = media.stream()
                .map(m -> CommunityChatResponse.ChatMediaResponse.builder()
                        .url(m.getUrl())
                        .mediaType(m.getMediaType().name())
                        .build())
                .toList();

        UserSummary senderSummary = UserSummary.builder()
                .id(chat.getSender().getId())
                .fullName(chat.getSender().getFullName())
                .avatarUrl(chat.getSender().getAvatarUrl())
                .build();

        CommunityChatResponse originalChatResponse = null;
        if (chat.getOriginalChat() != null) {
            originalChatResponse = mapToResponse(chat.getOriginalChat());
        }

        UUID gameId = chat.getGame() != null ? chat.getGame().getId() : null;

        return CommunityChatResponse.builder()
                .id(chat.getId())
                .sender(senderSummary)
                .gameId(gameId)
                .message(chat.getMessage())
                .reactionCount(chat.getReactionCount())
                .commentCount(chat.getCommentCount())
                .shareCount(chat.getShareCount())
                .isEdited(chat.isEdited())
                .isDeleted(chat.isDeleted())
                .mediaFiles(mediaFiles)
                .createdAt(chat.getCreatedAt() != null ? chat.getCreatedAt() : java.time.Instant.now())
                .updatedAt(chat.getUpdatedAt() != null ? chat.getUpdatedAt() : java.time.Instant.now())
                .originalChat(originalChatResponse)
                .build();
    }

    private ChatReactionResponse mapToReactionResponse(ChatReaction reaction) {
        UserSummary userSummary = UserSummary.builder()
                .id(reaction.getUser().getId())
                .fullName(reaction.getUser().getFullName())
                .avatarUrl(reaction.getUser().getAvatarUrl())
                .build();

        return ChatReactionResponse.builder()
                .id(reaction.getId())
                .chatId(reaction.getChat().getId())
                .user(userSummary)
                .reactionType(reaction.getReactionType())
                .createdAt(reaction.getCreatedAt())
                .build();
    }
}
