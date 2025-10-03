'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
	FileInfo,
} from '../api/types';
import * as mediaApi from '../api/media';

// ===== QUERY KEYS =====

export const mediaKeys = {
	all: ['media'] as const,
	files: () => [...mediaKeys.all, 'files'] as const,
	file: (fileId: string) => [...mediaKeys.files(), fileId] as const,
	gallery: () => [...mediaKeys.all, 'gallery'] as const,
	galleryList: (filters: Record<string, unknown>) =>
		[...mediaKeys.gallery(), 'list', { filters }] as const,
	userGallery: (userId: string, filters: Record<string, unknown>) =>
		[...mediaKeys.gallery(), 'user', userId, { filters }] as const,
	attachments: () => [...mediaKeys.all, 'attachments'] as const,
	postAttachments: (postId: string) => [...mediaKeys.attachments(), 'post', postId] as const,
};

// ===== FILE QUERIES =====

export function useFileInfoQuery(fileId: string, enabled = true) {
	return useQuery({
		queryKey: mediaKeys.file(fileId),
		queryFn: () => mediaApi.getFileInfo(fileId),
		enabled: !!fileId && enabled,
		staleTime: 10 * 60 * 1000, // 10 минут
		gcTime: 30 * 60 * 1000, // 30 минут
	});
}

// ===== GALLERY QUERIES =====

export function useMediaGalleryQuery(params?: {
	page?: number;
	limit?: number;
	type?: 'image' | 'video' | 'document' | 'all';
	circleId?: string;
}) {
	return useQuery({
		queryKey: mediaKeys.galleryList(params || {}),
		queryFn: () => mediaApi.getMediaGallery(params),
		staleTime: 2 * 60 * 1000, // 2 минуты
		gcTime: 10 * 60 * 1000, // 10 минут
	});
}

export function useUserMediaGalleryQuery(
	userId: string,
	params?: {
		page?: number;
		limit?: number;
		type?: 'image' | 'video' | 'document' | 'all';
	},
	enabled = true
) {
	return useQuery({
		queryKey: mediaKeys.userGallery(userId, params || {}),
		queryFn: () => mediaApi.getUserMediaGallery(userId, params),
		enabled: !!userId && enabled,
		staleTime: 2 * 60 * 1000, // 2 минуты
		gcTime: 10 * 60 * 1000, // 10 минут
	});
}

// ===== POST ATTACHMENTS QUERIES =====

export function usePostAttachmentsQuery(postId: string, enabled = true) {
	return useQuery({
		queryKey: mediaKeys.postAttachments(postId),
		queryFn: () => mediaApi.getPostAttachments(postId),
		enabled: !!postId && enabled,
		staleTime: 5 * 60 * 1000, // 5 минут
		gcTime: 15 * 60 * 1000, // 15 минут
	});
}

// ===== UPLOAD MUTATIONS =====

export function useUploadImageMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (file: File) => mediaApi.uploadImage(file),
		onSuccess: (uploadResult) => {
			// Добавляем файл в кэш
			queryClient.setQueryData(mediaKeys.file(uploadResult.fileId), {
				id: uploadResult.fileId,
				originalName: uploadResult.fileName,
				url: uploadResult.url,
				size: uploadResult.fileSize,
				type: 'image',
				mimeType: uploadResult.mimeType,
				uploadedAt: new Date().toISOString(),
				dimensions: uploadResult.dimensions,
			} as FileInfo);

			// Обновляем галерею
			queryClient.invalidateQueries({ queryKey: mediaKeys.gallery() });
		},
	});
}

export function useUploadVideoMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (file: File) => mediaApi.uploadVideo(file),
		onSuccess: (uploadResult) => {
			// Добавляем файл в кэш
			queryClient.setQueryData(mediaKeys.file(uploadResult.fileId), {
				id: uploadResult.fileId,
				originalName: uploadResult.fileName,
				url: uploadResult.url,
				size: uploadResult.fileSize,
				type: 'video',
				mimeType: uploadResult.mimeType,
				uploadedAt: new Date().toISOString(),
				dimensions: uploadResult.dimensions,
			} as FileInfo);

			// Обновляем галерею
			queryClient.invalidateQueries({ queryKey: mediaKeys.gallery() });
		},
	});
}

export function useUploadDocumentMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (file: File) => mediaApi.uploadDocument(file),
		onSuccess: (uploadResult) => {
			// Добавляем файл в кэш
			queryClient.setQueryData(mediaKeys.file(uploadResult.fileId), {
				id: uploadResult.fileId,
				originalName: uploadResult.fileName,
				url: uploadResult.url,
				size: uploadResult.fileSize,
				type: 'document',
				mimeType: uploadResult.mimeType,
				uploadedAt: new Date().toISOString(),
			} as FileInfo);

			// Обновляем галерею
			queryClient.invalidateQueries({ queryKey: mediaKeys.gallery() });
		},
	});
}

// ===== MULTI-FILE UPLOAD =====

export function useUploadMultipleFilesMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (files: File[]) => mediaApi.uploadMultipleFiles(files),
		onSuccess: (result) => {
			// Добавляем успешно загруженные файлы в кэш
			result.successful.forEach((uploadResult) => {
				queryClient.setQueryData(mediaKeys.file(uploadResult.fileId), {
					id: uploadResult.fileId,
					originalName: uploadResult.fileName,
					url: uploadResult.url,
					size: uploadResult.fileSize,
					type: uploadResult.mimeType.split('/')[0] as 'image' | 'video' | 'document',
					mimeType: uploadResult.mimeType,
					uploadedAt: new Date().toISOString(),
					dimensions: uploadResult.dimensions,
				} as FileInfo);
			});

			// Обновляем галерею
			queryClient.invalidateQueries({ queryKey: mediaKeys.gallery() });
		},
	});
}

// ===== FILE MANAGEMENT MUTATIONS =====

export function useDeleteFileMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (fileId: string) => mediaApi.deleteFile(fileId),
		onMutate: async (fileId) => {
			// Отменяем исходящие запросы
			await queryClient.cancelQueries({ queryKey: mediaKeys.file(fileId) });

			// Получаем предыдущие данные
			const previousFile = queryClient.getQueryData(mediaKeys.file(fileId));

			// Оптимистично удаляем файл из кэша
			queryClient.removeQueries({ queryKey: mediaKeys.file(fileId) });

			return { previousFile };
		},
		onError: (_error, fileId, context) => {
			// Восстанавливаем файл при ошибке
			if (context?.previousFile) {
				queryClient.setQueryData(mediaKeys.file(fileId), context.previousFile);
			}
		},
		onSettled: () => {
			// Обновляем галерею
			queryClient.invalidateQueries({ queryKey: mediaKeys.gallery() });
		},
	});
}

export function useUpdateFileMetadataMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			fileId,
			metadata,
		}: {
			fileId: string;
			metadata: { title?: string; description?: string; tags?: string[] };
		}) => mediaApi.updateFileMetadata(fileId, metadata),
		onSuccess: (updatedFile, { fileId }) => {
			// Обновляем файл в кэше
			queryClient.setQueryData(mediaKeys.file(fileId), updatedFile);

			// Обновляем галерею
			queryClient.invalidateQueries({ queryKey: mediaKeys.gallery() });
		},
	});
}

// ===== POST ATTACHMENT MUTATIONS =====

export function useCreatePostAttachmentMutation() {
	return useMutation({
		mutationFn: ({ fileId, type }: { fileId: string; type: 'image' | 'video' | 'document' }) =>
			mediaApi.createPostAttachment(fileId, type),
		onSuccess: () => {
			// Добавляем attachment в кэш (если знаем postId)
			// В реальном использовании postId может быть передан через context
		},
	});
}

export function useDeletePostAttachmentMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (attachmentId: string) => mediaApi.deletePostAttachment(attachmentId),
		onSuccess: () => {
			// Обновляем attachments поста если есть postId в контексте
			queryClient.invalidateQueries({ queryKey: mediaKeys.attachments() });
		},
	});
}

// ===== VIDEO PROCESSING =====

export function useVideoThumbnailQuery(videoId: string, enabled = true) {
	return useQuery({
		queryKey: [...mediaKeys.all, 'video', videoId, 'thumbnail'],
		queryFn: () => mediaApi.getVideoThumbnail(videoId),
		enabled: !!videoId && enabled,
		staleTime: 60 * 60 * 1000, // 1 час
		gcTime: 24 * 60 * 60 * 1000, // 24 часа
	});
}

export function useProcessVideoMutation() {
	return useMutation({
		mutationFn: (videoId: string) => mediaApi.processVideo(videoId),
	});
}

export function useVideoProcessingStatusQuery(jobId: string, enabled = true) {
	return useQuery({
		queryKey: [...mediaKeys.all, 'video', 'job', jobId],
		queryFn: () => mediaApi.getVideoProcessingStatus(jobId),
		enabled: !!jobId && enabled,
		refetchInterval: (data) => {
			// Перезапрашиваем каждые 5 секунд пока видео обрабатывается
			return data?.status === 'processing' || data?.status === 'queued' ? 5000 : false;
		},
		staleTime: 0, // Всегда получаем свежие данные
	});
}

// ===== IMAGE OPTIMIZATION =====

export function useOptimizedImageQuery(
	imageId: string,
	options?: {
		width?: number;
		height?: number;
		quality?: number;
		format?: 'webp' | 'jpeg' | 'png';
	},
	enabled = true
) {
	return useQuery({
		queryKey: [...mediaKeys.all, 'image', imageId, 'optimized', options],
		queryFn: () => mediaApi.getOptimizedImage(imageId, options),
		enabled: !!imageId && enabled,
		staleTime: 60 * 60 * 1000, // 1 час
		gcTime: 24 * 60 * 60 * 1000, // 24 часа
	});
}

export function useImageThumbnailQuery(
	imageId: string,
	size: 'small' | 'medium' | 'large' = 'medium',
	enabled = true
) {
	return useQuery({
		queryKey: [...mediaKeys.all, 'image', imageId, 'thumbnail', size],
		queryFn: () => mediaApi.generateImageThumbnail(imageId, size),
		enabled: !!imageId && enabled,
		staleTime: 60 * 60 * 1000, // 1 час
		gcTime: 24 * 60 * 60 * 1000, // 24 часа
	});
}

// ===== CUSTOM HOOKS =====

export function useImageGallery() {
	return useMediaGalleryQuery({ type: 'image' });
}

export function useVideoGallery() {
	return useMediaGalleryQuery({ type: 'video' });
}

export function useDocumentGallery() {
	return useMediaGalleryQuery({ type: 'document' });
}

export function useCircleMediaGallery(circleId: string) {
	return useMediaGalleryQuery({ circleId });
}

// ===== FILE VALIDATION =====

export function useFileValidation() {
	return useMutation({
		mutationFn: (file: File) => mediaApi.validateFile(file),
	});
}

// ===== PREFETCHING =====

export function usePrefetchMediaGallery() {
	const queryClient = useQueryClient();

	return (params?: {
		page?: number;
		limit?: number;
		type?: 'image' | 'video' | 'document' | 'all';
		circleId?: string;
	}) => {
		queryClient.prefetchQuery({
			queryKey: mediaKeys.galleryList(params || {}),
			queryFn: () => mediaApi.getMediaGallery(params),
			staleTime: 2 * 60 * 1000, // 2 минуты
		});
	};
}