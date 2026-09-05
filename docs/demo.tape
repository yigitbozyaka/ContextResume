Output docs/demo.gif

Set Shell bash
Set FontSize 16
Set Width 1100
Set Height 620
Set Theme "Catppuccin Mocha"
Set TypingSpeed 40ms

Hide
Type `cd demo-repo && eval "$(ctxr init bash)" && git switch -q feature/jwt-auth && clear`
Enter
Show

Type "ctxr run pnpm test tests/auth.test.ts"
Enter
Sleep 2.5s

Type `ctxr pause "refactoring token refresh, clock skew breaks the test"`
Enter
Sleep 1.5s

Type "git switch main"
Enter
Sleep 2s

Type "git switch feature/jwt-auth"
Enter
Sleep 5s
