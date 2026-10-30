// React frontend file: helper for calling the Node.js and Express backend API.
// Base address used by the React app to call the Express API.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Sends a request to the API and adds the saved login token when available.
export async function api(path, options = {}) {
  const token = localStorage.getItem("attendance_token");
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : await response.blob();
  if (!response.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}
