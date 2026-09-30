export const replyProjectStatuses = ['negotiating', 'confirmed', 'archived'] as const;
export type ReplyProjectStatus = typeof replyProjectStatuses[number];
export const replyProjectStatusLabels = { negotiating: '洽談中', confirmed: '客戶已接受', archived: '已封存' } as const;
export function isReplyProjectStatus(value: unknown): value is ReplyProjectStatus {
  return typeof value === 'string' && replyProjectStatuses.includes(value as ReplyProjectStatus);
}

export function canDraftQuotation(status: ReplyProjectStatus | null | undefined) {
  return (status ?? 'negotiating') !== 'archived';
}
