import React from 'react';
import Spinner from './Spinner';
import { useLanguage } from '../contexts/LanguageContext';
import { MockupType } from '../types';

interface ConfirmationScreenProps {
  captureImage: string;
  onConfirm: () => void;
  onCancel: () => void;
  mockupType: MockupType;
}

const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({ captureImage, onConfirm, onCancel, mockupType }) => {
  const { t } = useLanguage();
  return (
    <div className="w-full flex flex-col items-center text-center">
      <h2 className="text-2xl font-bold text-white mb-4">{t('confirmTitle')}</h2>
      <p className="text-gray-400 mb-6">{t('confirmSubTitle')}</p>
      
      <div className="w-full max-w-xl p-2 bg-gray-700 rounded-lg shadow-lg">
        {captureImage ? (
           <img src={captureImage} alt={t('confirmPreviewAlt')} className="w-full h-auto rounded-md" />
        ) : (
            <div className="w-full aspect-square flex items-center justify-center">
                <Spinner text={t('loadingPreview')}/>
            </div>
        )}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-4 flex-wrap justify-center items-center">
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors duration-200"
        >
          {t('backToEditor')}
        </button>
        <button
          onClick={onConfirm}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors duration-200 flex items-center justify-center"
        >
          {t('confirmAndGenerate')}
        </button>
      </div>
    </div>
  );
};

export default ConfirmationScreen;