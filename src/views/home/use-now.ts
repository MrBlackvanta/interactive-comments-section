import { currentMinute, PRERENDER_TIME, subscribeToMinutes } from "@/lib";
import { useSyncExternalStore } from "react";

const getServerSnapshot = () => PRERENDER_TIME;

export function useNow() {
  return useSyncExternalStore(
    subscribeToMinutes,
    currentMinute,
    getServerSnapshot,
  );
}
