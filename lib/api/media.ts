import { apiRequest } from './client';
import type {
	UploadResponse,
	FileInfo,
	MediaGalleryItem,
	PostAttachment,
} from './types';
import { cookies } from 'next/headers';

async function getAuthToken(): Promise<string | null> {
	const cookieStore = cookies();
	return cookieStore.get('sobranie_token')?.value ?? null;
}

// ===== ЗАГРУЗКА ФАЙЛОВ =====

export async function uploadImage(file: File): Promise<UploadResponse> {
	const token = await getAuthToken();
	const formData = new FormData();
	formData.append('file', file);
	formData.append('type', 'image');

	return apiRequest('/upload/image', {
		method: 'POST',
		body: formData,
		headers: {
			// Не устанавливаем Content-Type для FormData
		},
		token,
	});
}

export async function uploadVideo(file: File): Promise<UploadResponse> {
	const token = await getAuthToken();
	const formData = new FormData();
	formData.append('file', file);
	formData.append('type', 'video');

	return apiRequest('/upload/video', {
		method: 'POST',
		body: formData,
		headers: {
			// Не устанавливаем Content-Type для FormData
		},
		token,
	});
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
	const token = await getAuthToken();
	const formData = new FormData();
	formData.append('file', file);
	formData.append('type', 'document');

	return apiRequest('/upload/document', {
		method: 'POST',
		body: formData,
		headers: {
			// Не устанавливаем Content-Type для FormData
		},
		token,
	});
}

// ===== УПРАВЛЕНИЕ ФАЙЛАМИ =====

export async function getFileInfo(fileId: string): Promise<FileInfo> {
	const token = await getAuthToken();
	return apiRequest(`/files/${fileId}`, { token });
}

export async function deleteFile(fileId: string): Promise<void> {
	const token = await getAuthToken();
	return apiRequest(`/files/${fileId}`, {
		method: 'DELETE',
		token,
	});
}

export async function updateFileMetadata(
	fileId: string,
	metadata: {
		title?: string;
		description?: string;
		tags?: string[];
	}
): Promise<FileInfo> {
	const token = await getAuthToken();
	return apiRequest(`/files/${fileId}/metadata`, {
		method: 'PUT',
		body: metadata,
		token,
	});
}

// ===== ГАЛЕРЕЯ =====

export async function getMediaGallery(params?: {
	page?: number;
	limit?: number;
	type?: 'image' | 'video' | 'document' | 'all';
	circleId?: string;
}): Promise<{
	items: MediaGalleryItem[];
	total: number;
	page: number;
	limit: number;
}> {
	const searchParams = new URLSearchParams();
	if (params?.page) searchParams.set('page', params.page.toString());
	if (params?.limit) searchParams.set('limit', params.limit.toString());
	if (params?.type && params.type !== 'all') searchParams.set('type', params.type);
	if (params?.circleId) searchParams.set('circleId', params.circleId);

	const token = await getAuthToken();
	return apiRequest(`/gallery?${searchParams.toString()}`, { token });
}

export async function getUserMediaGallery(
	userId: string,
	params?: {
		page?: number;
		limit?: number;
		type?: 'image' | 'video' | 'document' | 'all';
	}
): Promise<{
	items: MediaGalleryItem[];
	total: number;
	page: number;
	limit: number;
}> {
	const searchParams = new URLSearchParams();
	if (params?.page) searchParams.set('page', params.page.toString());
	if (params?.limit) searchParams.set('limit', params.limit.toString());
	if (params?.type && params.type !== 'all') searchParams.set('type', params.type);

	const token = await getAuthToken();
	return apiRequest(`/users/${userId}/gallery?${searchParams.toString()}`, { token });
}

// ===== ОБРАБОТКА ВИДЕО =====

export async function getVideoThumbnail(videoId: string): Promise<{ url: string }> {
	const token = await getAuthToken();
	return apiRequest(`/videos/${videoId}/thumbnail`, { token });
}

export async function processVideo(videoId: string): Promise<{
	jobId: string;
	status: 'queued' | 'processing' | 'completed' | 'failed';
}> {
	const token = await getAuthToken();
	return apiRequest(`/videos/${videoId}/process`, {
		method: 'POST',
		token,
	});
}

export async function getVideoProcessingStatus(jobId: string): Promise<{
	status: 'queued' | 'processing' | 'completed' | 'failed';
	progress?: number;
	error?: string;
	result?: {
		formats: Array<{
			quality: string;
			url: string;
			size: number;
		}>;
		duration: number;
		thumbnail: string;
	};
}> {
	const token = await getAuthToken();
	return apiRequest(`/videos/jobs/${jobId}`, { token });
}

// ===== ОПТИМИЗАЦИЯ ИЗОБРАЖЕНИЙ =====

export async function getOptimizedImage(
	imageId: string,
	options?: {
		width?: number;
		height?: number;
		quality?: number;
		format?: 'webp' | 'jpeg' | 'png';
	}
): Promise<{ url: string }> {
	const searchParams = new URLSearchParams();
	if (options?.width) searchParams.set('w', options.width.toString());
	if (options?.height) searchParams.set('h', options.height.toString());
	if (options?.quality) searchParams.set('q', options.quality.toString());
	if (options?.format) searchParams.set('f', options.format);

	const token = await getAuthToken();
	return apiRequest(`/images/${imageId}/optimize?${searchParams.toString()}`, { token });
}

export async function generateImageThumbnail(
	imageId: string,
	size: 'small' | 'medium' | 'large' = 'medium'
): Promise<{ url: string }> {
	const token = await getAuthToken();
	return apiRequest(`/images/${imageId}/thumbnail/${size}`, { token });
}

// ===== ПРИКРЕПЛЕНИЯ К ПОСТАМ =====

export async function createPostAttachment(
	fileId: string,
	type: 'image' | 'video' | 'document'
): Promise<PostAttachment> {
	const token = await getAuthToken();
	return apiRequest('/attachments/', {
		method: 'POST',
		body: { fileId, type },
		token,
	});
}

export async function getPostAttachments(postId: string): Promise<PostAttachment[]> {
	const token = await getAuthToken();
	const response = await apiRequest<{ items: PostAttachment[] }>(
		`/posts/${postId}/attachments`,
		{ token }
	);
	return response.items;
}

export async function deletePostAttachment(attachmentId: string): Promise<void> {
	const token = await getAuthToken();
	return apiRequest(`/attachments/${attachmentId}`, {
		method: 'DELETE',
		token,
	});
}

// ===== ВАЛИДАЦИЯ И ПРОВЕРКА =====

export async function validateFile(file: File): Promise<{
	isValid: boolean;
	errors?: string[];
	warnings?: string[];
	metadata?: {
		size: number;
		type: string;
		dimensions?: { width: number; height: number };
		duration?: number;
	};
}> {
	// Клиентская валидация
	const errors: string[] = [];
	const warnings: string[] = [];

	// Максимальный размер файла: 100MB
	const maxSize = 100 * 1024 * 1024;
	if (file.size > maxSize) {
		errors.push('Файл слишком большой. Максимальный размер: 100MB');
	}

	// Разрешенные типы файлов
	const allowedTypes = {
		image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
		video: ['video/mp4', 'video/webm', 'video/mov'],
		document: ['application/pdf', 'text/plain', 'application/msword'],
	};

	const allAllowedTypes = Object.values(allowedTypes).flat();
	if (!allAllowedTypes.includes(file.type)) {
		errors.push('Неподдерживаемый тип файла');
	}

	// Предупреждения для больших файлов
	if (file.size > 10 * 1024 * 1024) {
		warnings.push('Большой файл может загружаться долго');
	}

	return {
		isValid: errors.length === 0,
		errors: errors.length > 0 ? errors : undefined,
		warnings: warnings.length > 0 ? warnings : undefined,
		metadata: {
			size: file.size,
			type: file.type,
		},
	};
}

// ===== BATCH ОПЕРАЦИИ =====

export async function uploadMultipleFiles(files: File[]): Promise<{
	successful: UploadResponse[];
	failed: Array<{ file: File; error: string }>;
}> {
	const results: UploadResponse[] = [];
	const failed: Array<{ file: File; error: string }> = [];

	// Загружаем файлы по одному для избежания перегрузки сервера
	for (const file of files) {
		try {
			let result: UploadResponse;
			if (file.type.startsWith('image/')) {
				result = await uploadImage(file);
			} else if (file.type.startsWith('video/')) {
				result = await uploadVideo(file);
			} else {
				result = await uploadDocument(file);
			}
			results.push(result);
		} catch (error) {
			failed.push({
				file,
				error: error instanceof Error ? error.message : 'Неизвестная ошибка',
			});
		}
	}

	return {
		successful: results,
		failed,
	};
}

export async function deleteMultipleFiles(fileIds: string[]): Promise<{
	successful: string[];
	failed: Array<{ fileId: string; error: string }>;
}> {
	const successful: string[] = [];
	const failed: Array<{ fileId: string; error: string }> = [];

	// Параллельное удаление файлов
	const promises = fileIds.map(async (fileId) => {
		try {
			await deleteFile(fileId);
			successful.push(fileId);
		} catch (error) {
			failed.push({
				fileId,
				error: error instanceof Error ? error.message : 'Неизвестная ошибка',
			});
		}
	});

	await Promise.allSettled(promises);

	return {
		successful,
		failed,
	};
}