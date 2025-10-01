export type NotificationType =
	| 'like'
	| 'comment'
	| 'repost'
	| 'follow'
	| 'circle_invite'
	| 'circle_join'
	| 'mention'
	| 'system';

export type Notification = {
	id: string;
	type: NotificationType;
	title: string;
	message: string;
	created_at: string;
	read: boolean;
	data: {
		user_id?: string;
		post_id?: string;
		circle_id?: string;
		[key: string]: any;
	};
	actor?: {
		id: string;
		name: string;
		avatar?: string;
	};
};

export type NotificationsFilter = {
	type?: NotificationType;
	read?: boolean;
	from_date?: string;
	to_date?: string;
};
