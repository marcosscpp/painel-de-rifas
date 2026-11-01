package br.com.winclub.service;

import br.com.winclub.dto.Requests.SettingsInput;
import br.com.winclub.model.Models.Settings;
import br.com.winclub.repository.DocumentRepository;
import org.springframework.stereotype.Service;

@Service
public class SettingsService {
  private final DocumentRepository db;

  public SettingsService(DocumentRepository db) {
    this.db = db;
  }

  public Settings get() {
    return db.find("setting", "site", Settings.class).orElseGet(Settings::new);
  }

  public Settings patch(
      java.util.Map<String, Object> patch,
      tools.jackson.databind.json.JsonMapper json,
      jakarta.validation.Validator validator) {
    return db.transaction(
        () -> {
          @SuppressWarnings("unchecked")
          var values =
              new java.util.LinkedHashMap<String, Object>(
                  json.convertValue(get(), java.util.Map.class));
          if (!values.keySet().containsAll(patch.keySet()))
            throw new IllegalArgumentException("Campo desconhecido");
          values.putAll(patch);
          var input = json.convertValue(values, SettingsInput.class);
          if (!validator.validate(input).isEmpty())
            throw new IllegalArgumentException("Dados inválidos");
          return update(input);
        });
  }

  public Settings update(SettingsInput input) {
    return db.transaction(
        () -> {
          Settings s = get();
          s.siteName = input.siteName();
          s.pixFeeCents = input.pixFeeCents();
          s.reservationMinutes = input.reservationMinutes();
          s.minBuyerAge = input.minBuyerAge();
          s.supportWhatsapp = input.supportWhatsapp();
          s.whatsappGroupUrl = input.whatsappGroupUrl();
          s.instagramUrl = input.instagramUrl();
          db.save("setting", "site", s);
          return s;
        });
  }
}
