"use client";

import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  // サーバーサイドレンダリング時はfalseを返す
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    // 初期値設定
    setMatches(media.matches);

    // イベントリスナーを設定
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);

    // クリーンアップ
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
