// kilogram-app/src/features/meals/components/EditMealModal.jsx
// ✅ 完全修正版 - apiClient を mealApi に置き換え済み
import { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Row, Col, Card } from 'react-bootstrap';
import { mealApi } from '../api/mealApi';

const EditMealModal = ({ meal, onClose, onMealUpdated }) => {
  const [mealData, setMealData] = useState({ ...meal });
  const [mealTimings, setMealTimings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdvancedNutrition, setShowAdvancedNutrition] = useState(false);

  useEffect(() => {
    const fetchMealTimings = async () => {
      try {
        const data = await mealApi.getMealTimings();
        setMealTimings(data);
      } catch (error) {
        console.error('Failed to fetch meal timings', error);
        setError('食事タイミングの取得に失敗しました。');
      }
    };
    fetchMealTimings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMealData({ 
      ...mealData, 
      [name]: name === 'meal_name' ? value : (parseFloat(value) || 0)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!mealData.meal_name.trim()) {
      setError('食事名を入力してください。');
      setIsLoading(false);
      return;
    }

    try {
      const response = await mealApi.updateMeal(meal.id, mealData);
      onMealUpdated(response);
    } catch (error) {
      console.error('Failed to update meal', error);
      setError('更新に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.keyCode === 27) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [onClose]);

  return (
    <Modal show={true} onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>食事記録の編集</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          {/* 日付選択 */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">記録日:</Form.Label>
            <Form.Control
              type="date"
              name="record_date"
              value={mealData.record_date}
              onChange={handleChange}
            />
          </Form.Group>

          {/* 食事タイミング選択 */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">食事タイミング:</Form.Label>
            <div className="d-flex gap-2">
              {mealTimings.map((timing) => (
                <Button
                  key={timing.value}
                  variant={mealData.meal_timing === timing.value ? "primary" : "outline-primary"}
                  onClick={() => handleChange({ target: { name: 'meal_timing', value: timing.value } })}
                  size="md"
                  className="px-4"
                >
                  {timing.label}
                </Button>
              ))}
            </div>
          </Form.Group>

          {/* 食事名 */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">食事名:</Form.Label>
            <Form.Control
              type="text"
              name="meal_name"
              value={mealData.meal_name}
              onChange={handleChange}
              required
            />
          </Form.Group>

          {/* 栄養情報 */}
          <Card className="mb-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0">栄養情報</h6>
              <Button
                variant="outline-secondary"  
                size="sm"
                onClick={() => setShowAdvancedNutrition(!showAdvancedNutrition)}
              >
                <i className={`bi ${showAdvancedNutrition ? 'bi-eye-slash' : 'bi-eye'} me-1`}></i>
                {showAdvancedNutrition ? '閉じる' : '詳細な栄養素を表示'}
              </Button>
            </Card.Header>
            <Card.Body>
              {/* 基本栄養素 */}
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Label>カロリー (kcal)</Form.Label>
                  <Form.Control
                    type="number"
                    name="calories"
                    value={mealData.calories}
                    onChange={handleChange}
                    step="0.1"
                  />
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Label>タンパク質 (g)</Form.Label>
                  <Form.Control
                    type="number"
                    name="protein"
                    value={mealData.protein}
                    onChange={handleChange}
                    step="0.1"
                  />
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Label>脂質 (g)</Form.Label>
                  <Form.Control
                    type="number"
                    name="fat"
                    value={mealData.fat}
                    onChange={handleChange}
                    step="0.1"
                  />
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Label>炭水化物 (g)</Form.Label>
                  <Form.Control
                    type="number"
                    name="carbohydrates"
                    value={mealData.carbohydrates}
                    onChange={handleChange}
                    step="0.1"
                  />
                </Col>
              </Row>

              {/* 詳細栄養素 */}
              {showAdvancedNutrition && (
                <>
                  <hr />
                  <Row>
                    <Col md={4} className="mb-3">
                      <Form.Label>食物繊維 (g)</Form.Label>
                      <Form.Control
                        type="number"
                        name="dietary_fiber"
                        value={mealData.dietary_fiber}
                        onChange={handleChange}
                        step="0.1"
                        size="sm"
                      />
                    </Col>
                    <Col md={4} className="mb-3">
                      <Form.Label>ナトリウム (mg)</Form.Label>
                      <Form.Control
                        type="number"
                        name="sodium"
                        value={mealData.sodium}
                        onChange={handleChange}
                        step="0.1"
                        size="sm"
                      />
                    </Col>
                    <Col md={4} className="mb-3">
                      <Form.Label>カルシウム (mg)</Form.Label>
                      <Form.Control
                        type="number"
                        name="calcium"
                        value={mealData.calcium}
                        onChange={handleChange}
                        step="0.1"
                        size="sm"
                      />
                    </Col>
                    <Col md={4} className="mb-3">
                      <Form.Label>鉄分 (mg)</Form.Label>
                      <Form.Control
                        type="number"
                        name="iron"
                        value={mealData.iron}
                        onChange={handleChange}
                        step="0.01"
                        size="sm"
                      />
                    </Col>
                    <Col md={4} className="mb-3">
                      <Form.Label>ビタミンA (μg)</Form.Label>
                      <Form.Control
                        type="number"
                        name="vitamin_a"
                        value={mealData.vitamin_a}
                        onChange={handleChange}
                        step="0.1"
                        size="sm"
                      />
                    </Col>
                    <Col md={4} className="mb-3">
                      <Form.Label>ビタミンB1 (mg)</Form.Label>
                      <Form.Control
                        type="number"
                        name="vitamin_b1"
                        value={mealData.vitamin_b1}
                        onChange={handleChange}
                        step="0.01"
                        size="sm"
                      />
                    </Col>
                    <Col md={4} className="mb-3">
                      <Form.Label>ビタミンB2 (mg)</Form.Label>
                      <Form.Control
                        type="number"
                        name="vitamin_b2"
                        value={mealData.vitamin_b2}
                        onChange={handleChange}
                        step="0.01"
                        size="sm"
                      />
                    </Col>
                    <Col md={4} className="mb-3">
                      <Form.Label>ビタミンC (mg)</Form.Label>
                      <Form.Control
                        type="number"
                        name="vitamin_c"
                        value={mealData.vitamin_c}
                        onChange={handleChange}
                        step="0.1"
                        size="sm"
                      />
                    </Col>
                  </Row>
                </>
              )}
            </Card.Body>
          </Card>

          {/* エラーメッセージ */}
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button 
          variant="outline-primary"  
          onClick={onClose} 
          disabled={isLoading}
        >
          キャンセル
        </Button>
        <Button
          variant="primary"  
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? '更新中...' : '更新する'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditMealModal;