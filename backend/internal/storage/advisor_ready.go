package storage

import (
	"context"
	"fmt"
)

// AdvisorReady checks the ledger and every required table privilege before
// enablement. Migration versions are verified by the owner, never runtime.
func (s *Store) AdvisorReady(ctx context.Context) error {
	for _, table := range []string{"advisor_sessions", "advisor_months", "advisor_turns"} {
		var ready bool
		err := s.Pool.QueryRow(ctx, `
            SELECT has_table_privilege(current_user,$1,'SELECT')
                AND has_table_privilege(current_user,$1,'INSERT')
                AND has_table_privilege(current_user,$1,'UPDATE')
        `, table).Scan(&ready)
		if err != nil || !ready {
			return fmt.Errorf("advisor ledger permissions incomplete")
		}
	}
	_, err := s.Pool.Exec(ctx, `
        SELECT s.token_hash, s.expires_at, s.accounted_micro_rub, m.blocked,
            t.request_hash, t.reserved_micro_rub, t.model, t.cached_tokens
        FROM advisor_sessions s CROSS JOIN advisor_months m CROSS JOIN advisor_turns t
        WHERE false
    `)
	if err != nil {
		return fmt.Errorf("advisor ledger unavailable")
	}
	return nil
}
