package br.com.winclub.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.*;

public final class Requests {
  private Requests() {}

  public record Login(@NotBlank @Email String email, @NotBlank @Size(max = 200) String password) {}

  public record Address(
      @NotBlank String zipCode,
      @NotBlank String street,
      @NotBlank String number,
      @NotBlank String district,
      @NotBlank String city,
      @Pattern(regexp = "[A-Z]{2}") String state,
      String complement,
      String reference) {}

  public record BuyerInput(
      @NotBlank @Size(max = 150) String name,
      @Size(max = 150) String socialName,
      @NotBlank String phone,
      @NotBlank String phoneConfirm,
      @NotBlank String cpf,
      @NotBlank String birthDate,
      @NotBlank @Email String email,
      @Valid Address address) {}

  public record Lookup(@NotBlank String phone, @NotBlank String cpf) {}

  public record Profile(
      @Size(min = 2, max = 150) String name,
      @Size(max = 150) String socialName,
      @Email String email,
      @Valid Address address) {}

  public record CreateOrder(
      @NotBlank @Pattern(regexp = "[a-z0-9-]{1,80}") String raffleSlug,
      @Min(1) @Max(10000) Integer quantity,
      @Size(min = 1, max = 10000) List<@PositiveOrZero Integer> numbers,
      @Valid BuyerInput buyer,
      @NotBlank @Size(max = 100) String idempotencyKey) {}

  public record RaffleInput(
      @Pattern(regexp = "[a-z0-9-]{1,80}") String slug,
      @NotBlank @Size(max = 200) String title,
      @NotBlank String description,
      String rules,
      @Pattern(regexp = "QUANTITY|PICK") String saleMode,
      @Min(2) @Max(10000000) int totalNumbers,
      @Min(1) @Max(100000000) int priceCents,
      @Min(1) Integer minPerOrder,
      @Min(1) @Max(10000) Integer maxPerOrder,
      Instant startsAt,
      Instant endsAt,
      Instant drawDate) {}

  public record PrizeInput(
      @NotBlank String title,
      String description,
      @Pattern(regexp = "ITEM|MONEY") String kind,
      @Min(1) Integer position,
      @PositiveOrZero Long valueCents) {}

  public record Draw(
      @NotBlank @Pattern(regexp = "\\d{1,6}") String contest,
      @NotNull @Size(min = 5, max = 5) List<@Pattern(regexp = "\\d{5}") String> prizes) {}

  public record Packages(@NotNull @Size(max = 30) List<@Valid PackageInput> items) {}

  public record PackageInput(@Min(1) int quantity, boolean highlighted, @Min(0) int position) {}

  public record Featured(boolean featured) {}

  public record SettingsInput(
      @NotBlank String siteName,
      @Min(0) int pixFeeCents,
      @Min(1) @Max(1440) int reservationMinutes,
      @Min(18) @Max(100) int minBuyerAge,
      String supportWhatsapp,
      String whatsappGroupUrl,
      String instagramUrl) {}
}
