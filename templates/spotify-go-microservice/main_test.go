package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
)

func TestHealthEndpoint(t *testing.T) {
	mux := BuildMux()
	req := httptest.NewRequest("GET", "/healthz", nil)
	w := httptest.NewRecorder()

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
	if body["finops"] != "DISTROLESS_L0" {
		t.Fatalf("Expected finops DISTROLESS_L0, got %v", body["finops"])
	}
}

func TestRecommendEndpoint(t *testing.T) {
	mux := BuildMux()
	req := httptest.NewRequest("GET", "/api/v1/recommend", nil)
	w := httptest.NewRecorder()

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

func TestIdempotencyDuplicateDeduplication(t *testing.T) {
	mux := BuildMux()
	idempotencyKey := "idemp-test-token-777"

	// 1st request (MISS)
	req1 := httptest.NewRequest("GET", "/api/v1/recommend", nil)
	req1.Header.Set("X-Idempotency-Key", idempotencyKey)
	w1 := httptest.NewRecorder()
	mux.ServeHTTP(w1, req1)

	if w1.Header().Get("X-Cache") != "MISS" {
		t.Fatalf("Expected 1st request to be MISS, got %s", w1.Header().Get("X-Cache"))
	}

	// 2nd request with exact same key (HIT)
	req2 := httptest.NewRequest("GET", "/api/v1/recommend", nil)
	req2.Header.Set("X-Idempotency-Key", idempotencyKey)
	w2 := httptest.NewRecorder()
	mux.ServeHTTP(w2, req2)

	if w2.Header().Get("X-Cache") != "IDEMPOTENT-HIT" {
		t.Fatalf("Expected 2nd request to be IDEMPOTENT-HIT, got %s", w2.Header().Get("X-Cache"))
	}

	if w1.Body.String() != w2.Body.String() {
		t.Fatalf("Idempotent payloads must match identically. 1: %s, 2: %s", w1.Body.String(), w2.Body.String())
	}
}

func TestConcurrentRaceCondition(t *testing.T) {
	mux := BuildMux()
	var wg sync.WaitGroup
	concurrency := 50

	wg.Add(concurrency)
	for i := 0; i < concurrency; i++ {
		go func(idx int) {
			defer wg.Done()
			key := fmt.Sprintf("race-token-%d", idx%5)
			req := httptest.NewRequest("GET", "/api/v1/recommend", nil)
			req.Header.Set("X-Idempotency-Key", key)
			w := httptest.NewRecorder()
			mux.ServeHTTP(w, req)
			if w.Code != http.StatusOK {
				t.Errorf("Unexpected status: %d", w.Code)
			}
		}(i)
	}
	wg.Wait()
}

// Memory allocation benchmark: tests throughput and allocs/op
func BenchmarkRecommendEndpoint(b *testing.B) {
	mux := BuildMux()
	req := httptest.NewRequest("GET", "/api/v1/recommend", nil)
	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)
	}
}

func BenchmarkIdempotencyStore(b *testing.B) {
	store := NewIdempotencyStore()
	samplePayload := []byte(`{"status":"OK","balance":1000.50}`)
	key := "bench-key-fixed"
	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		_, _, _ = store.GetOrSet(key, func() ([]byte, error) {
			return samplePayload, nil
		})
	}
}
