package api

import (
	"crypto/subtle"
	"net/http"
	"os"
)

func BasicAuth() func(http.Handler) http.Handler {
	username := os.Getenv("WINDMILL_USERNAME")
	password := os.Getenv("WINDMILL_PASSWORD")

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, pass, ok := r.BasicAuth()
			if !ok {
				w.Header().Set("WWW-Authenticate", `Basic realm="Windmill"`)
				Error(w, http.StatusUnauthorized, "Unauthorized")
				return
			}

			userMatch := subtle.ConstantTimeCompare([]byte(user), []byte(username)) == 1
			passwordMatch := subtle.ConstantTimeCompare([]byte(pass), []byte(password)) == 1

			if !userMatch || !passwordMatch {
				w.Header().Set("WWW-Authenticate", `Basic realm="Windmill"`)
				Error(w, http.StatusUnauthorized, "Unauthorized")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
