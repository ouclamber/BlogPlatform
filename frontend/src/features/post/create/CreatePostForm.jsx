import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import usePostsStore from '@/entities/post/model/postsStore';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import TagSelector from '@/features/tag/select/TagSelector';
import CoverUpload from '@/features/cover/upload/CoverUpload';

export default function CreatePostForm() {
  const navigate = useNavigate();
  const { createPost, categories, fetchCategories, isLoading } =
    usePostsStore();

  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: '',
    status: 'draft',
  });
  const [tags, setTags] = useState([]);
  const [coverFile, setCoverFile] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSubmit = async (e, status = null) => {
    e?.preventDefault();

    const newErrors = {};
    if (!formData.title.trim() || formData.title.length < 3) {
      newErrors.title = 'Заголовок должен быть минимум 3 символа';
    }
    if (!formData.content.trim() || formData.content.length < 10) {
      newErrors.content = 'Содержание должно быть минимум 10 символов';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Проверьте форму');
      return;
    }

    const data = new FormData();
    data.append('title', formData.title.trim());
    data.append('excerpt', formData.excerpt.trim());
    data.append('content', formData.content.trim());
    data.append('status', status || formData.status);

    if (formData.category) {
      data.append('category', formData.category);
    }

    if (coverFile) {
      data.append('cover_image', coverFile);
    }

    tags.forEach((tag) => {
      data.append('tags', tag.id);
    });

    const result = await createPost(data);

    if (result.success) {
      toast.success(
        (status || formData.status) === 'published'
          ? 'Пост опубликован!'
          : 'Черновик сохранён'
      );
      navigate(`/posts/${result.data.slug}`);
    } else {
      const errorMsg =
        typeof result.error === 'object'
          ? Object.values(result.error).flat().join(', ')
          : 'Ошибка создания поста';
      toast.error(errorMsg);
      if (typeof result.error === 'object') setErrors(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Заголовок *"
        name="title"
        value={formData.title}
        onChange={handleChange}
        error={errors.title}
        maxLength={255}
        required
        autoFocus
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Краткое описание
        </label>
        <textarea
          name="excerpt"
          value={formData.excerpt}
          onChange={handleChange}
          rows={2}
          maxLength={500}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition resize-none bg-white"
        />
        <p className="text-xs text-gray-400 mt-1">
          {formData.excerpt.length}/500
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Содержание *
        </label>
        <textarea
          name="content"
          value={formData.content}
          onChange={handleChange}
          rows={15}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition resize-none bg-white"
          required
        />
        {errors.content && (
          <p className="mt-1 text-sm text-red-600">{errors.content}</p>
        )}
      </div>

      <CoverUpload value={null} onChange={setCoverFile} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Категория
        </label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="input"
        >
          <option value="">Без категории</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <TagSelector selected={tags} onChange={setTags} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Статус
        </label>
        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="input"
        >
          <option value="draft">Черновик</option>
          <option value="published">Опубликовать сразу</option>
        </select>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
        <Button type="submit" loading={isLoading} disabled={isLoading}>
          {formData.status === 'published'
            ? 'Опубликовать'
            : 'Сохранить черновик'}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(-1)}
          disabled={isLoading}
        >
          Отмена
        </Button>
      </div>
    </form>
  );
}