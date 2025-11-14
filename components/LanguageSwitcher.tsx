import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const inactiveClass = "text-gray-400 hover:text-white";
  const activeClass = "text-white font-bold";

  return (
    <div className="flex items-center space-x-2 bg-gray-700/50 rounded-full p-1">
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 text-sm rounded-full transition-colors duration-200 ${language === 'en' ? activeClass : inactiveClass}`}
      >
        EN
      </button>
      <div className="w-px h-4 bg-gray-500"></div>
      <button
        onClick={() => setLanguage('id')}
        className={`px-3 py-1 text-sm rounded-full transition-colors duration-200 ${language === 'id' ? activeClass : inactiveClass}`}
      >
        ID
      </button>
    </div>
  );
};

export default LanguageSwitcher;
