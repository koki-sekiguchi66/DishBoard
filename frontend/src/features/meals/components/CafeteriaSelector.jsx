import React, { useState, useEffect } from 'react';
import { Card, Badge, Spinner, Alert, Nav, Button } from 'react-bootstrap';
import { mealApi } from '../api/mealApi';

const CafeteriaSelector = ({ onMenuSelected }) => {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { key: 'all', label: '全て' },
    { key: 'main', label: '主菜' },
    { key: 'side', label: '副菜' },
    { key: 'noodle', label: '麺類' },
    { key: 'rice', label: '丼・カレー' },
    { key: 'dessert', label: 'デザート' },
  ];

  useEffect(() => {
    const fetchMenus = async () => {
      setLoading(true);
      try {
        const data = await mealApi.getCafeteriaMenus();
        setMenus(data);
      } catch (err) {
        setError('メニューの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
    fetchMenus();
  }, []);

  const filteredMenus = activeCategory === 'all'
    ? menus
    : menus.filter(m => m.category === activeCategory);

  const handleSelect = (menu) => {
    onMenuSelected({
      item_type: 'cafeteria',
      item_id: menu.id || menu.menu_id,
      item_name: menu.name,
      amount: 100,
      ...menu // 栄養素データを含む
    });
  };

  if (loading) return <div className="text-center p-4"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div>
      <h6 className="mb-3"><i className="bi bi-shop me-2"></i>食堂メニュー</h6>
      
      {/* カテゴリタブ */}
      <Nav 
        variant="pills" 
        activeKey={activeCategory} 
        onSelect={setActiveCategory}
        className="mb-3 flex-nowrap" 
        style={{ overflowX: 'auto', paddingBottom: '5px' }}
      >
        {categories.map(cat => (
          <Nav.Item key={cat.key}>
            <Nav.Link eventKey={cat.key} className="py-1 px-3 small">
              {cat.label}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      {/* メニューリスト */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {filteredMenus.length === 0 ? (
          <div className="text-center p-4 text-muted bg-light rounded">
            該当するメニューはありません。
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {filteredMenus.map(menu => (
              <Card 
                key={menu.id} 
                className="border-0 shadow-sm"
                style={{ cursor: 'pointer', transition: '0.2s' }}
                onClick={() => handleSelect(menu)}
              >
                <Card.Body className="p-3 d-flex justify-content-between align-items-center">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-1">
                      <div className="fw-bold me-2">{menu.name}</div>
                      <Badge bg="secondary" style={{fontSize: '0.7em'}}>
                        {menu.category_display}
                      </Badge>
                    </div>
                    
                    <div className="text-muted small">
                      <span className="fw-bold text-dark me-3">
                        {menu.calories}kcal
                      </span>
                      <div className="d-block d-sm-inline text-secondary" style={{ fontSize: '0.85em' }}>
                        たんぱく質:{menu.protein}g <span className="mx-1">/</span> 
                        脂質:{menu.fat}g <span className="mx-1">/</span> 
                        炭水化物:{menu.carbohydrates}g
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    className="rounded-circle p-0 ms-2 flex-shrink-0" 
                    style={{width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                  >
                    <i className="bi bi-plus-lg"></i>
                  </Button>
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CafeteriaSelector;