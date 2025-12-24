import React, { useState } from 'react';
import { Form, Button, Row, Col, Spinner, Collapse } from 'react-bootstrap';
import { toast } from 'react-hot-toast';
import { customFoodApi } from '@/features/customFoods/api/customFoodApi';

const ManualInputForm = ({ onAdd }) => {
  const [data, setData] = useState({
    meal_name: '',
    calories: 0,
    protein: 0,
    fat: 0,
    carbohydrates: 0,
    dietary_fiber: 0,
    sodium: 0,
    calcium: 0,
    iron: 0,
    vitamin_a: 0,
    vitamin_b1: 0,
    vitamin_b2: 0,
    vitamin_c: 0,
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false); // 詳細表示のトグル

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData({ ...data, [name]: value });
  };

  // 共通のデータ整形処理
  const createItemData = () => ({
    item_type: 'standard',
    item_id: 0,
    item_name: data.meal_name,
    amount_grams: 100,
    // 数値変換（空文字対策）
    calories: parseFloat(data.calories) || 0,
    protein: parseFloat(data.protein) || 0,
    fat: parseFloat(data.fat) || 0,
    carbohydrates: parseFloat(data.carbohydrates) || 0,
    dietary_fiber: parseFloat(data.dietary_fiber) || 0,
    sodium: parseFloat(data.sodium) || 0,
    calcium: parseFloat(data.calcium) || 0,
    iron: parseFloat(data.iron) || 0,
    vitamin_a: parseFloat(data.vitamin_a) || 0,
    vitamin_b1: parseFloat(data.vitamin_b1) || 0,
    vitamin_b2: parseFloat(data.vitamin_b2) || 0,
    vitamin_c: parseFloat(data.vitamin_c) || 0,
  });

  // そのまま追加
  const handleAdd = () => {
    if (!data.meal_name) return;
    onAdd(createItemData());
    resetForm();
  };

  // Myアイテムとして保存して追加
  const handleSaveAndAdd = async () => {
    if (!data.meal_name) return;
    setIsSaving(true);

    try {
      // Myアイテム作成用データ（per_100gとして保存）
      const customFoodData = {
        name: data.meal_name,
        calories_per_100g: parseFloat(data.calories) || 0,
        protein_per_100g: parseFloat(data.protein) || 0,
        fat_per_100g: parseFloat(data.fat) || 0,
        carbs_per_100g: parseFloat(data.carbohydrates) || 0,
        fiber_per_100g: parseFloat(data.dietary_fiber) || 0,
        sodium_per_100g: parseFloat(data.sodium) || 0,
        calcium_per_100g: parseFloat(data.calcium) || 0,
        iron_per_100g: parseFloat(data.iron) || 0,
        vitamin_a_per_100g: parseFloat(data.vitamin_a) || 0,
        vitamin_b1_per_100g: parseFloat(data.vitamin_b1) || 0,
        vitamin_b2_per_100g: parseFloat(data.vitamin_b2) || 0,
        vitamin_c_per_100g: parseFloat(data.vitamin_c) || 0,
      };

      await customFoodApi.createCustomFood(customFoodData);
      toast.success('Myアイテムに保存しました');
      
      // メニューに追加
      onAdd(createItemData());
      resetForm();

    } catch (error) {
      console.error(error);
      toast.error('保存に失敗しました。同じ名前が既に存在する可能性があります。');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setData({
      meal_name: '',
      calories: 0, protein: 0, fat: 0, carbohydrates: 0,
      dietary_fiber: 0, sodium: 0, calcium: 0, iron: 0,
      vitamin_a: 0, vitamin_b1: 0, vitamin_b2: 0, vitamin_c: 0,
    });
    setShowDetails(false);
  };

  return (
    <div className="bg-light p-3 rounded border">
      <h6 className="mb-3"><i className="bi bi-pencil me-2"></i>手動入力</h6>
      <Form.Group className="mb-3">
        <Form.Label>食事名 <span className="text-danger">*</span></Form.Label>
        <Form.Control
          type="text"
          name="meal_name"
          value={data.meal_name}
          onChange={handleChange}
          placeholder="例: 自作のお弁当"
        />
      </Form.Group>
      
      {/* 基本栄養素 */}
      <Row>
        <Col xs={6} className="mb-2">
          <Form.Label className="small">カロリー(kcal)</Form.Label>
          <Form.Control type="number" name="calories" value={data.calories} onChange={handleChange} size="sm" />
        </Col>
        <Col xs={6} className="mb-2">
          <Form.Label className="small">タンパク質(g)</Form.Label>
          <Form.Control type="number" name="protein" value={data.protein} onChange={handleChange} size="sm" />
        </Col>
        <Col xs={6} className="mb-2">
          <Form.Label className="small">脂質(g)</Form.Label>
          <Form.Control type="number" name="fat" value={data.fat} onChange={handleChange} size="sm" />
        </Col>
        <Col xs={6} className="mb-2">
          <Form.Label className="small">炭水化物(g)</Form.Label>
          <Form.Control type="number" name="carbohydrates" value={data.carbohydrates} onChange={handleChange} size="sm" />
        </Col>
      </Row>

      {/* 詳細表示トグル */}
      <div className="d-flex justify-content-end mb-2">
        <Button 
          variant="link" 
          size="sm" 
          onClick={() => setShowDetails(!showDetails)}
          className="text-decoration-none p-0"
        >
          {showDetails ? '詳細を隠す ▲' : '詳細な栄養素を入力 ▼'}
        </Button>
      </div>

      {/* 詳細栄養素 */}
      <Collapse in={showDetails}>
        <div>
          <hr className="my-2" />
          <Row>
            <Col xs={6} md={4} className="mb-2">
              <Form.Label className="small">食物繊維(g)</Form.Label>
              <Form.Control type="number" name="dietary_fiber" value={data.dietary_fiber} onChange={handleChange} size="sm" />
            </Col>
            <Col xs={6} md={4} className="mb-2">
              <Form.Label className="small">ナトリウム(mg)</Form.Label>
              <Form.Control type="number" name="sodium" value={data.sodium} onChange={handleChange} size="sm" />
            </Col>
            <Col xs={6} md={4} className="mb-2">
              <Form.Label className="small">カルシウム(mg)</Form.Label>
              <Form.Control type="number" name="calcium" value={data.calcium} onChange={handleChange} size="sm" />
            </Col>
            <Col xs={6} md={4} className="mb-2">
              <Form.Label className="small">鉄分(mg)</Form.Label>
              <Form.Control type="number" name="iron" value={data.iron} onChange={handleChange} size="sm" step="0.1" />
            </Col>
            <Col xs={6} md={4} className="mb-2">
              <Form.Label className="small">ビタミンA(μg)</Form.Label>
              <Form.Control type="number" name="vitamin_a" value={data.vitamin_a} onChange={handleChange} size="sm" />
            </Col>
            <Col xs={6} md={4} className="mb-2">
              <Form.Label className="small">ビタミンB1(mg)</Form.Label>
              <Form.Control type="number" name="vitamin_b1" value={data.vitamin_b1} onChange={handleChange} size="sm" step="0.01" />
            </Col>
            <Col xs={6} md={4} className="mb-2">
              <Form.Label className="small">ビタミンB2(mg)</Form.Label>
              <Form.Control type="number" name="vitamin_b2" value={data.vitamin_b2} onChange={handleChange} size="sm" step="0.01" />
            </Col>
            <Col xs={6} md={4} className="mb-2">
              <Form.Label className="small">ビタミンC(mg)</Form.Label>
              <Form.Control type="number" name="vitamin_c" value={data.vitamin_c} onChange={handleChange} size="sm" />
            </Col>
          </Row>
        </div>
      </Collapse>
      
      <div className="d-flex gap-2 mt-3">
        <Button 
          variant="primary" 
          onClick={handleAdd} 
          disabled={!data.meal_name || isSaving} 
          className="flex-grow-1"
        >
          メニューに追加
        </Button>
        <Button 
          variant="outline-success" 
          onClick={handleSaveAndAdd} 
          disabled={!data.meal_name || isSaving}
          className="flex-grow-1"
          title="Myアイテムに保存しました"
        >
          {isSaving ? <Spinner size="sm" animation="border" /> : <i className="bi bi-save me-1"></i>}
          Myアイテムに保存してメニューに追加
        </Button>
      </div>
    </div>
  );
};

export default ManualInputForm;