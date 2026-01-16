package com.jspcs.pos.config;

import com.jspcs.pos.entity.user.Role;
import com.jspcs.pos.entity.user.User;
import com.jspcs.pos.repository.RoleRepository;
import com.jspcs.pos.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        seedRoles();
        seedUsers();
    }

    private void seedRoles() {
        if (roleRepository.count() == 0) {
            log.info("Seeding roles...");
            roleRepository.save(Role.builder()
                    .name("ADMIN")
                    .description("System Administrator")
                    .permissions(Map.of("all", true))
                    .isActive(true)
                    .build());
            roleRepository.save(Role.builder()
                    .name("CASHIER")
                    .description("Cashier/Operator")
                    .permissions(Map.of("sales", true, "inventory_view", true))
                    .isActive(true)
                    .build());
        }
    }

    private void seedUsers() {
        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseThrow(() -> new RuntimeException("ADMIN role not found"));
        Role cashierRole = roleRepository.findByName("CASHIER")
                .orElseThrow(() -> new RuntimeException("CASHIER role not found"));

        if (!userRepository.existsByUsername("admin")) {
            log.info("Creating default admin user...");
            userRepository.save(User.builder()
                    .username("admin")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .fullName("Main Administrator")
                    .role(adminRole)
                    .isActive(true)
                    .build());
        }

        if (!userRepository.existsByUsername("admin2")) {
            log.info("Creating default admin2 user...");
            userRepository.save(User.builder()
                    .username("admin2")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .fullName("Secondary Administrator")
                    .role(adminRole)
                    .isActive(true)
                    .build());
        }

        if (!userRepository.existsByUsername("cashier")) {
            log.info("Creating default cashier user...");
            userRepository.save(User.builder()
                    .username("cashier")
                    .passwordHash(passwordEncoder.encode("cashier123"))
                    .fullName("Default Cashier")
                    .role(cashierRole)
                    .isActive(true)
                    .build());
        }
    }
}
