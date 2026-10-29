# PPE Safety Detection (SafeGuard AI) 🦺

Sistema integral de visión artificial e inteligencia artificial para la detección en tiempo real y análisis de Equipos de Protección Personal (EPP / PPE) en entornos industriales y de construcción.

---

## 🚀 Características Principales

- **Detección con Visión Artificial:** Soporte para modelos YOLOv8 para identificar cascos, chalecos reflectantes, guantes, botas, etc.
- **Backend de Alto Rendimiento:** API REST con FastAPI (Python), procesamiento por lotes, generación de reportes y almacenamiento de incidentes.
- **Frontend Moderno:** Panel de control interactivo construido con Next.js 15 (App Router), TypeScript y Tailwind CSS.
- **Autenticación y Base de Datos:** Integración con Supabase para control de acceso, registro de usuarios e historial de inspecciones.
- **Scripts de Automatización:** Inicio y detención rápida con archivos `.bat` para entornos Windows.

---

## 📁 Estructura del Proyecto

```text
ppe-safety-detection/
├── backend/                  # Servidor API FastAPI e inferencia YOLO
│   ├── models/               # Pesos del modelo YOLO (.pt)
│   ├── reports/              # Reportes generados (PDF/Excel)
│   ├── results/              # Imágenes con inferencias realizadas
│   ├── uploads/              # Imágenes subidas temporalmente
│   ├── main.py               # Endpoints y lógica de la API
│   └── requirements.txt      # Dependencias Python
├── frontend/                 # Aplicación web Next.js
│   ├── app/                  # Rutas y páginas (Next.js App Router)
│   ├── components/           # Componentes UI reutilizables
│   ├── contexts/             # Proveedores de estado (Auth, Toast)
│   └── lib/                  # Clientes API y servicios Supabase
├── supabse conexion/         # Componentes y servicios complementarios de Supabase
├── iniciar_proyecto.bat      # Script para levantar backend y frontend
├── detener_proyecto.bat      # Script para detener los servicios
└── .gitignore                # Reglas de exclusión de Git
```

---

## 🛠️ Requisitos Previos

- **Python 3.10+**
- **Node.js 18+** y **npm**
- **Git**
- Cuenta en **Supabase** (URL y clave pública/anon)
- Archivo de modelo YOLO (`.pt`) ubicado en `backend/models/`

---

## ⚙️ Configuración e Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/ppe-safety-detection.git
cd ppe-safety-detection
```

### 2. Configuración del Backend
```bash
cd backend
python -m venv venv
# En Windows:
venv\Scripts\activate
# En Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```
> **Nota:** Coloca tu modelo YOLO (por ejemplo `best.pt` o `ppe_yolov8.pt`) dentro de la carpeta `backend/models/`.

### 3. Configuración del Frontend
```bash
cd ../frontend
npm install
```

Crea un archivo `.env.local` en la carpeta `frontend/`:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## ▶️ Ejecución del Proyecto

### Opción 1: Usando los scripts automatizados (Windows)
- Doble clic en `iniciar_proyecto.bat` para iniciar ambos servicios automáticamente.
- Doble clic en `detener_proyecto.bat` para finalizar todos los procesos.

### Opción 2: Ejecución manual
1. **Backend:**
   ```bash
   cd backend
   uvicorn main:app --reload --port 8000
   ```
2. **Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

Abre tu navegador en [http://localhost:3000](http://localhost:3000).

---

## 📄 Licencia
Este proyecto está bajo la Licencia MIT.
