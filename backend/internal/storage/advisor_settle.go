package storage

import (
	"context"
	"encoding/json"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
)

// SettleAdvisorTurn replaces an acknowledged reservation with usage exactly once.
func (s *Store) SettleAdvisorTurn(ctx context.Context, id, requestID string, result advisor.Completion) error {
	cost, err := advisor.Cost(result)
	if err != nil {
		return err
	}
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer rollbackAdvisor(ctx, tx)
	var month string
	err = tx.QueryRow(ctx, `SELECT month::text FROM advisor_turns WHERE session_id=$1 AND request_id=$2`, id, requestID).Scan(&month)
	if err != nil {
		return err
	}
	// Always lock month, session, then turn; reserve uses the same order.
	if _, err := tx.Exec(ctx, `SELECT month FROM advisor_months WHERE month=$1::text::date FOR UPDATE`, month); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `SELECT id FROM advisor_sessions WHERE id=$1 FOR UPDATE`, id); err != nil {
		return err
	}
	var before advisor.Money
	var status, mode string
	err = tx.QueryRow(ctx, `
        SELECT accounted_micro_rub, status, mode FROM advisor_turns
        WHERE session_id=$1 AND request_id=$2 FOR UPDATE
    `, id, requestID).Scan(&before, &status, &mode)
	if err != nil {
		return err
	}
	if status == "succeeded" {
		return tx.Commit(ctx)
	}
	if cost > before {
		return advisor.ErrLimit
	}
	if result.ImageCharge != (mode == "portrait" || mode == "icon") || (result.Asset != nil && !result.ImageCharge) {
		return advisor.ErrInvalid
	}
	var asset []byte
	if result.Asset != nil {
		asset, err = json.Marshal(result.Asset)
		if err != nil {
			return err
		}
	}
	_, err = tx.Exec(ctx, `
        UPDATE advisor_turns SET reply=$3, status='succeeded', accounted_micro_rub=$4,
            input_tokens=$5, output_tokens=$6, cached_tokens=$7, result_asset=$8
        WHERE session_id=$1 AND request_id=$2
    `, id, requestID, result.Reply, cost, result.InputTokens, result.OutputTokens, result.CachedTokens, asset)
	if err != nil {
		return err
	}
	difference := cost - before
	if _, err := tx.Exec(ctx, `UPDATE advisor_sessions SET accounted_micro_rub=accounted_micro_rub+$2 WHERE id=$1`, id, difference); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `UPDATE advisor_months SET accounted_micro_rub=accounted_micro_rub+$2 WHERE month=$1::text::date`, month, difference); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// MarkAdvisorUncertain never refunds a possibly billed request. A breached usage
// envelope also blocks the entire month pending an administrator's reconciliation.
func (s *Store) MarkAdvisorUncertain(ctx context.Context, id, requestID string, blockMonth bool) error {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer rollbackAdvisor(ctx, tx)
	if blockMonth {
		if _, err := tx.Exec(ctx, `
            UPDATE advisor_months SET blocked=true WHERE month=(
                SELECT month FROM advisor_turns WHERE session_id=$1 AND request_id=$2)
        `, id, requestID); err != nil {
			return err
		}
	}
	if _, err := tx.Exec(ctx, `
        UPDATE advisor_turns SET status='uncertain'
        WHERE session_id=$1 AND request_id=$2 AND status='reserved'
    `, id, requestID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
