#!/bin/sh
# 개발용: 우리 이펙트를 pixelfx 체크아웃에 복사해 렌더/검사한다. 사용: tools/fxlook.sh <pixelfx 경로> hit/punch [render 옵션]
PFX="$1"; ID="$2"; shift 2
mkdir -p "$PFX/src/fx/game/"
NAME=$(echo "$ID" | tr '/' '-')
sed 's#../../vendor/pixelfx/core/index.js#../../core/index.js#' "src/fx/$ID.js" > "$PFX/src/fx/game/$NAME.js"
cd "$PFX" && node tools/render.mjs "game/$NAME" "$@" && node tools/check.mjs "game/$NAME" 2>&1 | tail -4
