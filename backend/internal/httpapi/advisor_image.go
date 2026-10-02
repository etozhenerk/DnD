package httpapi

import "net/http"

// Image returns binary bytes with capability access and no persistent browser cache.
func (h AdvisorHandlers) Image(w http.ResponseWriter, r *http.Request) {
	id, token, ok := advisorAuth(w, r)
	if !ok || !h.ready(w) {
		return
	}
	data, mime, err := h.Service.Image(r.Context(), id, token, r.PathValue("requestId"))
	if err != nil {
		advisorFailure(w, err)
		return
	}
	w.Header().Set("Content-Type", mime)
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(data); err != nil {
		return
	} // Response cannot be replaced after headers.
}
