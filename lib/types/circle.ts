export type Circle = {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  banner?: string;
  created_at: string;
  updated_at: string;
  members_count: number;
  posts_count: number;
  is_member: boolean;
  is_admin: boolean;
  privacy: 'public' | 'private' | 'invite_only';
  category: string;
  tags: string[];
};

export type CircleMember = {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  role: 'member' | 'moderator' | 'admin';
  joined_at: string;
};

export type CreateCircleData = {
  name: string;
  description: string;
  privacy: 'public' | 'private' | 'invite_only';
  category: string;
  tags?: string[];
};

export type CirclesFilter = {
  category?: string;
  tag?: string;
  privacy?: 'public' | 'private';
  sort_by: 'created_at' | 'members_count' | 'activity';
  sort_order: 'asc' | 'desc';
};