// kilogram-app/src/features/ocr/components/OCRResultModal.jsx
import { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Row, Col, Card, Badge, Collapse } from 'react-bootstrap';

const OCRResultModal = ({ show, onClose, ocrResult, onConfirm }) => {
  const [nutritionData, setNutritionData] = useState({
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  useEffect(() => {
    if (ocrResult?.nutrition) {
      console.log('OCR結果を設定:', ocrResult.nutrition);
      setNutritionData(ocrResult.nutrition);
      
      // 詳細栄養素が1つでも検出されていたら自動展開
      const hasDetailNutrients = 
        ocrResult.nutrition.dietary_fiber > 0 ||
        ocrResult.nutrition.sodium > 0 ||
        ocrResult.nutrition.calcium > 0 ||
        ocrResult.nutrition.iron > 0 ||
        ocrResult.nutrition.vitamin_a > 0 ||
        ocrResult.nutrition.vitamin_b1 > 0 ||
        ocrResult.nutrition.vitamin_b2 > 0 ||
        ocrResult.nutrition.vitamin_c > 0;
      
      setShowAdvanced(hasDetailNutrients);
    }
  }, [ocrResult]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value) || 0;
    setNutritionData(prev => ({
      ...prev,
      [name]: numValue
    }));
  };
  
  const handleConfirm = () => {
    console.log('確認ボタン押下:', nutritionData);
    
    // 基本栄養素が1つでも入力されているか確認
    const hasBasicNutrient = 
      nutritionData.calories > 0 ||
      nutritionData.protein > 0 ||
      nutritionData.fat > 0 ||
      nutritionData.carbohydrates > 0;
    
    if (!hasBasicNutrient) {
      alert('基本的な栄養素（エネルギー、タンパク質、脂質、炭水化物）を少なくとも1つ入力してください。');
      return;
    }
    
    onConfirm(nutritionData);
  };
  
  if (!ocrResult) return null;
  
  // 検出された基本栄養素の数
  const detectedBasicCount = [
    nutritionData.calories,
    nutritionData.protein,
    nutritionData.fat,
    nutritionData.carbohydrates,
  ].filter(v => v > 0).length;
  
  // 検出された詳細栄養素の数
  const detectedDetailCount = [
    nutritionData.dietary_fiber,
    nutritionData.sodium,
    nutritionData.calcium,
    nutritionData.iron,
    nutritionData.vitamin_a,
    nutritionData.vitamin_b1,
    nutritionData.vitamin_b2,
    nutritionData.vitamin_c,
  ].filter(v => v > 0).length;
  
  return (
    <Modal show={show} onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-file-text me-2"></i>
          認識結果の確認
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {/* 認識ステータス */}
        {ocrResult.success ? (
          <Alert variant="success" className="d-flex align-items-center">
            <i className="bi bi-check-circle-fill me-2 fs-4"></i>
            <div>
              <strong>栄養素情報を認識しました</strong>
              <div className="small">
                基本栄養素: {detectedBasicCount}/4項目
                {detectedDetailCount > 0 && ` | 詳細栄養素: ${detectedDetailCount}/8項目`}
              </div>
              <div className="small text-muted">
                内容を確認し、必要に応じて修正してください
              </div>
            </div>
          </Alert>
        ) : (
          <Alert variant="warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {ocrResult.error || '一部の栄養素を認識できませんでした。手動で入力してください。'}
          </Alert>
        )}
        
        {/* デバッグ情報（開発時のみ） */}
        {process.env.NODE_ENV === 'development' && ocrResult.detected_texts && ocrResult.detected_texts.length > 0 && (
          <details className="mb-3">
            <summary className="text-muted small" style={{ cursor: 'pointer' }}>
              検出されたテキスト（デバッグ用）
            </summary>
            <div className="small text-muted mt-2 p-2 bg-light rounded" style={{ maxHeight: '100px', overflowY: 'auto' }}>
              {ocrResult.detected_texts.join(' / ')}
            </div>
          </details>
        )}
        
        {/* 栄養素フォーム */}
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <span className="fw-bold">
              <i className="bi bi-clipboard-data me-2"></i>
              栄養成分（100gあたり）
            </span>
            <Badge bg={ocrResult.success ? 'success' : 'secondary'}>
              {ocrResult.success ? 'AI認識済み' : '手動入力'}
            </Badge>
          </Card.Header>
          <Card.Body>
            {/* 基本栄養素 */}
            <h6 className="mb-3">
              <i className="bi bi-star-fill text-warning me-2"></i>
              基本栄養素（必須）
            </h6>
            <Row>
              <Col md={6} className="mb-3">
                <Form.Label>
                  エネルギー (kcal)
                  {nutritionData.calories > 0 && <i className="bi bi-check-circle-fill text-success ms-2"></i>}
                </Form.Label>
                <Form.Control
                  type="number"
                  name="calories"
                  value={nutritionData.calories}
                  onChange={handleChange}
                  step="0.1"
                  min="0"
                />
              </Col>
              <Col md={6} className="mb-3">
                <Form.Label>
                  タンパク質 (g)
                  {nutritionData.protein > 0 && <i className="bi bi-check-circle-fill text-success ms-2"></i>}
                </Form.Label>
                <Form.Control
                  type="number"
                  name="protein"
                  value={nutritionData.protein}
                  onChange={handleChange}
                  step="0.1"
                  min="0"
                />
              </Col>
              <Col md={6} className="mb-3">
                <Form.Label>
                  脂質 (g)
                  {nutritionData.fat > 0 && <i className="bi bi-check-circle-fill text-success ms-2"></i>}
                </Form.Label>
                <Form.Control
                  type="number"
                  name="fat"
                  value={nutritionData.fat}
                  onChange={handleChange}
                  step="0.1"
                  min="0"
                />
              </Col>
              <Col md={6} className="mb-3">
                <Form.Label>
                  炭水化物 (g)
                  {nutritionData.carbohydrates > 0 && <i className="bi bi-check-circle-fill text-success ms-2"></i>}
                </Form.Label>
                <Form.Control
                  type="number"
                  name="carbohydrates"
                  value={nutritionData.carbohydrates}
                  onChange={handleChange}
                  step="0.1"
                  min="0"
                />
              </Col>
            </Row>
            
            {/* 詳細栄養素トグル */}
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">
                <i className="bi bi-plus-circle me-2"></i>
                詳細栄養素（任意）
                {detectedDetailCount > 0 && (
                  <Badge bg="info" className="ms-2">{detectedDetailCount}項目検出</Badge>
                )}
              </h6>
              <Button
                variant="link"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-decoration-none"
              >
                {showAdvanced ? '詳細を隠す ▲' : '詳細を表示 ▼'}
              </Button>
            </div>
            
            <Collapse in={showAdvanced}>
              <div>
                <hr />
                <Row>
                  <Col md={4} className="mb-2">
                    <Form.Label className="small">
                      食物繊維 (g)
                      {nutritionData.dietary_fiber > 0 && <i className="bi bi-check-circle-fill text-success ms-1"></i>}
                    </Form.Label>
                    <Form.Control
                      type="number"
                      name="dietary_fiber"
                      value={nutritionData.dietary_fiber}
                      onChange={handleChange}
                      step="0.1"
                      min="0"
                      size="sm"
                    />
                  </Col>
                  <Col md={4} className="mb-2">
                    <Form.Label className="small">
                      ナトリウム (mg)
                      {nutritionData.sodium > 0 && <i className="bi bi-check-circle-fill text-success ms-1"></i>}
                    </Form.Label>
                    <Form.Control
                      type="number"
                      name="sodium"
                      value={nutritionData.sodium}
                      onChange={handleChange}
                      step="0.1"
                      min="0"
                      size="sm"
                    />
                  </Col>
                  <Col md={4} className="mb-2">
                    <Form.Label className="small">
                      カルシウム (mg)
                      {nutritionData.calcium > 0 && <i className="bi bi-check-circle-fill text-success ms-1"></i>}
                    </Form.Label>
                    <Form.Control
                      type="number"
                      name="calcium"
                      value={nutritionData.calcium}
                      onChange={handleChange}
                      step="0.1"
                      min="0"
                      size="sm"
                    />
                  </Col>
                  <Col md={4} className="mb-2">
                    <Form.Label className="small">
                      鉄分 (mg)
                      {nutritionData.iron > 0 && <i className="bi bi-check-circle-fill text-success ms-1"></i>}
                    </Form.Label>
                    <Form.Control
                      type="number"
                      name="iron"
                      value={nutritionData.iron}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      size="sm"
                    />
                  </Col>
                  <Col md={4} className="mb-2">
                    <Form.Label className="small">
                      ビタミンA (μg)
                      {nutritionData.vitamin_a > 0 && <i className="bi bi-check-circle-fill text-success ms-1"></i>}
                    </Form.Label>
                    <Form.Control
                      type="number"
                      name="vitamin_a"
                      value={nutritionData.vitamin_a}
                      onChange={handleChange}
                      step="0.1"
                      min="0"
                      size="sm"
                    />
                  </Col>
                  <Col md={4} className="mb-2">
                    <Form.Label className="small">
                      ビタミンB1 (mg)
                      {nutritionData.vitamin_b1 > 0 && <i className="bi bi-check-circle-fill text-success ms-1"></i>}
                    </Form.Label>
                    <Form.Control
                      type="number"
                      name="vitamin_b1"
                      value={nutritionData.vitamin_b1}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      size="sm"
                    />
                  </Col>
                  <Col md={4} className="mb-2">
                    <Form.Label className="small">
                      ビタミンB2 (mg)
                      {nutritionData.vitamin_b2 > 0 && <i className="bi bi-check-circle-fill text-success ms-1"></i>}
                    </Form.Label>
                    <Form.Control
                      type="number"
                      name="vitamin_b2"
                      value={nutritionData.vitamin_b2}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      size="sm"
                    />
                  </Col>
                  <Col md={4} className="mb-2">
                    <Form.Label className="small">
                      ビタミンC (mg)
                      {nutritionData.vitamin_c > 0 && <i className="bi bi-check-circle-fill text-success ms-1"></i>}
                    </Form.Label>
                    <Form.Control
                      type="number"
                      name="vitamin_c"
                      value={nutritionData.vitamin_c}
                      onChange={handleChange}
                      step="0.1"
                      min="0"
                      size="sm"
                    />
                  </Col>
                </Row>
              </div>
            </Collapse>
          </Card.Body>
        </Card>
        
        {/* 注意事項 */}
        <Alert variant="info" className="mt-3 mb-0">
          <small>
            <i className="bi bi-info-circle me-2"></i>
            <strong>注意:</strong> 基本栄養素（エネルギー、タンパク質、脂質、炭水化物）のうち、
            少なくとも1つの値を入力してください。詳細栄養素は任意です。
          </small>
        </Alert>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>
          キャンセル
        </Button>
        <Button 
          variant="primary" 
          onClick={handleConfirm}
          disabled={detectedBasicCount === 0}
        >
          <i className="bi bi-check-circle me-2"></i>
          この内容でメニューに追加
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default OCRResultModal;