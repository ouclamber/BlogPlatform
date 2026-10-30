import { Component } from 'react';

// Ловит ошибки рендера и падение загрузки lazy-чанков (типично после деплоя:
// старый index.html ссылается на удалённые файлы) — вместо белого экрана.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error(error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="card max-w-md p-8 text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Что-то пошло не так</h1>
          <p className="mb-6 text-gray-500">Попробуйте обновить страницу — возможно, вышла новая версия сайта.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 px-5 py-2.5 font-medium text-white shadow-glow-sm"
          >
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }
}
