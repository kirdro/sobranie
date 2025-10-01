export type Post = {
	id: string;
	author: {
		id: string;
		name: string;
		avatar?: string;
	};
	content: string;
	created_at: string;
	updated_at: string;
	likes_count: number;
	reposts_count: number;
	comments_count: number;
	tags: string[];
	is_liked: boolean;
	is_reposted: boolean;
	visibility: 'public' | 'private' | 'circle';
	circle_id?: string;
};

export type CreatePostData = {
	content: string;
	tags?: string[];
	visibility: 'public' | 'private' | 'circle';
	circle_id?: string;
};

export type PostsFilter = {
	circle_id?: string;
	author_id?: string;
	tag?: string;
	sort_by: 'created_at' | 'likes_count' | 'relevance';
	sort_order: 'asc' | 'desc';
};

export type PostsPagination = {
	page: number;
	limit: number;
	total: number;
	has_next: boolean;
};
