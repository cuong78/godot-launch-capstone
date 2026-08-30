package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.StoreDailyInstallMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StoreDailyInstallMetricRepository extends JpaRepository<StoreDailyInstallMetric, UUID> {
    Optional<StoreDailyInstallMetric> findByExternalPublishIdAndMetricDateAndCountryCode(
            UUID externalPublishId, LocalDate metricDate, String countryCode);

    List<StoreDailyInstallMetric> findByGameIdOrderByMetricDateDesc(UUID gameId);

    @Query("SELECT SUM(m.dailyUserInstalls) FROM StoreDailyInstallMetric m WHERE m.game.id = :gameId")
    Long sumDailyUserInstallsByGameId(@Param("gameId") UUID gameId);

    @Query("SELECT SUM(m.dailyUserInstalls) FROM StoreDailyInstallMetric m WHERE m.externalPublish.id = :externalPublishId")
    Long sumDailyUserInstallsByExternalPublishId(@Param("externalPublishId") UUID externalPublishId);

    List<StoreDailyInstallMetric> findAllByOrderByMetricDateDesc();
}
