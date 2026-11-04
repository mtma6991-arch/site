package util

import (
	"strings"
	"unicode"
)

var reservedSlugs = map[string]bool{
	"master": true, "api": true, "blog": true, "_next": true,
	"plugins": true, "static": true, "public": true, "files": true,
	"auth": true, "admin": true, "_": true,
}

func Reserved(slug string) bool {
	return reservedSlugs[strings.ToLower(strings.TrimSpace(slug))]
}

// Slugify فاصله‌ها را خط تیره می‌کند و حروف (از جمله فارسی) و عدد را نگه می‌دارد.
func Slugify(in string) string {
	in = strings.TrimSpace(strings.ToLower(in))
	var b strings.Builder
	prevDash := false
	for _, r := range in {
		switch {
		case r == ' ' || r == '_' || r == '/' || r == '\\' || r == '.':
			if !prevDash && b.Len() > 0 {
				b.WriteByte('-')
				prevDash = true
			}
		case unicode.IsLetter(r) || unicode.IsDigit(r) || r == '-':
			if r == '-' {
				if prevDash || b.Len() == 0 {
					continue
				}
				prevDash = true
				b.WriteRune(r)
				continue
			}
			prevDash = false
			b.WriteRune(r)
		}
	}
	out := strings.Trim(b.String(), "-")
	if out == "" {
		return "page"
	}
	if len(out) > 80 {
		out = strings.Trim(out[:80], "-")
	}
	return out
}
