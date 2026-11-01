package br.com.winclub.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RequestGuard extends OncePerRequestFilter {
  private final Set<String> origins;
  private final ConcurrentHashMap<String, Window> attempts = new ConcurrentHashMap<>();

  private record Window(long minute, int count) {}

  public RequestGuard(@Value("${app.cors-origins}") String origins) {
    this.origins = new HashSet<>(Arrays.asList(origins.split(",")));
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest req, HttpServletResponse res, FilterChain chain)
      throws ServletException, IOException {
    boolean mutation = Set.of("POST", "PUT", "PATCH", "DELETE").contains(req.getMethod());
    boolean webhook = req.getRequestURI().startsWith("/api/webhooks/");
    if (mutation && !webhook) {
      String origin = req.getHeader("Origin");
      boolean sessionCookie =
          req.getCookies() != null
              && Arrays.stream(req.getCookies()).anyMatch(c -> c.getName().equals("JSESSIONID"));
      if ((origin != null && !origins.contains(origin))
          || "cross-site".equals(req.getHeader("Sec-Fetch-Site"))
          || (sessionCookie && origin == null)) {
        reject(res, 403, "Origem não permitida");
        return;
      }
    }
    if (mutation && !webhook) {
      int limit = req.getRequestURI().matches(".*/(login|lookup|register)$") ? 6 : 60;
      long minute = Instant.now().getEpochSecond() / 60;
      if (attempts.size() > 10000) attempts.entrySet().removeIf(e -> e.getValue().minute != minute);
      String route = req.getRequestURI().replaceAll("/[0-9a-fA-F-]{36}(?=/|$)", "/:id");
      var window =
          attempts.compute(
              req.getRemoteAddr() + ":" + route,
              (k, v) -> new Window(minute, v == null || v.minute != minute ? 1 : v.count + 1));
      if (window.count > limit) {
        res.setHeader("Retry-After", "60");
        reject(res, 429, "Muitas tentativas");
        return;
      }
    }
    chain.doFilter(req, res);
  }

  private void reject(HttpServletResponse res, int status, String message) throws IOException {
    res.setStatus(status);
    res.setContentType("application/json;charset=UTF-8");
    res.getWriter().write("{\"statusCode\":" + status + ",\"message\":\"" + message + "\"}");
  }
}
