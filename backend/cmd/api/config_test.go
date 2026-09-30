package main

import (
	"net/url"
	"testing"
)

func TestDatabaseURLCloudCredentialsAndTLS(t *testing.T) {
	password := "special@:/?#%&+ password"
	env := map[string]string{"DB_HOST": "db.internal", "DB_USER": "dnd_api", "DB_PASSWORD": password, "DB_NAME": "dnd", "DB_SSL_ROOT_CERT": "/app/root.crt"}
	dsn, err := databaseURL(func(k string) string { return env[k] })
	if err != nil {
		t.Fatal(err)
	}
	u, err := url.Parse(dsn)
	if err != nil {
		t.Fatal(err)
	}
	got, _ := u.User.Password()
	if got != password || u.Host != "db.internal:6432" || u.Query().Get("sslmode") != "verify-full" || u.Query().Get("sslrootcert") != "/app/root.crt" {
		t.Fatal("credentials or TLS configuration changed")
	}
	delete(env, "DB_SSL_ROOT_CERT")
	if _, err = databaseURL(func(k string) string { return env[k] }); err == nil {
		t.Fatal("cloud connection without a trusted CA was accepted")
	}
}

func TestDatabaseURLLocalOverride(t *testing.T) {
	want := "postgres://localhost/local"
	dsn, err := databaseURL(func(k string) string {
		if k == "DATABASE_URL" {
			return want
		}
		return ""
	})
	if err != nil || dsn != want {
		t.Fatal("local DATABASE_URL override failed")
	}
}
