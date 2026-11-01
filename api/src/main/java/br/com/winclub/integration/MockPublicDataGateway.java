package br.com.winclub.integration;

import static br.com.winclub.service.Views.map;

import java.util.*;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("mock & !real")
public class MockPublicDataGateway implements PublicDataGateway {
  public Map<String, Object> cep(String cep) {
    return map(
        "zipCode",
        cep,
        "street",
        "Praça da Sé",
        "district",
        "Sé",
        "city",
        "São Paulo",
        "state",
        "SP");
  }

  public Map<String, Object> federal(String contest) {
    return map(
        "contest",
        contest,
        "date",
        "2026-10-31",
        "prizes",
        List.of("12345", "23456", "34567", "45678", "56789"));
  }
}
