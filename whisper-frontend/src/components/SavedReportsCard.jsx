import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

// Formatam timestamp ISO intr-un format romanesc
const formatDate = (isoString) => {
  const date = new Date(isoString);
  const z = (n) => n.toString().padStart(2, '0');
  return `${z(date.getDate())}.${z(date.getMonth() + 1)}.${date.getFullYear()} ${z(date.getHours())}:${z(date.getMinutes())}`;
};

function SavedReportsCard() {
  const [reports, setReports] = useState({});
  const [expandedPatients, setExpandedPatients] = useState(new Set());
  const [search, setSearch] = useState('');
  const [editingReport, setEditingReport] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/list_all_reports")
      .then((res) => res.json())
      .then((data) => setReports(data))
      .catch((err) => console.error("Eroare la preluarea rapoartelor:", err))
      .finally(() => setLoading(false));
  }, []);

  const togglePatient = (name) => {
    setExpandedPatients(prev => {
      const newSet = new Set(prev);
      newSet.has(name) ? newSet.delete(name) : newSet.add(name);
      return newSet;
    });
  };

  const handleDeleteFile = async (patient, filename) => {
    const result = await Swal.fire({
      title: 'Fisierul urmeaza sa fie sters',
      text: `Vrei sa stergi fisierul "${filename}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Da, sterge',
      cancelButtonText: 'Renunta'
    });

    if (result.isConfirmed) {
      try {
        const formData = new FormData();
        formData.append("patient", patient);
        formData.append("filename", filename);

        const response = await fetch("http://localhost:8000/delete_report/", {
          method: "DELETE",
          body: formData,
        });

        if (response.ok) {
          toast.success("Fisierul a fost sters.");
        } else {
          toast.error("Eroare la stergerea fisierului.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Eroare la conectarea cu serverul.");
      }
    }
  };

  const handleDeleteFolder = async (patient) => {
    const result = await Swal.fire({
      title: 'Folderul urmeaza sa fie sters',
      text: `Vrei sa stergi intreg folderul pacientului "${patient}" si fisierele asociate?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Da, sterge tot',
      cancelButtonText: 'Renunta'
    });

    if (result.isConfirmed) {
      try {
        const formData = new FormData();
        formData.append("patient", patient);

        const response = await fetch("http://localhost:8000/delete_patient_folder/", {
          method: "DELETE",
          body: formData,
        });

        if (response.ok) {
          toast.success(`Folderul pacientului "${patient}" a fost sters.`);
        } else {
          toast.error("Eroare la stergerea folderului.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Eroare la conectarea cu serverul.");
      }
    }
  };

  const handleEdit = async (patient, filename) => {
    const res = await fetch(`http://localhost:8000/download/${patient}/${filename}?_=${Date.now()}`);
    const text = await res.text();
    setEditingReport({ patient, filename });
    setEditedContent(text);
  };

  const handleSaveEdit = async () => {
    const formData = new FormData();
    formData.append("patient_name", editingReport.patient);
    formData.append("report_name", editingReport.filename.replace(".txt", ""));
    formData.append("new_content", editedContent);

    const res = await fetch("http://localhost:8000/update_report/", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      toast.success("Raport actualizat cu succes!");
      setEditingReport(null);
      setEditedContent('');
    } else {
      toast.error("❌ Eroare la salvare raport.");
    }
  };

  const filteredEntries = Object.entries(reports).filter(([name]) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <input
          type="text"
          placeholder="Caută pacient..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-600 text-sm animate-pulse">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <span>Se incarca istoricul rapoartelor...</span>
        </div>
      ) : filteredEntries.length === 0 ? (
        <p className="text-gray-500">Niciun pacient gasit.</p>
      ) : (
        filteredEntries.map(([patient, files]) => (
          <div key={patient} className="bg-gray-50 p-4 rounded-lg shadow-sm">
            <button
              className="w-full text-left font-semibold text-gray-800 flex justify-between items-center"
              onClick={() => togglePatient(patient)}
            >
              <span>📁 {patient}</span>
              <span className="text-sm text-gray-600">{expandedPatients.has(patient) ? '▲' : '▼'}</span>
            </button>

            {expandedPatients.has(patient) && (
              <>
                <ul className="mt-3 pl-6 text-sm text-blue-700 space-y-2">
                  {files.map((file, index) => (
                    <li key={index} className="flex justify-between items-center gap-4 px-2 py-1 rounded hover:bg-gray-200 transition">
                      <div className="flex items-center gap-3 flex-wrap">
                        <a
                          href={`http://localhost:8000/download/${patient}/${file.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-blue-700 font-medium"
                        >
                          📄 {file.name}
                        </a>
                        <span className="text-gray-500 text-xs">
                          {file.timestamp}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        {file.name.endsWith('.txt') && (
                          <button
                            onClick={() => handleEdit(patient, file.name)}
                            className="flex items-center gap-1 px-2 py-1 text-yellow-700 border border-yellow-400 rounded hover:bg-yellow-100 text-sm font-medium transition"
                            title="Modifica raport"
                          >
                            ✏️ <span>Modifică</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteFile(patient, file.name)}
                          className="flex items-center gap-1 px-2 py-1 text-red-700 border border-red-400 rounded hover:bg-red-100 text-sm font-medium transition"
                          title="Sterge fisier"
                        >
                          🗑️ <span>Șterge</span>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 pl-6">
                  <button
                    onClick={() => handleDeleteFolder(patient)}
                    className="text-white bg-red-600 hover:bg-red-700 text-xs px-3 py-1 rounded-md shadow-sm"
                  >
                    Sterge folderul
                  </button>
                </div>
              </>
            )}

            {editingReport?.patient === patient && (
              <div className="mt-4 pl-6">
                <textarea
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  rows={8}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                />
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={handleSaveEdit}
                    className="bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700"
                  >
                    Salvează modificarea
                  </button>
                  <button
                    onClick={() => setEditingReport(null)}
                    className="text-gray-600 hover:text-gray-800 text-sm"
                  >
                    Renunță
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default SavedReportsCard;