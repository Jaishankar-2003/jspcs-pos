package com.jspcs.pos.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        ConcurrentMapCacheManager cacheManager = new ConcurrentMapCacheManager();
        
        // Configure cache settings
        cacheManager.setAllowNullValues(false);
        
        // Configure individual caches
        cacheManager.setCacheNames(Arrays.asList(
                "products",
                "inventory", 
                "users",
                "reports",
                "dailySales",
                "monthlySales"
        ));
        
        return cacheManager;
    }
}
