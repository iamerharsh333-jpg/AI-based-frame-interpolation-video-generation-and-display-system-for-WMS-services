const statusText = document.querySelector("#status");
const statusDot = document.querySelector("#status-dot");
const video = document.querySelector("#result-video");
const resultMeta = document.querySelector("#result-meta");
const wmsForm = document.querySelector("#wms-form");
const uploadForm = document.querySelector("#upload-form");
const tabWms = document.querySelector("#tab-wms");
const tabUpload = document.querySelector("#tab-upload");
const inbetweensInput = document.querySelector("#inbetweens");
const fpsInput = document.querySelector("#fps");
const methodInput = document.querySelector("#method");

const worldExtentLonLat = [-180, -90, 180, 90];
let videoLayer = null;
let latestExtent = worldExtentLonLat;
let mapVideo = null;

const osm = new ol.layer.Tile({
  source: new ol.source.OSM(),
});

const map = new ol.Map({
  target: "map",
  layers: [osm],
  view: new ol.View({
    center: ol.proj.fromLonLat([78.9, 22.8]),
    zoom: 4,
  }),
});

function setStatus(message, mode = "working") {
  statusText.textContent = message;
  statusDot.className = `status-dot ${mode === "ok" ? "ok" : mode === "error" ? "error" : ""}`;
}

function setBusy(form, busy) {
  form.querySelectorAll("button, input, textarea, select").forEach((item) => {
    item.disabled = busy;
  });
}

function switchTab(target) {
  const showWms = target === "wms";
  tabWms.classList.toggle("active", showWms);
  tabUpload.classList.toggle("active", !showWms);
  wmsForm.classList.toggle("hidden", !showWms);
  uploadForm.classList.toggle("hidden", showWms);
}

function parseBbox(value) {
  const numbers = value.split(",").map((part) => Number.parseFloat(part.trim()));
  if (numbers.length !== 4 || numbers.some(Number.isNaN)) {
    throw new Error("BBOX must contain four comma-separated numbers.");
  }
  return numbers;
}

function currentRenderSettings() {
  return {
    inbetweens: Number.parseInt(inbetweensInput.value, 10),
    fps: Number.parseInt(fpsInput.value, 10),
    method: methodInput.value,
  };
}

function removeVideoLayer() {
  if (mapVideo) {
    mapVideo.remove();
    mapVideo = null;
  }
  videoLayer = null;
}

function positionMapVideo() {
  if (!mapVideo || !videoLayer) return;
  const projectedExtent = videoLayer;
  const topLeft = map.getPixelFromCoordinate([projectedExtent[0], projectedExtent[3]]);
  const bottomRight = map.getPixelFromCoordinate([projectedExtent[2], projectedExtent[1]]);

  const left = Math.min(topLeft[0], bottomRight[0]);
  const top = Math.min(topLeft[1], bottomRight[1]);
  const width = Math.abs(bottomRight[0] - topLeft[0]);
  const height = Math.abs(bottomRight[1] - topLeft[1]);

  mapVideo.style.left = `${left}px`;
  mapVideo.style.top = `${top}px`;
  mapVideo.style.width = `${width}px`;
  mapVideo.style.height = `${height}px`;
}

function overlayVideo(videoUrl, bbox) {
  removeVideoLayer();
  latestExtent = bbox;

  const projectedExtent = ol.proj.transformExtent(bbox, "EPSG:4326", "EPSG:3857");
  video.src = videoUrl;
  video.play().catch(() => {});

  mapVideo = document.createElement("video");
  mapVideo.className = "map-video-overlay";
  mapVideo.src = videoUrl;
  mapVideo.muted = true;
  mapVideo.loop = true;
  mapVideo.autoplay = true;
  mapVideo.playsInline = true;
  map.getViewport().appendChild(mapVideo);
  mapVideo.play().catch(() => {});

  videoLayer = projectedExtent;
  positionMapVideo();
  map.getView().fit(projectedExtent, { padding: [48, 48, 160, 48], duration: 350 });
}

map.on("postrender", positionMapVideo);
map.getView().on("change:center", positionMapVideo);
map.getView().on("change:resolution", positionMapVideo);

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Request failed.");
  }
  return data;
}

tabWms.addEventListener("click", () => switchTab("wms"));
tabUpload.addEventListener("click", () => switchTab("upload"));

document.querySelector("#fit-world").addEventListener("click", () => {
  const projectedExtent = ol.proj.transformExtent(latestExtent, "EPSG:4326", "EPSG:3857");
  map.getView().fit(projectedExtent, { padding: [48, 48, 160, 48], duration: 350 });
});

document.querySelector("#clear-video").addEventListener("click", () => {
  removeVideoLayer();
  video.removeAttribute("src");
  video.load();
  resultMeta.textContent = "No video generated yet.";
  setStatus("Video overlay cleared.", "ok");
});

wmsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(wmsForm, true);
  setStatus("Fetching WMS frames and interpolating sequence...");

  try {
    const form = new FormData(wmsForm);
    const bbox = parseBbox(form.get("bbox"));
    const times = String(form.get("times"))
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = {
      base_url: form.get("base_url"),
      layers: form.get("layers"),
      bbox: bbox.join(","),
      crs: form.get("crs"),
      version: form.get("version"),
      times,
      width: 768,
      height: 432,
      ...currentRenderSettings(),
    };

    const data = await postJson("/api/wms/interpolate", payload);
    overlayVideo(data.video_url, bbox);
    resultMeta.textContent = `${data.frame_count} frames at ${data.fps} FPS using ${data.method.replace("_", " ")}.`;
    setStatus("WMS interpolation complete.", "ok");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    setBusy(wmsForm, false);
  }
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(uploadForm, true);
  setStatus("Uploading frames and generating interpolated video...");

  try {
    const formData = new FormData();
    const files = uploadForm.querySelector("input[type=file]").files;
    for (const file of files) {
      formData.append("files", file);
    }
    const settings = currentRenderSettings();
    formData.append("inbetweens", settings.inbetweens);
    formData.append("fps", settings.fps);
    formData.append("method", settings.method);

    const response = await fetch("/api/interpolate", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Upload interpolation failed.");
    }

    overlayVideo(data.video_url, worldExtentLonLat);
    resultMeta.textContent = `${data.frame_count} frames at ${data.fps} FPS using ${data.method.replace("_", " ")}.`;
    setStatus("Upload interpolation complete.", "ok");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    setBusy(uploadForm, false);
  }
});
