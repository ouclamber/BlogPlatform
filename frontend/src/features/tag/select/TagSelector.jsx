import { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import usePostsStore from '../../../entities/post/model/postsStore';

export default function TagSelector({ selected = [], onChange }) {
  const { tags, fetchTags, createTag } = usePostsStore();
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (tags.length === 0) fetchTags();
  }, [tags.length, fetchTags]);

  const selectedIds = selected.map((t) => t.id);

  const suggestions = tags.filter(
    (tag) =>
      !selectedIds.includes(tag.id) &&
      tag.name.toLowerCase().includes(input.toLowerCase())
  );

  const addTag = (tag) => {
    onChange([...selected, tag]);
    setInput('');
    setShowSuggestions(false);
  };

  const removeTag = (tagId) => {
    onChange(selected.filter((t) => t.id !== tagId));
  };

  const handleCreateTag = async () => {
    const name = input.trim();
    if (!name) return;

    const existing = tags.find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      toast.error('Такой тег уже существует');
      return;
    }

    const result = await createTag(name);
    if (result.success) {
      addTag(result.data);
      toast.success(`Тег "${name}" создан`);
    } else {
      toast.error('Ошибка создания тега');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (input.trim() && suggestions.length > 0) {
        addTag(suggestions[0]);
      } else if (input.trim()) {
        handleCreateTag();
      }
    }
    if (e.key === 'Backspace' && !input && selected.length > 0) {
      removeTag(selected[selected.length - 1].id);
    }
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Теги
      </label>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {selected.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-lg text-sm"
          >
            #{tag.name}
            <button
              type="button"
              onClick={() => removeTag(tag.id)}
              className="hover:text-primary-900"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
      </div>

      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder="Введите тег и нажмите Enter..."
          className="input"
        />

        {showSuggestions && input && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {suggestions.length > 0 ? (
              suggestions.slice(0, 5).map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                >
                  <span>#{tag.name}</span>
                  <span className="text-xs text-gray-400">
                    {tag.posts_count || 0} постов
                  </span>
                </button>
              ))
            ) : (
              <button
                type="button"
                onClick={handleCreateTag}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-primary-600"
              >
                <PlusIcon className="w-4 h-4" />
                Создать тег "{input}"
              </button>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-1">
        Максимум 10 тегов. Нажмите Enter для добавления.
      </p>
    </div>
  );
}