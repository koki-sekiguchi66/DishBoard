import { ListGroup, Button, Badge } from 'react-bootstrap';

const CurrentMenuDisplay = ({ menuBuilder }) => {
  const { menuItems, removeMenuItem } = menuBuilder;

  return (
    <ListGroup variant="flush">
      {menuItems.map((item) => (
        <ListGroup.Item key={item.tempId} className="px-3 py-2">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <div className="fw-bold text-dark">{item.item_name}</div>
              <div className="text-muted small">
                {item.amount_grams}g
                <span className="mx-2">|</span>
                {Math.round(item.calories)}kcal
              </div>
              <div className="text-muted x-small" style={{ fontSize: '0.75rem' }}>
                P:{item.protein}g F:{item.fat}g C:{item.carbohydrates}g
              </div>
            </div>
            <Button
              variant="link"
              className="text-danger p-0 ms-2"
              onClick={() => removeMenuItem(item.tempId)}
            >
              <i className="bi bi-x-circle-fill" style={{ fontSize: '1.2rem' }}></i>
            </Button>
          </div>
        </ListGroup.Item>
      ))}
    </ListGroup>
  );
};

export default CurrentMenuDisplay;