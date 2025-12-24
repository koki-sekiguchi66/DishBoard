import { useMemo } from 'react';
import { Card } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CalorieChart = ({ meals }) => {
  // 日付別にカロリーを集計
  const chartData = useMemo(() => {
    if (!meals || meals.length === 0) return [];
    
    // 日付別にグループ化してカロリーを合計
    const dailyCalories = meals.reduce((acc, meal) => {
      const date = meal.record_date;
      if (!acc[date]) {
        acc[date] = {
          date,
          totalCalories: 0,
          meals: []
        };
      }
      acc[date].totalCalories += parseFloat(meal.calories || 0);
      acc[date].meals.push(meal);
      return acc;
    }, {});

    // 配列に変換し、日付順にソート
    return Object.values(dailyCalories)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(day => ({
        ...day,
        formattedDate: new Date(day.date).toLocaleDateString('ja-JP', { 
          month: 'short', 
          day: 'numeric' 
        })
      }));
  }, [meals]);

  // グラフポップアップ用ツールチップ
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const date = new Date(data.date).toLocaleDateString('ja-JP', {
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
          <p style={{ margin: 0, color: '#dc3545' }}>
            <i className="bi bi-fire me-1"></i>
            総カロリー: {Math.round(data.totalCalories)} kcal
          </p>
        </div>
      );
    }
    return null;
  };

  if (!meals || meals.length === 0) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-danger text-white">
          <Card.Title className="mb-0">
            <i className="bi bi-fire me-2"></i>
            カロリー推移グラフ
          </Card.Title>
        </Card.Header>
        <Card.Body>
          <div className="text-center py-5">
            <i className="bi bi-fire text-muted display-4"></i>
            <p className="text-muted mt-3">食事記録がまだありません。</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-danger text-white">
        <Card.Title className="mb-0">
          <i className="bi bi-graph-up me-2"></i>
          カロリー推移グラフ
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
                tick={{ fontSize: 12 }}
                stroke="#666"
                label={{ 
                  value: 'カロリー (kcal)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="totalCalories" 
                stroke="#dc3545"
                strokeWidth={3}
                dot={{ 
                  fill: '#dc3545', 
                  strokeWidth: 2, 
                  r: 4 
                }}
                activeDot={{ 
                  r: 6, 
                  stroke: '#dc3545',
                  strokeWidth: 2,
                  fill: '#ffffff'
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 直近の記録 */}
        <div className="mt-4">
          <h6 className="text-muted mb-3">
            <i className="bi bi-list-ul me-2"></i>
            最近の記録
          </h6>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            <div className="row g-2">
              {chartData
                .slice(-10) // 最新10件のみ表示
                .reverse()
                .map((day) => (
                  <div key={day.date} className="col-md-6">
                    <div className="p-2 bg-light rounded small">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted">
                          <i className="bi bi-calendar3 me-1"></i>
                          {new Date(day.date).toLocaleDateString('ja-JP', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <span className="fw-bold text-danger">
                          {Math.round(day.totalCalories)} kcal
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            {chartData.length > 10 && (
              <div className="text-center mt-2">
                <small className="text-muted">
                  他 {chartData.length - 10} 件の記録があります
                </small>
              </div>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default CalorieChart;