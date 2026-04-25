import { FaPlus } from "react-icons/fa";

export default function HeaderLogic() {
  return (
    <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-green-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center shadow-sm">
          <FaPlus className="text-white text-lg" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-lg font-bold text-gray-800">
            Pharmacie El Abawain
          </span>
          <span className="text-xs text-gray-500">
            Votre santé, notre priorité
          </span>
        </div>
      </div>
    </div>
  );
}
