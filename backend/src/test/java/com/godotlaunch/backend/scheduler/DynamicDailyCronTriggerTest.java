package com.godotlaunch.backend.scheduler;

import org.junit.jupiter.api.Test;
import org.springframework.scheduling.support.SimpleTriggerContext;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class DynamicDailyCronTriggerTest {

    @Test
    void eligibleWithdrawalWaitsUntilNextConfiguredDailyMaintenanceRun() {
        Instant now = Instant.parse("2026-08-09T02:00:00Z"); // 09:00 in Vietnam
        DynamicDailyCronTrigger trigger = new DynamicDailyCronTrigger(() -> LocalTime.of(10, 30));
        SimpleTriggerContext context = new SimpleTriggerContext(Clock.fixed(now, ZoneOffset.UTC));

        Instant nextRun = trigger.nextExecution(context);

        assertThat(nextRun).isEqualTo(Instant.parse("2026-08-09T03:30:00Z"));
        assertThat(nextRun).isAfter(now);
    }
}
