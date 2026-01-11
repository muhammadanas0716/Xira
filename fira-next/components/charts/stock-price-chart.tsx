"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StockPriceChartProps {
  data: {
    date: string;
    price: number;
    volume?: number;
  }[];
  ticker: string;
  currentPrice?: number;
  priceChange?: number;
  percentChange?: number;
}

export function StockPriceChart({
  data,
  ticker,
  currentPrice,
  priceChange,
  percentChange,
}: StockPriceChartProps) {
  const isPositive = (priceChange || 0) >= 0;

  // Calculate min/max for Y axis
  const prices = data.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">{ticker}</CardTitle>
          <div className="flex items-center gap-2 mt-1">
            {currentPrice !== undefined && (
              <span className="text-2xl font-bold font-mono">
                ${currentPrice.toFixed(2)}
              </span>
            )}
            {priceChange !== undefined && percentChange !== undefined && (
              <Badge
                variant="outline"
                className={
                  isPositive
                    ? "bg-finance-green/10 text-finance-green border-finance-green/30"
                    : "bg-finance-red/10 text-finance-red border-finance-red/30"
                }
              >
                {isPositive ? "+" : ""}
                {priceChange.toFixed(2)} ({percentChange.toFixed(2)}%)
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-64 p-0 pr-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isPositive ? "#22c55e" : "#ef4444"}
                  stopOpacity={0.3}
                />
                <stop
                  offset="100%"
                  stopColor={isPositive ? "#22c55e" : "#ef4444"}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              tick={{ fill: "#6b7280", fontSize: 12 }}
              tickLine={{ stroke: "#6b7280" }}
            />
            <YAxis
              domain={[minPrice - padding, maxPrice + padding]}
              stroke="#6b7280"
              tick={{ fill: "#6b7280", fontSize: 12 }}
              tickLine={{ stroke: "#6b7280" }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0a0a0a",
                border: "1px solid #262626",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#e5e7eb" }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={isPositive ? "#22c55e" : "#ef4444"}
              strokeWidth={2}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
