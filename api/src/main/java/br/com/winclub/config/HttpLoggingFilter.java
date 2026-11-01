package br.com.winclub.config;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerMapping;

/** Logs metadata only, including security rejections and the lifecycle of SSE requests. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class HttpLoggingFilter extends OncePerRequestFilter {
  private static final Logger log = LoggerFactory.getLogger(HttpLoggingFilter.class);
  private static final String HEADER = "X-Request-ID";
  private static final String UUID_PATTERN =
      "(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    return !request.getRequestURI().startsWith("/api/");
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String supplied = request.getHeader(HEADER);
    String requestId =
        supplied != null && supplied.matches(UUID_PATTERN)
            ? supplied
            : UUID.randomUUID().toString();
    long started = System.nanoTime();
    AtomicBoolean completed = new AtomicBoolean();
    String previous = MDC.get("requestId");
    MDC.put("requestId", requestId);
    request.setAttribute("requestId", requestId);
    response.setHeader(HEADER, requestId);
    log.info(
        "HTTP start requestId={} method={} route={}",
        requestId,
        request.getMethod(),
        safePath(request.getRequestURI()));
    try {
      chain.doFilter(request, response);
    } catch (IOException | ServletException | RuntimeException | Error ex) {
      complete(request, response, requestId, started, completed, 500, "exception");
      throw ex;
    } finally {
      try {
        if (!completed.get()) {
          if (request.isAsyncStarted()) {
            var listener =
                new AsyncListener() {
                  public void onComplete(AsyncEvent event) {
                    complete(request, response, requestId, started, completed, 0, "complete");
                  }

                  public void onTimeout(AsyncEvent event) {
                    complete(request, response, requestId, started, completed, 0, "timeout");
                  }

                  public void onError(AsyncEvent event) {
                    complete(request, response, requestId, started, completed, 500, "error");
                  }

                  public void onStartAsync(AsyncEvent event) {
                    event.getAsyncContext().addListener(this);
                  }
                };
            try {
              request.getAsyncContext().addListener(listener);
            } catch (IllegalStateException ex) {
              complete(request, response, requestId, started, completed, 0, "complete");
            }
          } else complete(request, response, requestId, started, completed, 0, "complete");
        }
      } finally {
        if (previous == null) MDC.remove("requestId");
        else MDC.put("requestId", previous);
      }
    }
  }

  private void complete(
      HttpServletRequest req,
      HttpServletResponse res,
      String requestId,
      long started,
      AtomicBoolean completed,
      int forcedStatus,
      String outcome) {
    if (!completed.compareAndSet(false, true)) return;
    int status = forcedStatus == 0 ? res.getStatus() : Math.max(forcedStatus, res.getStatus());
    Object pattern = req.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
    String route = pattern == null ? safePath(req.getRequestURI()) : pattern.toString();
    long duration = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);
    String message = "HTTP end requestId={} method={} route={} status={} durationMs={} outcome={}";
    if (status >= 500)
      log.error(message, requestId, req.getMethod(), route, status, duration, outcome);
    else if (status >= 400 || outcome.equals("timeout"))
      log.warn(message, requestId, req.getMethod(), route, status, duration, outcome);
    else log.info(message, requestId, req.getMethod(), route, status, duration, outcome);
  }

  private String safePath(String path) {
    String safe =
        path.replaceAll("/" + UUID_PATTERN + "(?=/|$)", "/:id")
            .replaceAll("/\\d+(?=/|$)", "/:number")
            .replaceAll("[\\r\\n\\t]", "_");
    return safe.substring(0, Math.min(safe.length(), 256));
  }
}
