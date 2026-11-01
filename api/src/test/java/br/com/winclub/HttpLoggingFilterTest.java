package br.com.winclub;

import static org.junit.jupiter.api.Assertions.*;

import br.com.winclub.config.HttpLoggingFilter;
import jakarta.servlet.AsyncEvent;
import jakarta.servlet.ServletException;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.slf4j.MDC;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.mock.web.*;

@ExtendWith(OutputCaptureExtension.class)
class HttpLoggingFilterTest {
  @Test
  void correlatesRequestAndOmitsSensitiveValues(CapturedOutput output) throws Exception {
    var req = new MockHttpServletRequest("POST", "/api/auth/login");
    var res = new MockHttpServletResponse();
    String id = "6900427f-96e4-49b2-8b24-11518158497a";
    req.addHeader("X-Request-ID", id);
    req.addHeader("Authorization", "Bearer secret-token-value");
    req.addHeader("Cookie", "JSESSIONID=secret-session-value");
    req.setQueryString("cpf=52998224725&email=private@example.com");
    req.setContent("{\"password\":\"private-password-value\"}".getBytes(StandardCharsets.UTF_8));
    new HttpLoggingFilter().doFilter(req, res, (request, response) -> res.setStatus(401));
    assertEquals(id, res.getHeader("X-Request-ID"));
    assertTrue(output.toString().contains("status=401"));
    assertTrue(output.toString().contains("requestId=" + id));
    for (String secret :
        new String[] {
          "secret-token-value",
          "secret-session-value",
          "52998224725",
          "private@example.com",
          "private-password-value"
        }) assertFalse(output.toString().contains(secret));
    assertNull(MDC.get("requestId"));
  }

  @Test
  void replacesInvalidCorrelationIdAndMasksIdentifiers(CapturedOutput output) throws Exception {
    String orderId = "1362bdb9-50e0-412d-a0c1-51eff2517098";
    var req = new MockHttpServletRequest("GET", "/api/orders/" + orderId);
    req.addHeader("X-Request-ID", "untrusted-value");
    var res = new MockHttpServletResponse();
    new HttpLoggingFilter().doFilter(req, res, (request, response) -> {});
    assertDoesNotThrow(() -> java.util.UUID.fromString(res.getHeader("X-Request-ID")));
    assertTrue(output.toString().contains("route=/api/orders/:id"));
    assertFalse(output.toString().contains(orderId));
    assertFalse(output.toString().contains("untrusted-value"));
  }

  @Test
  void logsUnexpectedFailureAndRestoresMdc(CapturedOutput output) {
    var req = new MockHttpServletRequest("GET", "/api/health");
    var res = new MockHttpServletResponse();
    MDC.put("requestId", "parent-context");
    try {
      assertThrows(
          ServletException.class,
          () ->
              new HttpLoggingFilter()
                  .doFilter(
                      req,
                      res,
                      (request, response) -> {
                        throw new ServletException("sensitive-error-message");
                      }));
      assertTrue(output.toString().contains("status=500"));
      assertFalse(output.toString().contains("sensitive-error-message"));
      assertEquals("parent-context", MDC.get("requestId"));
    } finally {
      MDC.clear();
    }
  }

  @Test
  void waitsForAsyncCompletionAndLogsItOnce(CapturedOutput output) throws Exception {
    var req = new MockHttpServletRequest("GET", "/api/events");
    req.setAsyncSupported(true);
    var res = new MockHttpServletResponse();
    new HttpLoggingFilter()
        .doFilter(req, res, (request, response) -> request.startAsync(request, response));
    assertFalse(output.toString().contains("HTTP end"));
    var context = (MockAsyncContext) req.getAsyncContext();
    for (var listener : context.getListeners()) {
      listener.onComplete(new AsyncEvent(context));
      listener.onComplete(new AsyncEvent(context));
    }
    assertEquals(1, output.toString().lines().filter(line -> line.contains("HTTP end")).count());
    assertTrue(output.toString().contains("status=200"));
  }
}
