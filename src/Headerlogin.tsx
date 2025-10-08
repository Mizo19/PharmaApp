import { FaCapsules } from "react-icons/fa";

export default function HeaderLogic() {
  return (
    <div
      className="flex items-center justify-between bg-gradient-to-r from-green-600 to-emerald-800 text-white px-8 py-4 rounded-xl shadow-lg"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      {/* Left: Logo + Title */}
      <div className="flex items-center space-x-4">
        <FaCapsules className="text-5xl text-yellow-300 drop-shadow-md" />
        <div className="flex flex-col leading-tight">
          <span className="text-2xl font-extrabold tracking-wide">
            Pharmacie El Abawain
          </span>
          <span className="text-sm font-light opacity-90">
            Welcome · Let’s Connect
          </span>
        </div>
      </div>
    </div>
  );
}
