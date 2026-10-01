package httpapi

import (
	"bytes"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

type readResponse struct {
	header http.Header
	status int
	body   bytes.Buffer
}

func newReadResponse() *readResponse {
	return &readResponse{header: make(http.Header)}
}

func (r *readResponse) Header() http.Header { return r.header }

func (r *readResponse) WriteHeader(status int) {
	if r.status == 0 {
		r.status = status
	}
}

func (r *readResponse) Write(body []byte) (int, error) {
	if r.status == 0 {
		r.status = http.StatusOK
	}
	return r.body.Write(body)
}

func (r *readResponse) cacheable() bool {
	return r.status == http.StatusOK && r.body.Len() <= maxReadBody &&
		strings.HasPrefix(r.header.Get("Content-Type"), "application/json") &&
		len(r.header.Values("Set-Cookie")) == 0 && r.header.Get("Vary") == "" &&
		!strings.Contains(strings.ToLower(r.header.Get("Cache-Control")), "no-store") &&
		!strings.Contains(strings.ToLower(r.header.Get("Cache-Control")), "private")
}

func (r *readResponse) send(w http.ResponseWriter, started time.Time, cache string) {
	for key, values := range r.header {
		w.Header()[key] = append([]string(nil), values...)
	}
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Server-Timing", fmt.Sprintf("app;dur=%.2f, read_cache;desc=%q", float64(time.Since(started).Microseconds())/1000, cache))
	status := r.status
	if status == 0 {
		status = http.StatusOK
	}
	w.WriteHeader(status)
	if _, err := w.Write(r.body.Bytes()); err != nil {
		slog.Warn("write public read response", "error_type", fmt.Sprintf("%T", err))
	}
}

type writeObserver struct {
	http.ResponseWriter
	status int
}

func (w *writeObserver) WriteHeader(status int) {
	if w.status == 0 {
		w.status = status
	}
	w.ResponseWriter.WriteHeader(status)
}

func (w *writeObserver) Write(body []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	return w.ResponseWriter.Write(body)
}

func (w *writeObserver) Unwrap() http.ResponseWriter { return w.ResponseWriter }
