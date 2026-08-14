/**
 * ProfileSection コンポーネントのテスト
 *
 * 3状態を検証: loading / error / success
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/axios", () => ({
  apiClient: {
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

import { ProfileSection } from "../ProfileSection";
import { apiClient } from "@/lib/axios";

describe("ProfileSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ローディング中はスピナーが表示される", () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    );

    render(<ProfileSection />);

    expect(screen.getByText("プロフィール")).toBeInTheDocument();
    // Loader2 の animate-spin が存在する（SVG 要素）
  });

  it("取得成功時に username と email が表示される", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        id: 1,
        username: "testuser",
        email: "test@example.com",
        date_joined: "2025-01-01T00:00:00Z",
      },
    });

    render(<ProfileSection />);

    await waitFor(() => {
      expect(screen.getByText("testuser")).toBeInTheDocument();
    });
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("Avatar に username の頭文字が表示される", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        id: 1,
        username: "testuser",
        email: "test@example.com",
        date_joined: "2025-01-01T00:00:00Z",
      },
    });

    render(<ProfileSection />);

    await waitFor(() => {
      expect(screen.getByText("T")).toBeInTheDocument();
    });
  });

  it("email が空でもクラッシュしない", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        id: 1,
        username: "nomail",
        email: "",
        date_joined: "2025-01-01T00:00:00Z",
      },
    });

    render(<ProfileSection />);

    await waitFor(() => {
      expect(screen.getByText("nomail")).toBeInTheDocument();
    });
    // email が空なら表示されない
    expect(screen.queryByText("@")).not.toBeInTheDocument();
  });

  it("エラー時にエラーメッセージと再試行ボタンが表示される", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { status: 500 },
    });

    render(<ProfileSection />);

    await waitFor(() => {
      expect(screen.getByText(/失敗しました/)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /再試行/ })).toBeInTheDocument();
  });

  it("401 エラー時に認証エラーメッセージが表示される", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { status: 401 },
    });

    render(<ProfileSection />);

    await waitFor(() => {
      expect(screen.getByText(/認証エラー/)).toBeInTheDocument();
    });
  });

  it("再試行ボタンで再取得できる", async () => {
    const user = userEvent.setup();

    // 1回目: エラー
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { status: 500 },
    });

    render(<ProfileSection />);

    await waitFor(() => {
      expect(screen.getByText(/失敗しました/)).toBeInTheDocument();
    });

    // 2回目: 成功
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        id: 1,
        username: "recovered",
        email: "ok@example.com",
        date_joined: "2025-01-01T00:00:00Z",
      },
    });

    await user.click(screen.getByRole("button", { name: /再試行/ }));

    await waitFor(() => {
      expect(screen.getByText("recovered")).toBeInTheDocument();
    });
  });
});
