import React, { useState } from 'react';
import { toast } from 'react-toastify';

function AudioUploadCard() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [transcriere, setTranscriere] = useState("");
  const [loading, setLoading] = useState(false);
  const [patientName, setPatientName] = useState("");

  const handleFileSelect = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('http://localhost:8000/transcribe/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Eroare la trimitere');

      const data = await response.json();
      setTranscriere(data.corectat);
    } catch (err) {
      console.error(err);
      toast.error("Eroare la trimiterea fisierului.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([transcriere], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${patientName || 'raport'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateReport = async () => {
    if (!transcriere) return;

    if (!patientName) {
      toast.error("Eroare la generarea raportului, completeaza numele pacientului.");
      return;
    }

    const formData = new FormData();
    formData.append('transcript', transcriere);
    formData.append('patient_name', patientName);

    try {
      const response = await fetch('http://localhost:8000/generate_report/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Eroare la generarea raportului');

      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${patientName || 'raport'}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      toast.error("A aparut o eroare la generarea raportului.");
    }
  };

  const handleSaveToHistory = async () => {
    if (!transcriere || !patientName) {
      toast.warn("Completeaza numele pacientului.");
      return;
    }

    const formData = new FormData();
    formData.append("transcript", transcriere);
    formData.append("patient_name", patientName);

    try {
      const response = await fetch("http://localhost:8000/save_report/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const result = await response.json();
        toast.error((result.detail || "Exista deja un raport salvat pentru acest pacient."));
        return;
      }

      toast.success("Raport salvat cu succes în istoric!");
    } catch (err) {
      console.error(err);
      toast.error("Un raport cu acest nume exista deja.");
    }
  };

  return (
    <div className="space-y-4 w-full">
      <h2 className="text-xl font-semibold text-gray-700">Încarcă fișier audio</h2>

      <input
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        className="block w-full text-sm text-gray-600"
      />

      {selectedFile && (
        <p className="text-green-600 text-sm">✅ {selectedFile.name} incarcat</p>
      )}

      <button
        onClick={handleUpload}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        Trimite pentru transcriere
      </button>

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-blue-800 font-medium">
          <div className="w-6 h-6 border-4 border-white border-t-blue-600 rounded-full animate-spin"></div>
          <span className="animate-pulse">⏳ Se face transcrierea fișierului...</span>
        </div>
      )}

      {transcriere && (
        <>
          <div className="mt-4 p-3 bg-green-100 text-green-800 rounded">
            <strong>Text transcris:</strong>
            <p className="whitespace-pre-wrap">{transcriere}</p>
          </div>

          <div className="mt-4">
            <label className="text-sm text-gray-700">Nume pacient (pentru salvare și denumire fișier):</label>
            <input
              type="text"
              className="mt-1 p-2 border rounded w-full"
              placeholder="ex: popescu_ion"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3 mt-4">
            <button
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded w-full"
              onClick={handleDownloadTxt}
            >
              Descarcă transcriere (.txt)
            </button>

            <button
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full"
              onClick={handleGenerateReport}
            >
              Generează și descarcă raport (.docx)
            </button>
          </div>

          <button
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded w-full mt-3"
            onClick={handleSaveToHistory}
          >
            Salvează în istoric
          </button>
        </>
      )}
    </div>
  );
}

export default AudioUploadCard;
