package main

import (
	"errors"
	"net"
	"net/url"
)

// Cloud credentials are injected independently so the password stays in Lockbox.
func databaseURL(getenv func(string) string) (string, error) {
	if dsn := getenv("DATABASE_URL"); dsn != "" {
		return dsn, nil
	}
	host, user, password, database := getenv("DB_HOST"), getenv("DB_USER"), getenv("DB_PASSWORD"), getenv("DB_NAME")
	if host == "" || user == "" || password == "" || database == "" {
		return "", errors.New("DATABASE_URL or DB_HOST, DB_USER, DB_PASSWORD and DB_NAME are required")
	}
	port := getenv("DB_PORT")
	if port == "" {
		port = "6432"
	}
	root := getenv("DB_SSL_ROOT_CERT")
	if root == "" {
		return "", errors.New("DB_SSL_ROOT_CERT is required for cloud database TLS")
	}
	u := url.URL{Scheme: "postgres", Host: net.JoinHostPort(host, port), User: url.UserPassword(user, password), Path: "/" + database}
	q := url.Values{"sslmode": {"verify-full"}, "sslrootcert": {root}, "connect_timeout": {"10"}}
	u.RawQuery = q.Encode()
	return u.String(), nil
}
