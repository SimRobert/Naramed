from main_api import parse_medical_data, app
from fastapi.testclient import TestClient

client = TestClient(app)

#Test de unitate: extragere date medicale
def test_parse_data_extraction():
    text = "Fractie de ejectie 65%, TAP 14, bara 7, bara 5"
    data = parse_medical_data(text)
    assert data["FE"]["value"] == "65"
    assert data["TAP"]["value"] == "14/7/5"

#Test de integrare: generare raport .docx
def test_generate_report_endpoint():
    response = client.post("/generate_report/", data={
        "transcript": "Fractie de ejectie 65%, TAP 14, bara 7, bara 5",
        "patient_name": "TestPacient"
    })
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

#Test de integrare: salvare raport
def test_save_report():
    response = client.post("/save_report/", data={
        "transcript": "Fractie de ejectie 60%, TAP 12, bara 6, bara 4",
        "patient_name": "pacient_test_py"
    })
    assert response.status_code in (200, 400)  # 400 dacă există deja, 200 dacă se salvează
