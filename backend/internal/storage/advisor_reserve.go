package storage

import (
	"bytes"
	"context"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
	"github.com/jackc/pgx/v5"
)

// ReserveAdvisorTurn atomically serializes monthly/session budgets and repeats.
// Its bool is true only for the worker allowed to make the single provider call.
func (s *Store) ReserveAdvisorTurn(ctx context.Context, id string, tokenHash []byte, in advisor.Input) (bool, error) {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer rollbackAdvisor(ctx, tx)
	// Serialize admission even across the Moscow month boundary.
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(726491029)`); err != nil {
		return false, err
	}
	month, total, blocked, err := lockAdvisorMonth(ctx, tx)
	if err != nil {
		return false, err
	}
	var accounted advisor.Money
	err = tx.QueryRow(ctx, `
        SELECT accounted_micro_rub FROM advisor_sessions
        WHERE id=$1 AND token_hash=$2 AND expires_at > now() FOR UPDATE
    `, id, tokenHash).Scan(&accounted)
	if err == pgx.ErrNoRows {
		return false, advisor.ErrNotFound
	}
	if err != nil {
		return false, err
	}
	var prior []byte
	err = tx.QueryRow(ctx, `SELECT request_hash FROM advisor_turns WHERE session_id=$1 AND request_id=$2`, id, in.RequestID).Scan(&prior)
	if err == nil {
		if !bytes.Equal(prior, in.Hash()) {
			return false, advisor.ErrConflict
		}
		return false, tx.Commit(ctx)
	}
	if err != pgx.ErrNoRows {
		return false, err
	}
	// The container has a hard 120-second lifetime. After three minutes a lost
	// worker cannot still be generating; retain its reserve and immutable UUID.
	if _, err := tx.Exec(ctx, `
        UPDATE advisor_turns SET status='uncertain'
        WHERE session_id=$1 AND status='reserved' AND created_at < now()-interval '3 minutes'
    `, id); err != nil {
		return false, err
	}
	amount := advisor.ReservationFor(in.Mode)
	if err := checkAdvisorLimits(ctx, tx, id, accounted, total, blocked, amount); err != nil {
		return false, err
	}
	if err := checkAdvisorToolLimits(ctx, tx, id, in.Mode); err != nil {
		return false, err
	}
	mode, model := in.Mode, advisor.ModelName
	if mode == "" {
		mode = "chat"
	}
	if mode == "portrait" || mode == "icon" {
		model = advisor.ImageModelName
	}
	_, err = tx.Exec(ctx, `
        INSERT INTO advisor_turns (session_id, request_id, request_hash, month, message,
            reserved_micro_rub, accounted_micro_rub, model, mode, target)
        VALUES ($1,$2,$3,$4::text::date,$5,$6,$6,$7,$8,$9)
    `, id, in.RequestID, in.Hash(), month, in.Message, amount, model, mode, in.Target)
	if err != nil {
		return false, err
	}
	if _, err := tx.Exec(ctx, `UPDATE advisor_sessions SET accounted_micro_rub=accounted_micro_rub+$2 WHERE id=$1`, id, amount); err != nil {
		return false, err
	}
	if _, err := tx.Exec(ctx, `UPDATE advisor_months SET accounted_micro_rub=accounted_micro_rub+$2 WHERE month=$1::text::date`, month, amount); err != nil {
		return false, err
	}
	if err := tx.Commit(ctx); err != nil {
		return false, err
	}
	return true, nil
}

func lockAdvisorMonth(ctx context.Context, tx pgx.Tx) (string, advisor.Money, bool, error) {
	var month string
	// Grant calendar month is Moscow time; reservations keep their original month.
	err := tx.QueryRow(ctx, `SELECT date_trunc('month', now() AT TIME ZONE 'Europe/Moscow')::date::text`).Scan(&month)
	if err != nil {
		return "", 0, false, err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO advisor_months (month) VALUES ($1::text::date) ON CONFLICT DO NOTHING`, month); err != nil {
		return "", 0, false, err
	}
	var total advisor.Money
	var blocked bool
	err = tx.QueryRow(ctx, `SELECT accounted_micro_rub, blocked FROM advisor_months WHERE month=$1::text::date FOR UPDATE`, month).Scan(&total, &blocked)
	return month, total, blocked, err
}

func checkAdvisorLimits(ctx context.Context, tx pgx.Tx, id string, session, month advisor.Money, blocked bool, amount advisor.Money) error {
	var count, pending int
	err := tx.QueryRow(ctx, `
        SELECT count(*), count(*) FILTER (WHERE status='reserved')
        FROM advisor_turns WHERE session_id=$1
    `, id).Scan(&count, &pending)
	if err != nil {
		return err
	}
	if pending > 0 {
		return advisor.ErrBusy
	}
	if blocked || count >= advisor.MaxTurns || session+amount > advisor.SessionBudget ||
		month+amount > advisor.MonthlyBudget {
		return advisor.ErrLimit
	}
	var active, recent int
	err = tx.QueryRow(ctx, `
        SELECT count(*) FILTER (WHERE status='reserved' AND created_at > now()-interval '2 minutes'),
            count(*) FILTER (WHERE created_at > now()-interval '1 minute')
        FROM advisor_turns WHERE created_at > now()-interval '2 minutes'
    `).Scan(&active, &recent)
	if err != nil {
		return err
	}
	if active >= 6 || recent >= 60 {
		return advisor.ErrLimit
	}
	return nil
}
