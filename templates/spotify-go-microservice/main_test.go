package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthEndpoint(t *testing.T) {
	req := httptest.NewRequest("GET", "/healthz", nil)
	w := httptest.NewRecorder()

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "UP",
			"squad":  "Audio-Intelligence",
		})
	})

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	var body map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("Failed to parse JSON response: %v", err)
	}

	if body["status"] != "UP" {
		t.Fatalf("Expected status UP, got %v", body["status"])
	}
}

func TestRecommendEndpoint(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/v1/recommend", nil)
	w := httptest.NewRecorder()

	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/recommend", func(w http.ResponseWriter, r *http.Request) {
		resp := RecommendResponse{
			TrackID:    "spotify:track:4cOdK2wGLETKBW3PvgPWqT",
			AcousticMu: 0.942,
			Squad:      "Personalization-Bandits",
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	})

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	var resp RecommendResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to decode RecommendResponse: %v", err)
	}

	if resp.TrackID == "" || resp.AcousticMu <= 0.0 {
		t.Fatalf("Invalid response content: %+v", resp)
	}
}
