import axios, {
  isAxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

const baseURL: string =
  import.meta.env.VITE_API_BASE_URL ||
  "https://d4zpdgaymaeb8.cloudfront.net/api/";

export const apiClient: AxiosInstance = axios.create({
  baseURL,
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
