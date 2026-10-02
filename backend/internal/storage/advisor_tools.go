package storage

import (
	"context"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
	"github.com/jackc/pgx/v5"
)

// Caller holds the shared admission lock, so these quotas cannot race.
func checkAdvisorToolLimits(ctx context.Context, tx pgx.Tx, id, mode string) error {
	if mode == "comment" {
		var count int
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM advisor_turns WHERE session_id=$1 AND mode='comment'`, id).Scan(&count); err != nil {
			return err
		}
		if count >= 6 {
			return advisor.ErrLimit
		}
	}
	if mode != "portrait" && mode != "icon" {
		return nil
	}
	var sessionImages, active, daily int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM advisor_turns WHERE session_id=$1 AND mode IN ('portrait','icon')`, id).Scan(&sessionImages); err != nil {
		return err
	}
	err := tx.QueryRow(ctx, `
		SELECT count(*) FILTER (WHERE status='reserved' AND created_at > now()-interval '2 minutes'), count(*)
		FROM advisor_turns WHERE mode IN ('portrait','icon') AND created_at > now()-interval '24 hours'
	`).Scan(&active, &daily)
	if err != nil {
		return err
	}
	// Bound temporary storage as well as CPU/RAM: at most 128 MiB of new portraits per day.
	if sessionImages >= 8 || active >= 2 || daily >= 128 {
		return advisor.ErrLimit
	}
	return nil
}
