export const zshHook = String.raw`
__ctxr_precmd() {
  local code=$?
  local info dir branch
  info=$(git rev-parse --path-format=absolute --git-common-dir --abbrev-ref HEAD 2>/dev/null) || { __CTXR_LAST_DIR=""; return; }
  { read -r dir; read -r branch; } <<< "$info"
  local id=$((HISTCMD - 1))
  if [ "$id" != "$__CTXR_LAST_ID" ]; then
    __CTXR_LAST_ID=$id
    local cmd
    read -r cmd <<< "$(fc -ln -1 2>/dev/null)"
    [ -n "$cmd" ] && printf '%s\t%s\t%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$PWD" "$branch" "$code" "$cmd" >> "$dir/ctxr-log.tsv"
  fi
  if [ -n "$__CTXR_LAST_DIR" ] && [ "$__CTXR_LAST_DIR" = "$dir" ] && [ "$__CTXR_LAST_BRANCH" != "$branch" ] && [ -z "$CTXR_NO_AUTO" ]; then
    [ "$__CTXR_LAST_BRANCH" != "HEAD" ] && ctxr pause --auto --branch "$__CTXR_LAST_BRANCH" >/dev/null 2>&1
    [ "$branch" != "HEAD" ] && ctxr resume --auto
  fi
  __CTXR_LAST_DIR=$dir
  __CTXR_LAST_BRANCH=$branch
}

autoload -Uz add-zsh-hook
add-zsh-hook precmd __ctxr_precmd
`.trimStart();
