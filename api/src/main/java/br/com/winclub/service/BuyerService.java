package br.com.winclub.service;

import static br.com.winclub.service.Views.map;

import br.com.winclub.dto.Requests.*;
import br.com.winclub.model.Models.Buyer;
import br.com.winclub.repository.DocumentRepository;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

@Service
public class BuyerService {
  private final DocumentRepository db;
  private final SettingsService settings;
  private final JsonMapper json;

  public BuyerService(DocumentRepository db, SettingsService settings, JsonMapper json) {
    this.db = db;
    this.settings = settings;
    this.json = json;
  }

  public Buyer get(String id) {
    return db.find("buyer", id, Buyer.class)
        .orElseThrow(
            () ->
                new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Identifique-se com celular e CPF"));
  }

  public List<Buyer> all() {
    return db.list("buyer", Buyer.class);
  }

  public Buyer lookup(Lookup input) {
    return all().stream()
        .filter(
            b ->
                Objects.equals(b.phone, digits(input.phone()))
                    && Objects.equals(b.cpf, digits(input.cpf())))
        .findFirst()
        .orElseThrow(
            () -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Cadastro não encontrado"));
  }

  public Buyer register(BuyerInput input, boolean checkout) {
    return db.transaction(
        () -> {
          String phone = digits(input.phone()), cpf = digits(input.cpf());
          if (!phone.matches("\\d{10,11}")
              || !phone.equals(digits(input.phoneConfirm()))
              || !validCpf(cpf)) throw new IllegalArgumentException("Celular ou CPF inválido");
          if (LocalDate.parse(input.birthDate())
              .plusYears(settings.get().minBuyerAge)
              .isAfter(LocalDate.now(ZoneId.of("America/Sao_Paulo"))))
            throw new IllegalArgumentException("Idade mínima");
          var existing =
              all().stream()
                  .filter(
                      b ->
                          Objects.equals(b.phone, phone)
                              || Objects.equals(b.cpf, cpf)
                              || Objects.equals(b.email, input.email().toLowerCase(Locale.ROOT)))
                  .findFirst();
          if (existing.isPresent()) {
            Buyer b = existing.get();
            if (checkout && Objects.equals(b.phone, phone) && Objects.equals(b.cpf, cpf)) return b;
            throw new ResponseStatusException(
                HttpStatus.CONFLICT, "Cadastro já existente; entre com celular e CPF");
          }
          Buyer b = new Buyer();
          b.name = input.name().trim();
          b.socialName = input.socialName();
          b.phone = phone;
          b.cpf = cpf;
          b.email = input.email().toLowerCase(Locale.ROOT);
          b.birthDate = input.birthDate();
          b.address = address(input.address());
          db.save("buyer", b.id, b);
          return b;
        });
  }

  public Buyer update(String id, Profile input) {
    return db.transaction(
        () -> {
          Buyer b = get(id);
          if (input.name() != null) b.name = input.name();
          if (input.socialName() != null) b.socialName = input.socialName();
          if (input.email() != null) {
            String email = input.email().toLowerCase(Locale.ROOT);
            if (all().stream().anyMatch(u -> !u.id.equals(id) && email.equals(u.email)))
              throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail já cadastrado");
            b.email = email;
          }
          b.address = address(input.address());
          db.save("buyer", b.id, b);
          return b;
        });
  }

  @SuppressWarnings("unchecked")
  private Map<String, String> address(Address address) {
    return address == null ? null : json.convertValue(address, Map.class);
  }

  public Map<String, Object> publicProfile(Buyer b) {
    return map("name", b.name, "phone", mask(b.phone));
  }

  public Map<String, Object> profile(Buyer b) {
    return map(
        "name",
        b.name,
        "socialName",
        b.socialName,
        "firstName",
        b.name.split(" ")[0],
        "phone",
        mask(b.phone),
        "cpf",
        mask(b.cpf),
        "email",
        b.email,
        "birthDate",
        b.birthDate,
        "address",
        b.address,
        "createdAt",
        b.createdAt);
  }

  public static String digits(String s) {
    return s == null ? "" : s.replaceAll("\\D", "");
  }

  public static String mask(String s) {
    return s == null ? null : s.length() < 5 ? "***" : "***" + s.substring(s.length() - 4);
  }

  public static boolean validCpf(String cpf) {
    if (!cpf.matches("\\d{11}") || cpf.chars().distinct().count() == 1) return false;
    for (int n = 9; n <= 10; n++) {
      int sum = 0;
      for (int i = 0; i < n; i++) sum += (cpf.charAt(i) - '0') * (n + 1 - i);
      int digit = 11 - sum % 11;
      if (digit >= 10) digit = 0;
      if (cpf.charAt(n) - '0' != digit) return false;
    }
    return true;
  }
}
