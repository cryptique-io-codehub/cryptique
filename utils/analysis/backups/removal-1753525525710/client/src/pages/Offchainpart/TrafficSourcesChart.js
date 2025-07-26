import React, { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const TrafficSourcesChart = () => {
  // Define state variables for dynamic chart data
  const [data, setData] = useState([
    { name: "Organic", value: 400 },
    { name: "Direct", value: 300 },
    { name: "Referral", value: 200 },
    { name: "Social", value: 100 },
  ]);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  return (
    <div className="w-full flex flex-col items-center mt-8 p-4 bg-white shadow-lg rounded-lg">
      <h2 className="text-lg font-semibold mb-4">Traffic Sources Distribution</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrafficSourcesChart;