import { useState, useEffect } from 'react';
import { Modal, Button, Badge, Form } from 'react-bootstrap';
import { customFoodApi } from '../api/customFoodApi';
import CustomFoodFormModal from './CustomFoodFormModal';
import EditCustomFoodModal from './EditCustomFoodModal';

const CustomFoodModal = ({ show, onClose, onFoodSelected }) => {
  const [customFoods, setCustomFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [amount, setAmount] = useState(100);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFood, setEditingFood] = useState(null);

  useEffect(() => {
    if (show) {
      fetchCustomFoods();
    }
  }, [show]);

  const fetchCustomFoods = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await customFoodApi.getCustomFoods();
      setCustomFoods(data || []);
    } catch (error) {
      setError('Myアイテムの読み込みに失敗しました: ' + (error.message || ''));
      setCustomFoods([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFoodSelect = (food) => {
    setSelectedFood(food);
  };

  const handleAddToMeal = () => {
    if (selectedFood) {
      onFoodSelected(selectedFood, amount);
      onClose();
    }
  };

  const handleCreateFood = async () => {
    await fetchCustomFoods();
    setShowCreateModal(false);
  };

  const handleEditClick = (food) => {
    setEditingFood(food);
    setShowEditModal(true);
  };

  const handleUpdateFood = async () => {
    await fetchCustomFoods();
    setShowEditModal(false);
    setEditingFood(null);
  };

  const handleDeleteFood = async (food) => {
    try {
      await customFoodApi.deleteCustomFood(food.id);
      await fetchCustomFoods();
    } catch (error) {
      console.error('削除エラー:', error);
      setError('削除に失敗しました');
    }
  };

  return (
    <>
      <Modal show={show} onHide={onClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-bookmark-heart me-2"></i>
            Myアイテムから追加
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <div className="alert alert-danger">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}

          <div className="d-flex mb-3">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
            >
              <i className="bi bi-plus-circle me-1"></i>
              新規作成
            </Button>
          </div>

          {loading ? (
            <div className="text-center p-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : customFoods.length === 0 ? (
            <div className="text-center p-4">
              <i className="bi bi-bookmark text-muted" style={{ fontSize: '2rem' }}></i>
              <p className="mt-2 text-muted">Myアイテムがまだありません</p>
            </div>
          ) : (
            <div className="list-group">
              {customFoods.map((food) => (
                <div
                  key={food.id}
                  className={`list-group-item ${
                    selectedFood?.id === food.id ? 'active' : ''
                  }`}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div 
                      className="flex-grow-1"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleFoodSelect(food)}
                    >
                      <h6 className="mb-1">{food.name}</h6>
                      <div>
                        <Badge bg="light" text="dark" className="me-1">
                          {food.calories_per_100g}kcal/100g
                        </Badge>
                        <small className="text-muted">
                          P:{food.protein_per_100g}g F:{food.fat_per_100g}g C:{food.carbs_per_100g}g
                        </small>
                      </div>
                    </div>
                    <div className="d-flex gap-1 align-items-start ms-2">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(food);
                        }}
                        title="編集"
                      >
                        <i className="bi bi-pencil"></i>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('このアイテムを削除してもよろしいですか？')) {
                            handleDeleteFood(food);
                          }
                        }}
                        title="削除"
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedFood && (
            <div className="mt-3">
              <Form.Group>
                <Form.Label>分量</Form.Label>
                <Form.Control
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  min="1"
                  max="1000"
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={handleAddToMeal}
            disabled={!selectedFood}
          >
            追加
          </Button>
        </Modal.Footer>
      </Modal>

      {showCreateModal && (
        <CustomFoodFormModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onFoodCreated={handleCreateFood}
        />
      )}

      {showEditModal && editingFood && (
        <EditCustomFoodModal
          show={showEditModal}
          food={editingFood}
          onClose={() => {
            setShowEditModal(false);
            setEditingFood(null);
          }}
          onFoodUpdated={handleUpdateFood}
        />
      )}
    </>
  );
};

export default CustomFoodModal;