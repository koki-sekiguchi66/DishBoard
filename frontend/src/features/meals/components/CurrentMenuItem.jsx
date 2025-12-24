import React, { useState } from 'react';
import { ListGroup, Button, Form, Badge } from 'react-bootstrap';

/**
 * 現在のメニューアイテム
 * 
 * 役割:
 * - 1つのアイテムを表示
 * - 分量の編集機能
 * - 削除ボタン
 * 
 * 設計原則:
 * - インライン編集（クリックで編集モード）
 * - ドラッグ&ドロップ対応（将来的に）
 */
const CurrentMenuItem = ({ item, index, onAmountChange, onRemove }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState(item.amount_grams);
  
  // 編集完了
  const handleSaveAmount = () => {
    if (amount > 0) {
      onAmountChange(amount);
      setIsEditing(false);
    }
  };
  
  // Enterキーで保存
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSaveAmount();
    }
  };
  
  return (
    <ListGroup.Item className="d-flex justify-content-between align-items-start">
      <div className="flex-grow-1">
        {/* アイテム名 */}
        <div className="fw-bold mb-1">
          {index + 1}. {item.item_name}
        </div>
        
        {/* 分量表示 / 編集 */}
        <div className="d-flex align-items-center gap-2 mb-1">
          {isEditing ? (
            <>
              <Form.Control
                type="number"
                size="sm"
                style={{ width: '80px' }}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                onKeyPress={handleKeyPress}
                autoFocus
              />
              <span className="text-muted">g</span>
              <Button
                size="sm"
                variant="success"
                onClick={handleSaveAmount}
              >
                <i className="bi bi-check"></i>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setAmount(item.amount_grams);
                  setIsEditing(false);
                }}
              >
                <i className="bi bi-x"></i>
              </Button>
            </>
          ) : (
            <>
              <span className="text-muted">分量:</span>
              <strong>{item.amount_grams}g</strong>
              <Button
                size="sm"
                variant="link"
                onClick={() => setIsEditing(true)}
                className="p-0"
              >
                <i className="bi bi-pencil"></i>
              </Button>
            </>
          )}
        </div>
        
        {/* 栄養情報（簡易版） */}
        <div className="d-flex flex-wrap gap-2">
          <Badge bg="info">
            {item.calories.toFixed(0)} kcal
          </Badge>
          <Badge bg="secondary">
            P: {item.protein.toFixed(1)}g
          </Badge>
          <Badge bg="secondary">
            F: {item.fat.toFixed(1)}g
          </Badge>
          <Badge bg="secondary">
            C: {item.carbohydrates.toFixed(1)}g
          </Badge>
        </div>
      </div>
      
      {/* 削除ボタン */}
      <Button
        variant="outline-danger"
        size="sm"
        onClick={onRemove}
        className="ms-2"
      >
        <i className="bi bi-trash"></i>
      </Button>
    </ListGroup.Item>
  );
};

export default CurrentMenuItem;