import { Card, Form, Button, Collapse, Badge } from 'react-bootstrap';
import NutritionSummary from './NutritionSummary';
import CurrentMenuDisplay from './CurrentMenuDisplay';

const MenuPreviewPanel = ({ menuBuilder }) => {
  const {
    menuItems,
    totalNutrition,
    saveAsMenu,
    setSaveAsMenu,
    menuName,
    setMenuName,
    menuDescription,
    setMenuDescription,
    handleSubmit,
    handleClearMenu,
    isSubmitting,
  } = menuBuilder;
  
  return (
    <>
      {/* 現在のメニューリスト */}
      <Card className="mb-3 shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center bg-light">
          <span className="fw-bold">
            <i className="bi bi-list-ul me-2"></i>
            現在のメニュー
            <Badge bg="primary" className="ms-2">{menuItems.length}</Badge>
          </span>
          {menuItems.length > 0 && (
            <Button
              size="sm"
              variant="outline-danger"
              onClick={handleClearMenu}
            >
              <i className="bi bi-trash"></i>
            </Button>
          )}
        </Card.Header>
        
        <Card.Body className="p-0" style={{ maxHeight: '350px', overflowY: 'auto' }}>
          {menuItems.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-basket3 display-4 mb-2 d-block"></i>
              <p>左のパネルから<br/>アイテムを追加してください</p>
            </div>
          ) : (
            <CurrentMenuDisplay menuBuilder={menuBuilder} />
          )}
        </Card.Body>
      </Card>
      
      {/* 合計栄養素 */}
      <Card className="mb-3 shadow-sm">
        <Card.Header className="bg-success text-white py-1">
          <small><i className="bi bi-bar-chart me-2"></i>合計栄養素</small>
        </Card.Header>
        <Card.Body className="py-2">
          <NutritionSummary nutrition={totalNutrition} simple={true} />
        </Card.Body>
      </Card>
      
      {/* 保存オプション */}
      <Card className="shadow-sm border-primary">
        <Card.Body>
          <Form.Check
            type="checkbox"
            id="saveAsMenu"
            label="Myメニューとして保存する"
            checked={saveAsMenu}
            onChange={(e) => setSaveAsMenu(e.target.checked)}
            className="mb-3 fw-bold text-primary"
          />
          
          <Collapse in={saveAsMenu}>
            <div className="mb-3 p-2 bg-light rounded border">
              <Form.Group className="mb-2">
                <Form.Label className="small">メニュー名 <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  size="sm"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  placeholder="例: 定番朝食セット"
                />
              </Form.Group>
              <Form.Group>
                <Form.Label className="small">説明</Form.Label>
                <Form.Control
                  size="sm"
                  as="textarea"
                  rows={2}
                  value={menuDescription}
                  onChange={(e) => setMenuDescription(e.target.value)}
                  placeholder="メモ..."
                />
              </Form.Group>
            </div>
          </Collapse>
          
          <Button
            variant="primary"
            className="w-100 py-2 fw-bold"
            onClick={handleSubmit}
            disabled={menuItems.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <span><span className="spinner-border spinner-border-sm me-2"></span>保存中...</span>
            ) : (
              <span><i className="bi bi-check-lg me-2"></i>食事記録として登録</span>
            )}
          </Button>
        </Card.Body>
      </Card>
    </>
  );
};

export default MenuPreviewPanel;