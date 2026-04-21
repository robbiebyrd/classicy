package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"

	"classicy/streamer/internal/cache"
	"classicy/streamer/internal/db"
	"classicy/streamer/internal/handler"
	"classicy/streamer/internal/session"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	dbURL := env("DATABASE_URL", "postgres://directus:directus@localhost:5432/directus")
	pool, err := db.Connect(dbURL)
	if err != nil {
		logger.Error("database connection failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	redisURL := env("REDIS_URL", "redis://localhost:6379")
	rdb := cache.Connect(redisURL)

	if err := cache.WarmCache(context.Background(), rdb, pool, logger); err != nil {
		logger.Error("cache warm failed", "error", err)
		os.Exit(1)
	}

	hub := session.NewHub(logger)
	go hub.Run()

	addr := env("LISTEN_ADDR", ":8080")

	mux := http.NewServeMux()
	mux.HandleFunc("/stream", handler.NewWSHandler(hub, rdb, pool, logger))
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	logger.Info("streamer listening", "addr", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		logger.Error("server exited", "error", err)
		os.Exit(1)
	}
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
