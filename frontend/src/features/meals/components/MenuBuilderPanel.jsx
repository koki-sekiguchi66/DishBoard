// kilogram-app/src/features/meals/components/MenuBuilderPanel.jsx
import { Card, Form, ButtonGroup, Button } from 'react-bootstrap';
import FoodSearchInput from './FoodSearchInput';
import ManualInputForm from './ManualInputForm';
import MyMenusSelector from './MyMenuSelector';
import MyItemsSelector from './MyItemsSelector';
import CafeteriaSelector from './CafeteriaSelector';
import { OCRButton } from '@/features/ocr';

const MenuBuilderPanel = ({ menuBuilder }) => {
  const {
    recordDate,
    setRecordDate,
    mealTiming,
    setMealTiming,
    activeInputMethod,
    setActiveInputMethod,
    addMenuItem
  } = menuBuilder;

  const handleFoodSelected = (item) => {
    // 1. 分量の決定 (優先順位: amount_grams > amount > 100)
    const amount = parseFloat(item.amount_grams || item.amount || 100);
    
    // 2. 栄養素の正規化処理
    const resolveNutrient = (stdKey, customKey) => {
        // A. 既に計算済みの値がある場合
        if (item[stdKey] !== undefined && item[stdKey] !== null) {
            return parseFloat(item[stdKey]);
        }
        
        // B. 100gあたりの値がある場合 -> 分量に合わせて計算
        const per100Val = item[customKey] || item[`${stdKey}_per_100g`];
        if (per100Val !== undefined && per100Val !== null) {
            return (parseFloat(per100Val) * amount) / 100;
        }
        
        return 0;
    };

    const newItem = {
      // アイテム種別の判定
      item_type: item.item_type || (item.menu_id ? 'cafeteria' : (item.calories_per_100g ? 'custom' : 'standard')),
      item_id: item.id || item.menu_id || 0,
      item_name: item.name || item.item_name || item.meal_name,
      amount_grams: amount,
      
      // 栄養素マッピング
      calories: resolveNutrient('calories', 'calories_per_100g'),
      protein: resolveNutrient('protein', 'protein_per_100g'),
      fat: resolveNutrient('fat', 'fat_per_100g'),
      carbohydrates: resolveNutrient('carbohydrates', 'carbs_per_100g'),
      dietary_fiber: resolveNutrient('dietary_fiber', 'fiber_per_100g'),
      sodium: resolveNutrient('sodium', 'sodium_per_100g'),
      calcium: resolveNutrient('calcium', 'calcium_per_100g'),
      iron: resolveNutrient('iron', 'iron_per_100g'),
      vitamin_a: resolveNutrient('vitamin_a', 'vitamin_a_per_100g'),
      vitamin_b1: resolveNutrient('vitamin_b1', 'vitamin_b1_per_100g'),
      vitamin_b2: resolveNutrient('vitamin_b2', 'vitamin_b2_per_100g'),
      vitamin_c: resolveNutrient('vitamin_c', 'vitamin_c_per_100g'),
    };

    addMenuItem(newItem);
  };
  
  return (
    <Card className="shadow-sm h-100">
      <Card.Header className="bg-primary text-white">
        <i className="bi bi-plus-circle me-2"></i>
        <strong>メニューを作成</strong>
      </Card.Header>
      
      <Card.Body>
        <div className="d-flex gap-3 mb-4">
          <Form.Group className="flex-fill">
            <Form.Label>記録日</Form.Label>
            <Form.Control
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="flex-fill">
            <Form.Label>食事タイミング</Form.Label>
            <Form.Select
              value={mealTiming}
              onChange={(e) => setMealTiming(e.target.value)}
            >
              <option value="breakfast">朝食</option>
              <option value="lunch">昼食</option>
              <option value="dinner">夕食</option>
              <option value="snack">間食</option>
            </Form.Select>
          </Form.Group>
        </div>
        
        <Form.Group className="mb-3">
          <Form.Label>追加方法</Form.Label>
          <ButtonGroup className="d-flex flex-wrap w-100">
            <Button
              variant={activeInputMethod === 'search' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveInputMethod('search')}
            >
              <i className="bi bi-search me-1"></i> 検索
            </Button>
            <Button
              variant={activeInputMethod === 'myItems' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveInputMethod('myItems')}
            >
              <i className="bi bi-egg-fried me-1"></i> Myアイテム
            </Button>
            <Button
              variant={activeInputMethod === 'myMenus' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveInputMethod('myMenus')}
            >
              <i className="bi bi-bookmark-star me-1"></i> Myメニュー
            </Button>
            <Button
              variant={activeInputMethod === 'cafeteria' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveInputMethod('cafeteria')}
            >
              <i className="bi bi-shop me-1"></i> 食堂
            </Button>
            <Button
              variant={activeInputMethod === 'manual' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveInputMethod('manual')}
            >
              <i className="bi bi-pencil me-1"></i> 手動
            </Button>
          </ButtonGroup>
        </Form.Group>
        
        <hr />
        
        <div className="p-1">
          {activeInputMethod === 'search' && (
            <FoodSearchInput onFoodSelected={handleFoodSelected} />
          )}
          
          {activeInputMethod === 'myItems' && (
            <MyItemsSelector onItemSelected={handleFoodSelected} />
          )}
          
          {activeInputMethod === 'myMenus' && (
            <MyMenusSelector menuBuilder={menuBuilder} />
          )}

          {activeInputMethod === 'cafeteria' && (
            <CafeteriaSelector onMenuSelected={handleFoodSelected} />
          )}

          {activeInputMethod === 'manual' && (
            <>
              <ManualInputForm onAdd={handleFoodSelected} />
              
              {/* OCR機能 */}
              <div className="mt-3">
                <div className="text-center mb-2">
                  <small className="text-muted">または</small>
                </div>
                <OCRButton onNutritionDetected={handleFoodSelected} />
              </div>
            </>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default MenuBuilderPanel;