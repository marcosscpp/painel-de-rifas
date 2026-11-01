package br.com.winclub.controller;

import static br.com.winclub.service.Views.map;

import br.com.winclub.integration.*;
import br.com.winclub.repository.DocumentRepository;
import br.com.winclub.service.*;
import java.time.Instant;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class SettingsController {
  private final SettingsService settings;
  private final DocumentRepository db;
  private final PaymentGateway payment;
  private final PublicDataGateway data;
  private final tools.jackson.databind.json.JsonMapper json;
  private final jakarta.validation.Validator validator;

  public SettingsController(
      SettingsService settings,
      DocumentRepository db,
      PaymentGateway payment,
      PublicDataGateway data,
      tools.jackson.databind.json.JsonMapper json,
      jakarta.validation.Validator validator) {
    this.settings = settings;
    this.db = db;
    this.payment = payment;
    this.data = data;
    this.json = json;
    this.validator = validator;
  }

  @GetMapping("/health")
  public ResponseEntity<?> health() {
    boolean healthy = db.healthy();
    return ResponseEntity.status(healthy ? 200 : 503)
        .body(
            map(
                "status",
                healthy ? "ok" : "error",
                "db",
                healthy ? "up" : "down",
                "time",
                Instant.now()));
  }

  @GetMapping("/settings/public")
  public Object publicSettings() {
    var s = settings.get();
    return map(
        "siteName",
        s.siteName,
        "pixFeeCents",
        s.pixFeeCents,
        "reservationMinutes",
        s.reservationMinutes,
        "minBuyerAge",
        s.minBuyerAge,
        "supportWhatsapp",
        s.supportWhatsapp,
        "whatsappGroupUrl",
        s.whatsappGroupUrl,
        "instagramUrl",
        s.instagramUrl,
        "cpfRequired",
        true,
        "gateway",
        payment.name());
  }

  @GetMapping("/admin/settings")
  public Object get() {
    return settings.get();
  }

  @PutMapping("/admin/settings")
  public Object update(@RequestBody java.util.Map<String, Object> input) {
    return settings.patch(input, json, validator);
  }

  @GetMapping("/geo/cep/{cep}")
  public Object cep(@PathVariable String cep) {
    String normalized = BuyerService.digits(cep);
    if (!normalized.matches("\\d{8}")) throw new IllegalArgumentException("CEP inválido");
    return data.cep(normalized);
  }

  @GetMapping("/admin/lottery/federal/{contest}")
  public Object federal(@PathVariable String contest) {
    if (!contest.matches("\\d{1,6}")) throw new IllegalArgumentException("Concurso inválido");
    return data.federal(contest);
  }
}
