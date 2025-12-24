import { useState, useEffect, useRef } from 'react';
import { Button, Form, InputGroup, Spinner, Card, Row, Col } from 'react-bootstrap';
import { mealApi } from '../api/mealApi';

const FoodSearchInput = ({ onFoodSelected }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 選択状態の管理
  const [selectedFood, setSelectedFood] = useState(null);
  const [amount, setAmount] = useState(100);
  const [calculating, setCalculating] = useState(false);

  // 検索処理
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setError('');
      return;
    }

    // 選択中は検索しない
    if (selectedFood) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const response = await mealApi.searchFoods(query);
        setResults(response.foods || []);
        if (response.foods && response.foods.length === 0) {
          setError('該当する食品が見つかりませんでした。');
        }
      } catch (error) {
        console.error('食品検索エラー:', error);
        setResults([]);
        setError('検索中にエラーが発生しました。');
      }
      setLoading(false);
    }, 500); // デバウンス時間を少し長めに

    return () => clearTimeout(timer);
  }, [query, selectedFood]);

  // 食品選択時の処理（一覧からクリック）
  const handleFoodSelect = (food) => {
    setSelectedFood(food);
    setQuery(''); // クエリをクリア
    setResults([]); // 結果をクリア
    setAmount(100); // 分量をリセット
    setError('');
  };

  // 追加ボタン処理
  const handleConfirmAdd = async () => {
    if (!selectedFood) return;
    setCalculating(true);
    try {
      // 正確な栄養素を取得するためにAPIで計算
      const response = await mealApi.calculateNutrition(selectedFood.id, amount);
      const nutrition = response.nutrition;

      onFoodSelected({
        item_type: 'standard',
        item_id: selectedFood.id,
        item_name: selectedFood.name,
        amount_grams: amount,
        ...nutrition
      });

      // 完了後リセット
      handleCancel();
    } catch (err) {
      console.error(err);
      setError('栄養素の計算に失敗しました');
    } finally {
      setCalculating(false);
    }
  };

  // キャンセル処理
  const handleCancel = () => {
    setSelectedFood(null);
    setAmount(100);
    setQuery('');
    setResults([]);
    setError('');
  };

  return (
    <div style={{ position: 'relative' }}>
      
      {/* 1. 検索モード: 食品が未選択の場合に表示 */}
      {!selectedFood && (
        <div style={{ marginBottom: '15px' }}>
          <Form.Group>
            <InputGroup>
              <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
              <Form.Control
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="食品名を入力してください... (例: 白米)"
                autoComplete="off"
              />
            </InputGroup>
          </Form.Group>
          
          {loading && (
            <div className="mt-2 text-primary small">
              <Spinner animation="border" size="sm" className="me-2" />
              検索中...
            </div>
          )}

          {error && (
            <div className="mt-2 text-danger small">
              {error}
            </div>
          )}

          {/* 検索結果リスト */}
          {results.length > 0 && (
            <Card className="mt-2 shadow-sm" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <div className="list-group list-group-flush">
                {results.map((food) => (
                  <button
                    key={food.id}
                    type="button"
                    className="list-group-item list-group-item-action p-3 text-start"
                    onClick={() => handleFoodSelect(food)}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-bold">{food.name}</div>
                        <small className="text-muted">
                          {food.category}
                        </small>
                      </div>
                      <div className="text-end text-muted small">
                        <div>{food.nutrition.calories}kcal / 100g</div>
                        <div>P:{food.nutrition.protein}g</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 2. 分量選択モード: 食品が選択された場合に表示 */}
      {selectedFood && (
        <Card className="border-primary bg-light">
          <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
            <span className="fw-bold"><i className="bi bi-check2-circle me-2"></i>選択中: {selectedFood.name}</span>
            <Button variant="outline-light" size="sm" onClick={handleCancel}>
              選び直す
            </Button>
          </Card.Header>
          <Card.Body>
            <Row className="align-items-end">
              <Col md={6} className="mb-3 mb-md-0">
                <Form.Label className="fw-bold text-dark">摂取量 (g)</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="1"
                    size="lg"
                  />
                  <InputGroup.Text>g</InputGroup.Text>
                </InputGroup>
              </Col>
              
              <Col md={6}>
                {/* 簡易プレビュー表示 (100gあたりの値から概算) */}
                <div className="p-2 bg-white rounded border mb-3 text-muted small">
                  <div className="d-flex justify-content-between mb-1">
                    <span>概算カロリー:</span>
                    <strong>{Math.round((selectedFood.nutrition.calories * amount) / 100)} kcal</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>タンパク質:</span>
                    <span>{((selectedFood.nutrition.protein * amount) / 100).toFixed(1)} g</span>
                  </div>
                </div>

                <Button 
                  variant="success" 
                  className="w-100" 
                  onClick={handleConfirmAdd}
                  disabled={amount <= 0 || calculating}
                >
                  {calculating ? (
                    <><Spinner animation="border" size="sm" className="me-2" />計算中...</>
                  ) : (
                    <><i className="bi bi-plus-circle me-2"></i>この分量で追加</>
                  )}
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default FoodSearchInput;