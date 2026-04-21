package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"classicy/streamer/internal/db"
	"classicy/streamer/internal/model"

	goredis "github.com/redis/go-redis/v9"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	keyItems   = "media:items"    // HASH  id → JSON
	keyByStart = "media:by_start" // ZSET  score=unix_start, member=id
)

// Connect parses a Redis URL and returns a client.
func Connect(url string) *goredis.Client {
	opt, err := goredis.ParseURL(url)
	if err != nil {
		opt = &goredis.Options{Addr: "localhost:6379"}
	}
	return goredis.NewClient(opt)
}

// WarmCache loads all items from PostgreSQL into Redis if not already present.
func WarmCache(ctx context.Context, rdb *goredis.Client, pool *pgxpool.Pool, logger *slog.Logger) error {
	n, err := rdb.ZCard(ctx, keyByStart).Result()
	if err == nil && n > 0 {
		logger.Info("redis cache already warm", "items", n)
		return nil
	}

	logger.Info("warming redis cache from database…")
	items, err := db.AllItems(ctx, pool)
	if err != nil {
		return fmt.Errorf("load items: %w", err)
	}

	pipe := rdb.Pipeline()
	for _, it := range items {
		data, err := json.Marshal(it)
		if err != nil {
			continue
		}
		id := strconv.Itoa(it.ID)
		pipe.HSet(ctx, keyItems, id, data)
		pipe.ZAdd(ctx, keyByStart, goredis.Z{
			Score:  float64(it.StartDate.Unix()),
			Member: id,
		})
	}
	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("pipeline exec: %w", err)
	}

	logger.Info("redis cache warm", "items", len(items))
	return nil
}

// ItemsAt returns items whose start_date falls within the second [t, t+1).
func ItemsAt(ctx context.Context, rdb *goredis.Client, t time.Time) ([]model.MediaItem, error) {
	lo := float64(t.Unix())
	hi := lo // exact-second match

	ids, err := rdb.ZRangeByScore(ctx, keyByStart, &goredis.ZRangeBy{
		Min: strconv.FormatFloat(lo, 'f', 0, 64),
		Max: strconv.FormatFloat(hi, 'f', 0, 64),
	}).Result()
	if err != nil || len(ids) == 0 {
		return nil, err
	}
	return fetchByIDs(ctx, rdb, ids)
}

func fetchByIDs(ctx context.Context, rdb *goredis.Client, ids []string) ([]model.MediaItem, error) {
	vals, err := rdb.HMGet(ctx, keyItems, ids...).Result()
	if err != nil {
		return nil, err
	}
	items := make([]model.MediaItem, 0, len(vals))
	for _, v := range vals {
		if v == nil {
			continue
		}
		var it model.MediaItem
		if err := json.Unmarshal([]byte(v.(string)), &it); err == nil {
			items = append(items, it)
		}
	}
	return items, nil
}
