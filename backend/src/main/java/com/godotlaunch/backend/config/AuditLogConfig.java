package com.godotlaunch.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

@Configuration
public class AuditLogConfig {

    @Bean(name = "auditLogExecutor")
    public Executor auditLogExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);        // core size: 5 threads
        executor.setMaxPoolSize(25);       // max size: 25 threads under load
        executor.setQueueCapacity(1000);   // maximum queue capacity: 1000 tasks
        executor.setThreadNamePrefix("audit-log-");
        
        // Rejection Policy: CallerRunsPolicy makes the calling thread execute the task when pool is full.
        // This ensures no log is silently lost under extreme overload, while slowing down callers slightly.
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
