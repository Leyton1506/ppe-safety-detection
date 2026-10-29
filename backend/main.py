import uuid
import json
import shutil
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Optional

import cv2
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

# ─── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="PPE Safety Detection API",
    description="API para detección de Equipos de Protección Personal (EPP) usando YOLO",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Directory Setup ───────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
MODELS_DIR = BASE_DIR / "models"
UPLOADS_DIR = BASE_DIR / "uploads"
RESULTS_DIR = BASE_DIR / "results"
REPORTS_DIR = BASE_DIR / "reports"
DB_FILE = BASE_DIR / "incidents.json"

for d in [MODELS_DIR, UPLOADS_DIR, RESULTS_DIR, REPORTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Mount static directories
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/results", StaticFiles(directory=str(RESULTS_DIR)), name="results")

# ─── Model Loading ─────────────────────────────────────────────────────────────
model = None
MODEL_PATH: Optional[Path] = None

def load_model(model_path: str):
    """Load a YOLO model from the given path."""
    global model, MODEL_PATH
    try:
        from ultralytics import YOLO
        path = Path(model_path)
        if not path.exists():
            raise FileNotFoundError(f"Modelo no encontrado: {model_path}")
        model = YOLO(str(path))
        MODEL_PATH = path
        return True
    except Exception as e:
        print(f"Error cargando modelo: {e}")
        return False

# Auto-load first .pt file found in models/
def auto_load_model():
    pt_files = list(MODELS_DIR.glob("*.pt"))
    if pt_files:
        load_model(str(pt_files[0]))
        print(f"✅ Modelo auto-cargado: {pt_files[0].name}")
    else:
        print("⚠️  No se encontró ningún modelo .pt en backend/models/")

auto_load_model()

# ─── Database Helpers ─────────────────────────────────────────────────────────
def read_db() -> dict:
    if DB_FILE.exists():
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"incidents": [], "alerts": [], "reports": []}

def write_db(data: dict):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)

# ─── Pydantic Models ───────────────────────────────────────────────────────────
class IncidentUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    severity: Optional[str] = None

class ModelConfig(BaseModel):
    model_filename: str  # filename inside backend/models/

class AlertConfig(BaseModel):
    title: str
    message: str
    severity: str  # "low" | "medium" | "high" | "critical"
    source: str

# ─── PPE Detection Logic ───────────────────────────────────────────────────────
# Adjust these labels to match YOUR model's class names
VIOLATION_CLASSES = {
    "no_helmet": ["no_helmet", "sin_casco", "no-helmet"],
    "no_vest": ["no_vest", "sin_chaleco", "no-vest"],
    "no_gloves": ["no_gloves", "sin_guantes", "no-gloves"],
    "no_boots": ["no_boots", "sin_botas", "no-boots"],
    "no_goggles": ["no_goggle", "no_goggles", "sin_gafas", "sin_lentes", "no-goggle", "no-goggles"],
}

PPE_CLASSES = {
    "helmet": ["helmet", "hard_hat", "casco", "hardhat"],
    "vest": ["vest", "safety_vest", "chaleco", "reflective_vest"],
    "gloves": ["gloves", "guantes", "glove"],
    "boots": ["boots", "botas", "safety_boots"],
    "mask": ["mask", "mascarilla", "face_mask"],
    "goggles": ["goggles", "goggle", "gafas", "safety_glasses", "lentes"],
}
PERSON_CLASSES = ["person", "persona", "worker", "trabajador"]

def classify_detection(label: str) -> str:
    label_lower = label.lower().strip()
    # Check violations first so "no_helmet" is not classified as "helmet"
    for viol_type, aliases in VIOLATION_CLASSES.items():
        if any(alias in label_lower for alias in aliases):
            return viol_type
    for ppe_type, aliases in PPE_CLASSES.items():
        if any(alias in label_lower for alias in aliases):
            return ppe_type
    if any(p in label_lower for p in PERSON_CLASSES):
        return "person"
    return "other"

def run_inference(image_path: str, conf: float = 0.25) -> dict:
    """Run YOLO inference on an image and return structured results."""
    if model is None:
        raise HTTPException(status_code=503, detail="Modelo no cargado. Sube un modelo .pt en backend/models/")

    img = cv2.imread(image_path)
    if img is None:
        raise HTTPException(status_code=400, detail="No se pudo leer la imagen")

    results = model.predict(img, conf=conf, verbose=False)
    result = results[0]

    detections = []
    persons = []
    ppe_items = []
    violations = []

    for box in result.boxes:
        cls_id = int(box.cls[0])
        label = model.names[cls_id]
        confidence = float(box.conf[0])
        xyxy = box.xyxy[0].tolist()
        category = classify_detection(label)
        is_violation = category.startswith("no_") or "no_" in label.lower() or "sin_" in label.lower()

        det = {
            "label": label,
            "category": category,
            "confidence": round(confidence, 3),
            "is_violation": is_violation,
            "bbox": {
                "x1": int(xyxy[0]), "y1": int(xyxy[1]),
                "x2": int(xyxy[2]), "y2": int(xyxy[3])
            }
        }
        detections.append(det)

        if category == "person":
            persons.append(det)
        elif is_violation:
            violations.append(det)
        elif category != "other":
            ppe_items.append(det)

    # Draw annotations
    annotated = result.plot()
    return {
        "detections": detections,
        "persons_count": len(persons),
        "ppe_count": len(ppe_items),
        "violations_count": len(violations),
        "total_detections": len(detections),
        "annotated_frame": annotated,
    }

# ─── Routes: Health & Model ────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {
        "status": "online",
        "model_loaded": model is not None,
        "model_path": str(MODEL_PATH) if MODEL_PATH else None,
    }

@app.get("/health", tags=["Health"])
def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_name": MODEL_PATH.name if MODEL_PATH else None,
        "timestamp": datetime.now().isoformat(),
    }

@app.get("/model/status", tags=["Model"])
def model_status():
    pt_files = [f.name for f in MODELS_DIR.glob("*.pt")]
    return {
        "model_loaded": model is not None,
        "current_model": MODEL_PATH.name if MODEL_PATH else None,
        "available_models": pt_files,
        "classes": list(model.names.values()) if model else [],
    }

@app.post("/model/load", tags=["Model"])
def load_model_endpoint(config: ModelConfig):
    path = MODELS_DIR / config.model_filename
    success = load_model(str(path))
    if not success:
        raise HTTPException(status_code=400, detail=f"No se pudo cargar: {config.model_filename}")
    return {
        "success": True,
        "message": f"Modelo '{config.model_filename}' cargado correctamente",
        "classes": list(model.names.values()),
    }

@app.post("/model/upload", tags=["Model"])
async def upload_model(file: UploadFile = File(...)):
    if not file.filename.endswith(".pt"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos .pt")
    dest = MODELS_DIR / file.filename
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    success = load_model(str(dest))
    return {
        "success": success,
        "filename": file.filename,
        "message": "Modelo subido y cargado" if success else "Subido pero fallo al cargar",
    }

# ─── Routes: Detection ────────────────────────────────────────────────────────
@app.post("/detect/image", tags=["Detection"])
async def detect_image(
    file: UploadFile = File(...),
    conf: float = Form(0.25),
    save_incident: bool = Form(False),
    required_ppe: str = Form("helmet,vest,gloves"),
):
    # Save uploaded file
    ext = Path(file.filename).suffix or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    upload_path = UPLOADS_DIR / filename
    with open(upload_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Run inference
    try:
        result_data = run_inference(str(upload_path), conf)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Parse required PPE list
    req_list = [p.strip().lower() for p in required_ppe.split(",") if p.strip()]

    # Missing PPE items for detected workers
    missing_ppe = _get_missing_ppe(result_data, req_list)
    has_violations = _has_violations(result_data, req_list)
    compliance_rate = _calc_compliance(result_data, req_list)

    # Save annotated image
    result_filename = f"result_{filename}"
    result_path = RESULTS_DIR / result_filename
    cv2.imwrite(str(result_path), result_data["annotated_frame"])

    # Build response
    img_h, img_w = result_data["annotated_frame"].shape[:2]
    response = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now().isoformat(),
        "original_file": f"/uploads/{filename}",
        "result_file": f"/results/{result_filename}",
        "image_width": img_w,
        "image_height": img_h,
        "persons_count": result_data["persons_count"],
        "ppe_count": result_data["ppe_count"],
        "total_detections": result_data["total_detections"],
        "detections": result_data["detections"],
        "missing_ppe": missing_ppe,
        "compliance_rate": compliance_rate,
        "has_violations": has_violations,
    }

    # Save incident ONLY if there are safety violations (does not comply with requirements)
    if response["has_violations"]:
        db = read_db()
        violations_list = [d for d in response["detections"] if d.get("is_violation")]
        for m in missing_ppe:
            spanish_name = PPE_SPANISH_NAMES.get(m, m.capitalize())
            violations_list.append({
                "label": f"Falta {spanish_name}",
                "category": f"no_{m}",
                "confidence": 1.0,
                "is_violation": True,
                "bbox": {"x1": 0, "y1": 0, "x2": 0, "y2": 0},
            })

        missing_text = ", ".join([PPE_SPANISH_NAMES.get(m, m) for m in missing_ppe]) if missing_ppe else ""
        incident_notes = f"Falta de EPP requerido: {missing_text}" if missing_ppe else "Infracción de seguridad detectada."

        incident = {
            "id": response["id"],
            "type": "image_detection",
            "timestamp": response["timestamp"],
            "original_file": response["original_file"],
            "result_file": response["result_file"],
            "persons_count": response["persons_count"],
            "ppe_count": response["ppe_count"],
            "violations": violations_list,
            "missing_ppe": missing_ppe,
            "compliance_rate": response["compliance_rate"],
            "severity": _calc_severity(response),
            "status": "open",
            "notes": incident_notes,
        }
        db["incidents"].append(incident)

        # Auto-generate alert for violations
        alert_msg = f"Se detectaron {response['persons_count']} trabajador(es) sin EPP requerido: {missing_text}." if missing_ppe else f"Se detectaron {response['persons_count']} trabajador(es) con posibles incumplimientos de seguridad."
        alert = {
            "id": str(uuid.uuid4()),
            "timestamp": response["timestamp"],
            "title": "⚠️ Violación de EPP detectada",
            "message": alert_msg,
            "severity": _calc_severity(response),
            "source": "image_detection",
            "incident_id": response["id"],
            "read": False,
        }
        db["alerts"].append(alert)
        write_db(db)

    return response

@app.post("/detect/video", tags=["Detection"])
async def detect_video(
    file: UploadFile = File(...),
    conf: float = Form(0.25),
    sample_rate: int = Form(30),  # process every N frames
):
    if model is None:
        raise HTTPException(status_code=503, detail="Modelo no cargado")

    ext = Path(file.filename).suffix or ".mp4"
    filename = f"{uuid.uuid4()}{ext}"
    upload_path = UPLOADS_DIR / filename
    with open(upload_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    cap = cv2.VideoCapture(str(upload_path))
    if not cap.isOpened():
        raise HTTPException(status_code=400, detail="No se pudo abrir el video")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    result_filename = f"result_{uuid.uuid4()}.mp4"
    result_path = RESULTS_DIR / result_filename
    fourcc = cv2.VideoWriter_fourcc(*"avc1")
    writer = cv2.VideoWriter(str(result_path), fourcc, fps, (width, height))
    if not writer.isOpened():
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(str(result_path), fourcc, fps, (width, height))

    def _draw_overlay(img, dets):
        """Draw persistent bounding boxes and labels on frames."""
        overlay = img.copy()
        for det in dets:
            box = det["bbox"]
            x1, y1, x2, y2 = box["x1"], box["y1"], box["x2"], box["y2"]
            label = det["label"]
            conf = det["confidence"]
            is_viol = det.get("is_violation", False)
            category = det.get("category", "")

            # Color in BGR: Red for violations, Cyan for workers, Emerald for safe PPE
            if is_viol:
                color = (60, 60, 240)    # Red / Hazard
            elif category == "person":
                color = (245, 180, 50)   # Cyan / Worker
            else:
                color = (70, 215, 70)    # Emerald / Safe PPE

            # Draw bounding box
            cv2.rectangle(overlay, (x1, y1), (x2, y2), color, 2)

            # Text label
            text = f"{label} {int(conf * 100)}%"
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.52
            thickness = 1
            (tw, th), _ = cv2.getTextSize(text, font, font_scale, thickness)

            tag_y1 = max(0, y1 - th - 8)
            tag_y2 = y1
            tag_x1 = x1
            tag_x2 = min(overlay.shape[1], x1 + tw + 8)

            cv2.rectangle(overlay, (tag_x1, tag_y1), (tag_x2, tag_y2), color, -1)
            cv2.putText(overlay, text, (tag_x1 + 4, tag_y2 - 4), font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)
        return overlay

    frame_results = []
    current_dets = []
    frame_idx = 0
    first_thumb = None

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Re-run detection on sample interval or first frame
        if frame_idx % sample_rate == 0:
            results = model.predict(frame, conf=conf, verbose=False)
            boxes = results[0].boxes

            current_dets = []
            for box in boxes:
                cls_id = int(box.cls[0])
                label = model.names[cls_id]
                cat = classify_detection(label)
                is_viol = cat.startswith("no_") or "no_" in label.lower() or "sin_" in label.lower()
                xyxy = box.xyxy[0].tolist()
                current_dets.append({
                    "label": label,
                    "category": cat,
                    "confidence": round(float(box.conf[0]), 3),
                    "is_violation": is_viol,
                    "bbox": {
                        "x1": int(xyxy[0]), "y1": int(xyxy[1]),
                        "x2": int(xyxy[2]), "y2": int(xyxy[3]),
                    }
                })
            frame_results.append({"frame": frame_idx, "detections": current_dets})

        # Render persistent boxes on ALL frames so labels never disappear during motion
        if current_dets:
            annotated_frame = _draw_overlay(frame, current_dets)
            if first_thumb is None:
                first_thumb = annotated_frame.copy()
            writer.write(annotated_frame)
        else:
            if first_thumb is None:
                first_thumb = frame.copy()
            writer.write(frame)

        frame_idx += 1

    cap.release()
    writer.release()

    # Aggregate stats
    all_dets = [d for fr in frame_results for d in fr["detections"]]
    persons = [d for d in all_dets if d["category"] == "person"]
    violations = [d for d in all_dets if d.get("is_violation")]
    ppe = [d for d in all_dets if d["category"] not in ["person", "other"] and not d.get("is_violation")]

    incident_id = str(uuid.uuid4())
    db = read_db()
    incident = {
        "id": incident_id,
        "type": "video_detection",
        "timestamp": datetime.now().isoformat(),
        "original_file": f"/uploads/{filename}",
        "result_file": f"/results/{result_filename}",
        "total_frames": total_frames,
        "frames_analyzed": len(frame_results),
        "persons_count": len(set(d["label"] for d in persons)),
        "ppe_count": len(ppe),
        "violations_count": len(violations),
        "status": "open",
        "notes": "",
        "severity": "high" if len(violations) > 0 else "low",
    }
    db["incidents"].append(incident)

    if len(violations) > 0:
        alert = {
            "id": str(uuid.uuid4()),
            "timestamp": incident["timestamp"],
            "title": "⚠️ Violación de EPP detectada en Video",
            "message": f"Se detectaron {len(violations)} posibles infracciones de seguridad en el video analizado.",
            "severity": "high",
            "source": "video_detection",
            "incident_id": incident_id,
            "read": False,
        }
        db["alerts"].append(alert)

    write_db(db)

    thumb_filename = f"thumb_{uuid.uuid4()}.jpg"
    thumb_path = RESULTS_DIR / thumb_filename
    if first_thumb is not None:
        cv2.imwrite(str(thumb_path), first_thumb)

    has_violations = len(violations) > 0
    persons_cnt = len(set(d["label"] for d in persons))
    compliance_rate = round(max(0.0, 100.0 - (len(violations) * 20)), 1) if persons_cnt > 0 else 100.0

    return {
        "id": incident_id,
        "timestamp": incident["timestamp"],
        "original_file": incident["original_file"],
        "result_file": incident["result_file"],
        "thumbnail_file": f"/results/{thumb_filename}",
        "image_width": width,
        "image_height": height,
        "total_frames": total_frames,
        "frames_analyzed": len(frame_results),
        "frame_results": frame_results[:20],  # return sample
        "persons_count": persons_cnt,
        "ppe_count": len(ppe),
        "violations_count": len(violations),
        "has_violations": has_violations,
        "compliance_rate": compliance_rate,
        "detections": all_dets[:25],
        "summary": {
            "unique_persons": incident["persons_count"],
            "ppe_detections": len(ppe),
        }
    }

# ─── Routes: Incidents ────────────────────────────────────────────────────────
@app.get("/incidents", tags=["Incidents"])
def get_incidents(status: Optional[str] = None, limit: int = 50):
    db = read_db()
    incidents = db.get("incidents", [])
    if status:
        incidents = [i for i in incidents if i.get("status") == status]
    return {"incidents": incidents[-limit:][::-1], "total": len(incidents)}

@app.get("/incidents/{incident_id}", tags=["Incidents"])
def get_incident(incident_id: str):
    db = read_db()
    for inc in db["incidents"]:
        if inc["id"] == incident_id:
            return inc
    raise HTTPException(status_code=404, detail="Incidente no encontrado")

@app.patch("/incidents/{incident_id}", tags=["Incidents"])
def update_incident(incident_id: str, update: IncidentUpdate):
    db = read_db()
    for inc in db["incidents"]:
        if inc["id"] == incident_id:
            if update.status:
                inc["status"] = update.status
            if update.notes is not None:
                inc["notes"] = update.notes
            if update.severity:
                inc["severity"] = update.severity
            inc["updated_at"] = datetime.now().isoformat()
            write_db(db)
            return inc
    raise HTTPException(status_code=404, detail="Incidente no encontrado")

@app.delete("/incidents/{incident_id}", tags=["Incidents"])
def delete_incident(incident_id: str):
    db = read_db()
    db["incidents"] = [i for i in db["incidents"] if i["id"] != incident_id]
    write_db(db)
    return {"success": True}

# ─── Routes: Alerts ───────────────────────────────────────────────────────────
@app.get("/alerts", tags=["Alerts"])
def get_alerts(unread_only: bool = False):
    db = read_db()
    alerts = db.get("alerts", [])
    if unread_only:
        alerts = [a for a in alerts if not a.get("read")]
    return {"alerts": alerts[::-1], "total": len(alerts), "unread": sum(1 for a in alerts if not a.get("read"))}

@app.post("/alerts", tags=["Alerts"])
def create_alert(alert: AlertConfig):
    db = read_db()
    new_alert = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now().isoformat(),
        "title": alert.title,
        "message": alert.message,
        "severity": alert.severity,
        "source": alert.source,
        "read": False,
    }
    db["alerts"].append(new_alert)
    write_db(db)
    return new_alert

@app.patch("/alerts/{alert_id}/read", tags=["Alerts"])
def mark_alert_read(alert_id: str):
    db = read_db()
    for a in db["alerts"]:
        if a["id"] == alert_id:
            a["read"] = True
            write_db(db)
            return a
    raise HTTPException(status_code=404, detail="Alerta no encontrada")

@app.patch("/alerts/read-all", tags=["Alerts"])
def mark_all_read():
    db = read_db()
    for a in db["alerts"]:
        a["read"] = True
    write_db(db)
    return {"success": True}

# ─── Routes: Reports ──────────────────────────────────────────────────────────
@app.get("/reports/stats", tags=["Reports"])
def get_stats():
    db = read_db()
    incidents = db.get("incidents", [])
    alerts = db.get("alerts", [])

    total = len(incidents)
    open_inc = sum(1 for i in incidents if i.get("status") == "open")
    resolved = sum(1 for i in incidents if i.get("status") == "resolved")

    # Violations by day (last 7 days)
    daily = Counter()
    for inc in incidents:
        try:
            day = inc["timestamp"][:10]
            daily[day] += 1
        except Exception:
            pass

    return {
        "total_incidents": total,
        "open_incidents": open_inc,
        "resolved_incidents": resolved,
        "total_alerts": len(alerts),
        "unread_alerts": sum(1 for a in alerts if not a.get("read")),
        "daily_incidents": dict(sorted(daily.items())[-7:]),
        "severity_breakdown": {
            "critical": sum(1 for i in incidents if i.get("severity") == "critical"),
            "high": sum(1 for i in incidents if i.get("severity") == "high"),
            "medium": sum(1 for i in incidents if i.get("severity") == "medium"),
            "low": sum(1 for i in incidents if i.get("severity") == "low"),
        }
    }

@app.get("/reports/export", tags=["Reports"])
def export_report():
    db = read_db()
    report_id = str(uuid.uuid4())[:8]
    filename = f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{report_id}.json"
    path = REPORTS_DIR / filename
    report_data = {
        "generated_at": datetime.now().isoformat(),
        "incidents": db.get("incidents", []),
        "alerts": db.get("alerts", []),
        "stats": get_stats(),
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, ensure_ascii=False, indent=2, default=str)
    return FileResponse(path, filename=filename, media_type="application/json")

# ─── Helper Functions ─────────────────────────────────────────────────────────
PPE_SPANISH_NAMES = {
    "helmet": "Casco",
    "vest": "Chaleco",
    "gloves": "Guantes",
    "boots": "Botas",
    "goggles": "Gafas de seguridad",
    "mask": "Mascarilla",
}

def _get_missing_ppe(data: dict, required_ppe: list = None) -> list:
    """Retorna lista de categorías de EPP requerido que faltan para las personas detectadas."""
    if required_ppe is None:
        required_ppe = ["helmet", "vest", "gloves"]
    if data.get("persons_count", 0) == 0:
        return []

    # Categorías de EPP correctamente portadas (no infracciones)
    detected_categories = {d.get("category") for d in data.get("detections", []) if not d.get("is_violation")}
    missing = []
    for req in required_ppe:
        req_clean = req.strip().lower()
        if req_clean and req_clean not in detected_categories:
            missing.append(req_clean)
    return missing

def _has_violations(data: dict, required_ppe: list = None) -> bool:
    if required_ppe is None:
        required_ppe = ["helmet", "vest", "gloves"]
    # 1. Violaciones explícitas detectadas por el modelo (no_helmet, sin_guantes, etc.)
    has_explicit = any(d.get("is_violation") for d in data.get("detections", []))
    if has_explicit:
        return True
    # 2. Omisión de EPP requerido si hay trabajadores presentes
    if data.get("persons_count", 0) > 0:
        missing = _get_missing_ppe(data, required_ppe)
        if len(missing) > 0:
            return True
    return False

def _calc_compliance(data: dict, required_ppe: list = None) -> float:
    persons = data.get("persons_count", 0)
    if persons == 0:
        return 100.0

    if required_ppe is None:
        required_ppe = ["helmet", "vest", "gloves"]
    required_clean = [r.strip().lower() for r in required_ppe if r.strip()]

    if not required_clean:
        return 100.0 if not any(d.get("is_violation") for d in data.get("detections", [])) else 0.0

    missing = _get_missing_ppe(data, required_clean)
    present_count = len(required_clean) - len(missing)
    base_rate = (present_count / len(required_clean)) * 100.0

    explicit_violations = sum(1 for d in data.get("detections", []) if d.get("is_violation"))
    if explicit_violations > 0:
        base_rate = max(0.0, base_rate - (explicit_violations * 20))

    return round(max(0.0, min(100.0, base_rate)), 1)

def _calc_severity(data: dict) -> str:
    compliance = data.get("compliance_rate", 100)
    if compliance < 30:
        return "critical"
    elif compliance < 60:
        return "high"
    elif compliance < 80:
        return "medium"
    return "low"

# ─── Entry Point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
