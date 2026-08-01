import { Story } from '@/types';
import { getArchivedDate } from '@/lib/dateUtils';

export interface GroupedStory {
  /** 組內 archived_date 最新的一筆，Grid 卡面顯示這筆 */
  representative: Story;
  /** 組內所有記錄，依 archived_date 由新到舊排序 */
  instances: Story[];
}

/**
 * 依 external_id 分組，組內與組間都依 archived_date（非 created_at）由新到舊排序。
 * 用於 Grid View 的疊層卡片；Calendar/Gallery 不使用此函式，維持攤平顯示。
 */
export function groupStoriesByShow(stories: Story[]): GroupedStory[] {
  const groups = new Map<string, Story[]>();

  for (const story of stories) {
    const existing = groups.get(story.external_id);
    if (existing) {
      existing.push(story);
    } else {
      groups.set(story.external_id, [story]);
    }
  }

  const grouped: GroupedStory[] = [];
  groups.forEach((instances) => {
    const sorted = [...instances].sort((a, b) =>
      getArchivedDate(b).localeCompare(getArchivedDate(a))
    );
    grouped.push({ representative: sorted[0], instances: sorted });
  });

  return grouped.sort((a, b) =>
    getArchivedDate(b.representative).localeCompare(getArchivedDate(a.representative))
  );
}
