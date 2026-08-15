# Cosmic Venturer

Cosmic Venturer is a Smart India Hackathon PS1736 prototype for AI-assisted frame interpolation, video generation, and WMS map display. It turns sparse satellite/WMS frames into smoother MP4 sequences and overlays the generated animation on an OpenLayers map.

## Features

- Upload two or more satellite frames and generate an interpolated MP4.
- Fetch time-stepped frames from an OGC WMS `GetMap` endpoint.
- Use dense optical-flow interpolation with a blend fallback.
- Preview the generated video in the UI and overlay it on a geographic extent.
- Keep outputs in `data/outputs/` and source frames in `data/frames/`.

## Quick Start

Use Python 3.12 for the smoothest install.

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

In this workspace I used the bundled Python 3.12 runtime and created `.venv-codex`, so you can also run:

```bash
source .venv-codex/bin/activate
uvicorn backend.main:app --reload
```

Then open:

```text
http://127.0.0.1:8000
```

## Docker

Anyone with Docker can run the project without setting up Python locally:

```bash
docker compose up --build
```

Then open `http://127.0.0.1:8000`.

## API

### Upload frames

```bash
curl -X POST http://127.0.0.1:8000/api/interpolate \
  -F "files=@frame_1.png" \
  -F "files=@frame_2.png" \
  -F "inbetweens=5" \
  -F "fps=12" \
  -F "method=optical_flow"
```

### Interpolate WMS frames

```bash
curl -X POST http://127.0.0.1:8000/api/wms/interpolate \
  -H "Content-Type: application/json" \
  -d '{
    "base_url": "https://example.com/geoserver/wms",
    "layers": "namespace:layer",
    "bbox": "-180,-90,180,90",
    "times": ["2024-09-29T00:00:00Z", "2024-09-29T00:30:00Z"],
    "width": 768,
    "height": 432,
    "crs": "EPSG:4326",
    "inbetweens": 5,
    "fps": 12,
    "method": "optical_flow"
  }'
```

## Project Structure

```text
backend/
  main.py            FastAPI routes and static app serving
  interpolation.py   OpenCV interpolation and video writing
  wms.py             OGC WMS GetMap URL construction and frame fetching
frontend/
  index.html         OpenLayers interface
  static/            CSS and browser JavaScript
data/
  frames/            Runtime input frame cache
  outputs/           Generated MP4 and extracted frame outputs
```

## Notes

This MVP uses OpenCV optical flow rather than a trained Super SloMo/RIFE model, which keeps the prototype lightweight and runnable on a normal laptop. The backend is structured so a deep-learning interpolator can replace `optical_flow_interpolate()` later without changing the API or UI.

## Publish to GitHub

If this project has already been committed locally, create a public GitHub repository named `cosmic-venturer` and run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/cosmic-venturer.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.
