package session

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"classicy/streamer/internal/cache"
	"classicy/streamer/internal/model"

	goredis "github.com/redis/go-redis/v9"
)

const (
	sendBuf     = 256
	driftThresh = 3 * time.Second
)

// outMsg is the envelope for every server→client message.
type outMsg struct {
	Type  string           `json:"type"`
	Time  string           `json:"time,omitempty"`
	Items []model.MediaItem `json:"items,omitempty"`
	Msg   string           `json:"message,omitempty"`
}

// Session holds all state for a single connected client.
type Session struct {
	id     string
	hub    *Hub
	rdb    *goredis.Client
	logger *slog.Logger

	mu          sync.Mutex
	virtualTime time.Time
	paused      bool

	send      chan []byte
	tickCh    chan struct{}
	done      chan struct{}
	closeOnce sync.Once
}

func NewSession(hub *Hub, rdb *goredis.Client, logger *slog.Logger) *Session {
	id := newID()
	return &Session{
		id:     id,
		hub:    hub,
		rdb:    rdb,
		logger: logger.With("session", id),
		send:   make(chan []byte, sendBuf),
		tickCh: make(chan struct{}, 1),
		done:   make(chan struct{}),
	}
}

// Done returns a channel that is closed when the session ends.
func (s *Session) Done() <-chan struct{} { return s.done }

// Send returns the outbound message channel for the writePump.
func (s *Session) Send() <-chan []byte { return s.send }

// Close terminates the session exactly once.
func (s *Session) Close() {
	s.closeOnce.Do(func() {
		close(s.done)
		s.hub.Unregister(s)
	})
}

// Init sets the client's starting virtual time and sends the initial snapshot.
func (s *Session) Init(t time.Time, items []model.MediaItem) {
	s.mu.Lock()
	s.virtualTime = t
	s.paused = false
	s.mu.Unlock()

	s.send_(outMsg{Type: "init_ack", Time: t.Format(time.RFC3339), Items: items})
}

// Seek moves the client's virtual clock to t and delivers the full set of
// items that are active at that time so the client can resync immediately.
func (s *Session) Seek(t time.Time, items []model.MediaItem) {
	s.mu.Lock()
	s.virtualTime = t
	s.mu.Unlock()
	s.send_(outMsg{Type: "seek_ack", Time: t.Format(time.RFC3339), Items: items})
}

// Pause freezes the client's virtual clock.
func (s *Session) Pause() {
	s.mu.Lock()
	s.paused = true
	s.mu.Unlock()
	s.send_(outMsg{Type: "pause_ack"})
}

// Resume unfreezes the client's virtual clock.
func (s *Session) Resume() {
	s.mu.Lock()
	s.paused = false
	s.mu.Unlock()
	s.send_(outMsg{Type: "resume_ack"})
}

// Heartbeat corrects drift if the client's reported time diverges too far.
func (s *Session) Heartbeat(clientTime time.Time) {
	s.mu.Lock()
	if drift := abs(clientTime.Sub(s.virtualTime)); drift > driftThresh {
		s.logger.Info("correcting drift", "drift", drift)
		s.virtualTime = clientTime
	}
	t := s.virtualTime
	s.mu.Unlock()

	s.send_(outMsg{Type: "heartbeat_ack", Time: t.Format(time.RFC3339)})
}

// SendError delivers an error message to the client.
func (s *Session) SendError(msg string) {
	s.send_(outMsg{Type: "error", Msg: msg})
}

// RunTimePump advances virtual time on each hub tick and dispatches new items.
// Call in a dedicated goroutine.
func (s *Session) RunTimePump() {
	ctx := context.Background()
	for {
		select {
		case <-s.done:
			return
		case <-s.tickCh:
			s.mu.Lock()
			if s.paused || s.virtualTime.IsZero() {
				s.mu.Unlock()
				continue
			}
			s.virtualTime = s.virtualTime.Add(time.Second)
			t := s.virtualTime
			s.mu.Unlock()

			items, err := cache.ItemsAt(ctx, s.rdb, t)
			if err != nil {
				s.logger.Warn("cache lookup failed", "error", err)
				continue
			}
			if len(items) > 0 {
				s.send_(outMsg{Type: "items", Time: t.Format(time.RFC3339), Items: items})
			}
		}
	}
}

func (s *Session) send_(m outMsg) {
	// Don't write to a closed session.
	select {
	case <-s.done:
		return
	default:
	}

	data, err := json.Marshal(m)
	if err != nil {
		return
	}

	select {
	case s.send <- data:
	case <-s.done:
	default:
		s.logger.Warn("send buffer full, dropping message", "type", m.Type)
	}
}

func newID() string {
	b := make([]byte, 8)
	rand.Read(b) //nolint:errcheck // crypto/rand never fails on supported platforms
	return hex.EncodeToString(b)
}

func abs(d time.Duration) time.Duration {
	if d < 0 {
		return -d
	}
	return d
}
