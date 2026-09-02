export type WorkspaceRoleValue = "owner" | "admin" | "member";

export const WORKSPACE_ROLE_LABELS: Record<WorkspaceRoleValue, string> = {
  owner: "工作空間擁有者",
  admin: "管理員",
  member: "協作者",
};

export function workspaceRoleLabel(role?: WorkspaceRoleValue | null) {
  return role ? WORKSPACE_ROLE_LABELS[role] : "未設定角色";
}
