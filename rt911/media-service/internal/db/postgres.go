package db

import (
	"context"
	"fmt"
	"time"

	"classicy/streamer/internal/model"

	"github.com/jackc/pgx/v5/pgxpool"
)

// selectFrom is the shared SELECT … FROM clause for all item queries.
// source is resolved to sources.slug via a LEFT JOIN so the client receives
// the human-readable slug instead of the raw integer foreign-key.
const selectFrom = `
	SELECT mi.id, mi.title, mi.full_title, s.slug,
	       mi.start_date, mi.end_date, mi.calc_duration, mi.timezone,
	       mi.url, mi.format, mi.approved, mi.mute,
	       mi.volume, mi.jump, mi.trim, mi.image, mi.image_caption,
	       mi.content, mi.sort
	FROM media_items mi
	LEFT JOIN sources s ON s.id = mi.source`

// Connect opens a pgx connection pool and verifies connectivity.
func Connect(dsn string) (*pgxpool.Pool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("pgxpool.New: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping: %w", err)
	}
	return pool, nil
}

// AllItems loads every approved media item ordered by start_date (used for cache warming).
func AllItems(ctx context.Context, pool *pgxpool.Pool) ([]model.MediaItem, error) {
	return queryItems(ctx, pool,
		selectFrom+` WHERE mi.approved = 1 ORDER BY mi.start_date`)
}

// CurrentItems returns items active at time t (start_date ≤ t ≤ end_date).
func CurrentItems(ctx context.Context, pool *pgxpool.Pool, t time.Time) ([]model.MediaItem, error) {
	return queryItems(ctx, pool,
		selectFrom+`
		 WHERE mi.start_date <= $1
		   AND (mi.end_date IS NULL OR mi.end_date >= $1)
		   AND mi.approved = 1
		 ORDER BY mi.start_date`, t)
}

func derefStr(dst *string, src *string) {
	if src != nil {
		*dst = *src
	}
}

func queryItems(ctx context.Context, pool *pgxpool.Pool, q string, args ...any) ([]model.MediaItem, error) {
	rows, err := pool.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}
	defer rows.Close()

	var out []model.MediaItem
	for rows.Next() {
		var it model.MediaItem
		// Use pointer locals for all nullable string columns — the DB stores
		// empty strings as NULL and pgx cannot scan NULL into a non-pointer string.
		var fullTitle, timezone, url, format, image, imageCaption, content *string
		if err := rows.Scan(
			&it.ID, &it.Title, &fullTitle, &it.Source,
			&it.StartDate, &it.EndDate, &it.CalcDuration, &timezone,
			&url, &format, &it.Approved, &it.Mute,
			&it.Volume, &it.Jump, &it.Trim, &image, &imageCaption,
			&content, &it.Sort,
		); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}
		derefStr(&it.FullTitle, fullTitle)
		derefStr(&it.Timezone, timezone)
		derefStr(&it.URL, url)
		derefStr(&it.Format, format)
		derefStr(&it.Image, image)
		derefStr(&it.ImageCaption, imageCaption)
		derefStr(&it.Content, content)
		out = append(out, it)
	}
	return out, rows.Err()
}
