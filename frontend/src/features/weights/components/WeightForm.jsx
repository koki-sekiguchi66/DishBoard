import { useState } from 'react';
import { Form, Button, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { weightApi } from '../api/weightApi';

const WeightForm = ({ onWeightCreated }) => {
  const [formData, setFormData] = useState({
    record_date: new Date().toISOString().split('T')[0],
    weight: ''
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    if (!formData.weight || formData.weight <= 0) {
      setMessage('有効な体重を入力してください。');
      setIsLoading(false);
      return;
    }

    if (formData.weight > 1000) {
      setMessage('体重は1000kg以下で入力してください。');
      setIsLoading(false);
      return;
    }

    try {
      const response = await weightApi.createWeight(formData);
      setMessage('体重を記録しました！');
      onWeightCreated(response); 
      
      const currentDate = formData.record_date;
      setFormData({
        record_date: currentDate,
        weight: ''
      });
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to create weight record', error);
      if (error.response?.status === 400) {
        setMessage('入力内容を確認してください。');
      } else {
        setMessage('記録に失敗しました。もう一度お試しください。');
      }
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Form onSubmit={handleSubmit}>
      {/* 日付選択 */}
      <Form.Group className="mb-3">
        <Form.Label className="fw-bold">
          <i className="bi bi-calendar3 me-2"></i>
          記録日
        </Form.Label>
        <Form.Control
          type="date"
          name="record_date"
          value={formData.record_date}
          onChange={handleChange}
        />
      </Form.Group>

      {/* 体重入力 */}
      <Form.Group className="mb-3">
        <Form.Label className="fw-bold">
          <i className="bi bi-speedometer me-2"></i>
          体重 (kg)
        </Form.Label>
        <InputGroup>
          <Form.Control
            type="number"
            step="0.1"
            min="1"
            max="1000"
            name="weight"
            value={formData.weight}
            onChange={handleChange}
            required
            placeholder="例: 65.5"
          />
          <InputGroup.Text>kg</InputGroup.Text>
        </InputGroup>
      </Form.Group>

      {/* 送信ボタン */}
      <div className="d-grid">
        <Button 
          type="submit"
          variant="info"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                className="me-2"
              />
              記録中...
            </>
          ) : (
            <>
              <i className="bi bi-check-circle me-2"></i>
              記録する
            </>
          )}
        </Button>
      </div>

      {/* メッセージ */}
      {message && (
        <Alert 
          variant={message.includes('失敗') || message.includes('確認') ? 'danger' : 'success'} 
          className="mt-3"
        >
          <i className={`bi ${message.includes('失敗') || message.includes('確認') ? 'bi-exclamation-triangle' : 'bi-check-circle'} me-2`}></i>
          {message}
        </Alert>
      )}
    </Form>
  );
};

export default WeightForm;