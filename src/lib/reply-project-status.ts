export const replyProjectStatuses = ['negotiating', 'confirmed', 'archived'] as const;
export type ReplyProjectStatus = typeof replyProjectStatuses[number];
export const replyProjectStatusLabels = { negotiating: '洽談中', confirmed: '已確認', archived: '已封存' } as const;
export function isReplyProjectStatus(value: unknown): value is ReplyProjectStatus {
  return typeof value === 'string' && replyProjectStatuses.includes(value as ReplyProjectStatus);
}
