package session

import (
	"log/slog"
	"sync"
	"time"
)

// Hub manages all active sessions and drives the global 1-second clock tick.
// It dispatches ticks to each session's tickCh without blocking on slow sessions.
type Hub struct {
	mu       sync.RWMutex
	sessions map[string]*Session
	reg      chan *Session
	unreg    chan *Session
	logger   *slog.Logger
}

func NewHub(logger *slog.Logger) *Hub {
	return &Hub{
		sessions: make(map[string]*Session),
		reg:      make(chan *Session, 64),
		unreg:    make(chan *Session, 64),
		logger:   logger,
	}
}

func (h *Hub) Register(s *Session) {
	h.reg <- s
}

func (h *Hub) Unregister(s *Session) {
	h.unreg <- s
}

// Run is the hub's main loop. Call it in a dedicated goroutine.
func (h *Hub) Run() {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			h.mu.RLock()
			for _, s := range h.sessions {
				// Non-blocking: if the session is busy processing the previous tick, skip.
				select {
				case s.tickCh <- struct{}{}:
				default:
				}
			}
			h.mu.RUnlock()

		case s := <-h.reg:
			h.mu.Lock()
			h.sessions[s.id] = s
			total := len(h.sessions)
			h.mu.Unlock()
			h.logger.Info("session joined", "id", s.id, "total", total)

		case s := <-h.unreg:
			h.mu.Lock()
			delete(h.sessions, s.id)
			total := len(h.sessions)
			h.mu.Unlock()
			h.logger.Info("session left", "id", s.id, "total", total)
		}
	}
}
