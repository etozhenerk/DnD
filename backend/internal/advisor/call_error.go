package advisor

// CallError exposes only bounded diagnostic labels, never provider response bodies.
// UsageKnown means a complete response included token usage before validation failed.
type CallError struct {
	Stage      string
	Code       string
	HTTPStatus int
	UsageKnown bool
}

func (e *CallError) Error() string { return e.Stage + ": " + e.Code }
