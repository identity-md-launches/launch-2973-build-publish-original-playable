import { useEffect, useRef, useState } from "react";
import {
  EMPTY_FEED,
  POLL_MS,
  STATUS_URL,
  isExpired,
  parseStatus,
  type Feed,
} from "./feed";

export function useWheel(onBlock: (previous: string, current: string) => void) {
  const [feed, setFeed] = useState<Feed>(EMPTY_FEED);
  const feedRef = useRef(feed);
  const blockRef = useRef<string | null>(null);
  const eventRef = useRef(onBlock);
  eventRef.current = onBlock;
  const retryRef = useRef<() => void>(() => {});
  useEffect(() => {
    let stopped = false,
      busy = false;
    let controller: AbortController | null = null;
    const commit = (next: Feed) => {
      if (!stopped) {
        feedRef.current = next;
        setFeed(next);
      }
    };
    const poll = async () => {
      if (busy || stopped) return;
      busy = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 4500);
      try {
        const response = await fetch(STATUS_URL, {
          signal: controller.signal,
          cache: "no-store",
          credentials: "omit",
        });
        if (!response.ok)
          throw new Error(`Status API returned ${response.status}`);
        const next = parseStatus(await response.json());
        if (stopped) return;
        if (next.online && next.blockHeight !== null) {
          const previous = blockRef.current;
          if (previous !== null && BigInt(next.blockHeight) > BigInt(previous))
            eventRef.current(previous, next.blockHeight);
          if (previous === null || BigInt(next.blockHeight) > BigInt(previous))
            blockRef.current = next.blockHeight;
        }
        commit({
          ...next,
          blockHeight: next.blockHeight ?? feedRef.current.blockHeight,
          blockProgress: next.blockProgress ?? feedRef.current.blockProgress,
        });
      } catch {
        commit({
          ...feedRef.current,
          online: false,
          loading: false,
          reason:
            "The public API could not be reached. Using a simulated wheel.",
        });
      } finally {
        clearTimeout(timeout);
        busy = false;
      }
    };
    retryRef.current = () => {
      void poll();
    };
    void poll();
    const timer = setInterval(() => {
      void poll();
    }, POLL_MS);
    const expiry = setInterval(() => {
      if (isExpired(feedRef.current))
        commit({
          ...feedRef.current,
          online: false,
          loading: false,
          reason: "The wheel measurement expired. Using a simulated wheel.",
        });
    }, 1000);
    return () => {
      stopped = true;
      clearInterval(timer);
      clearInterval(expiry);
      controller?.abort();
    };
  }, []);
  return { feed, feedRef, retry: () => retryRef.current() };
}
