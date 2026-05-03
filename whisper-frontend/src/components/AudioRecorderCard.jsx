import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';

function AudioRecorderCard() {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [transcriere, setTranscriere] = useState("");
  const [loading, setLoading] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [duration, setDuration] = useState(0);

  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    if (recording) {
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [recording]);

  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleReinregistreaza = () => {
    setAudioBlob(null);
    setTranscriere("");
    setDuration(0);
    setPatientName("");
    startRecording();
  };


  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    audioChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      setAudioBlob(audioBlob);
    };

    mediaRecorderRef.current.start();
    setRecording(true);
    setTranscriere("");
    setAudioBlob(null);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const sendToBackend = async () => {
    if (!audioBlob) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");

    try {
      const res = await fetch("http://localhost:8000/transcribe/", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setTranscriere(data.corectat);
    } catch (err) {
      console.error(err);
      toast.error("Eroare la trimiterea audio.");
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
      toast.warn("⚠️ Completeaza numele pacientului pentru a genera raportul.");
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
      toast.error("❌ A aparut o eroare la generarea raportului.");
    }
  };

  const handleSaveToHistory = async () => {
    if (!transcriere || !patientName) {
      toast.warn("Completeaza numele pacientului si transcrierea.");
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
        if (result.error === "report_exists") {
          toast.error("Exista deja un raport salvat pentru acest pacient.");
        } else {
          toast.error("Eroare la salvare.");
        }
        return;
      }

      toast.success("Raport salvat cu succes în istoric!");
    } catch (err) {
      console.error(err);
      toast.error("Eroare neasteptata la salvare.");
    }
  };

  return (
    <div className="space-y-4 w-full">
      <h2 className="text-xl font-semibold text-gray-700">Înregistrează audio</h2>

      {!recording && !audioBlob && (
        <>
          <button
            onClick={startRecording}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Înregistrează
          </button>
          <p className="text-xs text-gray-400 mt-2">Durata: {formatTime(duration)}</p>
        </>
      )}

      {recording && (
        <>
          <button
            onClick={stopRecording}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Stop Recording
          </button>
          <p className="text-xs text-gray-400 mt-2">Durata: {formatTime(duration)}</p>
        </>
      )}

      {audioBlob && !loading && (
        <>
          <audio controls src={URL.createObjectURL(audioBlob)} className="mt-2" />
          <div className="flex gap-2 mt-3">
            <button
              onClick={sendToBackend}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Trimite la backend
            </button>
            <button
              onClick={handleReinregistreaza}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded"
            >
              Reînregistrează
            </button>
          </div>
        </>
      )}

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-blue-800 font-medium">
          <div className="w-6 h-6 border-4 border-white border-t-blue-600 rounded-full animate-spin"></div>
          <span className="animate-pulse">⏳ Se transcrie înregistrarea...</span>
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

export default AudioRecorderCard;
