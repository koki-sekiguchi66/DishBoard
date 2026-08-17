/**
 * OCRButton テスト
 *
 * カメラ撮影とギャラリー選択のどちらも、同じ ImageCropModal へ
 * 渡されることを確認する（クロップ以降のパイプラインは共通のため）。
 * CameraCapture / ImageCropModal / OCRResultModal は Web カメラ・canvas に
 * 依存し jsdom では再現しづらいためモックする。
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OCRButton from "../OCRButton";

const { cameraCaptureMock, imageCropModalMock } = vi.hoisted(() => ({
  cameraCaptureMock: vi.fn(() => null),
  imageCropModalMock: vi.fn(() => null),
}));

vi.mock("../CameraCapture", () => ({ default: cameraCaptureMock }));
vi.mock("../ImageCropModal", () => ({ default: imageCropModalMock }));
vi.mock("../OCRResultModal", () => ({ default: () => null }));

describe("OCRButton コンポーネント", () => {
  it("カメラで撮影とギャラリーから選択の2ボタンを表示する", () => {
    render(<OCRButton onNutritionDetected={vi.fn()} />);

    expect(screen.getByRole("button", { name: /カメラで撮影/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ギャラリーから選択/ })).toBeInTheDocument();
  });

  it("ギャラリーから画像を選ぶと ImageCropModal に渡って表示される", async () => {
    const user = userEvent.setup();
    render(<OCRButton onNutritionDetected={vi.fn()} />);

    const file = new File(["dummy"], "label.jpg", { type: "image/jpeg" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    await user.upload(input, file);

    expect(imageCropModalMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ show: true, imageBlob: file }),
      undefined
    );
  });
});
