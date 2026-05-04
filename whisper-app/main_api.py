from typing import Annotated, Any

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from docx import Document
from docx.shared import RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from pathlib import Path
from tempfile import NamedTemporaryFile

import datetime
import re
import shutil

import whisper
import language_tool_python


app = FastAPI()

SAVED_REPORTS_DIR = Path("saved_reports")

REPORT_TITLE = "Raport Ecocardiografic"
ECHO_DATA_TITLE = "Date ecografice:"
CONCLUSION_LABEL = "Concluzie"
CONCLUSION_TITLE = "Concluzie:"
THANK_YOU_TEXT = "Multumim ca ati apelat la serviciile noastre!"
LIST_BULLET_STYLE = "List Bullet"
DOCX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

BRAND_BLUE = RGBColor(0x2E, 0x75, 0xB6)
ALLOWED_ORIGINS = ["http://localhost:5173"]

MEDICAL_UNITS = {
    "FE": "%",
    "TAP": "",
}

FormStr = Annotated[str, Form(...)]
UploadedAudio = Annotated[UploadFile, File(...)]


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ruleaza whisper
model = whisper.load_model("medium")

# Corectare text cu LanguageTool
tool = language_tool_python.LanguageTool("ro")


def parse_medical_data(text: str) -> dict[str, dict[str, Any]]:
    data: dict[str, dict[str, Any]] = {}

    complex_tap_match = re.search(
        r"TAP\s+(\d+)[,\s]+(?:BAR|bar[ăa])[\s,]+(\d+)[,\s]+(?:BAR|bar[ăa])[\s,]+(\d+)",
        text,
        re.IGNORECASE,
    )

    if complex_tap_match:
        data["TAP"] = {
            "value": "/".join(complex_tap_match.groups()),
            "pos": complex_tap_match.start(),
        }

    patterns = {
        "Aorta la Inel": r"aorta\s+(?:la|în|in dreptul|în zona)\s+(?:inel(?:ul)?|segmentul)?\s*(\d+)",
        "Aorta la Sinusuri": r"aorta\s+(?:la|în)\s+sinusuri\s*(\d+)",
        "Aorta Ascendenta": r"aorta\s+ascendent[aă]\s*(\d+)",
        "AS": r"\bAS\s+(\d+)",
        "VD": r"\bVD\s+(\d+)",
        "SIV": r"\bSIV\s+(\d+)",
        "VS": r"\bVS\s+(\d+)x(\d+)",
        "Perete Posterior": r"perete\s+posterior\s*(\d+)",
        "FE": r"frac(?:tie|ție)(?: de ejec[tț]ie)?\s*(\d+)%?",
        "TAP": r"\bTAP\s+(\d+)",
        "VMAX Aortica": r"valva\s+aortic[aă]\s+VMAX\s+(\d+[.,]\d+)",
        "VMAX Pulmonara": r"valva\s+pulmonar[aă]\s+VMAX\s+(\d+[.,]\d+)",
        "VMAX Tricuspidă": r"[Vv]alva\s+tr[iî]cuspid[aă]\s+VMAX\s+(\d+[.,]\d+)",
        "PSVD": r"\bPSVD\s+(\d+[.,]\d+)",
        "VMAX Arc Aortic": r"arc[aă]?\s+aortic\s+VMAX\s+(\d+[.,]\d+)",
        CONCLUSION_LABEL: r"[Cc]oncluzi[iî]?[ei][:,]?\s*(.+)",
    }

    for key, pattern in patterns.items():
        if key == "TAP" and "TAP" in data:
            continue

        match = re.search(pattern, text, re.IGNORECASE)
        if not match:
            continue

        value = match.groups() if len(match.groups()) > 1 else match.group(1)
        data[key] = {"value": value, "pos": match.start()}

    return data


def add_section_title(document: Document, text: str) -> None:
    paragraph = document.add_paragraph()
    run = paragraph.add_run(text)
    run.bold = True
    run.font.color.rgb = BRAND_BLUE


def format_medical_value(label: str, value: Any) -> str:
    if isinstance(value, tuple):
        value = " x ".join(value)

    unit = MEDICAL_UNITS.get(label, "mm")
    return f"{label}: {value} {unit}".strip()


def add_medical_data(document: Document, data: dict[str, dict[str, Any]]) -> None:
    add_section_title(document, ECHO_DATA_TITLE)

    sorted_items = sorted(
        [
            (label, entry["value"], entry["pos"])
            for label, entry in data.items()
            if label != CONCLUSION_LABEL
        ],
        key=lambda item: item[2],
    )

    for label, value, _ in sorted_items:
        document.add_paragraph(
            format_medical_value(label, value),
            style=LIST_BULLET_STYLE,
        )


def add_conclusion(document: Document, data: dict[str, dict[str, Any]]) -> None:
    if CONCLUSION_LABEL not in data:
        return

    document.add_paragraph()
    add_section_title(document, CONCLUSION_TITLE)
    document.add_paragraph(data[CONCLUSION_LABEL]["value"])


def add_footer(document: Document) -> None:
    document.add_paragraph()
    document.add_paragraph()

    paragraph = document.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT

    run = paragraph.add_run(THANK_YOU_TEXT)
    run.italic = True
    run.font.color.rgb = BRAND_BLUE


def create_report_document(transcript: str) -> Document:
    data = parse_medical_data(transcript)

    document = Document()
    document.add_heading(REPORT_TITLE, 0)

    add_medical_data(document, data)
    add_conclusion(document, data)
    add_footer(document)

    return document


@app.delete(
    "/delete_report/",
    responses={404: {"description": "Fisierul nu exista"}},
)
def delete_report(patient: FormStr, filename: FormStr):
    file_path = SAVED_REPORTS_DIR / patient / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Fisierul nu exista")

    file_path.unlink()
    return {"success": True, "message": "Fisier sters"}


@app.delete(
    "/delete_patient_folder/",
    responses={
        404: {"description": "Folderul nu exista"},
        500: {"description": "Eroare la stergere"},
    },
)
def delete_patient_folder(patient: FormStr):
    folder_path = SAVED_REPORTS_DIR / patient

    if not folder_path.exists():
        raise HTTPException(status_code=404, detail="Folderul nu exista")

    try:
        shutil.rmtree(folder_path)
        return {"success": True, "message": "Folder sters complet"}
    except OSError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Eroare la stergere: {str(exc)}",
        ) from exc


@app.post("/update_report/")
async def update_report(
    patient_name: FormStr,
    report_name: FormStr,
    new_content: FormStr,
):
    patient_folder = SAVED_REPORTS_DIR / patient_name
    patient_folder.mkdir(parents=True, exist_ok=True)

    txt_path = patient_folder / f"{report_name}.txt"
    txt_path.write_text(new_content, encoding="utf-8")

    document = create_report_document(new_content)
    docx_path = patient_folder / f"{report_name}.docx"
    document.save(docx_path)

    return JSONResponse(content={"message": "Raport actualizat cu succes"})


@app.get("/list_all_reports")
def list_all_reports():
    result = {}

    if not SAVED_REPORTS_DIR.exists():
        return result

    for patient_folder in SAVED_REPORTS_DIR.iterdir():
        if not patient_folder.is_dir():
            continue

        file_list = []
        for file_path in patient_folder.glob("*"):
            if not file_path.is_file():
                continue

            timestamp = datetime.datetime.fromtimestamp(file_path.stat().st_mtime)
            file_list.append(
                {
                    "name": file_path.name,
                    "timestamp": timestamp.strftime("%d.%m.%Y %H:%M"),
                }
            )

        result[patient_folder.name] = file_list

    return result


@app.get(
    "/download/{patient}/{filename}",
    responses={404: {"description": "File not found"}},
)
def download_file(patient: str, filename: str):
    file_path = SAVED_REPORTS_DIR / patient / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path, filename=filename)


@app.post("/transcribe/")
async def upload_audio(file: UploadedAudio):
    file_location = Path(f"temp_{file.filename}")

    with file_location.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        result = model.transcribe(str(file_location), language="ro", beam_size=5)
        matches = tool.check(result["text"])
        corrected_text = language_tool_python.utils.correct(
            result["text"],
            matches,
        ).strip()

        return {
            "original": result["text"],
            "corectat": corrected_text,
        }
    finally:
        if file_location.exists():
            file_location.unlink()


@app.post("/generate_report/")
async def generate_report(
    transcript: FormStr,
    patient_name: FormStr,
):
    document = create_report_document(transcript)

    with NamedTemporaryFile(delete=False, suffix=".docx") as tmp:
        document.save(tmp.name)

        return FileResponse(
            tmp.name,
            media_type=DOCX_MEDIA_TYPE,
            filename=f"{patient_name}.docx",
        )


@app.post("/save_report/")
async def save_report(
    transcript: FormStr,
    patient_name: FormStr,
):
    patient_folder = SAVED_REPORTS_DIR / patient_name

    if patient_folder.exists():
        return JSONResponse(
            status_code=400,
            content={"error": "report_exists"},
        )

    patient_folder.mkdir(parents=True, exist_ok=True)

    txt_path = patient_folder / f"{patient_name}.txt"
    txt_path.write_text(transcript, encoding="utf-8")

    document = create_report_document(transcript)
    docx_path = patient_folder / f"{patient_name}.docx"
    document.save(docx_path)

    return {"message": "Salvare cu succes", "folder": str(patient_folder)}