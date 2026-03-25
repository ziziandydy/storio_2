import { useEffect } from 'react';
import { getRenderServiceHealth } from '@/lib/share-api';

const HEARTBEAT_INTERVAL_MS = 10 * 60 * 1000; // 10 分鐘（防止 Render 15 分鐘 sleep）

/**
 * App 層級雙層預熱 hook
 *
 * Layer 1: App 掛載時立即靜默 ping /health（fire-and-forget）
 * Layer 2: App 在前景時每 10 分鐘 ping 一次，防止 Render 15 分鐘 sleep
 *
 * 使用 visibilitychange 事件在背景時暫停 heartbeat，回到前景時重新啟動
 */
export function useRenderServiceWarmup() {
  useEffect(() => {
    let heartbeatId: ReturnType<typeof setInterval> | null = null;

    // 靜默 ping（不顯示任何錯誤 UI）
    const ping = () => {
      getRenderServiceHealth().catch(() => {});
    };

    // Layer 1: 立即 ping
    ping();

    const startHeartbeat = () => {
      if (heartbeatId) return; // 避免重複啟動
      heartbeatId = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    };

    const stopHeartbeat = () => {
      if (heartbeatId) {
        clearInterval(heartbeatId);
        heartbeatId = null;
      }
    };

    // Layer 2: 前景時啟動 heartbeat
    if (!document.hidden) {
      startHeartbeat();
    }

    // visibilitychange 控制 heartbeat 生命週期
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopHeartbeat();
      } else {
        // 回到前景：先立即 ping，再啟動 heartbeat
        ping();
        startHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopHeartbeat();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
