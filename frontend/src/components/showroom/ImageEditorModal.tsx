import React, { useState } from 'react';
import { Camera, Upload, Check } from 'lucide-react';
import { uploadProductImage } from '../../firebase';

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (url: string) => void;
  currentUrl: string;
  title: string;
}

export function ImageEditorModal({ isOpen, onClose, onSave, currentUrl, title }: ImageEditorModalProps) {
  const [urlInput, setUrlInput] = useState(currentUrl);
  const [uploading, setUploading] = useState(false);

  React.useEffect(() => {
    setUrlInput(currentUrl);
  }, [currentUrl, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setUploading(true);
        const url = await uploadProductImage(file);
        setUrlInput(url);
        onSave(url);
        onClose();
      } catch (err) {
        console.error(err);
        alert("Erro ao enviar imagem ao Firebase Storage.");
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 max-w-md w-full overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-blue-600" />
            {title}
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={uploading}
            className="text-slate-400 hover:text-slate-900 font-extrabold text-sm transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-left">
          {/* External URL option */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">URL Externa da Imagem</label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://images.unsplash.com/... ou link de imagem"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={uploading}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-semibold disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => {
                  onSave(urlInput);
                  onClose();
                }}
                disabled={uploading}
                className="px-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Aplicar</span>
              </button>
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-[9px] font-bold uppercase tracking-wider">Ou carregar arquivo local</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Local File option */}
          <div className="space-y-1">
            <label className={`w-full flex flex-col items-center justify-center gap-2 px-4 py-4 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 text-slate-600 rounded-xl transition-colors text-center ${uploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
              <Upload className={`w-5 h-5 text-slate-400 ${uploading ? 'animate-bounce' : ''}`} />
              <span className="text-xs font-bold">{uploading ? 'Enviando ao Firebase...' : 'Selecionar Imagem do Computador'}</span>
              <span className="text-[9px] text-slate-400">Tamanho recomendado: &lt; 5MB</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          {currentUrl && (
            <div className="pt-2">
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prévia Atual</span>
              <div className="h-24 w-full rounded-lg border bg-slate-50 flex items-center justify-center overflow-hidden p-2">
                <img src={currentUrl} className="max-h-full max-w-full object-contain" alt="Current preview" referrerPolicy="no-referrer" />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
