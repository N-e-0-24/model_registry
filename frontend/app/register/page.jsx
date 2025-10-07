"use client";

import { useState } from "react";
import axios from "axios";
import api, { endpoints } from "../../lib/api";
import { useToast } from "../../components/ToastProvider";
import { useRouter } from "next/navigation";

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post(endpoints.auth.register, formData);

      if (res.data?.token) {
        localStorage.setItem("token", res.data.token);
        addToast("Registration successful", "success");
        router.push("/dashboard");
      } else {
        addToast("Registration succeeded but no token received.", "error");
        setError("Registration succeeded but no token received.");
      }
    } catch (err) {
      console.error("Registration error:", err);
      const msg = err.response?.data?.message || "Registration failed";
      addToast(msg, "error");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-md w-96"
      >
        <h2 className="text-2xl font-bold mb-4 text-center">Register</h2>

        {error && <p className="text-red-500 mb-3 text-center">{error}</p>}

        <input
          type="text"
          name="fullName"
          placeholder="Full Name"
          value={formData.fullName}
          onChange={handleChange}
          className="border p-2 w-full mb-3 rounded"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="border p-2 w-full mb-3 rounded"
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="border p-2 w-full mb-4 rounded"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white p-2 w-full rounded hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Registering..." : "Register"}
        </button>

        {/* Login redirect */}
        <p className="text-center text-sm mt-4">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-blue-600 hover:underline font-medium"
          >
            Login here
          </button>
        </p>
      </form>
    </div>
  );
}
