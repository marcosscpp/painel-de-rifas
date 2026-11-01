package br.com.winclub.controller;

import static br.com.winclub.service.Views.map;

import br.com.winclub.dto.Requests.Login;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final String email, passwordHash;
  private final PasswordEncoder encoder;
  private final Set<HttpSession> sessions = ConcurrentHashMap.newKeySet();

  public AuthController(
      @Value("${app.admin-email}") String email,
      @Value("${app.admin-password}") String password,
      PasswordEncoder encoder) {
    if (email.isBlank() || password.length() < 12)
      throw new IllegalStateException(
          "Configure ADMIN_EMAIL e ADMIN_PASSWORD (mínimo 12 caracteres)");
    this.email = email;
    this.encoder = encoder;
    passwordHash = encoder.encode(password);
  }

  private Map<String, Object> user() {
    return map("id", "admin", "name", "Administrador", "email", email, "role", "ADMIN");
  }

  @PostMapping("/login")
  public Object login(
      @Valid @RequestBody Login input, HttpServletRequest req, HttpServletResponse res) {
    boolean valid = encoder.matches(input.password(), passwordHash);
    if (!valid || !email.equalsIgnoreCase(input.email()))
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciais inválidas");
    if (req.getSession(false) != null) req.changeSessionId();
    var context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(
        new UsernamePasswordAuthenticationToken(
            email, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
    SecurityContextHolder.setContext(context);
    new HttpSessionSecurityContextRepository().saveContext(context, req, res);
    sessions.add(req.getSession());
    return user();
  }

  @GetMapping("/me")
  public Object me() {
    return user();
  }

  @PostMapping("/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void logout(HttpServletRequest req) {
    var s = req.getSession(false);
    if (s != null) {
      sessions.remove(s);
      s.invalidate();
    }
    SecurityContextHolder.clearContext();
  }

  @PostMapping("/logout-all")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void logoutAll() {
    for (var s : sessions) {
      try {
        s.invalidate();
      } catch (IllegalStateException ignored) {
      }
    }
    sessions.clear();
    SecurityContextHolder.clearContext();
  }
}
