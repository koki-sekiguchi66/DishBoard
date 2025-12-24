import React, { useState, useEffect } from 'react';
import { ListGroup, Spinner, Alert, Badge, Button, ButtonGroup } from 'react-bootstrap';
import { toast } from 'react-hot-toast';
import { mealApi } from '../api/mealApi';
import { customFoodApi } from '@/features/customFoods/api/customFoodApi';
import CustomFoodFormModal from '@/features/customFoods/components/CustomFoodFormModal';
import { EditCustomFoodModal } from '@/features/customFoods'; 

const MyItemsSelector = ({ onItemSelected }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // データ取得
  const fetchCustomFoods = async () => {
    setLoading(true);
    try {
      const data = await mealApi.getCustomFoods();
      setItems(data);
    } catch (err) {
      console.error(err);
      setError('Myアイテムの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomFoods();
  }, []);

  // 削除処理
  const handleDelete = async (e, item) => {
    e.stopPropagation(); 
    if (!window.confirm(`「${item.name}」を削除してもよろしいですか？`)) return;

    try {
      await customFoodApi.deleteCustomFood(item.id);
      toast.success('削除しました');
      fetchCustomFoods(); 
    } catch (err) {
      console.error(err);
      toast.error('削除に失敗しました');
    }
  };

  // 編集モーダル
  const handleEdit = (e, item) => {
    e.stopPropagation();
    setSelectedItem(item);
    setShowEditModal(true);
  };

  // 作成・編集後のリロード
  const handleSuccess = () => {
    fetchCustomFoods();
  };

  if (loading) return <div className="text-center p-3"><Spinner animation="border" size="sm" /> 読み込み中...</div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="m-0"><i className="bi bi-egg-fried me-2"></i>Myアイテム一覧</h6>
        <Button 
          variant="outline-primary" 
          size="sm" 
          onClick={() => setShowCreateModal(true)}
        >
          <i className="bi bi-plus-lg me-1"></i>新規作成
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center text-muted p-3 bg-light rounded">
          登録されたMyアイテムはありません。<br />
          「新規作成」から追加してください。
        </div>
      ) : (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <ListGroup variant="flush">
            {items.map((item) => (
              <ListGroup.Item 
                key={item.id} 
                action 
                className="d-flex justify-content-between align-items-center px-2 py-2"
                onClick={() => onItemSelected({
                  ...item,
                  item_type: 'custom',
                  amount: 100
                })}
              >
                <div className="flex-grow-1">
                  <div className="fw-bold text-primary">{item.name}</div>
                  <small className="text-muted">
                    {item.calories_per_100g}kcal <span className="mx-1">|</span> 
                    P:{item.protein_per_100g}g
                  </small>
                </div>
                
                <div className="d-flex align-items-center gap-2">
                  <Badge bg="primary" pill className="me-2">メニューに追加</Badge>
                  
                  <ButtonGroup size="sm">
                    <Button 
                      variant="light" 
                      className="text-secondary border-0"
                      title="編集"
                      onClick={(e) => handleEdit(e, item)}
                    >
                      <i className="bi bi-pencil"></i>
                    </Button>
                    <Button 
                      variant="light" 
                      className="text-danger border-0"
                      title="削除"
                      onClick={(e) => handleDelete(e, item)}
                    >
                      <i className="bi bi-trash"></i>
                    </Button>
                  </ButtonGroup>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </div>
      )}

      {/* 新規作成モーダル */}
      {showCreateModal && (
        <CustomFoodFormModal 
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onFoodCreated={handleSuccess}
        />
      )}

      {/* 編集モーダル */}
      {showEditModal && selectedItem && (
        <EditCustomFoodModal
          show={showEditModal}
          food={selectedItem}
          onClose={() => setShowEditModal(false)}
          onFoodUpdated={handleSuccess}
        />
      )}
    </>
  );
};

export default MyItemsSelector;