import { useState } from 'react';
import { Modal, Form, Button, Alert, Row, Col, Card } from 'react-bootstrap';
import { customFoodApi } from '../api/customFoodApi';

const CustomFoodFormModal = ({ show, onClose, onFoodCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    calories_per_100g: 0,
    protein_per_100g: 0,
    fat_per_100g: 0,
    carbs_per_100g: 0,
    fiber_per_100g: 0,
    sodium_per_100g: 0,
    calcium_per_100g: 0,
    iron_per_100g: 0,
    vitamin_a_per_100g: 0,
    vitamin_b1_per_100g: 0,
    vitamin_b2_per_100g: 0,
    vitamin_c_per_100g: 0,
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvancedNutrition, setShowAdvancedNutrition] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'name' ? value : parseFloat(value) || 0
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!formData.name.trim()) {
      setError('食品名を入力してください。');
      setIsLoading(false);
      return;
    }

    try {
      const response = await customFoodApi.createCustomFood(formData);
      onFoodCreated(response);
      onClose();
    } catch (error) {
      if (error.response?.data?.name?.includes('already exists')) {
        setError('この食品名は既に登録されています。');
      } else {
        setError('保存に失敗しました。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-plus-circle me-2"></i>
          Myアイテムを新規作成
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">
              <i className="bi bi-journal-text me-2"></i>
              食品名
            </Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="例: チキンサラダ"
            />
          </Form.Group>

          <Card className="mb-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <Card.Title className="mb-0 h6">
                <i className="bi bi-graph-up me-2"></i>
                栄養成分（100gあたり）
              </Card.Title>
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
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Label>カロリー (kcal)</Form.Label>
                  <Form.Control
                    type="number"
                    name="calories_per_100g"
                    value={formData.calories_per_100g}
                    onChange={handleChange}
                    step="0.1"
                  />
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Label>タンパク質 (g)</Form.Label>
                  <Form.Control
                    type="number"
                    name="protein_per_100g"
                    value={formData.protein_per_100g}
                    onChange={handleChange}
                    step="0.1"
                  />
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Label>脂質 (g)</Form.Label>
                  <Form.Control
                    type="number"
                    name="fat_per_100g"
                    value={formData.fat_per_100g}
                    onChange={handleChange}
                    step="0.1"
                  />
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Label>炭水化物 (g)</Form.Label>
                  <Form.Control
                    type="number"
                    name="carbs_per_100g"
                    value={formData.carbs_per_100g}
                    onChange={handleChange}
                    step="0.1"
                  />
                </Col>
              </Row>

              {showAdvancedNutrition && (
                <>
                  <hr />
                  <Row>
                    <Col md={4} className="mb-3">
                      <Form.Label>食物繊維 (g)</Form.Label>
                      <Form.Control
                        type="number"
                        name="fiber_per_100g"
                        value={formData.fiber_per_100g}
                        onChange={handleChange}
                        step="0.1"
                        size="sm"
                      />
                    </Col>
                    <Col md={4} className="mb-3">
                      <Form.Label>ナトリウム (mg)</Form.Label>
                      <Form.Control
                        type="number"
                        name="sodium_per_100g"
                        value={formData.sodium_per_100g}
                        onChange={handleChange}
                        step="0.1"
                        size="sm"
                      />
                    </Col>
                    <Col md={4} className="mb-3">
                      <Form.Label>カルシウム (mg)</Form.Label>
                      <Form.Control
                        type="number"
                        name="calcium_per_100g"
                        value={formData.calcium_per_100g}
                        onChange={handleChange}
                        step="0.1"
                        size="sm"
                      />
                    </Col>
                    <Col md={4} className="mb-3">
                      <Form.Label>鉄分 (mg)</Form.Label>
                      <Form.Control
                        type="number"
                        name="iron_per_100g"
                        value={formData.iron_per_100g}
                        onChange={handleChange}
                        step="0.01"
                        size="sm"
                      />
                    </Col>
                    <Col md={4} className="mb-3">
                      <Form.Label>ビタミンA (μg)</Form.Label>
                      <Form.Control
                        type="number"
                        name="vitamin_a_per_100g"
                        value={formData.vitamin_a_per_100g}
                        onChange={handleChange}
                        step="0.1"
                        size="sm"
                      />
                    </Col>
                    <Col md={4} className="mb-3">
                      <Form.Label>ビタミンB1 (mg)</Form.Label>
                      <Form.Control
                        type="number"
                        name="vitamin_b1_per_100g"
                        value={formData.vitamin_b1_per_100g}
                        onChange={handleChange}
                        step="0.01"
                        size="sm"
                      />
                    </Col>
                    <Col md={4} className="mb-3">
                      <Form.Label>ビタミンB2 (mg)</Form.Label>
                      <Form.Control
                        type="number"
                        name="vitamin_b2_per_100g"
                        value={formData.vitamin_b2_per_100g}
                        onChange={handleChange}
                        step="0.01"
                        size="sm"
                      />
                    </Col>
                    <Col md={4} className="mb-3">
                      <Form.Label>ビタミンC (mg)</Form.Label>
                      <Form.Control
                        type="number"
                        name="vitamin_c_per_100g"
                        value={formData.vitamin_c_per_100g}
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

          {error && (
            <Alert variant="danger">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </Alert>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-primary" onClick={onClose}>
          キャンセル
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              保存中...
            </>
          ) : (
            <>
              <i className="bi bi-check-circle me-2"></i>
              保存する
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CustomFoodFormModal;