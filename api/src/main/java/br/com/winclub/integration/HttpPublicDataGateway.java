package br.com.winclub.integration;

import static br.com.winclub.service.Views.map;

import java.net.http.HttpClient;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;

@Component
@Profile("real & !mock")
public class HttpPublicDataGateway implements PublicDataGateway {
  private final RestClient http;

  public HttpPublicDataGateway() {
    var factory =
        new JdkClientHttpRequestFactory(
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).build());
    factory.setReadTimeout(Duration.ofSeconds(6));
    http = RestClient.builder().requestFactory(factory).build();
  }

  public Map<String, Object> cep(String cep) {
    JsonNode n = fetch("https://viacep.com.br/ws/" + cep + "/json/");
    if (n.has("erro"))
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "CEP não encontrado");
    return map(
        "zipCode",
        cep,
        "street",
        n.path("logradouro").asText(""),
        "district",
        n.path("bairro").asText(""),
        "city",
        n.path("localidade").asText(""),
        "state",
        n.path("uf").asText(""));
  }

  public Map<String, Object> federal(String contest) {
    JsonNode n = fetch("https://servicebus2.caixa.gov.br/portaldeloterias/api/federal/" + contest);
    var prizes = new ArrayList<String>();
    for (JsonNode p : n.path("listaDezenas")) prizes.add(p.asText());
    if (prizes.size() != 5
        || prizes.stream().anyMatch(p -> !p.matches("\\d{5}"))
        || n.path("numero").asInt() != Integer.parseInt(contest))
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Resultado da Caixa inválido");
    String date =
        LocalDate.parse(n.path("dataApuracao").asText(), DateTimeFormatter.ofPattern("dd/MM/yyyy"))
            .toString();
    return map("contest", contest, "date", date, "prizes", prizes);
  }

  private JsonNode fetch(String url) {
    try {
      return http.get().uri(url).retrieve().body(JsonNode.class);
    } catch (RuntimeException ex) {
      throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE, "Consulta indisponível. Preencha manualmente.");
    }
  }
}
