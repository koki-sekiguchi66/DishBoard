/**
 * WeightForm — 体重記録フォーム（Tailwind + shadcn/ui版）
 *
 * Phase 3: Bootstrap Form → shadcn/ui Input + Tailwind。
 * ロジック変更なし、UI層のみ移行。
 */
import { useState, type FormEvent, type ChangeEvent } from "react";
import { Calendar, Scale, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { weightApi } from "../api/weightApi";
import type { WeightRecord } from "@/types";

interface WeightFormProps {
  onWeightCreated: (weight: WeightRecord) => void;
}

export default function WeightForm({ onWeightCreated }: WeightFormProps) {
  const [formData, setFormData] = useState({
    record_date: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })(),
    weight: "",
  });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);

    const weightVal = parseFloat(formData.weight);

    if (!formData.weight || weightVal <= 0) {
      setMessage("有効な体重を入力してください。");
      setIsLoading(false);
      return;
    }

    if (weightVal > 1000) {
      setMessage("体重は1000kg以下で入力してください。");
      setIsLoading(false);
      return;
    }

    try {
      const response = await weightApi.createWeight(formData);
      setMessage("体重を記録しました！");
      onWeightCreated(response);

      setFormData({ record_date: formData.record_date, weight: "" });
      setTimeout(() => setMessage(""), 3000);
    } catch (error: unknown) {
      console.error("Failed to create weight record", error);
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 400) {
        setMessage("入力内容を確認してください。");
      } else {
        setMessage("記録に失敗しました。もう一度お試しください。");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isError = message.includes("失敗") || message.includes("確認") || message.includes("有効") || message.includes("1000");

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* 日付選択 */}
      <div className="space-y-2">
        <Label htmlFor="weight-date" className="flex items-center gap-2 font-medium">
          <Calendar className="h-4 w-4" />
          記録日
        </Label>
        <Input
          id="weight-date"
          type="date"
          name="record_date"
          value={formData.record_date}
          onChange={handleChange}
        />
      </div>

      {/* 体重入力 */}
      <div className="space-y-2">
        <Label htmlFor="weight-value" className="flex items-center gap-2 font-medium">
          <Scale className="h-4 w-4" />
          体重 (kg)
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="weight-value"
            type="number"
            step="0.1"
            min="1"
            max="1000"
            name="weight"
            value={formData.weight}
            onChange={handleChange}
            required
            placeholder="例: 65.5"
            className="flex-1"
          />
          <span className="text-sm font-medium text-muted-foreground">kg</span>
        </div>
      </div>

      {/* 送信ボタン */}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            記録中...
          </>
        ) : (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            記録する
          </>
        )}
      </Button>

      {/* メッセージ */}
      {message && (
        <Alert variant={isError ? "destructive" : "success"}>
          {isError ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
