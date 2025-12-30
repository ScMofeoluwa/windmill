package ui

import (
	"embed"
	"io/fs"
	"net/http"
	"path"
	"strings"
)

//go:embed dist/*
var assets embed.FS

type spaFileSystem struct {
	fs http.FileSystem
}

func (sfs spaFileSystem) Open(name string) (http.File, error) {
	f, err := sfs.fs.Open(name)
	if err == nil {
		return f, nil
	}

	// If file not found and doesn't have an extension, serve index.html
	if path.Ext(name) == "" {
		return sfs.fs.Open("index.html")
	}

	return nil, err
}

// Handler returns an http.Handler that serves the embedded UI assets.
func Handler() http.Handler {
	sub, err := fs.Sub(assets, "dist")
	if err != nil {
		panic(err)
	}

	return http.FileServer(spaFileSystem{http.FS(sub)})
}

// FixedHandler is a helper for mounting the UI at a specific prefix.
func FixedHandler(prefix string) http.Handler {
	h := Handler()
	if prefix == "" || prefix == "/" {
		return h
	}
	return http.StripPrefix(strings.TrimSuffix(prefix, "/"), h)
}
