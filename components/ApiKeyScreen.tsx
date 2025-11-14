import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface ApiKeyScreenProps {
  onKeySubmit: (key: string) => void;
  error?: string | null;
}

const ApiKeyScreen: React.FC<ApiKeyScreenProps> = ({ onKeySubmit, error }) => {
  const { t } = useLanguage();
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onKeySubmit(apiKey.trim());
    }
  };

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen flex flex-col items-center justify-center p-4 font-sans">
      <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl shadow-2xl p-8 text-center max-w-lg w-full">
        <h1 className="text-3xl font-bold text-white mb-2">{t('apiKeyTitle')}</h1>
        <p className="text-gray-400 mb-6">
          {t('apiKeyDescriptionManual')}
        </p>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={t('apiKeyPlaceholder')}
          className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition mb-4"
          aria-label={t('apiKeyPlaceholder')}
        />
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          disabled={!apiKey.trim()}
          className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors duration-200 disabled:bg-indigo-400 disabled:cursor-not-allowed"
        >
          {t('apiKeySaveButton')}
        </button>
         <p className="text-xs text-gray-500 mt-4">
            Your API key is stored only in your browser's local storage.
        </p>
      </form>
    </div>
  );
};

export default ApiKeyScreen;
