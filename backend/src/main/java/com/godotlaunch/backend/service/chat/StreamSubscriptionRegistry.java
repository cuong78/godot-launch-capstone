package com.godotlaunch.backend.service.chat;

import org.reactivestreams.Subscription;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class StreamSubscriptionRegistry {

    private final Map<String, Subscription> activeStreams = new ConcurrentHashMap<>();

    public void register(String sessionId, Subscription subscription) {
        activeStreams.put(sessionId, subscription);
    }

    public void unregister(String sessionId) {
        activeStreams.remove(sessionId);
    }

    public boolean abort(String sessionId) {
        Subscription subscription = activeStreams.remove(sessionId);
        if (subscription != null) {
            subscription.cancel();
            return true;
        }
        return false;
    }
}
