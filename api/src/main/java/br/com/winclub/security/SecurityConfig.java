package br.com.winclub.security;

import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.*;

@Configuration
public class SecurityConfig {
  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  @Bean
  SecurityFilterChain security(HttpSecurity http, @Value("${app.cors-origins}") String origins)
      throws Exception {
    var cors = new CorsConfiguration();
    cors.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).toList());
    cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    cors.setAllowedHeaders(List.of("Content-Type", "X-Requested-With", "X-Request-ID"));
    cors.setExposedHeaders(List.of("X-Request-ID"));
    cors.setAllowCredentials(true);
    var source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", cors);
    return http.cors(c -> c.configurationSource(source))
        .csrf(c -> c.disable())
        .authorizeHttpRequests(
            a ->
                a.requestMatchers("/api/admin/**", "/api/auth/me", "/api/auth/logout-all")
                    .hasRole("ADMIN")
                    .anyRequest()
                    .permitAll())
        .exceptionHandling(
            e ->
                e.authenticationEntryPoint(
                    (req, res, ex) -> {
                      res.setStatus(401);
                      res.setContentType("application/json");
                      res.getWriter()
                          .write("{\"message\":\"Autenticação necessária\",\"statusCode\":401}");
                    }))
        .headers(h -> h.frameOptions(f -> f.deny()))
        .build();
  }
}
