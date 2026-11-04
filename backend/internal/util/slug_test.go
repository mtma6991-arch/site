package util

import "testing"

func TestSlugify(t *testing.T) {
	cases := map[string]string{
		"Hello World":   "hello-world",
		"  درباره ما  ": "درباره-ما",
		"A---B":         "a-b",
		"":              "page",
		"../etc":        "etc",
		"blog":          "blog",
	}
	for in, want := range cases {
		if got := Slugify(in); got != want {
			t.Fatalf("Slugify(%q)=%q want %q", in, got, want)
		}
	}
	if !Reserved("master") || Reserved("home") {
		t.Fatal("reserved set")
	}
}
