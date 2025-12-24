import { Table } from 'react-bootstrap';

const NutritionSummary = ({ nutrition }) => {
  
  const nutritionItems = [
    {
      label: 'エネルギー',
      value: nutrition.calories,
      unit: 'kcal',
      decimals: 0,
    },
    {
      label: 'タンパク質',
      value: nutrition.protein,
      unit: 'g',
      decimals: 1,
    },
    {
      label: '脂質',
      value: nutrition.fat,
      unit: 'g',
      decimals: 1,
    },
    {
      label: '炭水化物',
      value: nutrition.carbohydrates,
      unit: 'g',
      decimals: 1,
    },
    {
      label: '食物繊維',
      value: nutrition.dietary_fiber,
      unit: 'g',
      decimals: 1,
    },
    {
      label: '食塩相当量',
      value: nutrition.sodium,
      unit: 'g',
      decimals: 2,
    },
    {
      label: 'カルシウム',
      value: nutrition.calcium,
      unit: 'mg',
      decimals: 0,
    },
    {
      label: '鉄',
      value: nutrition.iron,
      unit: 'mg',
      decimals: 1,
    },
    {
      label: 'ビタミンA',
      value: nutrition.vitamin_a,
      unit: 'μg',
      decimals: 0,
    },
    {
      label: 'ビタミンB1',
      value: nutrition.vitamin_b1,
      unit: 'mg',
      decimals: 2,
    },
    {
      label: 'ビタミンB2',
      value: nutrition.vitamin_b2,
      unit: 'mg',
      decimals: 2,
    },
    {
      label: 'ビタミンC',
      value: nutrition.vitamin_c,
      unit: 'mg',
      decimals: 0,
    },
  ];
  
  return (
    <Table bordered size="sm" className="mb-0">
      <tbody>
        {nutritionItems.map((item) => (
          <tr key={item.label} className={item.primary ? 'table-primary' : ''}>
            <td className="fw-semibold" style={{ width: '50%' }}>
              {item.label}
            </td>
            <td className="text-end">
              <strong>
                {item.value.toFixed(item.decimals)} {item.unit}
              </strong>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default NutritionSummary;