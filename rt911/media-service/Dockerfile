FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod tidy && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o streamer ./cmd/server

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/streamer .
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s \
    CMD wget -qO- http://localhost:8080/health || exit 1
ENTRYPOINT ["./streamer"]
