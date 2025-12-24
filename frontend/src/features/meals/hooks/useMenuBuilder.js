import { useState, useEffect, useMemo } from 'react';
import { mealApi } from '../api/mealApi';
import { customMenuApi } from '@/features/customMenus/api/customMenuApi';
import { toast } from 'react-hot-toast'; // トースト通知用（なければalert等に置換可）

export const useMenuBuilder = (onMealCreated) => {
  // 基本設定
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [mealTiming, setMealTiming] = useState('breakfast');
  const [activeInputMethod, setActiveInputMethod] = useState('search');

  // メニューの内容（カート）
  const [menuItems, setMenuItems] = useState([]);
  
  // 保存オプション
  const [saveAsMenu, setSaveAsMenu] = useState(false);
  const [menuName, setMenuName] = useState('');
  const [menuDescription, setMenuDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 合計栄養素の計算
  const totalNutrition = useMemo(() => {
    return menuItems.reduce((acc, item) => {
      const multiplier = item.amount_grams / 100; // 基本は100gあたりのデータと仮定、またはアイテム自体が計算済みならそのまま
      
      // アイテムが既に計算済みの栄養素を持っている場合（推奨）
      return {
        calories: acc.calories + (item.calories || 0),
        protein: acc.protein + (item.protein || 0),
        fat: acc.fat + (item.fat || 0),
        carbohydrates: acc.carbohydrates + (item.carbohydrates || 0),
        dietary_fiber: acc.dietary_fiber + (item.dietary_fiber || 0),
        sodium: acc.sodium + (item.sodium || 0),
        calcium: acc.calcium + (item.calcium || 0),
        iron: acc.iron + (item.iron || 0),
        vitamin_a: acc.vitamin_a + (item.vitamin_a || 0),
        vitamin_b1: acc.vitamin_b1 + (item.vitamin_b1 || 0),
        vitamin_b2: acc.vitamin_b2 + (item.vitamin_b2 || 0),
        vitamin_c: acc.vitamin_c + (item.vitamin_c || 0),
      };
    }, {
      calories: 0, protein: 0, fat: 0, carbohydrates: 0,
      dietary_fiber: 0, sodium: 0, calcium: 0, iron: 0,
      vitamin_a: 0, vitamin_b1: 0, vitamin_b2: 0, vitamin_c: 0,
    });
  }, [menuItems]);

  // アイテム追加
  const addMenuItem = (item) => {
    const newItem = {
      ...item,
      tempId: Date.now() + Math.random(), // フロントエンド用の一時ID
      display_order: menuItems.length + 1,
    };
    setMenuItems([...menuItems, newItem]);
    toast.success(`${item.item_name}を追加しました`);
  };

  // アイテム削除
  const removeMenuItem = (tempId) => {
    setMenuItems(menuItems.filter(item => item.tempId !== tempId));
  };

  // Myメニュー読み込み
  const loadFromCustomMenu = (menuDetail) => {
    const newItems = menuDetail.items.map(item => ({
      ...item,
      tempId: Date.now() + Math.random() + item.id,
      // 既存の栄養素データを使用
    }));
    setMenuItems([...menuItems, ...newItems]);
    toast.success(`メニュー「${menuDetail.name}」を読み込みました`);
  };

  // メニュークリア
  const handleClearMenu = () => {
    if (window.confirm('現在のメニューをクリアしますか？')) {
      setMenuItems([]);
      setMenuName('');
      setMenuDescription('');
      setSaveAsMenu(false);
    }
  };

  // 送信処理
  const handleSubmit = async () => {
    if (menuItems.length === 0) {
      toast.error('アイテムを追加してください');
      return;
    }
    if (saveAsMenu && !menuName.trim()) {
      toast.error('Myメニューとして保存する場合は名前が必要です');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. 食事記録の作成
      // 食事名は、Myメニュー名が指定されていればそれ、なければ代表アイテム名などから生成
      const finalMealName = saveAsMenu ? menuName : (menuItems[0].item_name + (menuItems.length > 1 ? ' 他' : ''));

      const mealRecordData = {
        record_date: recordDate,
        meal_timing: mealTiming,
        meal_name: finalMealName,
        // 合計栄養素を展開
        ...totalNutrition,
        // アイテムリスト
        items: menuItems.map((item, index) => ({
          item_type: item.item_type || 'standard', // デフォルト
          item_id: item.item_id || 0, // IDがない場合（手動など）は0や適切な処理
          item_name: item.item_name,
          amount_grams: item.amount_grams,
          display_order: index + 1,
          // 栄養素スナップショット
          calories: item.calories,
          protein: item.protein,
          fat: item.fat,
          carbohydrates: item.carbohydrates,
          dietary_fiber: item.dietary_fiber,
          sodium: item.sodium,
          calcium: item.calcium,
          iron: item.iron,
          vitamin_a: item.vitamin_a,
          vitamin_b1: item.vitamin_b1,
          vitamin_b2: item.vitamin_b2,
          vitamin_c: item.vitamin_c,
        }))
      };

      const createdMeal = await mealApi.createMeal(mealRecordData);

      // 2. Myメニューとして保存する場合
      if (saveAsMenu) {
        const customMenuData = {
          name: menuName,
          description: menuDescription,
          items: menuItems.map((item, index) => ({
            item_type: item.item_type || 'standard',
            item_id: item.item_id || 0,
            item_name: item.item_name,
            amount_grams: item.amount_grams,
            display_order: index + 1,
            // 栄養素
            calories: item.calories,
            protein: item.protein,
            fat: item.fat,
            carbohydrates: item.carbohydrates,
            dietary_fiber: item.dietary_fiber,
            sodium: item.sodium,
            calcium: item.calcium,
            iron: item.iron,
            vitamin_a: item.vitamin_a,
            vitamin_b1: item.vitamin_b1,
            vitamin_b2: item.vitamin_b2,
            vitamin_c: item.vitamin_c,
          }))
        };
        await customMenuApi.createMenu(customMenuData);
        toast.success('Myメニューとしても保存しました');
      }

      toast.success('食事を記録しました！');
      
      // リセット
      setMenuItems([]);
      setMenuName('');
      setMenuDescription('');
      setSaveAsMenu(false);
      
      if (onMealCreated) onMealCreated(createdMeal);

    } catch (error) {
      console.error('登録エラー:', error);
      toast.error('登録に失敗しました。入力内容を確認してください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    recordDate, setRecordDate,
    mealTiming, setMealTiming,
    activeInputMethod, setActiveInputMethod,
    menuItems, addMenuItem, removeMenuItem,
    totalNutrition,
    saveAsMenu, setSaveAsMenu,
    menuName, setMenuName,
    menuDescription, setMenuDescription,
    isSubmitting,
    handleSubmit,
    handleClearMenu,
    loadFromCustomMenu
  };
};