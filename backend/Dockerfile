FROM golang:1.27.1-alpine AS build
WORKDIR /src/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/dnd-api ./cmd/api

FROM alpine:3.23 AS certificates
RUN apk add --no-cache ca-certificates curl \
    && curl --fail --silent --show-error --location \
       https://storage.yandexcloud.net/cloud-certs/CA.pem -o /root.crt

FROM scratch
COPY --from=build /out/dnd-api /app/dnd-api
COPY --from=certificates /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=certificates /root.crt /app/root.crt
COPY content/character-creation.json content/character-abilities.json content/races.json content/rules.json content/world-map.json /app/content/
COPY shared/advisor/guide.json /app/advisor/guide.json
COPY shared/advisor/persona.md /app/advisor/persona.md
ENV CONTENT_DIR=/app/content DB_SSL_ROOT_CERT=/app/root.crt ADVISOR_GUIDE_PATH=/app/advisor/guide.json ADVISOR_PERSONA_PATH=/app/advisor/persona.md
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/app/dnd-api"]
