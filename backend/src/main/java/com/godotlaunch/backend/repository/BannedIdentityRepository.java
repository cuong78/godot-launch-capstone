package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.BannedIdentity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Repository
public interface BannedIdentityRepository extends JpaRepository<BannedIdentity, UUID> {

    boolean existsByKycIdNumber(String kycIdNumber);
    boolean existsByBankAccount(String bankAccount);

    /**
     * Insert banned identity kèm face embedding (vector). Dùng native vì JPA không map vector.
     * @param embedding chuỗi dạng "[0.1,0.2,...]" (pgvector literal)
     */
    @Modifying
    @Transactional
    @Query(value = """
        INSERT INTO banned_identities (user_id, face_embedding, kyc_id_number, bank_account, reason, note)
        VALUES (:userId, CAST(:embedding AS vector), :kyc, :bank, :reason, :note)
        """, nativeQuery = true)
    void insertWithFace(@Param("userId") UUID userId,
                        @Param("embedding") String embedding,
                        @Param("kyc") String kycIdNumber,
                        @Param("bank") String bankAccount,
                        @Param("reason") String reason,
                        @Param("note") String note);

    /**
     * Kiểm tra face có khớp banned identity nào không (cosine distance <= threshold).
     * @return số bản ghi khớp
     */
    @Query(value = """
        SELECT COUNT(*) FROM banned_identities
        WHERE face_embedding IS NOT NULL
          AND face_embedding <=> CAST(:embedding AS vector) <= :threshold
        """, nativeQuery = true)
    long countMatchingFace(@Param("embedding") String embedding,
                           @Param("threshold") double threshold);
}
