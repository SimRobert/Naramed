import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AudioUploadCard from './components/AudioUploadCard';
import AudioRecorderCard from './components/AudioRecorderCard';
import SavedReportsCard from './components/SavedReportsCard';

function App() {
  const [activeTab, setActiveTab] = useState('transcriere');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-indigo-500 flex flex-col items-center justify-start p-8 gap-10">


      {/* Titlu si descriere */}
      <div className="text-center text-gray-800 mt-2">
        <div className="text-5xl mb-4">🎙️</div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Bine ai venit în NaraMed!
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Înregistrează sau încarcă fișiere pentru transcriere automată și salvare
        </p>
      </div>

      {/* Butoane tab switch */}
      <div className="flex gap-4 mt-2">
        <button
          className={`px-5 py-2 rounded-full font-medium transition shadow ${
            activeTab === 'transcriere'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100'
          }`}
          onClick={() => setActiveTab('transcriere')}
        >
          🎤 Transcriere
        </button>

        <button
          className={`px-5 py-2 rounded-full font-medium transition shadow ${
            activeTab === 'istoric'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100'
          }`}
          onClick={() => setActiveTab('istoric')}
        >
          📄 Istoric
        </button>
      </div>

      {/* Continut taburi */}
      {activeTab === 'transcriere' && (
        <div className="flex flex-col md:flex-row items-start gap-8 mt-4">
          <div className="bg-white shadow-md rounded-2xl p-6 w-full md:w-[360px] min-h-[171px] transition hover:shadow-lg hover:-translate-y-1">
            <AudioUploadCard />
          </div>

          <div className="bg-white shadow-md rounded-2xl p-6 w-full md:w-[360px] min-h-[160px] transition hover:shadow-lg hover:-translate-y-1">
            <AudioRecorderCard />
          </div>
        </div>
      )}

      {activeTab === 'istoric' && (
        <div className="bg-white shadow-md rounded-2xl p-6 w-full max-w-3xl mt-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">📄 Rapoarte salvate</h2>
          <SavedReportsCard />
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-black mt-10">
        © 2025 NaraMed – Asistent digital pentru transcriere medicală
      </footer>

      {/* Notificari toast */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        pauseOnHover
        theme="colored"
      />
    </div>
  );
}

export default App;
