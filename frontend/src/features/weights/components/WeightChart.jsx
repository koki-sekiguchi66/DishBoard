import { useMemo } from 'react';
import { Card,} from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const WeightChart = ({ weights }) => {
  // データを日付順にソートし、グラフ用にフォーマット
  const chartData = useMemo(() => {
    if (!weights || weights.length === 0) return [];
    
    return weights
      .sort((a, b) => new Date(a.record_date) - new Date(b.record_date))
      .map(weight => ({
        date: weight.record_date,
        weight: parseFloat(weight.weight),
        formattedDate: new Date(weight.record_date).toLocaleDateString('ja-JP', { 
          month: 'short', 
          day: 'numeric' 
        })
      }));
  }, [weights]);



  // グラフのポップアップ用のツールチップ
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const dateObj = payload[0].payload;
      const date = new Date(dateObj.date).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #ccc',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#333' }}>
            {date}
          </p>
          <p style={{ margin: 0, color: '#007bff' }}>
            <i className="bi bi-speedometer me-1"></i>
            体重: {data.value} kg
          </p>
        </div>
      );
    }
    return null;
  };

  if (!weights || weights.length === 0) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-info text-white">
          <Card.Title className="mb-0">
            <i className="bi bi-graph-up me-2"></i>
            体重推移グラフ
          </Card.Title>
        </Card.Header>
        <Card.Body>
          <div className="text-center py-5">
            <i className="bi bi-graph-up text-muted display-4"></i>
            <p className="text-muted mt-3">体重記録がまだありません。</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-info text-white d-flex justify-content-between align-items-center">
        <Card.Title className="mb-0">
          <i className="bi bi-graph-up me-2"></i>
          体重推移グラフ
        </Card.Title>
      </Card.Header>
      <Card.Body>
        {/* グラフ */}
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="formattedDate"
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <YAxis 
                domain={['dataMin - 1', 'dataMax + 1']}
                tick={{ fontSize: 12 }}
                stroke="#666"
                label={{ 
                  value: '体重 (kg)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="#007bff"
                strokeWidth={3}
                dot={{ 
                  fill: '#007bff', 
                  strokeWidth: 2, 
                  r: 4 
                }}
                activeDot={{ 
                  r: 6, 
                  stroke: '#007bff',
                  strokeWidth: 2,
                  fill: '#ffffff'
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 記録一覧（コンパクト表示） */}
        <div className="mt-4">
          <h6 className="text-muted mb-3">
            <i className="bi bi-list-ul me-2"></i>
            最近の記録
          </h6>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            <div className="row g-2">
              {weights
                .slice(0, 10) // 最新10件
                .map((weight) => (
                  <div key={weight.id} className="col-md-6">
                    <div className="p-2 bg-light rounded small">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted">
                          <i className="bi bi-calendar3 me-1"></i>
                          {new Date(weight.record_date).toLocaleDateString('ja-JP', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <span className="fw-bold text-primary">
                          {weight.weight} kg
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            {weights.length > 10 && (
              <div className="text-center mt-2">
                <small className="text-muted">
                  他 {weights.length - 10} 件の記録があります
                </small>
              </div>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default WeightChart;