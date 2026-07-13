export const GLOBAL_ROLES = ['USER', 'ADMIN', 'MODERATOR', 'SUPPORT'] as const;
export type GlobalRole = (typeof GLOBAL_ROLES)[number];

export const WORKSPACE_ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];
