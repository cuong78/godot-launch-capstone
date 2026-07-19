package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.AgreementVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AgreementVersionRepository extends JpaRepository<AgreementVersion, UUID> {

    Optional<AgreementVersion> findByIsActiveTrue();

    List<AgreementVersion> findAllByOrderByVersionDesc();

    Optional<AgreementVersion> findTopByOrderByVersionDesc();
}
