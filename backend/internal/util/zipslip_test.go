package util

import (
	"path/filepath"
	"strings"
	"testing"
)

func TestSafeJoin(t *testing.T) {
	root := "/tmp/plugins"
	ok, err := SafeJoin(root, "wpcode/plugin.json")
	if err != nil {
		t.Fatal(err)
	}
	if ok != filepath.Join(root, "wpcode/plugin.json") {
		t.Fatalf("got %s", ok)
	}
	for _, name := range []string{"../etc/passwd", "/etc/passwd", "foo/../../etc/passwd", ".."} {
		dest, err := SafeJoin(root, name)
		if err != nil {
			if name == ".." {
				continue
			}
			t.Fatalf("%s: %v", name, err)
		}
		rel, err := filepath.Rel(root, dest)
		if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
			t.Fatalf("escaped root: %s -> %s", name, dest)
		}
	}
}
