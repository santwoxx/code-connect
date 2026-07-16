import { EditableText } from './EditableText';

interface TopBarFeaturesProps {
  topBarTexts: string[];
  onChangeTopBarText: (index: number, value: string) => void;
  visualEditMode: boolean;
}

export function TopBarFeatures({ topBarTexts, onChangeTopBarText, visualEditMode }: TopBarFeaturesProps) {
  return (
    <div className="bg-slate-900 text-white py-2 text-[11px] px-4 font-sans tracking-tight border-b border-slate-800">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-blue-400 font-bold">💳</span>
          <span>
            <EditableText
              text={topBarTexts[0]}
              onChange={(val) => onChangeTopBarText(0, val)}
              visualEditMode={visualEditMode}
            />
          </span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <span className="text-blue-400 font-bold">⚡</span>
            <span>
              <EditableText
                text={topBarTexts[1]}
                onChange={(val) => onChangeTopBarText(1, val)}
                visualEditMode={visualEditMode}
              />
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-blue-400 font-bold">🚚</span>
            <span>
              <EditableText
                text={topBarTexts[2]}
                onChange={(val) => onChangeTopBarText(2, val)}
                visualEditMode={visualEditMode}
              />
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold">🔒</span>
            <span>
              <EditableText
                text={topBarTexts[3]}
                onChange={(val) => onChangeTopBarText(3, val)}
                visualEditMode={visualEditMode}
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
