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
  { value: 'published', label: 'Опубликовать сразу' },
];

export default function CreatePostForm() {
  const navigate = useNavigate();
  const createPost = usePostsStore((s) => s.createPost);
  const isLoading = usePostsStore((s) => s.isLoading);

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

    const result = await createPost(buildPostFormData(formData, tags, coverFile));

    if (result.success) {
      toast.success(formData.status === 'published' ? 'Пост опубликован!' : 'Черновик сохранён');
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
        coverValue={null}
        onCoverChange={setCoverFile}
        statusOptions={STATUS_OPTIONS}
      />

      <div className="glass sticky bottom-4 z-20 flex items-center gap-3 rounded-2xl p-3 shadow-soft">
        <Button type="submit" loading={isLoading} disabled={isLoading}>
          {formData.status === 'published' ? 'Опубликовать' : 'Сохранить черновик'}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isLoading}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
