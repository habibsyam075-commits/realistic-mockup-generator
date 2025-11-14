import React, { useState, useCallback, useEffect } from 'react';
import { AppState, MockupType } from './types';
import FileUpload from './components/FileUpload';
import MockupEditor from './components/MockupEditor';
import ResultDisplay from './components/ResultDisplay';
import Spinner from './components/Spinner';
import ConfirmationScreen from './components/ConfirmationScreen';
import ApiKeyScreen from './components/ApiKeyScreen';
import { generateMockup } from './services/geminiService';
import { GenerationAssets } from './utils/imageUtils';
import { useLanguage } from './contexts/LanguageContext';
import LanguageSwitcher from './components/LanguageSwitcher';

export type DesignTransform = {
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
};

const App: React.FC = () => {
  const { t } = useLanguage();
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem('gemini-api-key'));
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD_FILES);
  const [walletImage, setWalletImage] = useState<string | null>(null);
  const [designImages, setDesignImages] = useState<string[]>([]);
  const [mockupResult, setMockupResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // State to hold data for confirmation and regeneration
  const [lastEditorData, setLastEditorData] = useState<DesignTransform[] | null>(null);
  const [lastMockupType, setLastMockupType] = useState<MockupType>(MockupType.ENGRAVE);
  const [lastContainerSize, setLastContainerSize] = useState<{width: number, height: number} | null>(null);
  const [captureImage, setCaptureImage] = useState<string | null>(null);
  const [lastGenerationAssets, setLastGenerationAssets] = useState<GenerationAssets | null>(null);
  
  const handleKeySubmit = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini-api-key', key);
    setApiKeyError(null); // Clear previous errors on new submission
  };

  useEffect(() => {
    if (walletImage && designImages.length > 0 && appState === AppState.UPLOAD_FILES) {
      const timer = setTimeout(() => {
        setAppState(AppState.EDIT);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [walletImage, designImages, appState]);

  const handleWalletUpload = (files: FileList) => {
    const file = files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setWalletImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDesignUpload = (files: FileList) => {
    const filePromises = Array.from(files).map(file => {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    });

    Promise.all(filePromises).then(newImages => {
        setDesignImages(prev => [...prev, ...newImages]);
    });
  };

  const handleRemoveDesign = (indexToRemove: number) => {
    setDesignImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };


  const runGeneration = useCallback(async (assets: GenerationAssets, mockupType: MockupType) => {
    if (!apiKey) {
      setError("API Key is not set.");
      setAppState(AppState.UPLOAD_FILES);
      return;
    }
    setAppState(AppState.GENERATING);
    setError(null);
    setApiKeyError(null);

    try {
      const resultData = await generateMockup(
        assets.guideImage,
        mockupType,
        apiKey
      );
      
      setMockupResult(resultData);
      setAppState(AppState.RESULT);
    } catch (err: any) {
      console.error(err);
      if (err.message === 'API_KEY_INVALID') {
        setApiKey(null);
        localStorage.removeItem('gemini-api-key');
        setApiKeyError(t('apiKeyError'));
      } else {
        setError(t('errorFailedToGenerate'));
        setAppState(AppState.EDIT);
      }
    }
  }, [apiKey, t]);

  const handleGenerate = useCallback((
    assets: GenerationAssets,
    designs: DesignTransform[],
    containerSize: { width: number; height: number },
    mockupType: MockupType
  ) => {
    setCaptureImage(assets.captureImage);
    setLastGenerationAssets(assets);
    setLastEditorData(designs);
    setLastContainerSize(containerSize);
    setLastMockupType(mockupType);
    setAppState(AppState.CONFIRM);
  }, []);

  const handleConfirmGenerate = useCallback(async () => {
    if (lastGenerationAssets) {
        await runGeneration(lastGenerationAssets, lastMockupType);
    } else {
        console.error("Missing assets for generation confirmation.");
        setAppState(AppState.EDIT);
    }
  }, [runGeneration, lastGenerationAssets, lastMockupType]);
  
  const handleCancelConfirm = () => {
    setAppState(AppState.EDIT);
    setCaptureImage(null);
  };

  const handleRegenerate = useCallback(async () => {
    if (lastGenerationAssets) {
      await runGeneration(lastGenerationAssets, lastMockupType);
    } else {
      console.error("Missing assets for regeneration.");
      setAppState(AppState.EDIT);
    }
  }, [lastGenerationAssets, lastMockupType, runGeneration]);
  
  const handleAdjust = () => {
    setAppState(AppState.EDIT);
  };

  const handleReset = () => {
    setAppState(AppState.UPLOAD_FILES);
    setWalletImage(null);
    setDesignImages([]);
    setMockupResult(null);
    setError(null);
    setLastEditorData(null);
    setLastMockupType(MockupType.ENGRAVE);
    setCaptureImage(null);
    setLastContainerSize(null);
    setLastGenerationAssets(null);
  };
  
  const renderDesignUploads = () => {
    return (
      <div className="flex flex-col w-full">
        {designImages.length > 0 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-2 text-center">{t('yourDesigns')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-2 bg-gray-900/50 rounded-lg">
              {designImages.map((src, index) => (
                <div key={index} className="relative group">
                  <img src={src} alt={`${t('design')} ${index + 1}`} className="w-full h-full object-contain rounded-md bg-gray-700 aspect-square" />
                  <button 
                    onClick={() => handleRemoveDesign(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-600/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={t('removeDesign')}
                  >
                    &#x2715;
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <FileUpload
          onFileSelect={handleDesignUpload}
          title={designImages.length === 0 ? t('step2Title') : t('addMoreDesigns')}
          description={t('step2Desc')}
          multiple
        />
      </div>
    );
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.UPLOAD_FILES:
        return (
          <div className="w-full max-w-4xl mx-auto">
            <div className="bg-gray-700/50 rounded-lg p-6 mb-8 text-center">
              <h2 className="text-xl font-bold text-white mb-4">{t('howItWorksTitle')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-300">
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-full text-white font-bold text-xl mb-3">1</div>
                  <h3 className="font-semibold text-white mb-1">{t('howItWorksStep1Title')}</h3>
                  <p className="text-sm">{t('howItWorksStep1Desc')}</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-full text-white font-bold text-xl mb-3">2</div>
                  <h3 className="font-semibold text-white mb-1">{t('howItWorksStep2Title')}</h3>
                  <p className="text-sm">{t('howItWorksStep2Desc')}</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-full text-white font-bold text-xl mb-3">3</div>
                  <h3 className="font-semibold text-white mb-1">{t('howItWorksStep3Title')}</h3>
                  <p className="text-sm">{t('howItWorksStep3Desc')}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col">
                {walletImage ? (
                  <div className="flex flex-col items-center text-center">
                    <h2 className="text-xl font-semibold text-white mb-4">{t('productPhoto')}</h2>
                    <div className="p-2 bg-gray-700 rounded-lg shadow-lg w-full">
                      <img src={walletImage} alt={t('productPreview')} className="rounded-md w-full object-contain max-h-64" />
                    </div>
                    <button
                      onClick={() => setWalletImage(null)}
                      className="mt-4 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors duration-200"
                    >
                      {t('changeProduct')}
                    </button>
                  </div>
                ) : (
                  <FileUpload
                    onFileSelect={handleWalletUpload}
                    title={t('step1Title')}
                    description={t('step1Desc')}
                  />
                )}
              </div>
              {renderDesignUploads()}
            </div>
            {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
          </div>
        );
      case AppState.EDIT:
        if (walletImage && designImages.length > 0) {
          return (
            <MockupEditor
              walletImage={walletImage}
              designImages={designImages}
              onGenerate={handleGenerate}
              initialDesigns={lastEditorData}
            />
          );
        }
        return null;
      case AppState.CONFIRM:
        if (captureImage) {
          return (
            <ConfirmationScreen
              captureImage={captureImage}
              onConfirm={handleConfirmGenerate}
              onCancel={handleCancelConfirm}
              mockupType={lastMockupType}
            />
          );
        }
        return null;
      case AppState.GENERATING:
        return <Spinner text={t('generatingSpinner')} />;
      case AppState.RESULT:
        if (mockupResult) {
          return (
            <ResultDisplay 
              mockupResult={mockupResult}
              onReset={handleReset}
              onRegenerate={handleRegenerate}
              onAdjust={handleAdjust}
            />
          );
        }
        return null;
      default:
        return null;
    }
  };

  if (!apiKey) {
    return <ApiKeyScreen onKeySubmit={handleKeySubmit} error={apiKeyError} />;
  }

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
       <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8 relative">
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{t('mainTitle')}</h1>
            <p className="text-gray-400 mt-2 text-lg">
              {t('subTitle')}
            </p>
            <div className="absolute top-0 right-0">
                <LanguageSwitcher />
            </div>
        </header>
        <main className="bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-8 flex items-center justify-center min-h-[500px]">
            {renderContent()}
            {error && appState === AppState.EDIT && (
              <p className="text-red-400 mt-4 text-center">{error}</p>
            )}
        </main>
         <footer className="text-center mt-8 text-gray-500 text-sm">
            <p>Powered by Gemini API</p>
        </footer>
       </div>
    </div>
  );
};

export default App;
