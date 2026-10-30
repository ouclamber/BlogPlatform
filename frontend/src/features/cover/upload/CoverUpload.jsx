import { useEffect, useRef, useState } from 'react';
import { PhotoIcon, XMarkIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { resolveMediaUrl } from '@/shared/lib/media';

const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export default function CoverUpload({ value, onChange }) {
  const [preview, setPreview] = useState(() => resolveMediaUrl(value));
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  const objectUrlRef = useRef(null);

  // Освобождаем blob-URL, иначе каждый выбор файла держит картинку в памяти.
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL?.(objectUrlRef.current);
    },
    []
  );

  const acceptFile = (file) => {
    if (!file) return;

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Файл слишком большой. Максимум ${MAX_SIZE_MB} МБ.`);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Недопустимый тип файла. Разрешены: jpeg, png, gif, webp.');
      return;
    }

    if (objectUrlRef.current) URL.revokeObjectURL?.(objectUrlRef.current);
    if (typeof URL.createObjectURL === 'function') {
      // createObjectURL мгновенный и не копирует файл в base64-строку (как FileReader).
      objectUrlRef.current = URL.createObjectURL(file);
      setPreview(objectUrlRef.current);
    } else {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }

    onChange(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    acceptFile(e.dataTransfer?.files?.[0]);
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">Обложка</label>

      {preview ? (
        <div className="group relative overflow-hidden rounded-xl">
          <img
            src={preview}
            alt="Превью"
            className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Удалить обложку"
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-red-600 shadow-lg backdrop-blur transition hover:scale-110 hover:bg-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
            dragging
              ? 'scale-[1.01] border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-primary-400 hover:bg-primary-50/50'
          }`}
        >
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
            {dragging ? <CloudArrowUpIcon className="h-7 w-7 animate-bounce" /> : <PhotoIcon className="h-7 w-7" />}
          </div>
          <p className="font-medium text-gray-700">Нажмите, чтобы загрузить обложку</p>
          <p className="mt-1 text-xs text-gray-400">или перетащите файл · JPG, PNG, GIF, WEBP · до {MAX_SIZE_MB} МБ</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={(e) => acceptFile(e.target.files?.[0])}
        className="hidden"
      />
    </div>
  );
}
