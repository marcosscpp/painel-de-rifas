package br.com.winclub.config;

import br.com.winclub.model.Models.*;
import br.com.winclub.repository.DocumentRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("mock & !real")
public class MockSeed implements CommandLineRunner {
  private final DocumentRepository db;

  public MockSeed(DocumentRepository db) {
    this.db = db;
  }

  public void run(String... args) {
    Raffle r = new Raffle();
    r.id = "00000000-0000-4000-8000-000000000001";
    r.slug = "campanha-demonstracao";
    r.title = "Campanha de demonstração";
    r.description = "Dados simulados para testar o checkout e o painel.";
    r.rules = "Ambiente de demonstração, sem pagamentos reais.";
    r.status = "ACTIVE";
    r.totalNumbers = 1000;
    r.priceCents = 100;
    r.featured = true;
    Prize p = new Prize();
    p.title = "Prêmio de demonstração";
    r.prizes.add(p);
    db.save("raffle", r.id, r);
  }
}
