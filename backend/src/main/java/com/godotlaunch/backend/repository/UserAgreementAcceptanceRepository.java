package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.UserAgreementAcceptance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserAgreementAcceptanceRepository extends JpaRepository<UserAgreementAcceptance, UUID> {

    boolean existsByUserIdAndAgreementVersionId(UUID userId, UUID agreementVersionId);

    Optional<UserAgreementAcceptance> findTopByUserIdOrderByAcceptedAtDesc(UUID userId);
}
