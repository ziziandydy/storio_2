import { isNativePlatform } from '@/lib/appleAuth';

/** 兩下成功震動之間的間隔（毫秒） */
const SECOND_TAP_DELAY_MS = 120;

/**
 * 第一部收藏慶祝用的成功觸覺：連兩下 SUCCESS。
 * 只在原生平台執行；外掛以動態 import 載入，任何失敗都吞掉，不影響畫面。
 */
export async function playSuccessHaptics(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
    await new Promise((resolve) => setTimeout(resolve, SECOND_TAP_DELAY_MS));
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // 觸覺只是加分效果：裝置不支援或外掛出錯時靜默略過
  }
}
