/**
 * apiClient テスト
 */
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

interface MockedAxiosInstance {
  interceptors: {
    request: { use: Mock };
    response: { use: Mock };
  };
  get: Mock;
  post: Mock;
}

interface MockedAxios {
  default: {
    create: Mock & {
      mock: { results: Array<{ value: MockedAxiosInstance }> };
    };
  };
}

vi.mock("axios", () => {
  const interceptors = {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  };
  return {
    default: {
      create: vi.fn(() => ({
        interceptors,
        get: vi.fn(),
        post: vi.fn(),
      })),
    },
    isAxiosError: (error: unknown) =>
      typeof error === "object" && error !== null && "response" in error,
  };
});

describe("apiClient", () => {
  let axios: MockedAxios["default"];

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    const mod = (await import("axios")) as unknown as MockedAxios;
    axios = mod.default;
  });

  it("axios.createが呼び出される", async () => {
    await import("@/lib/axios");
    expect(axios.create).toHaveBeenCalled();
  });

  it("リクエストインターセプターが登録される", async () => {
    await import("@/lib/axios");
    const instance = axios.create.mock.results[0]?.value;
    expect(instance?.interceptors.request.use).toHaveBeenCalled();
  });

  it("レスポンスインターセプターが登録される", async () => {
    await import("@/lib/axios");
    const instance = axios.create.mock.results[0]?.value;
    expect(instance?.interceptors.response.use).toHaveBeenCalled();
  });

  describe("リクエストインターセプター", () => {
    it("トークンが存在する場合、Authorizationヘッダーが付与される", async () => {
      localStorage.setItem("token", "test-token-123");
      await import("@/lib/axios");

      const instance = axios.create.mock.results[0]?.value;
      const requestHandler = instance?.interceptors.request.use.mock
        .calls[0]?.[0] as (config: {
        headers: Record<string, string>;
      }) => { headers: Record<string, string> };

      const config = { headers: {} as Record<string, string> };
      const result = requestHandler(config);
      expect(result.headers.Authorization).toBe("Token test-token-123");
    });

    it("トークンが存在しない場合、Authorizationヘッダーが付与されない", async () => {
      await import("@/lib/axios");

      const instance = axios.create.mock.results[0]?.value;
      const requestHandler = instance?.interceptors.request.use.mock
        .calls[0]?.[0] as (config: {
        headers: Record<string, string>;
      }) => { headers: Record<string, string> };

      const config = { headers: {} as Record<string, string> };
      const result = requestHandler(config);
      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe("レスポンスインターセプター", () => {
    it("401エラー時にlocalStorageのトークンを削除", async () => {
      localStorage.setItem("token", "test-token-123");

      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        value: { href: "" },
        writable: true,
        configurable: true,
      });

      await import("@/lib/axios");

      const instance = axios.create.mock.results[0]?.value;
      const errorHandler = instance?.interceptors.response.use.mock
        .calls[0]?.[1] as (error: unknown) => Promise<never>;

      const error = { response: { status: 401 } };

      try {
        await errorHandler(error);
      } catch {
        // 401 は reject される
      }

      expect(localStorage.removeItem).toHaveBeenCalledWith("token");

      Object.defineProperty(window, "location", {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });
  });
});
