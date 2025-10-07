import api, { endpoints } from "./api";

export async function fetchModels() {
  const res = await api.get(endpoints.models.list);
  return res.data;
}

export async function fetchModel(id) {
  const res = await api.get(endpoints.models.get(id));
  return res.data;
}

export async function fetchLogs(id) {
  const res = await api.get(endpoints.models.logs(id));
  return res.data;
}

export async function uploadModel(formData, onUploadProgress) {
  const res = await api.post(endpoints.models.upload, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress,
  });
  return res.data;
}

export async function uploadNewVersion(id, formData, onUploadProgress) {
  const res = await api.post(endpoints.models.newVersion(id), formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress,
  });
  return res.data;
}

export async function rollbackVersion(id, versionId) {
  const res = await api.post(endpoints.models.rollback(id), { versionId });
  return res.data;
}

export async function downloadModel(id) {
  const res = await api.get(endpoints.models.download(id), { responseType: "blob" });
  return res;
}
