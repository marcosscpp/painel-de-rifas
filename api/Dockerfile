# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /app
COPY pom.xml ./
RUN mvn -B -ntp dependency:go-offline
COPY src/main ./src/main
COPY src/test ./src/test
RUN mvn -B -ntp verify

FROM maven:3.9-eclipse-temurin-25 AS dev
WORKDIR /app
COPY pom.xml ./
RUN mvn -B -ntp dependency:go-offline
COPY src/main ./src/main
EXPOSE 3000
CMD ["mvn", "-B", "-ntp", "spring-boot:run"]

FROM eclipse-temurin:25-jre AS prod
WORKDIR /app
COPY --from=build --chown=10001:10001 /app/target/rifas-api-1.0.0.jar /app/app.jar
USER 10001:10001
EXPOSE 3000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
