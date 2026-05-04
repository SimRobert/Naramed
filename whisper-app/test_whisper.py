import os
import whisper
import language_tool_python

# Seteaza calea catre fisierul audio
file_path = r"C:\Users\Robert\Licenta\whisper-app\test3.ogg"

# Verifica daca fisierul exista
if not os.path.exists(file_path):
    print(f"EROARE: Fisierul '{file_path}' nu exista!")
else:
    # Incarca modelul Whisper si LanguageTool
    model = whisper.load_model("medium")
    tool = language_tool_python.LanguageTool('ro')

    # Transcrie fisierul audio in limba romana
    result = model.transcribe(file_path, language="ro", beam_size=5)
    original_text = result["text"]

    # Corecteaza textul
    matches = tool.check(original_text)
    corrected_text = language_tool_python.utils.correct(original_text, matches)

    # Extrage numele fisierului pentru salvare
    file_name = os.path.splitext(os.path.basename(file_path))[0]
    output_file = f"output_{file_name}.txt"

    # Scrie ambele variante in acelasi fisier
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("=== Text Original ===\n")
        f.write(original_text.strip() + "\n\n")
        f.write("=== Text Corectat ===\n")
        f.write(corrected_text.strip())

    print(f"Textul a fost salvat in {output_file}")
