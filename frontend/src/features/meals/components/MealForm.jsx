import { Row, Col, Alert } from 'react-bootstrap';
import { useMenuBuilder } from '../hooks/useMenuBuilder';
import MenuBuilderPanel from './MenuBuilderPanel';
import MenuPreviewPanel from './MenuPreviewPanel';
import { Toaster } from 'react-hot-toast';

const MealForm = ({ onMealCreated }) => {
  const menuBuilder = useMenuBuilder(onMealCreated);

  return (
    <>
      <Toaster position="top-right" />
      <Row>
        {/* 左側：メニュービルダー */}
        <Col lg={7} md={12} className="mb-4">
          <MenuBuilderPanel menuBuilder={menuBuilder} />
        </Col>

        {/* 右側：プレビュー  */}
        <Col lg={5} md={12}>
          <div className="sticky-top" style={{ top: '20px', zIndex: 100 }}>
            <MenuPreviewPanel menuBuilder={menuBuilder} />
          </div>
        </Col>
      </Row>
    </>
  );
};

export default MealForm;