"use client";
import { useState } from "react";
import api, { endpoints } from "../../../lib/api";
import { useRouter } from "next/navigation";

export default function UploadModel() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    version: "",
    description: "",
    tags: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a file!");

    const data = new FormData();
    data.append("name", formData.name);
    data.append("version", formData.version);
    data.append("description", formData.description);
    data.append("tags", formData.tags);
    data.append("file", file);

    try {
      setLoading(true);
      // api will attach Authorization header automatically via interceptor
      const res = await api.post(endpoints.models.upload, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Model uploaded successfully!");
      router.push("/dashboard"); // Redirect to dashboard after success
    } catch (err) {
      console.error(err);
      alert("Upload failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="mb-8">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition duration-150 mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Upload New Model</h1>
            <p className="text-gray-600 mt-2">Upload a new machine learning model to your repository</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model Name *
              </label>
              <input
                type="text"
                name="name"
                placeholder="e.g., Fraud Detection Model"
                className="w-full px-4 py-3 border text-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Version Number *
              </label>
              <input
                type="text"
                name="version"
                placeholder="e.g., 1.0.0"
                className="w-full px-4 py-3 border border-gray-300  text-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150"
                value={formData.version}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                placeholder="Describe what this model does..."
                rows="4"
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150"
                value={formData.description}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Environment *
              </label>
              <select
                name="tags"
                className="w-full px-4 py-3 border text-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 bg-white"
                value={formData.tags}
                onChange={handleChange}
                required
              >
                <option value="">Select Environment</option>
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="dev">Dev</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model File *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition duration-150">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  required
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="mt-2">
                    <span className="text-blue-600 font-medium">Click to upload</span>
                    <span className="text-gray-500"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-gray-700 mt-1">
                    {file ? file.name : "Supported formats: .pkl, .h5, .zip, etc."}
                  </p>
                </label>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition duration-150 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-150 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Uploading...
                  </>
                ) : (
                  'Upload Model'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}