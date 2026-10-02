package storage

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/etozhenerk/DnD/backend/internal/advisor"
	"github.com/jackc/pgx/v5"
)

// CreateAdvisorSession rate-limits new anonymous capabilities globally in SQL.
func (s *Store) CreateAdvisorSession(ctx context.Context, tokenHash []byte) (advisor.Session, error) {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return advisor.Session{}, err
	}
	defer rollbackAdvisor(ctx, tx)
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(726491028)`); err != nil {
		return advisor.Session{}, err
	}
	var minute, day int
	err = tx.QueryRow(ctx, `
        SELECT count(*) FILTER (WHERE created_at > now() - interval '1 minute'), count(*)
        FROM advisor_sessions WHERE created_at > now() - interval '24 hours'
    `).Scan(&minute, &day)
	if err != nil {
		return advisor.Session{}, err
	}
	if minute >= 12 || day >= 60 {
		return advisor.Session{}, advisor.ErrLimit
	}
	session := advisor.Session{Budget: advisor.SessionBudget, Turns: []advisor.Turn{}}
	err = tx.QueryRow(ctx, `
        INSERT INTO advisor_sessions (token_hash) VALUES ($1)
        RETURNING id::text, expires_at
    `, tokenHash).Scan(&session.ID, &session.ExpiresAt)
	if err != nil {
		return advisor.Session{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return advisor.Session{}, err
	}
	return session, nil
}

// GetAdvisorSession uses a consistent snapshot and never returns its token hash.
func (s *Store) GetAdvisorSession(ctx context.Context, id string, tokenHash []byte) (advisor.Session, error) {
	tx, err := s.Pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return advisor.Session{}, err
	}
	defer rollbackAdvisor(ctx, tx)
	session := advisor.Session{Budget: advisor.SessionBudget, Turns: []advisor.Turn{}}
	err = tx.QueryRow(ctx, `
        SELECT id::text, expires_at, accounted_micro_rub FROM advisor_sessions
        WHERE id=$1 AND token_hash=$2 AND expires_at > now()
    `, id, tokenHash).Scan(&session.ID, &session.ExpiresAt, &session.Accounted)
	if err == pgx.ErrNoRows {
		return advisor.Session{}, advisor.ErrNotFound
	}
	if err != nil {
		return advisor.Session{}, err
	}
	rows, err := tx.Query(ctx, `
        SELECT request_id::text, message, reply,
            CASE WHEN status='reserved' AND created_at < now()-interval '2 minutes'
                THEN 'uncertain' ELSE status END,
            accounted_micro_rub, created_at
        FROM advisor_turns WHERE session_id=$1 ORDER BY created_at, request_id LIMIT 100
    `, id)
	if err != nil {
		return advisor.Session{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var turn advisor.Turn
		if err := rows.Scan(&turn.RequestID, &turn.Message, &turn.Reply, &turn.Status, &turn.Accounted, &turn.CreatedAt); err != nil {
			return advisor.Session{}, err
		}
		session.Turns = append(session.Turns, turn)
	}
	if err := rows.Err(); err != nil {
		return advisor.Session{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return advisor.Session{}, err
	}
	return session, nil
}

func rollbackAdvisor(ctx context.Context, tx pgx.Tx) {
	// Cancellation must not leave a connection with an open transaction.
	cleanup, cancel := context.WithTimeout(context.WithoutCancel(ctx), 3*time.Second)
	defer cancel()
	if err := tx.Rollback(cleanup); err != nil && err != pgx.ErrTxClosed {
		// A broken connection is discarded by pgx. Never log its raw DSN/error.
		slog.Warn("advisor rollback failed", "error_type", fmt.Sprintf("%T", err))
	}
}
