/**
 * Login — ログインフォーム
 *
 * Fix #9: トークン永続化の責務を App.jsx に一元化
 *
 * 修正前:
 *   handleSubmit 内で localStorage.setItem('token', ...) を実行した後、
 *   onLoginSuccess(token) を呼んでいた。しかし App.jsx の handleLoginSuccess も
 *   同じ localStorage.setItem を実行しており、責務が重複していた。
 *
 * 修正後:
 *   Login は「認証APIの呼び出し → 成功時にトークンを親に通知」のみ担当。
 *   localStorage への保存は App.jsx が一括管理する。
 *   これにより、将来的にトークン保存先を変更する場合も App.jsx だけ修正すれば済む。
 */
import { useState } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { apiClient } from '@/lib/axios';

const Login = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/login/', formData);

      if (response.data.token) {
        // トークンの永続化は App.jsx（handleLoginSuccess）に委譲
        setMessage('ログインに成功しました！');
        onLoginSuccess(response.data.token);
      }
    } catch (error) {
      console.error('Login error:', error.response?.data);
      setMessage('ログインに失敗しました。ユーザー名またはパスワードを確認してください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h3 className="text-center mb-4">
        <i className="bi bi-box-arrow-in-right text-primary me-2"></i>
        ログイン
      </h3>
      
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>
            <i className="bi bi-person me-1"></i>
            ユーザー名
          </Form.Label>
          <Form.Control
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            placeholder="ユーザー名を入力"
          />
        </Form.Group>

        <Form.Group className="mb-4">
          <Form.Label>
            <i className="bi bi-lock me-1"></i>
            パスワード
          </Form.Label>
          <Form.Control
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="パスワードを入力"
          />
        </Form.Group>

        <div className="d-grid">
          <Button 
            type="submit" 
            variant="primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  className="me-2"
                />
                ログイン中...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2"></i>
                ログイン
              </>
            )}
          </Button>
        </div>
      </Form>

      {message && (
        <Alert 
          variant={message.includes('成功') ? 'success' : 'danger'} 
          className="mt-3"
        >
          <i className={`bi ${message.includes('成功') ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}></i>
          {message}
        </Alert>
      )}
    </>
  );
};

export default Login;
