package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.entity.BannedIdentity;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.repository.BannedIdentityRepository;
import com.godotlaunch.backend.service.BannedIdentityService;
import com.godotlaunch.backend.service.EncryptionService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BannedIdentityServiceImpl implements BannedIdentityService {

    private final BannedIdentityRepository bannedIdentityRepository;
    private final EncryptionService encryptionService;

    @PersistenceContext
    private EntityManager entityManager;

    private static final double FACE_THRESHOLD = 0.5;

    @Override
    @Transactional
    public void banUser(User user, String reason) {
        // Lấy face embedding của user từ face_embeddings (nếu đã verify Tier 1)
        String faceLiteral = fetchUserFaceEmbedding(user.getId().toString());

        String encKyc = user.getKycIdNumber() != null
                ? encryptionService.encrypt(user.getKycIdNumber()) : null;

        if (faceLiteral != null) {
            // Có face → insert kèm vector qua native
            bannedIdentityRepository.insertWithFace(
                    user.getId(), faceLiteral, encKyc, null, reason,
                    "Auto-ban từ dispute resolution");
        } else {
            // Không có face → lưu KYC thường
            BannedIdentity banned = new BannedIdentity();
            banned.setUserId(user.getId());
            banned.setKycIdNumber(encKyc);
            banned.setReason(reason);
            banned.setNote("Auto-ban từ dispute resolution (no face)");
            bannedIdentityRepository.save(banned);
        }
        log.info("Đã ban identity user={} reason={}", user.getId(), reason);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isFaceBanned(String embeddingVectorLiteral) {
        if (embeddingVectorLiteral == null) return false;
        return bannedIdentityRepository.countMatchingFace(embeddingVectorLiteral, FACE_THRESHOLD) > 0;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isKycBanned(String plainIdNumber) {
        if (plainIdNumber == null) return false;
        return bannedIdentityRepository.existsByKycIdNumber(encryptionService.encrypt(plainIdNumber));
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isBankBanned(String plainBankAccount) {
        if (plainBankAccount == null) return false;
        return bannedIdentityRepository.existsByBankAccount(encryptionService.encrypt(plainBankAccount));
    }

    /** Lấy face embedding mới nhất của user dạng pgvector literal "[...]". */
    private String fetchUserFaceEmbedding(String userId) {
        try {
            Query q = entityManager.createNativeQuery(
                    "SELECT embedding::text FROM face_embeddings WHERE user_id = CAST(:uid AS uuid) " +
                    "ORDER BY created_at DESC LIMIT 1");
            q.setParameter("uid", userId);
            List<?> result = q.getResultList();
            if (!result.isEmpty() && result.get(0) != null) {
                return result.get(0).toString();
            }
        } catch (Exception e) {
            log.warn("Không lấy được face embedding của user {}: {}", userId, e.getMessage());
        }
        return null;
    }
}
