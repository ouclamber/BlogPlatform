import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import usePostsStore from '@/entities/post/model/postsStore';
import Button from '@/shared/ui/Button';
import PostFormFields, {
  buildPostFormData,
  formatServerErrors,
  validatePostForm,
} from '@/features/post/form/PostFormFields';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Черновик' },
  { value: 'published', label: 'Опубликован' },
  { value: 'archived', label: 'В архиве' },
];

export default function EditPostForm({ post }) {
  const navigate = useNavigate();
  const updatePost = usePostsStore((s) => s.updatePost);
  const isLoading = usePostsStore((s) => s.isLoading);

  const [formData, setFormData] = useState({
    title: post.title || '',
    excerpt: post.excerpt || '',
    content: post.content || '',
    category: post.category?.id || '',
    status: post.status || 'draft',
  });
  const [tags, setTags] = useState(post.tags || []);
  const [coverFile, setCoverFile] = useState(null);
  const [coverRemoved, setCoverRemoved] = useState(false);

  const handleCoverChange = (file) => {
    setCoverFile(file);
    // Крестик на существующей обложке теперь действительно удаляет её на сервере.
    setCoverRemoved(file === null && Boolean(post.cover_image));
  };
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validatePostForm(formData);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Проверьте форму');
      return;
    }

    const data = buildPostFormData(formData, tags, coverFile, {
      includeEmptyCategory: true,
      removeCover: coverRemoved,
    });
    const result = await updatePost(post.slug, data);

    if (result.success) {
      toast.success('Пост обновлён');
      navigate(`/posts/${result.data.slug}`);
    } else {
      toast.error(formatServerErrors(result.error));
      if (typeof result.error === 'object') setErrors(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PostFormFields
        formData={formData}
        errors={errors}
        onChange={handleChange}
        tags={tags}
        onTagsChange={setTags}
        // Текущая обложка показывается как превью; выбор нового файла её заменит.
        coverValue={post.cover_image}
        onCoverChange={handleCoverChange}
        statusOptions={STATUS_OPTIONS}
      />

      <div className="glass sticky bottom-4 z-20 flex items-center gap-3 rounded-2xl p-3 shadow-soft">
        <Button type="submit" loading={isLoading} disabled={isLoading}>
          Сохранить изменения
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isLoading}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
