package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.request.UpdateGameRequest;
import com.godotlaunch.backend.dto.response.GameResponse;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Category;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.dto.request.CreateGameRequest;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.CategoryRepository;
import com.godotlaunch.backend.service.AsyncVirusScanService;
import com.godotlaunch.backend.service.AwsS3Service;
import com.godotlaunch.backend.service.EmailService;
import com.godotlaunch.backend.service.GameService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class GameServiceImpl implements GameService {

    private final GameRepository gameRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final AwsS3Service awsS3Service;
    private final AsyncVirusScanService asyncVirusScanService;
    private final EmailService emailService;

    public GameServiceImpl(GameRepository gameRepository, UserRepository userRepository, CategoryRepository categoryRepository, AwsS3Service awsS3Service, AsyncVirusScanService asyncVirusScanService, EmailService emailService) {
        this.gameRepository = gameRepository;
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.awsS3Service = awsS3Service;
        this.asyncVirusScanService = asyncVirusScanService;
        this.emailService = emailService;
    }

    @Override
    @Transactional
    public UUID createGameDraft(CreateGameRequest request, String creatorEmail) {
        User creator = userRepository.findByEmail(creatorEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Game game = new Game();
        game.setTitle(request.getTitle());
        game.setDescription(request.getDescription());
        game.setPriceProposed(request.getPriceProposed());
        game.setCreator(creator);
        game.setStatus(GameStatus.draft);

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Category not found"));
            game.setCategory(category);
        }

        Game savedGame = gameRepository.save(game);
        return savedGame.getId();
    }

    @Override
    @Transactional(readOnly = true)
    public GameResponse getGameById(UUID gameId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));
        return mapToResponse(game);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GameResponse> getAllGames() {
        return gameRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<GameResponse> getGamesByStatus(GameStatus status) {
        return gameRepository.findByStatus(status).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public GameResponse updateGame(UUID gameId, UpdateGameRequest request, String updaterEmail) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        // Xác thực người dùng (Optional, giả định chỉ creator hoặc admin mới được sửa)
        if (!game.getCreator().getEmail().equals(updaterEmail)) {
            throw new RuntimeException("You do not have permission to update this game");
        }

        if (request.getTitle() != null) {
            game.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            game.setDescription(request.getDescription());
        }
        if (request.getPriceProposed() != null) {
            game.setPriceProposed(request.getPriceProposed());
        }
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Category not found"));
            game.setCategory(category);
        }

        Game updatedGame = gameRepository.save(game);
        return mapToResponse(updatedGame);
    }

    private GameResponse mapToResponse(Game game) {
        return GameResponse.builder()
                .id(game.getId())
                .title(game.getTitle())
                .description(game.getDescription())
                .thumbnailUrl(game.getThumbnailUrl())
                .priceProposed(game.getPriceProposed())
                .downloadPrice(game.getDownloadPrice())
                .communityAvailable(game.isCommunityAvailable())
                .status(game.getStatus().name())
                .creatorName(game.getCreator().getUsername())
                .categoryName(game.getCategory() != null ? game.getCategory().getName() : null)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public String getPresignedUploadUrl(UUID gameId, String fileType, String contentType) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        String objectKey;
        if ("thumbnail".equalsIgnoreCase(fileType)) {
            // Để đơn giản, ta gán đuôi file ảnh chung là thumbnail, S3 sẽ dựa vào contentType (image/png, image/jpeg)
            objectKey = "games/" + gameId.toString() + "/thumbnail"; 
        } else {
            objectKey = "games/" + gameId.toString() + "/game.zip";
        }
        
        return awsS3Service.generatePresignedUploadUrl(objectKey, contentType);
    }

    @Override
    @Transactional
    public void confirmUploadComplete(UUID gameId, String fileType) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        if ("thumbnail".equalsIgnoreCase(fileType)) {
            String objectKey = "games/" + gameId.toString() + "/thumbnail";
            String thumbnailUrl = awsS3Service.getFileUrl(objectKey);
            game.setThumbnailUrl(thumbnailUrl);
            gameRepository.save(game);
        } else {
            String objectKey = "games/" + gameId.toString() + "/game.zip";
            String fileUrl = awsS3Service.getFileUrl(objectKey);

            game.setFileUrl(fileUrl);
            gameRepository.save(game);
            
            // Gọi logic quét virus bất đồng bộ chỉ với file game
            asyncVirusScanService.scanAndProcessGame(gameId, objectKey);
        }
    }

    @Override
    @Transactional
    public void approveGame(UUID gameId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        if (game.getStatus() != GameStatus.pending) {
            throw new RuntimeException("Game must be in pending status to be approved");
        }

        game.setStatus(GameStatus.published);
        gameRepository.save(game);

        emailService.sendGameStatusNotification(
                game.getCreator().getEmail(),
                game.getTitle(),
                "APPROVED and PUBLISHED",
                "Your game has passed all manual checks and is now live on the store."
        );
    }

    @Override
    @Transactional
    public void rejectGame(UUID gameId, String reason) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        if (game.getStatus() != GameStatus.pending) {
            throw new RuntimeException("Game must be in pending status to be rejected");
        }

        game.setStatus(GameStatus.rejected);
        gameRepository.save(game);

        emailService.sendGameStatusNotification(
                game.getCreator().getEmail(),
                game.getTitle(),
                "REJECTED",
                reason
        );
    }
}
