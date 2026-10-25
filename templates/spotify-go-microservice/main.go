package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync/atomic"
	"syscall"
	"time"
)

type RecommendResponse struct {
	TrackID    string    `json:"track_id"`
	AcousticMu float64   `json:"acoustic_mu"`
	ServingTs  time.Time `json:"serving_ts"`
	Squad      string    `json:"squad"`
}

type MetricsCollector struct {
	TotalRequests   uint64
	ActiveSessions  int64
	LatencySumMicro uint64
}

var metrics MetricsCollector

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()

	// 1. CNCF SRE Health endpoint
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "UP",
			"squad":  "Audio-Intelligence",
			"tier":   "Tier-1",
		})
	})

	// 2. Prometheus metrics exporter
	mux.HandleFunc("/metrics", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; version=0.0.4")
		reqs := atomic.LoadUint64(&metrics.TotalRequests)
		sessions := atomic.LoadInt64(&metrics.ActiveSessions)
		latSum := atomic.LoadUint64(&metrics.LatencySumMicro)
		var avgLat float64
		if reqs > 0 {
			avgLat = float64(latSum) / float64(reqs)
		}
		fmt.Fprintf(w, "# HELP spotify_http_requests_total Total HTTP requests received\n")
		fmt.Fprintf(w, "# TYPE spotify_http_requests_total counter\n")
		fmt.Fprintf(w, "spotify_http_requests_total %d\n", reqs)
		fmt.Fprintf(w, "# HELP spotify_active_audio_sessions Current active streaming sessions\n")
		fmt.Fprintf(w, "# TYPE spotify_active_audio_sessions gauge\n")
		fmt.Fprintf(w, "spotify_active_audio_sessions %d\n", sessions)
		fmt.Fprintf(w, "# HELP spotify_avg_latency_microseconds Average serving latency\n")
		fmt.Fprintf(w, "# TYPE spotify_avg_latency_microseconds gauge\n")
		fmt.Fprintf(w, "spotify_avg_latency_microseconds %.2f\n", avgLat)
	})

	// 3. Spotify BaRT recommendation inference endpoint
	mux.HandleFunc("/api/v1/recommend", func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		atomic.AddUint64(&metrics.TotalRequests, 1)
		atomic.AddInt64(&metrics.ActiveSessions, 1)
		defer atomic.AddInt64(&metrics.ActiveSessions, -1)

		resp := RecommendResponse{
			TrackID:    "spotify:track:4cOdK2wGLETKBW3PvgPWqT",
			AcousticMu: 0.942,
			ServingTs:  time.Now().UTC(),
			Squad:      "Personalization-Bandits",
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)

		latMicro := uint64(time.Since(start).Microseconds())
		atomic.AddUint64(&metrics.LatencySumMicro, latMicro)
	})

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("[SPOTIFY GO SERVICE] Listening on port %s...", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server listen failed: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
	log.Println("[SPOTIFY GO SERVICE] Shutting down gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	log.Println("[SPOTIFY GO SERVICE] Exited cleanly.")
}
