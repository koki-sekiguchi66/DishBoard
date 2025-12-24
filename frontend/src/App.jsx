import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Login, Register } from '@/features/auth';
// インポートパスを変更（featuresから読み込む）
import { Dashboard } from '@/features/dashboard';

function App() {
  const [token, setToken] = useState(null);
  const [currentView, setCurrentView] = useState('login');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const handleLoginSuccess = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleRegisterSuccess = (tokenOrNull) => {
    if (tokenOrNull) {
      localStorage.setItem('token', tokenOrNull);
      setToken(tokenOrNull);
    } else {
      setCurrentView('login');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentView('login');
  };

  const switchToRegister = () => {
    setCurrentView('register');
  };

  const switchToLogin = () => {
    setCurrentView('login');
  };

  if (token) {
    return <Dashboard handleLogout={handleLogout} />;
  }

  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={5}>
            <div className="text-center mb-4">
              <h1 className="display-4 fw-bold text-primary mb-2">
                <i className="bi bi-heart-pulse-fill me-2"></i>
                KiloGram
              </h1>
            </div>

            <Card className="shadow">
              <Card.Body className="p-4">
                {currentView === 'login' ? (
                  <>
                    <Login onLoginSuccess={handleLoginSuccess} />
                    
                    <hr className="my-4" />
                    
                    <div className="text-center">
                      <p className="text-muted mb-3">
                        まだアカウントをお持ちでないですか？
                      </p>
                      <Button 
                        variant="outline-success"
                        onClick={switchToRegister}
                      >
                        <i className="bi bi-person-plus me-2"></i>
                        新規登録
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Register onRegisterSuccess={handleRegisterSuccess} />
                    
                    <hr className="my-4" />
                    
                    <div className="text-center">
                      <p className="text-muted mb-3">
                        すでにアカウントをお持ちですか？
                      </p>
                      <Button 
                        variant="outline-primary"
                        onClick={switchToLogin}
                      >
                        <i className="bi bi-box-arrow-in-right me-2"></i>
                        ログイン
                      </Button>
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default App;