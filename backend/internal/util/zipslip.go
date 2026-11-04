package util

import (
	"errors"
	"path/filepath"
	"strings"
)

func SafeJoin(root, name string) (string, error) {
	if name == "" {
		return "", errors.New("empty path")
	}
	clean := filepath.Clean("/" + name)
	clean = strings.TrimPrefix(clean, "/")
	if clean == "" || clean == "." {
		return "", errors.New("bad path")
	}
	dest := filepath.Join(root, clean)
	rel, err := filepath.Rel(root, dest)
	if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return "", errors.New("zip slip")
	}
	return dest, nil
}
