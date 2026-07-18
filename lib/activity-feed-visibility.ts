const DEFAULT_ACTIVITY_PREVIEW_LIMIT = 3;

export function getVisibleActivity<T>(
  activity: readonly T[],
  isExpanded: boolean,
  limit = DEFAULT_ACTIVITY_PREVIEW_LIMIT,
): readonly T[] {
  return isExpanded ? activity : activity.slice(0, limit);
}
