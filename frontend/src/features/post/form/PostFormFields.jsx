import { useEffect, useMemo } from 'react';

import usePostsStore from '@/entities/post/model/postsStore';
import Input from '@/shared/ui/Input';
import TagSelector from '@/features/tag/select/TagSelector';
import CoverUpload from '@/features/cover/upload/CoverUpload';

const fieldError = (error) => (Array.isArray(error) ? error.join(' ') : error);

/**
 * Общие поля формы поста. Раньше CreatePostForm и EditPostForm были почти
 * полными копиями друг друга (~200 строк), с расходящимися багами.
 */
export default function PostFormFields({
  formData,
  errors,
  onChange,
  tags,
  onTagsChange,
  coverValue,
  onCoverChange,
  statusOptions,
}) {
  const categories = usePostsStore((s) => s.categories);
  const fetchCategories = usePostsStore((s) => s.fetchCategories);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const stats = useMemo(() => {
    const words = formData.content.trim() ? formData.content.trim().split(/\s+/).length : 0;
    return { words, minutes: Math.max(1, Math.round(words / 200)) };
  }, [formData.content]);

  return (
    <div className="space-y-6">
      <div className="card space-y-5 p-6">
        <Input
          label="Заголовок *"
          name="title"
          value={formData.title}
          onChange={onChange}
          error={errors.title}
          maxLength={255}
          placeholder="Яркий заголовок привлекает читателей"
          required
          autoFocus
        />

        <div>
          <label htmlFor="post-excerpt" className="mb-1.5 block text-sm font-medium text-gray-700">
            Краткое описание
          </label>
          <textarea
            id="post-excerpt"
            name="excerpt"
            value={formData.excerpt}
            onChange={onChange}
            rows={2}
            maxLength={500}
            placeholder="Пара предложений для карточки в ленте"
            className="input resize-none"
          />
          <p className="mt-1 text-right text-xs text-gray-400">{formData.excerpt.length}/500</p>
        </div>

        <div>
          <div className="mb-1.5 flex items-end justify-between">
            <label htmlFor="post-content" className="block text-sm font-medium text-gray-700">
              Содержание *
            </label>
            <span className="text-xs text-gray-400">
              {stats.words} слов · ~{stats.minutes} мин чтения
            </span>
          </div>
          <textarea
            id="post-content"
            name="content"
            value={formData.content}
            onChange={onChange}
            rows={15}
            className={`input min-h-[16rem] resize-y leading-relaxed ${
              errors.content ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''
            }`}
            required
          />
          {errors.content && (
            <p className="mt-1.5 animate-fade-in text-sm text-red-600">{fieldError(errors.content)}</p>
          )}
        </div>
      </div>

      <div className="card p-6">
        <CoverUpload value={coverValue} onChange={onCoverChange} />
        {errors.cover_image && (
          <p className="mt-1.5 text-sm text-red-600">{fieldError(errors.cover_image)}</p>
        )}
      </div>

      <div className="card grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
        <div>
          <label htmlFor="post-category" className="mb-1.5 block text-sm font-medium text-gray-700">
            Категория
          </label>
          <select id="post-category" name="category" value={formData.category} onChange={onChange} className="input">
            <option value="">Без категории</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="post-status" className="mb-1.5 block text-sm font-medium text-gray-700">
            Статус
          </label>
          <select id="post-status" name="status" value={formData.status} onChange={onChange} className="input">
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <TagSelector selected={tags} onChange={onTagsChange} />
          {errors.tags && <p className="mt-1.5 text-sm text-red-600">{fieldError(errors.tags)}</p>}
        </div>
      </div>
    </div>
  );
}

export function validatePostForm(formData) {
  const errors = {};
  if (formData.title.trim().length < 3) {
    errors.title = 'Заголовок должен быть минимум 3 символа';
  }
  if (formData.content.trim().length < 10) {
    errors.content = 'Содержание должно быть минимум 10 символов';
  }
  return errors;
}

export function buildPostFormData(
  formData,
  tags,
  coverFile,
  { includeEmptyCategory = false, removeCover = false } = {}
) {
  const data = new FormData();
  data.append('title', formData.title.trim());
  data.append('excerpt', formData.excerpt.trim());
  data.append('content', formData.content.trim());
  data.append('status', formData.status);

  if (formData.category) data.append('category', formData.category);
  else if (includeEmptyCategory) data.append('category', '');

  if (coverFile) data.append('cover_image', coverFile);
  else if (removeCover) data.append('cover_image', '');
  tags.forEach((tag) => data.append('tags', tag.id));
  return data;
}

export function formatServerErrors(error) {
  if (!error || typeof error !== 'object') return 'Ошибка сохранения';
  return Object.values(error).flat().join(', ');
}
