import { useEffect, useId, useMemo, useState } from 'react';
import { XMarkIcon, PlusIcon, HashtagIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import usePostsStore from '@/entities/post/model/postsStore';

const MAX_TAGS = 10;

export default function TagSelector({ selected = [], onChange }) {
  const tags = usePostsStore((s) => s.tags);
  const fetchTags = usePostsStore((s) => s.fetchTags);
  const createTag = usePostsStore((s) => s.createTag);
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const limitReached = selected.length >= MAX_TAGS;

  const suggestions = useMemo(() => {
    const selectedIds = new Set(selected.map((t) => t.id));
    const query = input.trim().toLowerCase();
    return (tags || [])
      .filter((tag) => !selectedIds.has(tag.id) && tag.name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [tags, selected, input]);

  const addTag = (tag) => {
    if (limitReached) {
      toast.error(`Максимум ${MAX_TAGS} тегов`);
      return;
    }
    onChange([...selected, tag]);
    setInput('');
    setShowSuggestions(false);
    setActiveIndex(0);
  };

  const removeTag = (tagId) => onChange(selected.filter((t) => t.id !== tagId));

  const handleCreateTag = async () => {
    const name = input.trim();
    if (!name) return;

    const existing = (tags || []).find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!selected.some((t) => t.id === existing.id)) addTag(existing);
      else toast.error('Такой тег уже добавлен');
      return;
    }

    const result = await createTag(name);
    if (result.success) {
      addTag(result.data);
      toast.success(`Тег «${name}» создан`);
    } else {
      toast.error(result.error?.name?.[0] || 'Ошибка создания тега');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' && suggestions.length) {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && suggestions.length) {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (input.trim() && suggestions.length > 0) addTag(suggestions[activeIndex] || suggestions[0]);
      else if (input.trim()) handleCreateTag();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    } else if (e.key === 'Backspace' && !input && selected.length > 0) {
      removeTag(selected[selected.length - 1].id);
    }
  };

  return (
    <div className="relative">
      <label className="mb-1.5 block text-sm font-medium text-gray-700">Теги</label>

      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex animate-scale-in items-center gap-1 rounded-full bg-primary-100 py-1 pl-3 pr-1.5 text-sm font-medium text-primary-700"
            >
              #{tag.name}
              <button
                type="button"
                onClick={() => removeTag(tag.id)}
                className="rounded-full p-0.5 transition hover:bg-primary-200 hover:text-primary-900"
                aria-label={`Удалить тег ${tag.name}`}
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <HashtagIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
            setActiveIndex(0);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Введите тег и нажмите Enter..."
          disabled={limitReached}
          maxLength={50}
          role="combobox"
          aria-expanded={showSuggestions && !!input}
          aria-controls={listId}
          aria-autocomplete="list"
          className="input pl-10 disabled:cursor-not-allowed disabled:bg-gray-50"
        />

        {showSuggestions && input && (
          <div
            id={listId}
            role="listbox"
            className="absolute z-20 mt-2 max-h-56 w-full origin-top animate-scale-in overflow-y-auto rounded-xl border border-gray-100 bg-white py-1 shadow-glow"
          >
            {suggestions.length > 0 ? (
              suggestions.map((tag, index) => (
                <button
                  key={tag.id}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTag(tag)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left transition-colors ${
                    index === activeIndex ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50'
                  }`}
                >
                  <span>#{tag.name}</span>
                  <span className="text-xs text-gray-400">{tag.posts_count || 0} постов</span>
                </button>
              ))
            ) : (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCreateTag}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-primary-600 hover:bg-primary-50"
              >
                <PlusIcon className="h-4 w-4" />
                Создать тег «{input.trim()}»
              </button>
            )}
          </div>
        )}
      </div>

      <p className="mt-1.5 text-xs text-gray-500">
        {selected.length}/{MAX_TAGS} тегов · Enter — добавить, ↑↓ — выбрать, Backspace — удалить последний
      </p>
    </div>
  );
}
