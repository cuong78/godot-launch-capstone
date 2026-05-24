package com.godotlaunch.backend.service;

import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.repository.GameRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.util.UUID;

@Service
public class AsyncVirusScanService {

    private static final Logger log = LoggerFactory.getLogger(AsyncVirusScanService.class);

    private final ClamAVService clamAVService;
    private final AwsS3Service awsS3Service;
    private final GameRepository gameRepository;

    public AsyncVirusScanService(ClamAVService clamAVService, AwsS3Service awsS3Service, GameRepository gameRepository) {
        this.clamAVService = clamAVService;
        this.awsS3Service = awsS3Service;
        this.gameRepository = gameRepository;
    }

    @Async
    public void scanAndProcessGame(UUID gameId, String objectKey) {
        log.info("Starting virus scan for gameId: {}, objectKey: {}", gameId, objectKey);
        
        Game game = gameRepository.findById(gameId).orElse(null);
        if (game == null) {
            log.warn("Game with id {} not found for virus scan.", gameId);
            return;
        }

        try (ResponseInputStream<GetObjectResponse> inputStream = awsS3Service.getObjectStream(objectKey)) {
            boolean isClean = clamAVService.scanStream(inputStream);

            if (isClean) {
                log.info("Scan CLEAN for gameId: {}", gameId);
                game.setStatus(GameStatus.pending); // Sạch -> Chờ Admin duyệt
            } else {
                log.warn("Scan INFECTED for gameId: {}. Deleting file and rejecting.", gameId);
                game.setStatus(GameStatus.rejected); // Có virus -> Bị từ chối
                
                // Xóa file nhiễm virus khỏi AWS S3 để đảm bảo an toàn
                awsS3Service.deleteObject(objectKey);
            }
            gameRepository.save(game);
            
        } catch (Exception e) {
            log.error("Error during virus scan for gameId: {}. Falling back to PENDING for development/testing.", gameId, e);
            try {
                if (game != null) {
                    game.setStatus(GameStatus.pending);
                    gameRepository.save(game);
                    log.info("Successfully updated game {} status to PENDING on scan error (fallback active).", gameId);
                }
            } catch (Exception ex) {
                log.error("Failed to set game status to PENDING on scan error", ex);
            }
        }
    }
}
